package handlers

import (
	"net/http"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type AddCashMovementRequest struct {
	BranchID    string                  `json:"branchId,omitempty"`
	Type        models.CashMovementType `json:"type" binding:"required"`
	Kind        models.CashMovementKind `json:"kind" binding:"required"`
	Description string                  `json:"description,omitempty"`
	Method      models.PaymentMethod    `json:"method" binding:"required"`
	Amount      float64                 `json:"amount" binding:"required,gt=0"`
	RefType     string                  `json:"refType,omitempty"`
	RefID       string                  `json:"refId,omitempty"`
}

// AddMovement registra um lançamento na sessão aberta da filial.
// Venda e recebimentos de OS exigem cash.sale; sangria/reforço/outros exigem cash.movement.
func (h *CashHandler) AddMovement(c *gin.Context) {
	var req AddCashMovementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}
	if msg := validateCashMovement(&req); msg != "" {
		utils.RespondWithBadRequest(c, msg)
		return
	}
	if !isSaleKind(req.Kind) && !hasCashManagePermission(c) {
		utils.RespondWithForbidden(c, "")
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
	branchID, err := resolveBranchID(ctx, h.branchRepo, req.BranchID)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrBranchNotFound)
		return
	}
	session, err := h.cashRepo.GetOpenByBranch(ctx, branchID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if session == nil {
		utils.RespondWithBadRequest(c, utils.ErrCashNotOpen)
		return
	}

	movement := &models.CashMovement{
		SessionID:   session.ID,
		BranchID:    branchID,
		Type:        req.Type,
		Kind:        req.Kind,
		Description: req.Description,
		Method:      req.Method,
		Amount:      roundMoney(req.Amount),
		RefType:     req.RefType,
		RefID:       refID,
		CreatedBy:   actor.ID,
	}
	if err := h.cashRepo.CreateMovement(ctx, movement); err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"movement": movement})
}

func isSaleKind(kind models.CashMovementKind) bool {
	return kind == models.CashKindSale || kind == models.CashKindOSDeposit || kind == models.CashKindOSBalance
}

// validateCashMovement valida coerência entre tipo, categoria e forma de pagamento
func validateCashMovement(req *AddCashMovementRequest) string {
	if req.Type != models.CashIn && req.Type != models.CashOut {
		return utils.ErrInvalidRequest
	}
	if !models.IsValidCashKind(req.Kind) {
		return utils.ErrInvalidRequest
	}
	if !models.IsValidPaymentMethod(req.Method) {
		return utils.ErrInvalidPaymentMethod
	}
	if isSaleKind(req.Kind) && req.Type != models.CashIn {
		return "Vendas e recebimentos de OS devem ser lançados como entrada"
	}
	if req.Kind == models.CashKindWithdraw && req.Type != models.CashOut {
		return "Sangria deve ser lançada como saída"
	}
	return ""
}
