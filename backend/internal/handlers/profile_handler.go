package handlers

import (
	"net/http"

	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ProfileHandler struct {
	profileRepo *repository.ProfileRepository
}

func NewProfileHandler(profileRepo *repository.ProfileRepository) *ProfileHandler {
	return &ProfileHandler{
		profileRepo: profileRepo,
	}
}

// ListProfiles lists all profiles
func (h *ProfileHandler) ListProfiles(c *gin.Context) {
	ctx := c.Request.Context()
	filter := bson.M{}

	// Filter by active status if provided
	if active := c.Query("isActive"); active != "" {
		if active == "true" {
			filter["isActive"] = true
		} else if active == "false" {
			filter["isActive"] = false
		}
	}

	profiles, err := h.profileRepo.ListProfiles(ctx, filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"profiles": profiles})
}

// GetProfile retrieves a profile by ID
func (h *ProfileHandler) GetProfile(c *gin.Context) {
	id := c.Param("id")
	profileID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()
	profile, err := h.profileRepo.GetProfileByID(ctx, profileID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if profile == nil {
		utils.RespondWithNotFound(c, "Perfil não encontrado")
		return
	}

	c.JSON(http.StatusOK, gin.H{"profile": profile})
}

// GetProfileByName retrieves a profile by name
func (h *ProfileHandler) GetProfileByName(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		utils.RespondWithBadRequest(c, "Nome do perfil é obrigatório")
		return
	}

	ctx := c.Request.Context()
	profile, err := h.profileRepo.GetProfileByName(ctx, name)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if profile == nil {
		utils.RespondWithNotFound(c, "Perfil não encontrado")
		return
	}

	c.JSON(http.StatusOK, gin.H{"profile": profile})
}

// UpdateProfilePermissions updates profile permissions
type UpdateProfilePermissionsRequest struct {
	Permissions       []string `json:"permissions" binding:"required"` // View permissions
	EditPermissions   []string `json:"editPermissions"`                // Edit permissions
	DeletePermissions []string `json:"deletePermissions"`              // Delete permissions
}

func (h *ProfileHandler) UpdateProfilePermissions(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		utils.RespondWithBadRequest(c, "Nome do perfil é obrigatório")
		return
	}

	var req UpdateProfilePermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()

	// Get existing profile
	profile, err := h.profileRepo.GetProfileByName(ctx, name)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if profile == nil {
		utils.RespondWithNotFound(c, "Perfil não encontrado")
		return
	}

	// Check if it's a default profile (Super Admin or Admin) - these shouldn't be modified
	if profile.IsDefault && (name == "Super Admin" || name == "Admin") {
		utils.RespondWithForbidden(c, "Não é possível modificar permissões de perfis padrão do sistema")
		return
	}

	// Update permissions
	profile.Permissions = req.Permissions
	if req.EditPermissions != nil {
		profile.EditPermissions = req.EditPermissions
	} else {
		profile.EditPermissions = []string{}
	}
	if req.DeletePermissions != nil {
		profile.DeletePermissions = req.DeletePermissions
	} else {
		profile.DeletePermissions = []string{}
	}

	// Update in database
	if err := h.profileRepo.UpdateProfile(ctx, profile.ID, profile); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"profile": profile})
}

// GetAvailableModules returns list of available modules
func (h *ProfileHandler) GetAvailableModules(c *gin.Context) {
	// Return list of module paths/names based on MODULES from frontend
	// These should match the module paths in the system
	modules := []string{
		"/dashboard",
		"/service-orders",
		"/customers",
		"/departments",
		"/employees",
		"/profiles",
	}

	c.JSON(http.StatusOK, gin.H{"modules": modules})
}
