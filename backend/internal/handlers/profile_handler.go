package handlers

import (
	"net/http"
	"strings"

	"order-platform/backend/internal/middleware"
	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

type ProfileHandler struct {
	profileRepo *repository.ProfileRepository
}

func NewProfileHandler(profileRepo *repository.ProfileRepository) *ProfileHandler {
	return &ProfileHandler{
		profileRepo: profileRepo,
	}
}

type CreateProfileRequest struct {
	Name        string   `json:"name" binding:"required"`
	Description string   `json:"description,omitempty"`
	Permissions []string `json:"permissions" binding:"required"`
}

type UpdateProfileRequest struct {
	Name        *string   `json:"name,omitempty"`
	Description *string   `json:"description,omitempty"`
	Permissions *[]string `json:"permissions,omitempty"`
	IsActive    *bool     `json:"isActive,omitempty"`
}

// ListProfiles lists all profiles
func (h *ProfileHandler) ListProfiles(c *gin.Context) {
	ctx := c.Request.Context()
	filter := bson.M{}

	// Filter by active status if provided
	if active := boolQuery(c, "isActive"); active != nil {
		filter["isActive"] = *active
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
	profileID, ok := parseIDParam(c, "id")
	if !ok {
		return
	}

	profile, err := h.profileRepo.GetProfileByID(c.Request.Context(), profileID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if profile == nil {
		utils.RespondWithNotFound(c, utils.ErrProfileNotFound)
		return
	}

	c.JSON(http.StatusOK, gin.H{"profile": profile})
}

// CreateProfile cria um perfil personalizado
func (h *ProfileHandler) CreateProfile(c *gin.Context) {
	var req CreateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	name := strings.TrimSpace(req.Name)
	permissions := normalizePermissions(req.Permissions)
	if name == "" || len(permissions) == 0 {
		utils.RespondWithBadRequest(c, "")
		return
	}
	if !canGrantPermissions(c, permissions) {
		utils.RespondWithForbidden(c, "")
		return
	}

	profile := &models.Profile{
		Name:        name,
		Description: req.Description,
		Permissions: permissions,
		IsActive:    true,
	}
	if err := h.profileRepo.CreateProfile(c.Request.Context(), profile); err != nil {
		if isDuplicateKey(err) {
			utils.RespondWithConflict(c, "Já existe um perfil com este nome")
			return
		}
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"profile": profile})
}

// UpdateProfile atualiza um perfil. Em perfis padrão o nome e o status não podem ser
// alterados e o perfil Super Admin é imutável; as permissões dos demais podem ser editadas.
func (h *ProfileHandler) UpdateProfile(c *gin.Context) {
	profileID, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	profile, err := h.profileRepo.GetProfileByID(ctx, profileID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if profile == nil {
		utils.RespondWithNotFound(c, utils.ErrProfileNotFound)
		return
	}

	if status, msg := h.applyProfileUpdate(c, profile, &req); status != 0 {
		utils.RespondWithError(c, status, msg)
		return
	}

	if err := h.profileRepo.UpdateProfile(ctx, profileID, profile); err != nil {
		if isDuplicateKey(err) {
			utils.RespondWithConflict(c, "Já existe um perfil com este nome")
			return
		}
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"profile": profile})
}

// applyProfileUpdate aplica as alterações respeitando as regras de perfis padrão.
// Retorna (status HTTP, mensagem) em caso de erro, ou (0, "") em caso de sucesso.
func (h *ProfileHandler) applyProfileUpdate(c *gin.Context, profile *models.Profile, req *UpdateProfileRequest) (int, string) {
	nameChange := req.Name != nil && strings.TrimSpace(*req.Name) != profile.Name
	statusChange := req.IsActive != nil && *req.IsActive != profile.IsActive
	if profile.IsDefault && (nameChange || statusChange) {
		return http.StatusBadRequest, utils.ErrDefaultProfileLocked
	}
	if profile.IsDefault && profile.Name == "Super Admin" && req.Permissions != nil {
		return http.StatusBadRequest, "O perfil Super Admin não pode ser alterado"
	}

	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		profile.Name = strings.TrimSpace(*req.Name)
	}
	if req.Description != nil {
		profile.Description = *req.Description
	}
	if req.IsActive != nil {
		profile.IsActive = *req.IsActive
	}
	if req.Permissions != nil {
		permissions := normalizePermissions(*req.Permissions)
		if len(permissions) == 0 {
			return http.StatusBadRequest, utils.ErrInvalidRequest
		}
		if !canGrantPermissions(c, permissions) {
			return http.StatusForbidden, utils.ErrForbidden
		}
		profile.Permissions = permissions
	}
	return 0, ""
}

// normalizePermissions remove espaços, vazios e duplicatas
func normalizePermissions(perms []string) []string {
	seen := make(map[string]bool, len(perms))
	result := make([]string, 0, len(perms))
	for _, p := range perms {
		p = strings.TrimSpace(p)
		if p != "" && !seen[p] {
			seen[p] = true
			result = append(result, p)
		}
	}
	return result
}

// canGrantPermissions impede escalonamento de privilégio: só é possível conceder
// permissões que o próprio usuário já possui.
func canGrantPermissions(c *gin.Context, perms []string) bool {
	actorPerms := middleware.GetPermissionsFromContext(c)
	for _, p := range perms {
		if !models.HasPermission(actorPerms, p) {
			return false
		}
	}
	return true
}
