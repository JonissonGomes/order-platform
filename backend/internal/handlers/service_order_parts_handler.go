package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CloseoutRequest struct {
	TechnicalReport string  `json:"technicalReport"`
	Resolution      string  `json:"resolution"`
	LaborOnly       bool    `json:"laborOnly"`
	LaborCost       float64 `json:"laborCost"`
}

type AddPartRequest struct {
	ProductID string `json:"productId" binding:"required"`
	Qty       int    `json:"qty" binding:"required,gte=1"`
}

func orderAllowsCloseoutEdit(status models.ServiceOrderStatus) bool {
	switch status {
	case models.StatusDelivered, models.StatusCancelled, models.StatusUnrepairable:
		return false
	default:
		return true
	}
}

func orderAllowsPartAdd(status models.ServiceOrderStatus) bool {
	return orderAllowsCloseoutEdit(status)
}

// UpdateCloseout salva parecer, resolução, mão de obra e flag “só mão de obra”.
func (h *ServiceOrderHandler) UpdateCloseout(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req CloseoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
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
	if !orderAllowsCloseoutEdit(order.Status) {
		utils.RespondWithBadRequest(c, utils.ErrOrderClosed)
		return
	}

	report := strings.TrimSpace(req.TechnicalReport)
	resolution := strings.TrimSpace(req.Resolution)
	laborOnly := req.LaborOnly
	laborCost := req.LaborCost
	if laborCost < 0 {
		utils.RespondWithBadRequest(c, utils.ErrInvalidAmount)
		return
	}

	parts := order.Parts
	if laborOnly {
		if len(parts) > 0 {
			utils.RespondWithBadRequest(c, utils.ErrCloseoutLaborWithParts)
			return
		}
		parts = []models.ServiceOrderPart{}
	}

	finalCost := models.ComputeFinalCost(laborCost, parts)
	if err := h.orderRepo.UpdateCloseout(ctx, id, report, resolution, laborOnly, laborCost, finalCost, parts, actor.ID); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	order.TechnicalReport = report
	order.Resolution = resolution
	order.LaborOnly = laborOnly
	order.LaborCost = laborCost
	order.FinalCost = finalCost
	order.Parts = parts
	h.populateDetails(c, order)
	c.JSON(http.StatusOK, gin.H{"order": order})
}

