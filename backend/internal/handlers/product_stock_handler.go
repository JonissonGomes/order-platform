package handlers

import (
	"net/http"
	"strings"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type AdjustStockRequest struct {
	// Type: in (entrada), out (saída), adjust (define a quantidade absoluta),
	// sale (venda) ou os_consume (consumo em ordem de serviço)
	Type     models.InventoryMovementType `json:"type" binding:"required"`
	Qty      int                          `json:"qty" binding:"gte=0"`
	UnitCost float64                      `json:"unitCost,omitempty"`
	RefType  string                       `json:"refType,omitempty"`
	RefID    string                       `json:"refId,omitempty"`
	Note     string                       `json:"note,omitempty"`
}

// AdjustStock altera o estoque de forma atômica e registra a movimentação
func (h *ProductHandler) AdjustStock(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req AdjustStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}
	if !models.IsValidMovementType(req.Type) || (req.Type != models.MovementAdjust && req.Qty == 0) {
		utils.RespondWithBadRequest(c, utils.ErrInvalidQuantity)
		return
	}
	refID, err := parseOptionalID(req.RefID)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}
	actor := requireActor(c)
	if actor == nil {
		return
	}

	ctx := c.Request.Context()
	current, err := h.productRepo.GetProductByID(ctx, id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if current == nil {
		utils.RespondWithNotFound(c, utils.ErrProductNotFound)
		return
	}

	delta := stockDelta(req.Type, req.Qty, current.Qty)
	var updated *models.Product
	if req.Type == models.MovementAdjust {
		updated, err = h.productRepo.SetQty(ctx, id, req.Qty, actor.ID)
	} else {
		updated, err = h.productRepo.UpdateQty(ctx, id, delta, actor.ID)
	}
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if updated == nil {
		utils.RespondWithConflict(c, utils.ErrInsufficientStock)
		return
	}

	unitCost := req.UnitCost
	if unitCost == 0 {
		unitCost = current.Cost
	}
	movement := &models.InventoryMovement{
		BranchID:  current.BranchID,
		ProductID: id,
		Type:      req.Type,
		Qty:       delta,
		UnitCost:  unitCost,
		RefType:   strings.TrimSpace(req.RefType),
		RefID:     refID,
		Note:      req.Note,
		CreatedBy: actor.ID,
	}
	if err := h.movementRepo.Create(ctx, movement); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"product": updated, "movement": movement})
}

// ListMovements lista as movimentações de estoque de um produto
func (h *ProductHandler) ListMovements(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	_, limit, skip := parsePagination(c)

	movements, err := h.movementRepo.ListByProduct(c.Request.Context(), id, skip, limit)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"movements": movements})
}

// stockDelta calcula a variação (com sinal) de uma movimentação
func stockDelta(t models.InventoryMovementType, qty, currentQty int) int {
	switch t {
	case models.MovementIn:
		return qty
	case models.MovementAdjust:
		return qty - currentQty
	default: // out, sale, os_consume
		return -qty
	}
}