package handlers

import (
	"context"
	"log"
	"net/http"
	"time"

	"order-platform/backend/internal/auth"
	"order-platform/backend/internal/middleware"
	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type EmployeeHandler struct {
	employeeRepo   *repository.EmployeeRepository
	profileRepo    *repository.ProfileRepository
	departmentRepo *repository.DepartmentRepository
}

func NewEmployeeHandler(
	employeeRepo *repository.EmployeeRepository,
	profileRepo *repository.ProfileRepository,
	departmentRepo *repository.DepartmentRepository,
) *EmployeeHandler {
	return &EmployeeHandler{
		employeeRepo:   employeeRepo,
		profileRepo:    profileRepo,
		departmentRepo: departmentRepo,
	}
}

// populateEmployeeDepartment populates the Department field for an employee
func (h *EmployeeHandler) populateEmployeeDepartment(ctx context.Context, emp *models.Employee) {
	if !emp.DepartmentID.IsZero() {
		if dept, err := h.departmentRepo.GetDepartmentByID(ctx, emp.DepartmentID); err == nil && dept != nil {
			emp.Department = dept
		}
	}
}

// populateEmployeeFromUser is no longer needed - IsSuspended is now directly on Employee
func (h *EmployeeHandler) populateEmployeeFromUser(ctx context.Context, emp *models.Employee) {
	// IsSuspended is now directly on Employee model, no need to populate from User
}

// mapRoleToUserRole maps EmployeeRole to UserRole for the associated User
func mapRoleToUserRole(role models.EmployeeRole) models.UserRole {
	switch role {
	case models.EmployeeRoleAdmin, models.EmployeeRoleDepartmentManager:
		return models.RoleAdmin
	default:
		return models.RoleUser
	}
}

type CreateEmployeeRequest struct {
	Email        string              `json:"email" binding:"required,email"`
	Password     string              `json:"password" binding:"required,min=6"`
	Name         string              `json:"name" binding:"required"`
	Phone        string              `json:"phone,omitempty"`
	Role         models.EmployeeRole `json:"role" binding:"required"`
	DepartmentID string              `json:"departmentId,omitempty"`
}

type UpdateEmployeeRequest struct {
	Name         string              `json:"name,omitempty"`
	Phone        string              `json:"phone,omitempty"`
	Role         models.EmployeeRole `json:"role,omitempty"`
	DepartmentID *string             `json:"departmentId"` // pointer to allow explicit empty string to unlink
	IsActive     *bool               `json:"isActive,omitempty"`
}

// CreateEmployee creates a new employee (creates User + Employee)
// Similar to CCD-Connect pattern: user registration creates both User and Employee
func (h *EmployeeHandler) CreateEmployee(c *gin.Context) {
	var req CreateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()

	// Get current employee (must be authenticated as employee)
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		log.Printf("[CreateEmployee] Access denied - Not authenticated as employee")
		utils.RespondWithForbidden(c, "É necessário ser um colaborador autenticado para criar outros colaboradores")
		return
	}

	// Check if employee already exists for this email
	existingEmployee, err := h.employeeRepo.GetEmployeeByEmail(ctx, req.Email)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if existingEmployee != nil {
		utils.RespondWithConflict(c, utils.ErrEmailAlreadyExists)
		return
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Parse department ID if provided
	var departmentID primitive.ObjectID
	if req.DepartmentID != "" {
		departmentID, err = primitive.ObjectIDFromHex(req.DepartmentID)
		if err != nil {
			utils.RespondWithBadRequest(c, utils.ErrInvalidID)
			return
		}
	}

	// Map EmployeeRole to Profile (CCD-Connect pattern)
	// Buscar perfil correspondente ao role
	profileName := mapRoleToProfileName(req.Role)
	profile, err := h.profileRepo.GetProfileByName(ctx, profileName)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if profile == nil {
		utils.RespondWithBadRequest(c, "Perfil não encontrado: "+profileName+". Verifique se os perfis padrão foram inicializados.")
		return
	}

	// Create Employee with authentication fields directly
	employee := &models.Employee{
		Name:         req.Name,
		Email:        req.Email,
		Password:     hashedPassword,
		Phone:        req.Phone,
		Role:         req.Role,
		ProfileID:    profile.ID,
		DepartmentID: departmentID,
		IsActive:     true,
		IsSuspended:  false,
		CreatedBy:    currentEmployee.ID,
		UpdatedBy:    currentEmployee.ID,
	}

	if err := h.employeeRepo.CreateEmployee(ctx, employee); err != nil {
		// Note: In production, use MongoDB transactions for atomicity
		// For now, we'll leave the user and handle cleanup separately if needed
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"employee": gin.H{
			"id":           employee.ID.Hex(),
			"name":         employee.Name,
			"email":        employee.Email,
			"phone":        employee.Phone,
			"role":         employee.Role,
			"profileId":    employee.ProfileID.Hex(),
			"departmentId": employee.DepartmentID.Hex(),
			"isActive":     employee.IsActive,
		},
	})
}

