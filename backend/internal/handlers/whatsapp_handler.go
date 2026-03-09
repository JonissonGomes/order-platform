package handlers

import (
	"net/http"

	"order-platform/backend/internal/services"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type WhatsAppHandler struct {
	whatsappService *services.WhatsAppService
}

func NewWhatsAppHandler(whatsappService *services.WhatsAppService) *WhatsAppHandler {
	return &WhatsAppHandler{
		whatsappService: whatsappService,
	}
}

type SendMessageRequest struct {
	To      string `json:"to" binding:"required"`
	Message string `json:"message" binding:"required"`
}

type SendServiceOrderStatusRequest struct {
	To          string `json:"to" binding:"required"`
	OrderNumber string `json:"orderNumber" binding:"required"`
	Status      string `json:"status" binding:"required"`
	CustomerName string `json:"customerName" binding:"required"`
}

// SendMessage handles POST /api/whatsapp/send
func (h *WhatsAppHandler) SendMessage(c *gin.Context) {
	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	if err := h.whatsappService.SendMessage(req.To, req.Message); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Mensagem enviada com sucesso"})
}

// SendServiceOrderStatus handles POST /api/whatsapp/service-order-status
func (h *WhatsAppHandler) SendServiceOrderStatus(c *gin.Context) {
	var req SendServiceOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	if err := h.whatsappService.SendServiceOrderStatus(req.To, req.OrderNumber, req.Status, req.CustomerName); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Notificação enviada com sucesso"})
}
