package handlers

import (
	"net/http"

	"order-platform/backend/internal/services"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type NFEHandler struct {
	nfeService *services.NFEService
}

func NewNFEHandler(nfeService *services.NFEService) *NFEHandler {
	return &NFEHandler{
		nfeService: nfeService,
	}
}

type EmitNFERequest struct {
	OrderID string                    `json:"orderId" binding:"required"`
	Items   []services.NFEItem        `json:"items" binding:"required"`
}

// EmitNFE handles POST /api/nfe/emit
func (h *NFEHandler) EmitNFE(c *gin.Context) {
	var req EmitNFERequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	// TODO: Get order and customer data from database
	// For now, return not implemented
	c.JSON(http.StatusNotImplemented, gin.H{
		"message": "Emissão de NF-e ainda não implementada completamente. Requer dados da ordem e cliente.",
	})
}

// GetNFEStatus handles GET /api/nfe/:accessKey/status
func (h *NFEHandler) GetNFEStatus(c *gin.Context) {
	accessKey := c.Param("accessKey")

	status, err := h.nfeService.GetNFEStatus(accessKey)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": status})
}

// CancelNFE handles POST /api/nfe/:accessKey/cancel
func (h *NFEHandler) CancelNFE(c *gin.Context) {
	accessKey := c.Param("accessKey")

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	if err := h.nfeService.CancelNFE(accessKey, req.Reason); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "NF-e cancelada com sucesso"})
}
