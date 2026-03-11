package handlers

import (
	"net/http"
	"time"

	"order-platform/backend/internal/auth"
	"order-platform/backend/internal/config"
	"order-platform/backend/internal/middleware"
	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuthHandler struct {
	employeeRepo *repository.EmployeeRepository
	customerRepo *repository.CustomerRepository
}

func NewAuthHandler(employeeRepo *repository.EmployeeRepository, customerRepo *repository.CustomerRepository) *AuthHandler {
	return &AuthHandler{
		employeeRepo: employeeRepo,
		customerRepo: customerRepo,
	}
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Register creates a new employee account (for internal use)
// Note: Customer registration should use the public register endpoint
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()

	// Check if employee already exists
	existingEmployee, err := h.employeeRepo.GetEmployeeByEmail(ctx, req.Email)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if existingEmployee != nil {
		utils.RespondWithConflict(c, utils.ErrUserAlreadyExists)
		return
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Determine role
	var role models.EmployeeRole = models.EmployeeRoleAttendant

	// Check if it's super admin email
	if config.Get().SuperAdminEmail != "" && req.Email == config.Get().SuperAdminEmail {
		// Validate max 3 super admins (admins)
		adminCount, err := h.employeeRepo.CountAdmins(ctx)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}
		if adminCount >= 3 {
			utils.RespondWithForbidden(c, utils.ErrMaxSuperAdmins)
			return
		}
		role = models.EmployeeRoleAdmin
	} else if config.Get().AdminEmail != "" && req.Email == config.Get().AdminEmail {
		role = models.EmployeeRoleAdmin
	} else {
		// Check if this is the first employee (becomes admin)
		count, err := h.employeeRepo.CountEmployees(ctx)
		if err == nil && count == 0 {
			role = models.EmployeeRoleAdmin
		}
	}

	// Create employee
	employee := &models.Employee{
		Email:    req.Email,
		Password: hashedPassword,
		Name:     req.Name,
		Role:     role,
		IsActive: true,
	}

	if err := h.employeeRepo.CreateEmployee(ctx, employee); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Create session token
	sessionPayload := auth.SessionPayload{
		UserID: employee.ID.Hex(),
		Email:  employee.Email,
		Name:   employee.Name,
		Role:   string(employee.Role),
		Type:   "employee",
	}

	sessionToken, err := auth.CreateSessionToken(sessionPayload, oneYear)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Set cookie
	c.SetCookie(
		"app_session_id",
		sessionToken,
		int(oneYear.Seconds()),
		"/",
		"",
		isSecureRequest(c.Request),
		true,
	)

	c.JSON(http.StatusCreated, gin.H{
		"user": gin.H{
			"id":    employee.ID.Hex(),
			"email": employee.Email,
			"name":  employee.Name,
			"role":  employee.Role,
			"type":  "employee",
		},
	})
}

// Login authenticates an employee or customer
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()

	// Try to find as employee first
	employee, err := h.employeeRepo.GetEmployeeByEmail(ctx, req.Email)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	var userID string
	var userName string
	var userRole string
	var userType string // "employee" or "customer"

	if employee != nil {
		// Check password
		if !auth.CheckPasswordHash(req.Password, employee.Password) {
			utils.RespondWithUnauthorized(c, utils.ErrInvalidCredentials)
			return
		}

		// Check if suspended
		if employee.IsSuspended {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Sua conta está suspensa. Entre em contato com o time de gestão de pessoas.",
				"code":  "USER_SUSPENDED",
			})
			c.Abort()
			return
		}

		// Update last signed in
		_ = h.employeeRepo.UpdateLastSignedIn(ctx, employee.ID)

		userID = employee.ID.Hex()
		userName = employee.Name
		userRole = string(employee.Role)
		userType = "employee"
	} else {
		// Try to find as customer
		customer, err := h.customerRepo.GetCustomerByEmail(ctx, req.Email)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}
		if customer == nil {
			utils.RespondWithUnauthorized(c, utils.ErrInvalidCredentials)
			return
		}

		// Check password
		if !auth.CheckPasswordHash(req.Password, customer.Password) {
			utils.RespondWithUnauthorized(c, utils.ErrInvalidCredentials)
			return
		}

		// Update last signed in
		_ = h.customerRepo.UpdateLastSignedIn(ctx, customer.ID)

		userID = customer.ID.Hex()
		userName = customer.Name
		userRole = "customer"
		userType = "customer"
	}

	// Create session token
	sessionPayload := auth.SessionPayload{
		UserID: userID,
		Email:  req.Email,
		Name:   userName,
		Role:   userRole,
		Type:   userType, // Add type to session payload
	}

	sessionToken, err := auth.CreateSessionToken(sessionPayload, oneYear)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Set cookie
	c.SetCookie(
		"app_session_id",
		sessionToken,
		int(oneYear.Seconds()),
		"/",
		"",
		isSecureRequest(c.Request),
		true,
	)

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":    userID,
			"email": req.Email,
			"name":  userName,
			"role":  userRole,
			"type":  userType,
		},
	})
}

