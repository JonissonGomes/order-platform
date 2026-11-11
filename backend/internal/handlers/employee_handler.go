package handlers

import (
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
	ProfileID    string              `json:"profileId,omitempty"` // Se vazio, usa o perfil padrão do role
	DepartmentID string              `json:"departmentId,omitempty"`
}

type UpdateEmployeeRequest struct {
	Name         string              `json:"name,omitempty"`
	Phone        string              `json:"phone,omitempty"`
	Role         models.EmployeeRole `json:"role,omitempty"`
	ProfileID    string              `json:"profileId,omitempty"`
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
	if middleware.GetUserFromContext(c) == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	// Colaborador atual (ou super admin) é usado como createdBy
	currentEmployee := requireActor(c)
	if currentEmployee == nil {
		return
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

	// Valida departamento e perfil antes de criar o usuário (evita usuários órfãos)
	departmentID, err := parseOptionalID(req.DepartmentID)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}
	profile, status, msg := h.resolveProfile(c, req.ProfileID, req.Role)
	if profile == nil {
		utils.RespondWithError(c, status, msg)
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

// resolveProfile retorna o perfil pelo ID informado ou, se vazio, o perfil padrão do role.
// Em caso de erro retorna profile nil com o status HTTP e a mensagem a responder.
func (h *EmployeeHandler) resolveProfile(c *gin.Context, rawProfileID string, role models.EmployeeRole) (*models.Profile, int, string) {
	ctx := c.Request.Context()

	var profile *models.Profile
	var err error
	if rawProfileID != "" {
		profileID, idErr := primitive.ObjectIDFromHex(rawProfileID)
		if idErr != nil {
			return nil, http.StatusBadRequest, utils.ErrInvalidID
		}
		profile, err = h.profileRepo.GetProfileByID(ctx, profileID)
	} else {
		profile, err = h.profileRepo.GetProfileByName(ctx, mapRoleToProfileName(role))
	}

	if err != nil {
		return nil, http.StatusInternalServerError, utils.ErrInternalServer
	}
	if profile == nil || !profile.IsActive {
		return nil, http.StatusBadRequest, utils.ErrProfileNotFound
	}
	// Impede conceder um perfil com mais privilégios do que o usuário atual possui
	if !canGrantPermissions(c, profile.Permissions) {
		return nil, http.StatusForbidden, utils.ErrForbidden
	}
	return profile, 0, ""
}

// mapRoleToProfileName mapeia EmployeeRole para nome do Profile
func mapRoleToProfileName(role models.EmployeeRole) string {
	switch role {
	case models.EmployeeRoleAdmin:
		return "Admin"
	case models.EmployeeRoleDepartmentManager:
		return "Gerente de Departamento"
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
		switch active {
		case "true":
			filter["isActive"] = true
		case "false":
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
	if middleware.GetUserFromContext(c) == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	currentEmployee := requireActor(c)
	if currentEmployee == nil {
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
	if req.Role != "" {
		employee.Role = req.Role
	}
	if req.ProfileID != "" {
		profile, status, msg := h.resolveProfile(c, req.ProfileID, employee.Role)
		if profile == nil {
			utils.RespondWithError(c, status, msg)
			return
		}
		employee.ProfileID = profile.ID
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

	employee.UpdatedBy = currentEmployee.ID
	employee.UpdatedAt = time.Now()

	if err := h.employeeRepo.UpdateEmployee(ctx, employeeID, employee); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"employee": employee})
}
