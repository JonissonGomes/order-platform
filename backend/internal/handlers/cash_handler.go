package handlers

import (
	"math"
	"net/http"

	"order-platform/backend/internal/middleware"
	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type CashHandler struct {
	cashRepo   *repository.CashSessionRepository
	branchRepo *repository.BranchRepository
}

func NewCashHandler(cashRepo *repository.CashSessionRepository, branchRepo *repository.BranchRepository) *CashHandler {
	return &CashHandler{cashRepo: cashRepo, branchRepo: branchRepo}
}

type OpenCashRequest struct {
	BranchID     string  `json:"branchId,omitempty"`
	OpeningFloat float64 `json:"openingFloat" binding:"gte=0"`
	Notes        string  `json:"notes,omitempty"`
}

type CloseCashRequest struct {
	BranchID       string  `json:"branchId,omitempty"`
	ClosingCounted float64 `json:"closingCounted" binding:"gte=0"`
	Notes          string  `json:"notes,omitempty"`
}

// CashSummary resume os lançamentos de uma sessão
type CashSummary struct {
	TotalsByMethod map[models.PaymentMethod]float64 `json:"totalsByMethod"` // entradas - saídas por forma de pagamento
	TotalIn        float64                          `json:"totalIn"`
	TotalOut       float64                          `json:"totalOut"`
	ExpectedCash   float64                          `json:"expectedCash"` // fundo inicial + dinheiro em espécie líquido
}

// GetOpenSession retorna a sessão aberta da filial com o resumo (session = null se fechada)
func (h *CashHandler) GetOpenSession(c *gin.Context) {
	ctx := c.Request.Context()
	branchID, err := resolveBranchID(ctx, h.branchRepo, c.Query("branchId"))
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
		c.JSON(http.StatusOK, gin.H{"session": nil})
		return
	}

	movements, err := h.cashRepo.ListMovements(ctx, session.ID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"session": session, "summary": summarizeCash(session, movements)})
}

// OpenSession abre o caixa da filial (apenas uma sessão aberta por filial)
func (h *CashHandler) OpenSession(c *gin.Context) {
	var req OpenCashRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
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

	existing, err := h.cashRepo.GetOpenByBranch(ctx, branchID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if existing != nil {
		utils.RespondWithConflict(c, utils.ErrCashAlreadyOpen)
		return
	}

	session := &models.CashSession{
		BranchID:     branchID,
		OpenedBy:     actor.ID,
		OpeningFloat: req.OpeningFloat,
		Notes:        req.Notes,
	}
	if err := h.cashRepo.CreateSession(ctx, session); err != nil {
		if isDuplicateKey(err) { // corrida entre duas aberturas simultâneas
			utils.RespondWithConflict(c, utils.ErrCashAlreadyOpen)
			return
		}
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"session": session})
}

// CloseSession fecha o caixa calculando o esperado e a diferença
func (h *CashHandler) CloseSession(c *gin.Context) {
	var req CloseCashRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
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

	movements, err := h.cashRepo.ListMovements(ctx, session.ID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	summary := summarizeCash(session, movements)

	counted := roundMoney(req.ClosingCounted)
	difference := roundMoney(counted - summary.ExpectedCash)
	session.ClosedBy = actor.ID
	session.ClosingCounted = &counted
	session.ExpectedTotal = &summary.ExpectedCash
	session.Difference = &difference
	if req.Notes != "" {
		session.Notes = req.Notes
	}

	closed, err := h.cashRepo.Close(ctx, session)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if closed == nil { // já fechado por outra requisição
		utils.RespondWithBadRequest(c, utils.ErrCashNotOpen)
		return
	}
	c.JSON(http.StatusOK, gin.H{"session": closed, "summary": summary})
}

// ListSessionMovements lista os lançamentos de uma sessão
func (h *CashHandler) ListSessionMovements(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	ctx := c.Request.Context()

	session, err := h.cashRepo.GetSessionByID(ctx, id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if session == nil {
		utils.RespondWithNotFound(c, "")
		return
	}
	movements, err := h.cashRepo.ListMovements(ctx, id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"session": session, "movements": movements, "summary": summarizeCash(session, movements)})
}

// summarizeCash calcula totais por forma de pagamento e o dinheiro esperado em caixa
func summarizeCash(session *models.CashSession, movements []*models.CashMovement) CashSummary {
	summary := CashSummary{TotalsByMethod: map[models.PaymentMethod]float64{}, ExpectedCash: session.OpeningFloat}

	for _, m := range movements {
		signed := m.Amount
		if m.Type == models.CashOut {
			signed = -m.Amount
			summary.TotalOut += m.Amount
		} else {
			summary.TotalIn += m.Amount
		}
		summary.TotalsByMethod[m.Method] += signed
		if m.Method == models.PaymentCash {
			summary.ExpectedCash += signed
		}
	}

	summary.TotalIn = roundMoney(summary.TotalIn)
	summary.TotalOut = roundMoney(summary.TotalOut)
	summary.ExpectedCash = roundMoney(summary.ExpectedCash)
	for method, total := range summary.TotalsByMethod {
		summary.TotalsByMethod[method] = roundMoney(total)
	}
	return summary
}

func roundMoney(v float64) float64 {
	return math.Round(v*100) / 100
}

// hasCashManagePermission indica se o usuário pode lançar sangria/reforço/outros
func hasCashManagePermission(c *gin.Context) bool {
	return models.HasPermission(middleware.GetPermissionsFromContext(c), "cash.movement")
}
