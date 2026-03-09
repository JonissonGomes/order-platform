package handlers

import (
	"net/http"
	"time"

	"order-platform/backend/internal/middleware"
	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DepartmentHandler struct {
	departmentRepo   *repository.DepartmentRepository
	employeeRepo     *repository.EmployeeRepository
	serviceOrderRepo *repository.ServiceOrderRepository
}

func NewDepartmentHandler(
	departmentRepo *repository.DepartmentRepository,
	employeeRepo *repository.EmployeeRepository,
	serviceOrderRepo *repository.ServiceOrderRepository,
) *DepartmentHandler {
	return &DepartmentHandler{
		departmentRepo:   departmentRepo,
		employeeRepo:     employeeRepo,
		serviceOrderRepo: serviceOrderRepo,
	}
}

type CreateDepartmentRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description,omitempty"`
	ManagerID   string `json:"managerId,omitempty"`
}

type UpdateDepartmentRequest struct {
	Name        string `json:"name,omitempty"`
	Description string `json:"description,omitempty"`
	ManagerID   string `json:"managerId,omitempty"`
	IsActive    *bool  `json:"isActive,omitempty"`
}

// CreateDepartment creates a new department
func (h *DepartmentHandler) CreateDepartment(c *gin.Context) {
	var req CreateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	currentUser := middleware.GetUserFromContext(c)
	if currentUser == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	// Get current employee
	// Admin and Super Admin can create departments even without an Employee record
	currentEmployee, err := h.employeeRepo.GetEmployeeByUserID(ctx, currentUser.ID)
	if err != nil || currentEmployee == nil {
		if !currentUser.IsAdmin() {
			utils.RespondWithForbidden(c, "")
			return
		}
		// For admin/super admin without Employee, we'll use User ID for createdBy
	}

	// Parse manager ID if provided
	var managerID primitive.ObjectID
	if req.ManagerID != "" {
		managerID, err = primitive.ObjectIDFromHex(req.ManagerID)
		if err != nil {
			utils.RespondWithBadRequest(c, "ID do gerente inválido")
			return
		}

		// Verify manager exists
		manager, err := h.employeeRepo.GetEmployeeByID(ctx, managerID)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}
		if manager == nil {
			utils.RespondWithNotFound(c, "Gerente não encontrado")
			return
		}
	}

	// Determine createdBy - use Employee ID if available, otherwise use User ID for super admin
	var createdBy primitive.ObjectID
	var updatedBy primitive.ObjectID
	if currentEmployee != nil {
		createdBy = currentEmployee.ID
		updatedBy = currentEmployee.ID
	} else {
		// For super admin without Employee, use User ID
		createdBy = currentUser.ID
		updatedBy = currentUser.ID
	}

	// Create department
	department := &models.Department{
		Name:        req.Name,
		Description: req.Description,
		ManagerID:   managerID,
		IsActive:    true,
		CreatedBy:   createdBy,
		UpdatedBy:   updatedBy,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := h.departmentRepo.CreateDepartment(ctx, department); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"department": department})
}

// GetDepartment retrieves a department by ID
func (h *DepartmentHandler) GetDepartment(c *gin.Context) {
	id := c.Param("id")
	departmentID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()
	department, err := h.departmentRepo.GetDepartmentByID(ctx, departmentID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if department == nil {
		utils.RespondWithNotFound(c, "Departamento não encontrado")
		return
	}

	c.JSON(http.StatusOK, gin.H{"department": department})
}

// ListDepartments lists all departments
func (h *DepartmentHandler) ListDepartments(c *gin.Context) {
	ctx := c.Request.Context()
	filter := bson.M{}

	// Filter by active status
	if active := c.Query("isActive"); active != "" {
		if active == "true" {
			filter["isActive"] = true
		} else if active == "false" {
			filter["isActive"] = false
		}
	}

	departments, err := h.departmentRepo.ListDepartments(ctx, filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"departments": departments})
}

// UpdateDepartment updates a department
func (h *DepartmentHandler) UpdateDepartment(c *gin.Context) {
	id := c.Param("id")
	departmentID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	var req UpdateDepartmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	currentUser := middleware.GetUserFromContext(c)
	if currentUser == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	// Get current employee
	// Admin and Super Admin can update departments even without an Employee record
	currentEmployee, err := h.employeeRepo.GetEmployeeByUserID(ctx, currentUser.ID)
	if err != nil || currentEmployee == nil {
		if !currentUser.IsAdmin() {
			utils.RespondWithForbidden(c, "")
			return
		}
	}

	// Get existing department
	department, err := h.departmentRepo.GetDepartmentByID(ctx, departmentID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if department == nil {
		utils.RespondWithNotFound(c, "Departamento não encontrado")
		return
	}

	// Update fields
	if req.Name != "" {
		department.Name = req.Name
	}
	if req.Description != "" {
		department.Description = req.Description
	}
	if req.ManagerID != "" {
		managerID, err := primitive.ObjectIDFromHex(req.ManagerID)
		if err != nil {
			utils.RespondWithBadRequest(c, "ID do gerente inválido")
			return
		}
		department.ManagerID = managerID
	}
	if req.IsActive != nil {
		department.IsActive = *req.IsActive
	}

	// Determine updatedBy - use Employee ID if available, otherwise use User ID for super admin
	if currentEmployee != nil {
		department.UpdatedBy = currentEmployee.ID
	} else {
		department.UpdatedBy = currentUser.ID
	}
	department.UpdatedAt = time.Now()

	if err := h.departmentRepo.UpdateDepartment(ctx, departmentID, department); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"department": department})
}

// GetDepartmentEmployees retrieves employees in a department
func (h *DepartmentHandler) GetDepartmentEmployees(c *gin.Context) {
	id := c.Param("id")
	departmentID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()
	employees, err := h.employeeRepo.GetEmployeesByDepartmentID(ctx, departmentID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"employees": employees})
}

// GetDepartmentServiceOrders retrieves service orders for a department
func (h *DepartmentHandler) GetDepartmentServiceOrders(c *gin.Context) {
	id := c.Param("id")
	departmentID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()
	filter := bson.M{"departmentId": departmentID}

	// Filter by status if provided
	if status := c.Query("status"); status != "" {
		filter["status"] = status
	}

	orders, err := h.serviceOrderRepo.ListServiceOrders(ctx, 0, 1000, filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

// DeleteDepartment deletes a department
func (h *DepartmentHandler) DeleteDepartment(c *gin.Context) {
	id := c.Param("id")
	departmentID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()

	// Check if department has employees
	employees, err := h.employeeRepo.GetEmployeesByDepartmentID(ctx, departmentID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if len(employees) > 0 {
		utils.RespondWithConflict(c, "Não é possível deletar departamento com colaboradores associados")
		return
	}

	// Check if department has service orders
	orders, err := h.serviceOrderRepo.ListServiceOrders(ctx, 0, 1, bson.M{"departmentId": departmentID})
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if len(orders) > 0 {
		utils.RespondWithConflict(c, "Não é possível deletar departamento com ordens de serviço associadas")
		return
	}

	// Delete department
	if err := h.departmentRepo.DeleteDepartment(ctx, departmentID); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
