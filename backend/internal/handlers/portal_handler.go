package handlers

import (
	"log"
	"net/http"
	"strings"
	"time"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PortalHandler expõe o acompanhamento público da ordem para o cliente
type PortalHandler struct {
	orderRepo    *repository.ServiceOrderRepository
	customerRepo *repository.CustomerRepository
	historyRepo  *repository.StatusHistoryRepository
}

func NewPortalHandler(
	orderRepo *repository.ServiceOrderRepository,
	customerRepo *repository.CustomerRepository,
	historyRepo *repository.StatusHistoryRepository,
) *PortalHandler {
	return &PortalHandler{orderRepo: orderRepo, customerRepo: customerRepo, historyRepo: historyRepo}
}

type PortalLookupRequest struct {
	OrderNumber string `json:"orderNumber" binding:"required"`
	PhoneLast4  string `json:"phoneLast4" binding:"required"`
}

type portalTimelineItem struct {
	Status      models.ServiceOrderStatus `json:"status"`
	StatusLabel string                    `json:"statusLabel"`
	At          time.Time                 `json:"at"`
}

type portalMessage struct {
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
}

type portalOrderResponse struct {
	OrderNumber   string                    `json:"orderNumber"`
	Status        models.ServiceOrderStatus `json:"status"`
	StatusLabel   string                    `json:"statusLabel"`
	Device        string                    `json:"device"`
	ServiceType   string                    `json:"serviceType,omitempty"`
	EstimatedCost float64                   `json:"estimatedCost,omitempty"`
	CreatedAt     time.Time                 `json:"createdAt"`
	UpdatedAt     time.Time                 `json:"updatedAt"`
	ExpectedAt    *time.Time                `json:"expectedAt,omitempty"`
	Timeline      []portalTimelineItem      `json:"timeline"`
	Messages      []portalMessage           `json:"messages"`
}

type PortalRespondRequest struct {
	OrderNumber string `json:"orderNumber" binding:"required"`
	PhoneLast4  string `json:"phoneLast4" binding:"required"`
	// approved | cancelled
	Decision string `json:"decision" binding:"required"`
}

// Lookup (público) retorna o andamento sanitizado da ordem, sem valores internos.
// Valida o número da ordem + 4 últimos dígitos do telefone do cliente; qualquer falha
// retorna a mesma resposta 404 para não revelar quais ordens existem.
func (h *PortalHandler) Lookup(c *gin.Context) {
	var req PortalLookupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	last4 := onlyDigits(req.PhoneLast4)
	if len(last4) != 4 {
		utils.RespondWithBadRequest(c, "Informe os 4 últimos dígitos do telefone")
		return
	}

	ctx := c.Request.Context()
	order, err := h.orderRepo.GetServiceOrderByOrderNumber(ctx, normalizeOrderNumber(req.OrderNumber))
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if order == nil {
		utils.RespondWithNotFound(c, utils.ErrPortalNotFound)
		return
	}

	customer, err := h.customerRepo.GetCustomerByID(ctx, order.CustomerID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if customer == nil || !phoneEndsWith(customer.Phone, last4) {
		utils.RespondWithNotFound(c, utils.ErrPortalNotFound)
		return
	}

	history, err := h.historyRepo.GetStatusHistoryByServiceOrderID(ctx, order.ID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"order": buildPortalResponse(order, history)})
}

// Respond permite ao cliente aprovar ou recusar o orçamento (status evaluating).
func (h *PortalHandler) Respond(c *gin.Context) {
	var req PortalRespondRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}
	last4 := onlyDigits(req.PhoneLast4)
	if len(last4) != 4 {
		utils.RespondWithBadRequest(c, "Informe os 4 últimos dígitos do telefone")
		return
	}

	var next models.ServiceOrderStatus
	var note string
	switch strings.ToLower(strings.TrimSpace(req.Decision)) {
	case "approved", "aprovar", "aprovado":
		next = models.StatusApproved
		note = "Orçamento aprovado pelo cliente no portal."
	case "cancelled", "recusar", "cancelado", "rejected":
		next = models.StatusCancelled
		note = "Orçamento recusado pelo cliente no portal."
	default:
		utils.RespondWithBadRequest(c, "Decisão inválida")
		return
	}

	ctx := c.Request.Context()
	order, err := h.orderRepo.GetServiceOrderByOrderNumber(ctx, normalizeOrderNumber(req.OrderNumber))
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if order == nil {
		utils.RespondWithNotFound(c, utils.ErrPortalNotFound)
		return
	}

	customer, err := h.customerRepo.GetCustomerByID(ctx, order.CustomerID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if customer == nil || !phoneEndsWith(customer.Phone, last4) {
		utils.RespondWithNotFound(c, utils.ErrPortalNotFound)
		return
	}

	if order.Status != models.StatusEvaluating {
		utils.RespondWithBadRequest(c, "Esta ordem não está aguardando aprovação")
		return
	}
	if !models.IsValidStatusTransition(order.Status, next) {
		utils.RespondWithBadRequest(c, utils.ErrInvalidStatusTransition)
		return
	}

	previous := order.Status
	changed, err := h.orderRepo.UpdateStatus(ctx, order.ID, previous, next, primitive.NilObjectID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if !changed {
		utils.RespondWithConflict(c, utils.ErrStatusConflict)
		return
	}

	entry := &models.StatusHistory{
		ServiceOrderID: order.ID,
		PreviousStatus: previous,
		NewStatus:      next,
		Notes:          note,
	}
	if err := h.historyRepo.CreateStatusHistory(ctx, entry); err != nil {
		log.Printf("Warning: portal respond history for %s: %v", order.OrderNumber, err)
	}

	order.Status = next
	history, err := h.historyRepo.GetStatusHistoryByServiceOrderID(ctx, order.ID)
	if err != nil {
		history = nil
	}
	c.JSON(http.StatusOK, gin.H{"order": buildPortalResponse(order, history)})
}

func buildPortalResponse(order *models.ServiceOrder, history []*models.StatusHistory) portalOrderResponse {
	device := order.DeviceLabel
	if device == "" {
		device = deviceLabel(order.ProductBrand, order.ProductModel)
	}

	// O repositório retorna o histórico do mais recente ao mais antigo; a linha do tempo é cronológica
	timeline := make([]portalTimelineItem, 0, len(history))
	for i := len(history) - 1; i >= 0; i-- {
		timeline = append(timeline, portalTimelineItem{
			Status:      history[i].NewStatus,
			StatusLabel: models.StatusLabel(history[i].NewStatus),
			At:          history[i].ChangedAt,
		})
	}

	messages := make([]portalMessage, 0)
	for _, note := range order.Notes {
		if note.IsPublic {
			messages = append(messages, portalMessage{Content: note.Content, CreatedAt: note.CreatedAt})
		}
	}

	resp := portalOrderResponse{
		OrderNumber: order.OrderNumber,
		Status:      order.Status,
		StatusLabel: models.StatusLabel(order.Status),
		Device:      device,
		ServiceType: order.ServiceType,
		CreatedAt:   order.CreatedAt,
		UpdatedAt:   order.UpdatedAt,
		ExpectedAt:  order.ExpectedAt,
		Timeline:    timeline,
		Messages:    messages,
	}
	// Orçamento só na etapa de aprovação (evita expor valores em outros status)
	if order.Status == models.StatusEvaluating && order.EstimatedCost > 0 {
		resp.EstimatedCost = order.EstimatedCost
	}
	return resp
}

// normalizeOrderNumber normaliza códigos novos (alfanuméricos) e mantém
// compatibilidade com OS legadas "OS-1048" / "1048".
func normalizeOrderNumber(raw string) string {
	value := strings.ToUpper(strings.TrimSpace(raw))
	value = strings.TrimPrefix(value, "#")
	value = strings.ReplaceAll(value, " ", "")
	value = strings.ReplaceAll(value, "-", "")

	// Legado: só dígitos → OS-NNNN
	if digits := onlyDigits(value); digits != "" && digits == value {
		return "OS-" + digits
	}
	// Legado: "OS1048" → "OS-1048"
	if strings.HasPrefix(value, "OS") {
		rest := strings.TrimPrefix(value, "OS")
		if digits := onlyDigits(rest); digits != "" && digits == rest {
			return "OS-" + digits
		}
	}
	return value
}

func phoneEndsWith(phone, last4 string) bool {
	digits := onlyDigits(phone)
	return len(digits) >= 4 && strings.HasSuffix(digits, last4)
}