// GetMe returns the current authenticated user (Employee or Customer)
func (h *AuthHandler) GetMe(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	if user == nil {
		c.JSON(http.StatusOK, gin.H{"user": nil})
		return
	}

	// Convert to appropriate response format
	var response interface{}
	if employee, ok := user.(*models.Employee); ok {
		response = gin.H{
			"id":    employee.ID.Hex(),
			"email": employee.Email,
			"name":  employee.Name,
			"role":  employee.Role,
			"type":  "employee",
		}
	} else if customer, ok := user.(*models.Customer); ok {
		response = gin.H{
			"id":    customer.ID.Hex(),
			"email": customer.Email,
			"name":  customer.Name,
			"role":  "customer",
			"type":  "customer",
		}
	} else {
		c.JSON(http.StatusOK, gin.H{"user": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": response})
}

// Logout logs out the current user
func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetCookie(
		"app_session_id",
		"",
		-1,
		"/",
		"",
		isSecureRequest(c.Request),
		true,
	)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

type UpdateEmployeeRoleRequest struct {
	Role models.EmployeeRole `json:"role" binding:"required"`
}

// UpdateEmployeeRole updates an employee's role (Admin only)
func (h *AuthHandler) UpdateEmployeeRole(c *gin.Context) {
	id := c.Param("id")
	employeeID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employee ID"})
		return
	}

	var req UpdateEmployeeRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()

	// Validate admin limit
	if req.Role == models.EmployeeRoleAdmin {
		adminCount, err := h.employeeRepo.CountAdmins(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate admin count"})
			return
		}

		// Check if the employee being updated is already an admin
		existingEmployee, err := h.employeeRepo.GetEmployeeByID(ctx, employeeID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get employee"})
			return
		}
		if existingEmployee == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Employee not found"})
			return
		}

		// If employee is not already an admin, check limit
		if existingEmployee.Role != models.EmployeeRoleAdmin && adminCount >= 3 {
			c.JSON(http.StatusForbidden, gin.H{"error": "Maximum of 3 admins allowed in the system"})
			return
		}
	}

	// Get existing employee
	employee, err := h.employeeRepo.GetEmployeeByID(ctx, employeeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get employee"})
		return
	}
	if employee == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Employee not found"})
		return
	}

	// Update employee role
	employee.Role = req.Role
	if err := h.employeeRepo.UpdateEmployee(ctx, employeeID, employee); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update employee role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"employee": gin.H{
			"id":    employee.ID.Hex(),
			"email": employee.Email,
			"name":  employee.Name,
			"role":  employee.Role,
		},
	})
}

const oneYear = 365 * 24 * time.Hour

func isSecureRequest(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	return r.Header.Get("X-Forwarded-Proto") == "https"
}
