package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UpdateStatusRequest struct {
	Status models.ServiceOrderStatus `json:"status" binding:"required"`
	Notes  string                    `json:"notes,omitempty"`
	// Obrigatório na entrega quando houver valor a receber no caixa.
	PaymentMethod models.PaymentMethod `json:"paymentMethod,omitempty"`
}

type AddNoteRequest struct {
	Content  string `json:"content" binding:"required"`
	IsPublic bool   `json:"isPublic,omitempty"`
}

type AssignRequest struct {
	EmployeeID string `json:"employeeId" binding:"required"`
}

// UpdateStatus altera o status validando transição e permissão, e grava o histórico
func (h *ServiceOrderHandler) UpdateStatus(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}
	if !models.IsValidStatus(req.Status) {
		utils.RespondWithBadRequest(c, utils.ErrInvalidStatus)
		return
	}
	actor := requireActor(c)
	if actor == nil {
		return
	}

	ctx := c.Request.Context()
	order, err := h.orderRepo.GetServiceOrderByID(ctx, id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if order == nil {
		utils.RespondWithNotFound(c, utils.ErrOrderNotFound)
		return
	}

	previous := order.Status
	if !models.IsValidStatusTransition(previous, req.Status) {
		utils.RespondWithBadRequest(c, utils.ErrInvalidStatusTransition)
		return
	}
	if !actor.CanChangeStatus(req.Status) {
		utils.RespondWithForbidden(c, utils.ErrStatusChangeForbidden)
		return
	}

	// Gate de entrega: laudo + peças ou “só mão de obra”; baixa estoque em ready/delivered.
	if req.Status == models.StatusReady || req.Status == models.StatusDelivered {
		if msg := validateDeliveryCloseout(order); msg != "" {
			utils.RespondWithBadRequest(c, msg)
			return
		}
	}

	// Pré-valida caixa antes de baixar estoque (evita consumo sem recebimento).
	var deliveryDue float64
	var deliverySession *models.CashSession
	var deliveryBranch primitive.ObjectID
	if req.Status == models.StatusDelivered {
		due, session, branchID, status, msg := h.prepareDeliveryPayment(ctx, order, req.PaymentMethod)
		if status != 0 {
			utils.RespondWithError(c, status, msg)
			return
		}
		deliveryDue = due
		deliverySession = session
		deliveryBranch = branchID
	}

	if req.Status == models.StatusReady || req.Status == models.StatusDelivered {
		if err := h.consumePendingParts(ctx, order, actor.ID); err != nil {
			if err == errInsufficientStock {
				utils.RespondWithConflict(c, utils.ErrInsufficientStock)
				return
			}
			utils.RespondWithInternalError(c)
			return
		}
	}

	// Entrega: lança no caixa o valor ainda não recebido desta OS (recalcula após consumo).
	if req.Status == models.StatusDelivered && deliverySession != nil {
		due := deliveryDue
		if realized := orderRealizedAmount(order); realized > 0 {
			already, err := h.cashRepo.SumInByRef(ctx, cashRefServiceOrder, order.ID)
			if err != nil {
				utils.RespondWithInternalError(c)
				return
			}
			due = roundMoney(realized - already)
		}
		if due > 0 {
			if status, msg := h.postDeliveryPayment(ctx, order, actor.ID, req.PaymentMethod, due, deliverySession, deliveryBranch); status != 0 {
				utils.RespondWithError(c, status, msg)
				return
			}
		}
	}

	// Cancelamento: estorna peças já consumidas.
	if req.Status == models.StatusCancelled {
		if err := h.reverseConsumedParts(ctx, order, actor.ID); err != nil {
			utils.RespondWithInternalError(c)
			return
		}
	}

	changed, err := h.orderRepo.UpdateStatus(ctx, id, previous, req.Status, actor.ID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if !changed {
		utils.RespondWithConflict(c, utils.ErrStatusConflict)
		return
	}

	now := time.Now()
	order.Status = req.Status
	order.StatusChangedBy = actor.ID
	order.StatusChangedAt = now
	if req.Status == models.StatusDelivered {
		order.DeliveredAt = &now
	}
	h.recordHistory(c, order, previous, req.Status, strings.TrimSpace(req.Notes), actor)
	h.populateDetails(c, order)
	h.notifyStatus(order)

	c.JSON(http.StatusOK, gin.H{"order": order})
}

const cashRefServiceOrder = "service_order"

func orderRealizedAmount(order *models.ServiceOrder) float64 {
	if order.FinalCost > 0 {
		return order.FinalCost
	}
	return order.EstimatedCost
}

// prepareDeliveryPayment calcula o saldo a receber e exige caixa aberto + forma de pagamento.
func (h *ServiceOrderHandler) prepareDeliveryPayment(
	ctx context.Context,
	order *models.ServiceOrder,
	method models.PaymentMethod,
) (due float64, session *models.CashSession, branchID primitive.ObjectID, status int, msg string) {
	if h.cashRepo == nil {
		return 0, nil, primitive.NilObjectID, 0, ""
	}

	realized := orderRealizedAmount(order)
	if realized <= 0 {
		return 0, nil, primitive.NilObjectID, 0, ""
	}

	already, err := h.cashRepo.SumInByRef(ctx, cashRefServiceOrder, order.ID)
	if err != nil {
		return 0, nil, primitive.NilObjectID, http.StatusInternalServerError, utils.ErrInternalServer
	}
	due = roundMoney(realized - already)
	if due <= 0 {
		return 0, nil, primitive.NilObjectID, 0, ""
	}

	if !models.IsValidPaymentMethod(method) {
		return 0, nil, primitive.NilObjectID, http.StatusBadRequest,
			"Informe a forma de pagamento para registrar o recebimento no caixa"
	}

	branchID = order.BranchID
	if branchID.IsZero() {
		bid, berr := resolveBranchID(ctx, h.branchRepo, "")
		if berr != nil {
			return 0, nil, primitive.NilObjectID, http.StatusBadRequest, utils.ErrBranchNotFound
		}
		branchID = bid
	}

	session, err = h.cashRepo.GetOpenByBranch(ctx, branchID)
	if err != nil {
		return 0, nil, primitive.NilObjectID, http.StatusInternalServerError, utils.ErrInternalServer
	}
	if session == nil {
		return 0, nil, primitive.NilObjectID, http.StatusBadRequest, utils.ErrCashNotOpen
	}
	return due, session, branchID, 0, ""
}

func (h *ServiceOrderHandler) postDeliveryPayment(
	ctx context.Context,
	order *models.ServiceOrder,
	actorID primitive.ObjectID,
	method models.PaymentMethod,
	due float64,
	session *models.CashSession,
	branchID primitive.ObjectID,
) (int, string) {
	movement := &models.CashMovement{
		SessionID:   session.ID,
		BranchID:    branchID,
		Type:        models.CashIn,
		Kind:        models.CashKindOSBalance,
		Description: fmt.Sprintf("Recebimento OS %s", order.OrderNumber),
		Method:      method,
		Amount:      due,
		RefType:     cashRefServiceOrder,
		RefID:       order.ID,
		CreatedBy:   actorID,
	}
	if err := h.cashRepo.CreateMovement(ctx, movement); err != nil {
		return http.StatusInternalServerError, utils.ErrInternalServer
	}
	return 0, ""
}

// AddNote adiciona uma nota (interna ou pública) à ordem
func (h *ServiceOrderHandler) AddNote(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req AddNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}
	content := strings.TrimSpace(req.Content)
	if content == "" {
		utils.RespondWithBadRequest(c, "")
		return
	}
	actor := requireActor(c)
	if actor == nil {
		return
	}

	ctx := c.Request.Context()
	order, err := h.orderRepo.GetServiceOrderByID(ctx, id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if order == nil {
		utils.RespondWithNotFound(c, utils.ErrOrderNotFound)
		return
	}

	note := &models.Note{Content: content, IsPublic: req.IsPublic, CreatedBy: actor.ID}
	if err := h.orderRepo.AddNote(ctx, id, note, actor.ID); err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"note": note})
}

