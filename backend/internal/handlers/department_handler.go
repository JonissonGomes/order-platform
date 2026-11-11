package handlers

import (
	"net/http"
	"strings"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DepartmentHandler struct {
	departmentRepo *repository.DepartmentRepository
	branchRepo     *repository.BranchRepository
}

func NewDepartmentHandler(departmentRepo *repository.DepartmentRepository, branchRepo *repository.BranchRepository) *DepartmentHandler {
	return &DepartmentHandler{departmentRepo: departmentRepo, branchRepo: branchRepo}
}

type CreateDepartmentRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description,omitempty"`
	ManagerID   string `json:"managerId,omitempty"`
	BranchID    string `json:"branchId,omitempty"`
}

type UpdateDepartmentRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	ManagerID   *string `json:"managerId,omitempty"`
	BranchID    *string `json:"branchId,omitempty"`
	IsActive    *bool   `json:"isActive,omitempty"`
}

// ListDepartments lista departamentos (filtros: branchId, isActive)
func (h *DepartmentHandler) ListDepartments(c *gin.Context) {
	filter := bson.M{}
	if raw := c.Query("branchId"); raw != "" {
		branchID, err := primitive.ObjectIDFromHex(raw)
		if err != nil {
			utils.RespondWithBadRequest(c, utils.ErrInvalidID)
			return
		}
		filter["branchId"] = branchID
	}
	if active := boolQuery(c, "isActive"); active != nil {
		filter["isActive"] = *active
	}

	departments, err := h.departmentRepo.ListDepartments(c.Request.Context(), filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"departments": departments})
}

// GetDepartment retorna um departamento
func (h *DepartmentHandler) GetDepartment(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}

	department, err := h.departmentRepo.GetDepartmentByID(c.Request.Context(), id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if department == nil {
		utils.RespondWithNotFound(c, "")
		return
	}
	c.JSON(http.StatusOK, gin.H{"department": department})
}

// CreateDepartment cria um departamento
func (h *DepartmentHandler) CreateDepartment(c *gin.Context) {
	var req CreateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}
	actor := requireActor(c)
	if actor == nil {
		return
	}

	ctx := c.Request.Context()
	managerID, err := parseOptionalID(req.ManagerID)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}
	branchID, err := resolveBranchID(ctx, h.branchRepo, req.BranchID)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrBranchNotFound)
		return
	}

	department := &models.Department{
		BranchID:    branchID,
		Name:        strings.TrimSpace(req.Name),
		Description: req.Description,
		ManagerID:   managerID,
		IsActive:    true,
		CreatedBy:   actor.ID,
		UpdatedBy:   actor.ID,
	}
	if department.Name == "" {
		utils.RespondWithBadRequest(c, "")
		return
	}

	if err := h.departmentRepo.CreateDepartment(ctx, department); err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"department": department})
}

// UpdateDepartment atualiza um departamento
func (h *DepartmentHandler) UpdateDepartment(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req UpdateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}
	actor := requireActor(c)
	if actor == nil {
		return
	}

	ctx := c.Request.Context()
	department, err := h.departmentRepo.GetDepartmentByID(ctx, id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if department == nil {
		utils.RespondWithNotFound(c, "")
		return
	}

	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		department.Name = strings.TrimSpace(*req.Name)
	}
	if req.Description != nil {
		department.Description = *req.Description
	}
	if req.ManagerID != nil {
		managerID, err := parseOptionalID(*req.ManagerID)
		if err != nil {
			utils.RespondWithBadRequest(c, utils.ErrInvalidID)
			return
		}
		department.ManagerID = managerID
	}
	if req.BranchID != nil && *req.BranchID != "" {
		branchID, err := primitive.ObjectIDFromHex(*req.BranchID)
		if err != nil {
			utils.RespondWithBadRequest(c, utils.ErrInvalidID)
			return
		}
		department.BranchID = branchID
	}
	if req.IsActive != nil {
		department.IsActive = *req.IsActive
	}
	department.UpdatedBy = actor.ID

	if err := h.departmentRepo.UpdateDepartment(ctx, id, department); err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"department": department})
}
