package handlers

import (
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
	userRepo     *repository.UserRepository
	employeeRepo *repository.EmployeeRepository
	profileRepo  *repository.ProfileRepository
}

func NewEmployeeHandler(
	userRepo *repository.UserRepository,
	employeeRepo *repository.EmployeeRepository,
	profileRepo *repository.ProfileRepository,
) *EmployeeHandler {
	return &EmployeeHandler{
		userRepo:     userRepo,
		employeeRepo: employeeRepo,
		profileRepo:  profileRepo,
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
	DepartmentID string              `json:"departmentId,omitempty"`
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
	currentUser := middleware.GetUserFromContext(c)
	if currentUser == nil {
		log.Printf("[CreateEmployee] No user in context")
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	log.Printf("[CreateEmployee] Current user: %s, Role: %s, IsAdmin: %v, IsSuperAdmin: %v",
		currentUser.Email, currentUser.Role, currentUser.IsAdmin(), currentUser.IsSuperAdmin())

	// Get current employee to use as createdBy
	// Super admin can create employees even without an Employee record
	currentEmployee, err := h.employeeRepo.GetEmployeeByUserID(ctx, currentUser.ID)
	if err != nil || currentEmployee == nil {
		// If user is super admin or admin, allow creation without Employee record
		// This is needed because super_admin users may not have an Employee record
		if !currentUser.IsAdmin() {
			log.Printf("[CreateEmployee] Access denied - User is not admin or super admin")
			utils.RespondWithForbidden(c, "É necessário ser administrador ou super administrador para criar colaboradores")
			return
		}
		// For super admin/admin without Employee, we'll use User ID for createdBy
		// This is acceptable as they have full permissions
	}

	// Check if user already exists
	existingUser, err := h.userRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if existingUser != nil {
		utils.RespondWithConflict(c, utils.ErrEmailAlreadyExists)
		return
	}

	// Check if employee already exists for this email
	existingEmployees, err := h.employeeRepo.ListEmployees(ctx, bson.M{"email": req.Email})
	if err == nil && len(existingEmployees) > 0 {
		utils.RespondWithConflict(c, utils.ErrEmailAlreadyExists)
		return
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Create User first
	user := &models.User{
		Email:    req.Email,
		Password: hashedPassword,
		Name:     req.Name,
		Role:     models.RoleUser, // Employees are regular users, role is in Employee
	}

	if err := h.userRepo.CreateUser(ctx, user); err != nil {
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

	// Create Employee linked to User and Profile
	employee := &models.Employee{
		UserID:       user.ID,
		Name:         req.Name,
		Email:        req.Email,
		Phone:        req.Phone,
		Role:         req.Role,
		ProfileID:    profile.ID,
		DepartmentID: departmentID,
		IsActive:     true,
		CreatedBy:    createdBy,
		UpdatedBy:    updatedBy,
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
			"userId":       employee.UserID.Hex(),
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
		return "Admin"
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
	currentUser := middleware.GetUserFromContext(c)
	if currentUser == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	currentEmployee, err := h.employeeRepo.GetEmployeeByUserID(ctx, currentUser.ID)
	if err != nil || currentEmployee == nil {
		// If user is super admin, allow update without Employee record
		if !currentUser.IsSuperAdmin() {
			utils.RespondWithForbidden(c, "")
			return
		}
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
	if req.Role != "" {
		employee.Role = req.Role
	}
	if req.DepartmentID != "" {
		departmentID, err := primitive.ObjectIDFromHex(req.DepartmentID)
		if err != nil {
			utils.RespondWithBadRequest(c, utils.ErrInvalidID)
			return
		}
		employee.DepartmentID = departmentID
	}
	if req.IsActive != nil {
		employee.IsActive = *req.IsActive
	}

	// Determine updatedBy - use Employee ID if available, otherwise use User ID for super admin
	if currentEmployee != nil {
		employee.UpdatedBy = currentEmployee.ID
	} else {
		employee.UpdatedBy = currentUser.ID
	}
	employee.UpdatedAt = time.Now()

	if err := h.employeeRepo.UpdateEmployee(ctx, employeeID, employee); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"employee": employee})
}
