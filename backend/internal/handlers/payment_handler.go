package handlers

import (
	"net/http"

	"order-platform/backend/internal/services"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PaymentHandler struct {
	paymentService *services.PaymentService
}

func NewPaymentHandler(paymentService *services.PaymentService) *PaymentHandler {
	return &PaymentHandler{
		paymentService: paymentService,
	}
}

type CreatePaymentRequest struct {
	Amount      float64            `json:"amount" binding:"required,gt=0"`
	Currency    string             `json:"currency" binding:"required"`
	Description string             `json:"description" binding:"required"`
	OrderID     string             `json:"orderId" binding:"required"`
	CustomerID  string             `json:"customerId" binding:"required"`
	Metadata    map[string]string  `json:"metadata,omitempty"`
}

type CreatePaymentResponse struct {
	PaymentID   string  `json:"paymentId"`
	PaymentLink string  `json:"paymentLink"`
	Status      string  `json:"status"`
	Amount      float64 `json:"amount"`
}

// CreatePayment handles POST /api/payments/create
func (h *PaymentHandler) CreatePayment(c *gin.Context) {
	var req CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	orderID, err := primitive.ObjectIDFromHex(req.OrderID)
	if err != nil {
		utils.RespondWithBadRequest(c, "ID da ordem inválido")
		return
	}

	customerID, err := primitive.ObjectIDFromHex(req.CustomerID)
	if err != nil {
		utils.RespondWithBadRequest(c, "ID do cliente inválido")
		return
	}

	paymentReq := services.PaymentRequest{
		Amount:      req.Amount,
		Currency:    req.Currency,
		Description: req.Description,
		OrderID:     orderID,
		CustomerID:  customerID,
		Metadata:    req.Metadata,
	}

	payment, err := h.paymentService.CreatePayment(paymentReq)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"payment": CreatePaymentResponse{
			PaymentID:   payment.PaymentID,
			PaymentLink: payment.PaymentLink,
			Status:      payment.Status,
			Amount:      payment.Amount,
		},
	})
}

// GetPaymentStatus handles GET /api/payments/:id/status
func (h *PaymentHandler) GetPaymentStatus(c *gin.Context) {
	paymentID := c.Param("id")

	status, err := h.paymentService.GetPaymentStatus(paymentID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": status})
}

// Webhook handles POST /api/payments/webhook/:provider
func (h *PaymentHandler) Webhook(c *gin.Context) {
	_ = c.Param("provider") // provider parameter for future implementation

	// TODO: Implement webhook handling for payment confirmations
	// This would verify the webhook signature and update the payment status in the database

	c.JSON(http.StatusOK, gin.H{"message": "Webhook received"})
}
