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
	userRepo     *repository.UserRepository
	employeeRepo *repository.EmployeeRepository
	profileRepo  *repository.ProfileRepository
}

func NewAuthHandler(
	userRepo *repository.UserRepository,
	employeeRepo *repository.EmployeeRepository,
	profileRepo *repository.ProfileRepository,
) *AuthHandler {
	return &AuthHandler{
		userRepo:     userRepo,
		employeeRepo: employeeRepo,
		profileRepo:  profileRepo,
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

// Register creates a new user account
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()

	// Check if user already exists
	existingUser, err := h.userRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if existingUser != nil {
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
	role := models.RoleUser

	// Check if it's super admin email
	if config.Get().SuperAdminEmail != "" && req.Email == config.Get().SuperAdminEmail {
		// Validate max 3 super admins
		superAdminCount, err := h.userRepo.CountSuperAdmins(ctx)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}
		if superAdminCount >= 3 {
			utils.RespondWithForbidden(c, utils.ErrMaxSuperAdmins)
			return
		}
		role = models.RoleSuperAdmin
	} else if config.Get().AdminEmail != "" && req.Email == config.Get().AdminEmail {
		role = models.RoleAdmin
	} else {
		// Check if this is the first user (becomes admin)
		count, err := h.userRepo.CountUsers(ctx)
		if err == nil && count == 0 {
			role = models.RoleAdmin
		}
	}

	// Create user
	user := &models.User{
		Email:    req.Email,
		Password: hashedPassword,
		Name:     req.Name,
		Role:     role,
	}

	if err := h.userRepo.CreateUser(ctx, user); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Create session token
	sessionPayload := auth.SessionPayload{
		UserID: user.ID.Hex(),
		Email:  user.Email,
		Name:   user.Name,
		Role:   string(user.Role),
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
			"id":    user.ID.Hex(),
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		},
	})
}

// Login authenticates a user
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()

	// Get user by email
	user, err := h.userRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if user == nil {
		utils.RespondWithUnauthorized(c, utils.ErrInvalidCredentials)
		return
	}

	// Check password
	if !auth.CheckPasswordHash(req.Password, user.Password) {
		utils.RespondWithUnauthorized(c, utils.ErrInvalidCredentials)
		return
	}

	// Update last signed in
	_ = h.userRepo.UpdateLastSignedIn(ctx, user.ID)

	// Create session token
	sessionPayload := auth.SessionPayload{
		UserID: user.ID.Hex(),
		Email:  user.Email,
		Name:   user.Name,
		Role:   string(user.Role),
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
			"id":    user.ID.Hex(),
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		},
	})
}

// GetMe retorna o usuário autenticado, seu colaborador (com perfil) e as permissões efetivas.
// Usa o contexto preenchido por LoadEmployeeContext; se ausente, resolve diretamente.
func (h *AuthHandler) GetMe(c *gin.Context) {
	user := middleware.GetUserFromContext(c)
	if user == nil {
		c.JSON(http.StatusOK, gin.H{"user": nil, "employee": nil, "permissions": []string{}})
		return
	}

	employee := middleware.GetEmployeeFromContext(c)
	permissions := middleware.GetPermissionsFromContext(c)
	if _, loaded := c.Get(middleware.PermissionsContextKey); !loaded {
		var err error
		employee, permissions, err = middleware.ResolveAccess(c.Request.Context(), user, h.employeeRepo, h.profileRepo)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"user": user, "employee": employee, "permissions": permissions})
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

type UpdateUserRoleRequest struct {
	Role models.UserRole `json:"role" binding:"required"`
}

// UpdateUserRole updates a user's role (Super Admin only)
func (h *AuthHandler) UpdateUserRole(c *gin.Context) {
	id := c.Param("id")
	userID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req UpdateUserRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()

	// Validate super admin limit
	if req.Role == models.RoleSuperAdmin {
		superAdminCount, err := h.userRepo.CountSuperAdmins(ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate super admin count"})
			return
		}

		// Check if the user being updated is already a super admin
		existingUser, err := h.userRepo.GetUserByID(ctx, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
			return
		}
		if existingUser == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		// If user is not already a super admin, check limit
		if existingUser.Role != models.RoleSuperAdmin && superAdminCount >= 3 {
			c.JSON(http.StatusForbidden, gin.H{"error": "Maximum of 3 super admins allowed in the system"})
			return
		}
	}

	// Update user role
	if err := h.userRepo.UpdateUserRole(ctx, userID, req.Role); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user role"})
		return
	}

	// Get updated user
	user, err := h.userRepo.GetUserByID(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get updated user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":    user.ID.Hex(),
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
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
