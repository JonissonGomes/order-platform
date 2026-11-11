package handlers

import (
	"net/http"
	"strings"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

type BranchHandler struct {
	branchRepo *repository.BranchRepository
}

func NewBranchHandler(branchRepo *repository.BranchRepository) *BranchHandler {
	return &BranchHandler{branchRepo: branchRepo}
}

type CreateBranchRequest struct {
	Name    string `json:"name" binding:"required"`
	Code    string `json:"code" binding:"required"`
	Address string `json:"address,omitempty"`
	Phone   string `json:"phone,omitempty"`
}

type UpdateBranchRequest struct {
	Name     *string `json:"name,omitempty"`
	Code     *string `json:"code,omitempty"`
	Address  *string `json:"address,omitempty"`
	Phone    *string `json:"phone,omitempty"`
	IsActive *bool   `json:"isActive,omitempty"`
}

// ListBranches lista as filiais
func (h *BranchHandler) ListBranches(c *gin.Context) {
	filter := bson.M{}
	if active := boolQuery(c, "isActive"); active != nil {
		filter["isActive"] = *active
	}

	branches, err := h.branchRepo.ListBranches(c.Request.Context(), filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"branches": branches})
}

// GetBranch retorna uma filial
func (h *BranchHandler) GetBranch(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}

	branch, err := h.branchRepo.GetBranchByID(c.Request.Context(), id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if branch == nil {
		utils.RespondWithNotFound(c, utils.ErrBranchNotFound)
		return
	}
	c.JSON(http.StatusOK, gin.H{"branch": branch})
}

// CreateBranch cria uma filial
func (h *BranchHandler) CreateBranch(c *gin.Context) {
	var req CreateBranchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	branch := &models.Branch{
		Name:     strings.TrimSpace(req.Name),
		Code:     strings.ToUpper(strings.TrimSpace(req.Code)),
		Address:  req.Address,
		Phone:    req.Phone,
		IsActive: true,
	}
	if branch.Name == "" || branch.Code == "" {
		utils.RespondWithBadRequest(c, "")
		return
	}

	if err := h.branchRepo.CreateBranch(c.Request.Context(), branch); err != nil {
		if isDuplicateKey(err) {
			utils.RespondWithConflict(c, utils.ErrDuplicateRecord)
			return
		}
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"branch": branch})
}

// UpdateBranch atualiza uma filial
func (h *BranchHandler) UpdateBranch(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}

	var req UpdateBranchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	branch, err := h.branchRepo.GetBranchByID(ctx, id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if branch == nil {
		utils.RespondWithNotFound(c, utils.ErrBranchNotFound)
		return
	}

	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		branch.Name = strings.TrimSpace(*req.Name)
	}
	if req.Code != nil && strings.TrimSpace(*req.Code) != "" {
		branch.Code = strings.ToUpper(strings.TrimSpace(*req.Code))
	}
	if req.Address != nil {
		branch.Address = *req.Address
	}
	if req.Phone != nil {
		branch.Phone = *req.Phone
	}
	if req.IsActive != nil {
		if branch.IsDefault && !*req.IsActive {
			utils.RespondWithBadRequest(c, "A filial padrão não pode ser desativada")
			return
		}
		branch.IsActive = *req.IsActive
	}

	if err := h.branchRepo.UpdateBranch(ctx, id, branch); err != nil {
		if isDuplicateKey(err) {
			utils.RespondWithConflict(c, utils.ErrDuplicateRecord)
			return
		}
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"branch": branch})
}