// Assign atribui a ordem a um colaborador ativo
func (h *ServiceOrderHandler) Assign(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req AssignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}
	employeeID, err := primitive.ObjectIDFromHex(req.EmployeeID)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}
	actor := requireActor(c)
	if actor == nil {
		return
	}

	ctx := c.Request.Context()
	order, err := h.orderRepo.GetServiceOrderByID(ctx, id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if order == nil {
		utils.RespondWithNotFound(c, utils.ErrOrderNotFound)
		return
	}

	assignee, err := h.employeeRepo.GetEmployeeByID(ctx, employeeID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if assignee == nil || !assignee.IsActive {
		utils.RespondWithBadRequest(c, utils.ErrEmployeeNotFound)
		return
	}

	if err := h.orderRepo.AssignTo(ctx, id, employeeID, actor.ID); err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	order.AssignedTo = employeeID
	order.AssignedEmployee = assignee
	order.StatusLabel = models.StatusLabel(order.Status)
	c.JSON(http.StatusOK, gin.H{"order": order})
}

// notifyStatus avisa o cliente da mudança de status sem bloquear a requisição
func (h *ServiceOrderHandler) notifyStatus(order *models.ServiceOrder) {
	if order.Customer == nil || order.Customer.Phone == "" {
		return
	}
	orderNumber, phone := order.OrderNumber, order.Customer.Phone
	message := fmt.Sprintf("Olá, %s! Sua ordem %s agora está: %s.",
		order.Customer.Name, orderNumber, models.StatusLabel(order.Status))

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := h.notifier.NotifyStatus(ctx, orderNumber, phone, message); err != nil {
			log.Printf("Warning: failed to notify status for order %s: %v", orderNumber, err)
		}
	}()
}