// mapRoleToProfileName mapeia EmployeeRole para nome do Profile
func mapRoleToProfileName(role models.EmployeeRole) string {
	switch role {
	case models.EmployeeRoleAdmin:
		return "Administrador"
	case models.EmployeeRoleDepartmentManager:
		return "Gerente"
	case models.EmployeeRoleAttendant:
		return "Atendente"
	case models.EmployeeRoleTechnician:
		return "Técnico"
	default:
		return "Atendente" // Default
	}
}

// GetEmployee retrieves an employee by ID
func (h *EmployeeHandler) GetEmployee(c *gin.Context) {
	id := c.Param("id")
	employeeID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()
	employee, err := h.employeeRepo.GetEmployeeByID(ctx, employeeID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if employee == nil {
		utils.RespondWithNotFound(c, "")
		return
	}

	h.populateEmployeeDepartment(ctx, employee)
	h.populateEmployeeFromUser(ctx, employee)
	c.JSON(http.StatusOK, gin.H{"employee": employee})
}

// ListEmployees lists all employees
func (h *EmployeeHandler) ListEmployees(c *gin.Context) {
	ctx := c.Request.Context()
	filter := bson.M{}

	// Filter by department if provided
	if deptID := c.Query("departmentId"); deptID != "" {
		departmentID, err := primitive.ObjectIDFromHex(deptID)
		if err == nil {
			filter["departmentId"] = departmentID
		}
	}

	// Filter by role if provided
	if role := c.Query("role"); role != "" {
		filter["role"] = role
	}

	// Filter by active status
	if active := c.Query("isActive"); active != "" {
		if active == "true" {
			filter["isActive"] = true
		} else if active == "false" {
			filter["isActive"] = false
		}
	}

	employees, err := h.employeeRepo.ListEmployees(ctx, filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Populate department and suspension status for each employee
	for _, emp := range employees {
		h.populateEmployeeDepartment(ctx, emp)
		h.populateEmployeeFromUser(ctx, emp)
	}

	c.JSON(http.StatusOK, gin.H{"employees": employees})
}

// UpdateEmployee updates an employee
func (h *EmployeeHandler) UpdateEmployee(c *gin.Context) {
	id := c.Param("id")
	employeeID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	var req UpdateEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	// Get existing employee
	employee, err := h.employeeRepo.GetEmployeeByID(ctx, employeeID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if employee == nil {
		utils.RespondWithNotFound(c, "")
		return
	}

	// Update fields
	if req.Name != "" {
		employee.Name = req.Name
	}
	if req.Phone != "" {
		employee.Phone = req.Phone
	}
	if req.Role != "" && req.Role != employee.Role {
		employee.Role = req.Role
	}
	if req.DepartmentID != nil {
		if *req.DepartmentID == "" {
			// Explicitly unlink department
			employee.DepartmentID = primitive.NilObjectID
		} else {
			departmentID, err := primitive.ObjectIDFromHex(*req.DepartmentID)
			if err != nil {
				utils.RespondWithBadRequest(c, utils.ErrInvalidID)
				return
			}
			employee.DepartmentID = departmentID
		}
	}
	if req.IsActive != nil {
		employee.IsActive = *req.IsActive
	}

	// Update updatedBy
	employee.UpdatedBy = currentEmployee.ID
	employee.UpdatedAt = time.Now()

	if err := h.employeeRepo.UpdateEmployee(ctx, employeeID, employee); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	h.populateEmployeeDepartment(ctx, employee)
	c.JSON(http.StatusOK, gin.H{"employee": employee})
}

// SuspendEmployee suspends an employee (sets isSuspended=true on user, isActive=false on employee)
func (h *EmployeeHandler) SuspendEmployee(c *gin.Context) {
	id := c.Param("id")
	employeeID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	employee, err := h.employeeRepo.GetEmployeeByID(ctx, employeeID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if employee == nil {
		utils.RespondWithNotFound(c, "Colaborador não encontrado")
		return
	}

	// Suspend: set employee inactive and suspended
	employee.IsActive = false
	employee.IsSuspended = true
	employee.UpdatedBy = currentEmployee.ID
	employee.UpdatedAt = time.Now()
	if err := h.employeeRepo.UpdateEmployee(ctx, employeeID, employee); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Colaborador suspenso com sucesso"})
}

// UnsuspendEmployee removes the suspension from an employee
func (h *EmployeeHandler) UnsuspendEmployee(c *gin.Context) {
	id := c.Param("id")
	employeeID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	employee, err := h.employeeRepo.GetEmployeeByID(ctx, employeeID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if employee == nil {
		utils.RespondWithNotFound(c, "Colaborador não encontrado")
		return
	}

	// Unsuspend: set employee active and remove suspension
	employee.IsActive = true
	employee.IsSuspended = false
	employee.UpdatedBy = currentEmployee.ID
	employee.UpdatedAt = time.Now()
	if err := h.employeeRepo.UpdateEmployee(ctx, employeeID, employee); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Suspensão do colaborador removida com sucesso"})
}
