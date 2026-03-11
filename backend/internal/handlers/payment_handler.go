package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/services"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PaymentHandler struct {
	paymentService   *services.PaymentService
	serviceOrderRepo *repository.ServiceOrderRepository
}

func NewPaymentHandler(paymentService *services.PaymentService, serviceOrderRepo *repository.ServiceOrderRepository) *PaymentHandler {
	return &PaymentHandler{
		paymentService:   paymentService,
		serviceOrderRepo: serviceOrderRepo,
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

	// Garantir que orderID está nos metadados para o webhook
	if req.Metadata == nil {
		req.Metadata = make(map[string]string)
	}
	req.Metadata["order_id"] = orderID.Hex()

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
	provider := c.Param("provider")
	
	if provider != "mercadopago" {
		utils.RespondWithBadRequest(c, "Provedor de pagamento não suportado")
		return
	}

	// Mercado Pago webhook payload
	var webhookData map[string]interface{}
	if err := c.ShouldBindJSON(&webhookData); err != nil {
		log.Printf("Webhook: Erro ao decodificar JSON: %v", err)
		utils.RespondWithBadRequest(c, "Payload inválido")
		return
	}

	// Mercado Pago envia diferentes tipos de notificações
	// Verificar se é uma notificação de pagamento
	data, ok := webhookData["data"].(map[string]interface{})
	if !ok {
		// Pode ser um formato diferente, tentar pegar diretamente
		data = webhookData
	}

	// Extrair ID do pagamento
	var paymentID string
	if idStr, ok := data["id"].(string); ok {
		paymentID = idStr
	} else if idNum, ok := data["id"].(float64); ok {
		paymentID = fmt.Sprintf("%.0f", idNum)
	} else {
		log.Printf("Webhook: ID do pagamento não encontrado no payload: %v", webhookData)
		c.JSON(http.StatusOK, gin.H{"message": "Webhook recebido, mas ID do pagamento não encontrado"})
		return
	}

	// Buscar status do pagamento no Mercado Pago
	ctx := c.Request.Context()
	paymentStatus, err := h.paymentService.GetPaymentStatus(paymentID)
	if err != nil {
		log.Printf("Webhook: Erro ao buscar status do pagamento %s: %v", paymentID, err)
		c.JSON(http.StatusOK, gin.H{"message": "Webhook recebido, mas erro ao verificar status"})
		return
	}

	// Se o pagamento foi aprovado, atualizar a ordem de serviço
	if paymentStatus.Status == "paid" {
		// Buscar ordem de serviço pelo paymentID nos metadados
		// O paymentID pode estar armazenado nos metadados da ordem ou precisamos de outra forma de relacionar
		// Por enquanto, vamos buscar por metadata ou criar um campo paymentID na ordem
		
		// Verificar se há orderID nos metadados do webhook
		var orderID primitive.ObjectID
		if metadata, ok := data["metadata"].(map[string]interface{}); ok {
			if orderIDStr, ok := metadata["order_id"].(string); ok {
				var err error
				orderID, err = primitive.ObjectIDFromHex(orderIDStr)
				if err != nil {
					log.Printf("Webhook: ID da ordem inválido: %s", orderIDStr)
					c.JSON(http.StatusOK, gin.H{"message": "Webhook recebido, mas ID da ordem inválido"})
					return
				}
			}
		}

		// Se não encontrou orderID nos metadados, tentar buscar por paymentID armazenado
		// Por enquanto, vamos apenas logar e retornar sucesso
		// TODO: Implementar busca de ordem por paymentID se necessário
		
		if !orderID.IsZero() {
			order, err := h.serviceOrderRepo.GetServiceOrderByID(ctx, orderID)
			if err != nil {
				log.Printf("Webhook: Erro ao buscar ordem %s: %v", orderID.Hex(), err)
				c.JSON(http.StatusOK, gin.H{"message": "Webhook recebido, mas erro ao buscar ordem"})
				return
			}

			if order != nil {
				// Atualizar status de pagamento
				if order.Payment.Paid != true {
					order.Payment.Paid = true
					order.UpdatedAt = time.Now()
					
					if err := h.serviceOrderRepo.UpdateServiceOrder(ctx, orderID, order); err != nil {
						log.Printf("Webhook: Erro ao atualizar ordem %s: %v", orderID.Hex(), err)
						c.JSON(http.StatusOK, gin.H{"message": "Webhook recebido, mas erro ao atualizar ordem"})
						return
					}

					log.Printf("Webhook: Pagamento confirmado para ordem %s (paymentID: %s)", order.OrderNumber, paymentID)
				}
			}
		} else {
			log.Printf("Webhook: Pagamento confirmado (paymentID: %s), mas orderID não encontrado nos metadados", paymentID)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Webhook processado com sucesso"})
}