// AddPart lança uma peça na OS (sem baixar estoque ainda).
func (h *ServiceOrderHandler) AddPart(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req AddPartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}
	productID, err := parseOptionalID(req.ProductID)
	if err != nil || productID.IsZero() {
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
	if !orderAllowsPartAdd(order.Status) {
		utils.RespondWithBadRequest(c, utils.ErrOrderClosed)
		return
	}
	if order.LaborOnly {
		utils.RespondWithBadRequest(c, utils.ErrCloseoutLaborWithParts)
		return
	}

	product, err := h.productRepo.GetProductByID(ctx, productID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if product == nil || !product.IsActive {
		utils.RespondWithNotFound(c, utils.ErrProductNotFound)
		return
	}

	part := &models.ServiceOrderPart{
		ID:        primitive.NewObjectID(),
		ProductID: product.ID,
		Name:      product.Name,
		SKU:       product.SKU,
		Barcode:   product.Barcode,
		Qty:       req.Qty,
		UnitPrice: product.Price,
		UnitCost:  product.Cost,
		Consumed:  false,
		CreatedAt: time.Now(),
		CreatedBy: actor.ID,
	}

	newParts := append(append([]models.ServiceOrderPart{}, order.Parts...), *part)
	finalCost := models.ComputeFinalCost(order.LaborCost, newParts)
	if err := h.orderRepo.PushPart(ctx, id, part, false, finalCost, actor.ID); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	order.Parts = newParts
	order.LaborOnly = false
	order.FinalCost = finalCost
	h.populateDetails(c, order)
	c.JSON(http.StatusOK, gin.H{"order": order, "part": part})
}

// RemovePart remove a peça; se já consumida, estorna o estoque.
func (h *ServiceOrderHandler) RemovePart(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	partID, ok := parseIDParam(c, "partId")
	if !ok {
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
	if order.Status == models.StatusCancelled {
		utils.RespondWithBadRequest(c, utils.ErrOrderClosed)
		return
	}

	idx := -1
	var removed models.ServiceOrderPart
	for i, p := range order.Parts {
		if p.ID == partID {
			idx = i
			removed = p
			break
		}
	}
	if idx < 0 {
		utils.RespondWithNotFound(c, utils.ErrPartNotFound)
		return
	}

	if removed.Consumed {
		if err := h.reversePartStock(ctx, order, removed, actor.ID); err != nil {
			if err == errInsufficientStock {
				utils.RespondWithConflict(c, utils.ErrInsufficientStock)
				return
			}
			utils.RespondWithInternalError(c)
			return
		}
	}

	newParts := append([]models.ServiceOrderPart{}, order.Parts[:idx]...)
	newParts = append(newParts, order.Parts[idx+1:]...)
	laborOnly := order.LaborOnly && len(newParts) == 0
	finalCost := models.ComputeFinalCost(order.LaborCost, newParts)

	if err := h.orderRepo.PullPart(ctx, id, partID, finalCost, laborOnly, actor.ID); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	order.Parts = newParts
	order.LaborOnly = laborOnly
	order.FinalCost = finalCost
	h.populateDetails(c, order)
	c.JSON(http.StatusOK, gin.H{"order": order})
}

var errInsufficientStock = fmt.Errorf("insufficient stock")

func validateDeliveryCloseout(order *models.ServiceOrder) string {
	if strings.TrimSpace(order.TechnicalReport) == "" || strings.TrimSpace(order.Resolution) == "" {
		return utils.ErrCloseoutIncomplete
	}
	if len(order.Parts) == 0 && !order.LaborOnly {
		return utils.ErrCloseoutPartsOrLabor
	}
	if order.LaborOnly && len(order.Parts) > 0 {
		return utils.ErrCloseoutLaborWithParts
	}
	return ""
}

// consumePendingParts baixa estoque (os_consume) das peças ainda não consumidas.
func (h *ServiceOrderHandler) consumePendingParts(ctx context.Context, order *models.ServiceOrder, actorID primitive.ObjectID) error {
	for i := range order.Parts {
		if order.Parts[i].Consumed {
			continue
		}
		if err := h.applyPartStock(ctx, order, order.Parts[i], models.MovementOSConsume, -order.Parts[i].Qty, actorID, "Consumo OS"); err != nil {
			return err
		}
		order.Parts[i].Consumed = true
	}
	order.FinalCost = models.ComputeFinalCost(order.LaborCost, order.Parts)
	return h.orderRepo.ReplacePartsAndFinalCost(ctx, order.ID, order.Parts, order.FinalCost, actorID)
}

// reverseConsumedParts estorna peças já consumidas (ex.: cancelamento).
func (h *ServiceOrderHandler) reverseConsumedParts(ctx context.Context, order *models.ServiceOrder, actorID primitive.ObjectID) error {
	changed := false
	for i := range order.Parts {
		if !order.Parts[i].Consumed {
			continue
		}
		if err := h.reversePartStock(ctx, order, order.Parts[i], actorID); err != nil {
			return err
		}
		order.Parts[i].Consumed = false
		changed = true
	}
	if !changed {
		return nil
	}
	order.FinalCost = models.ComputeFinalCost(order.LaborCost, order.Parts)
	return h.orderRepo.ReplacePartsAndFinalCost(ctx, order.ID, order.Parts, order.FinalCost, actorID)
}

func (h *ServiceOrderHandler) reversePartStock(
	ctx context.Context,
	order *models.ServiceOrder,
	part models.ServiceOrderPart,
	actorID primitive.ObjectID,
) error {
	return h.applyPartStock(ctx, order, part, models.MovementIn, part.Qty, actorID, "Estorno consumo OS")
}

func (h *ServiceOrderHandler) applyPartStock(
	ctx context.Context,
	order *models.ServiceOrder,
	part models.ServiceOrderPart,
	movType models.InventoryMovementType,
	delta int,
	actorID primitive.ObjectID,
	note string,
) error {
	updated, err := h.productRepo.UpdateQty(ctx, part.ProductID, delta, actorID)
	if err != nil {
		return err
	}
	if updated == nil {
		return errInsufficientStock
	}
	movement := &models.InventoryMovement{
		BranchID:  updated.BranchID,
		ProductID: part.ProductID,
		Type:      movType,
		Qty:       delta,
		UnitCost:  part.UnitCost,
		RefType:   "service_order",
		RefID:     order.ID,
		Note:      fmt.Sprintf("%s #%s — %s", note, order.OrderNumber, part.Name),
		CreatedBy: actorID,
	}
	return h.movementRepo.Create(ctx, movement)
}
