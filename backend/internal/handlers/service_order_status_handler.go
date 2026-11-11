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

	changed, err := h.orderRepo.UpdateStatus(ctx, id, previous, req.Status, actor.ID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if !changed {
		utils.RespondWithConflict(c, utils.ErrStatusConflict)
		return
	}

	order.Status = req.Status
	order.StatusChangedBy = actor.ID
	h.recordHistory(c, order, previous, req.Status, strings.TrimSpace(req.Notes), actor)
	h.populateDetails(c, order)
	h.notifyStatus(order)

	c.JSON(http.StatusOK, gin.H{"order": order})
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
