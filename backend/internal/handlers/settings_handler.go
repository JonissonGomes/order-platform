package handlers

import (
	"net/http"

	"order-platform/backend/internal/middleware"
	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type SettingsHandler struct {
	settingsRepo *repository.SettingsRepository
	employeeRepo *repository.EmployeeRepository
}

func NewSettingsHandler(settingsRepo *repository.SettingsRepository, employeeRepo *repository.EmployeeRepository) *SettingsHandler {
	return &SettingsHandler{
		settingsRepo: settingsRepo,
		employeeRepo: employeeRepo,
	}
}

// GetSettings returns the company settings
func (h *SettingsHandler) GetSettings(c *gin.Context) {
	ctx := c.Request.Context()
	settings, err := h.settingsRepo.GetSettings(ctx)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if settings == nil {
		settings = &models.Settings{}
	}
	c.JSON(http.StatusOK, gin.H{"settings": settings})
}

type UpdateSettingsRequest struct {
	CompanyName       string          `json:"companyName"`
	CompanyPhone      string          `json:"companyPhone"`
	CompanyEmail      string          `json:"companyEmail"`
	CompanyAddress    *models.Address `json:"companyAddress"`
	WarrantyTerms     string          `json:"warrantyTerms"`
	DeliveryCostPerKm float64         `json:"deliveryCostPerKm"`
}

// UpdateSettings creates or updates the company settings
func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	var req UpdateSettingsRequest
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

	// Determine updatedBy
	updatedBy := currentEmployee.ID

	settings := &models.Settings{
		CompanyName:       req.CompanyName,
		CompanyPhone:      req.CompanyPhone,
		CompanyEmail:      req.CompanyEmail,
		CompanyAddress:    req.CompanyAddress,
		WarrantyTerms:     req.WarrantyTerms,
		DeliveryCostPerKm: req.DeliveryCostPerKm,
	}

	result, err := h.settingsRepo.UpsertSettings(ctx, settings, updatedBy)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"settings": result})
}
