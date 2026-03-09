package handlers

import (
	"net/http"
	"strconv"
	"time"

	"order-platform/backend/internal/middleware"
	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FinancialHandler struct {
	financialRepo *repository.FinancialRepository
	employeeRepo  *repository.EmployeeRepository
}

func NewFinancialHandler(financialRepo *repository.FinancialRepository, employeeRepo *repository.EmployeeRepository) *FinancialHandler {
	return &FinancialHandler{financialRepo: financialRepo, employeeRepo: employeeRepo}
}

func (h *FinancialHandler) resolveActor(c *gin.Context) (primitive.ObjectID, error) {
	ctx := c.Request.Context()
	currentUser := middleware.GetUserFromContext(c)
	if currentUser == nil {
		return primitive.NilObjectID, nil
	}
	emp, err := h.employeeRepo.GetEmployeeByUserID(ctx, currentUser.ID)
	if err == nil && emp != nil {
		return emp.ID, nil
	}
	return currentUser.ID, nil
}

// ── Requests ─────────────────────────────────────────────────────────────────

type CreateTransactionRequest struct {
	Type          models.TransactionType     `json:"type" binding:"required"`
	Category      models.TransactionCategory `json:"category" binding:"required"`
	Description   string                     `json:"description" binding:"required"`
	Amount        float64                    `json:"amount" binding:"required,gt=0"`
	PaymentMethod string                     `json:"paymentMethod" binding:"required"`
	ServiceOrderID string                    `json:"serviceOrderId,omitempty"`
	StockItemID    string                    `json:"stockItemId,omitempty"`
	ReferenceDate  string                    `json:"referenceDate,omitempty"` // ISO date
	DueDate        string                    `json:"dueDate,omitempty"`
	IsPaid         bool                      `json:"isPaid"`
	Notes          string                    `json:"notes,omitempty"`
}

type UpdateTransactionRequest struct {
	Description   string  `json:"description,omitempty"`
	Amount        float64 `json:"amount,omitempty"`
	PaymentMethod string  `json:"paymentMethod,omitempty"`
	IsPaid        *bool   `json:"isPaid,omitempty"`
	Notes         string  `json:"notes,omitempty"`
	DueDate       string  `json:"dueDate,omitempty"`
}

// ── Handlers ─────────────────────────────────────────────────────────────────

func (h *FinancialHandler) CreateTransaction(c *gin.Context) {
	var req CreateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	actor, _ := h.resolveActor(c)
	now := time.Now()

	refDate := now
	if req.ReferenceDate != "" {
		if parsed, err := time.Parse("2006-01-02", req.ReferenceDate); err == nil {
			refDate = parsed
		}
	}

	t := &models.Transaction{
		ID:            primitive.NewObjectID(),
		Type:          req.Type,
		Category:      req.Category,
		Description:   req.Description,
		Amount:        req.Amount,
		PaymentMethod: req.PaymentMethod,
		ReferenceDate: refDate,
		IsPaid:        req.IsPaid,
		Notes:         req.Notes,
		CreatedAt:     now,
		UpdatedAt:     now,
		CreatedBy:     actor,
		UpdatedBy:     actor,
	}

	if req.IsPaid {
		t.PaidAt = &now
	}
	if req.DueDate != "" {
		if parsed, err := time.Parse("2006-01-02", req.DueDate); err == nil {
			t.DueDate = &parsed
		}
	}
	if req.ServiceOrderID != "" {
		if oid, err := primitive.ObjectIDFromHex(req.ServiceOrderID); err == nil {
			t.ServiceOrderID = &oid
		}
	}
	if req.StockItemID != "" {
		if oid, err := primitive.ObjectIDFromHex(req.StockItemID); err == nil {
			t.StockItemID = &oid
		}
	}

	if err := h.financialRepo.Create(c.Request.Context(), t); err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"transaction": t})
}

func (h *FinancialHandler) ListTransactions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	filter := bson.M{}
	if t := c.Query("type"); t != "" {
		filter["type"] = t
	}
	if cat := c.Query("category"); cat != "" {
		filter["category"] = cat
	}
	if paid := c.Query("isPaid"); paid != "" {
		filter["isPaid"] = paid == "true"
	}

	// Filtro por período (mês YYYY-MM ou range)
	if month := c.Query("month"); month != "" {
		from, err1 := time.Parse("2006-01", month)
		if err1 == nil {
			to := from.AddDate(0, 1, 0)
			filter["referenceDate"] = bson.M{"$gte": from, "$lt": to}
		}
	} else {
		if from := c.Query("from"); from != "" {
			if to := c.Query("to"); to != "" {
				fromT, err1 := time.Parse("2006-01-02", from)
				toT, err2 := time.Parse("2006-01-02", to)
				if err1 == nil && err2 == nil {
					filter["referenceDate"] = bson.M{"$gte": fromT, "$lte": toT}
				}
			}
		}
	}

	transactions, total, err := h.financialRepo.List(c.Request.Context(), filter, page, limit)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"transactions": transactions,
		"pagination":   gin.H{"page": page, "limit": limit, "total": total},
	})
}

func (h *FinancialHandler) GetTransaction(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		utils.RespondWithBadRequest(c, "ID inválido")
		return
	}
	t, err := h.financialRepo.GetByID(c.Request.Context(), id)
	if err != nil || t == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transação não encontrada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"transaction": t})
}

func (h *FinancialHandler) UpdateTransaction(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		utils.RespondWithBadRequest(c, "ID inválido")
		return
	}

	var req UpdateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	update := bson.M{}
	if req.Description != "" {
		update["description"] = req.Description
	}
	if req.Amount > 0 {
		update["amount"] = req.Amount
	}
	if req.PaymentMethod != "" {
		update["paymentMethod"] = req.PaymentMethod
	}
	if req.Notes != "" {
		update["notes"] = req.Notes
	}
	if req.IsPaid != nil {
		update["isPaid"] = *req.IsPaid
		if *req.IsPaid {
			now := time.Now()
			update["paidAt"] = now
		} else {
			update["paidAt"] = nil
		}
	}
	if req.DueDate != "" {
		if parsed, err := time.Parse("2006-01-02", req.DueDate); err == nil {
			update["dueDate"] = parsed
		}
	}

	if err := h.financialRepo.Update(c.Request.Context(), id, update); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	t, _ := h.financialRepo.GetByID(c.Request.Context(), id)
	c.JSON(http.StatusOK, gin.H{"transaction": t})
}

func (h *FinancialHandler) DeleteTransaction(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		utils.RespondWithBadRequest(c, "ID inválido")
		return
	}
	if err := h.financialRepo.Delete(c.Request.Context(), id); err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *FinancialHandler) MarkAsPaid(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		utils.RespondWithBadRequest(c, "ID inválido")
		return
	}

	now := time.Now()
	update := bson.M{"isPaid": true, "paidAt": now}
	if err := h.financialRepo.Update(c.Request.Context(), id, update); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	t, _ := h.financialRepo.GetByID(c.Request.Context(), id)
	c.JSON(http.StatusOK, gin.H{"transaction": t})
}

func (h *FinancialHandler) GetSummary(c *gin.Context) {
	dateFilter := bson.M{}
	if month := c.Query("month"); month != "" {
		from, err := time.Parse("2006-01", month)
		if err == nil {
			to := from.AddDate(0, 1, 0)
			dateFilter["referenceDate"] = bson.M{"$gte": from, "$lt": to}
		}
	}

	summary, err := h.financialRepo.GetSummary(c.Request.Context(), dateFilter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if month := c.Query("month"); month != "" {
		summary.Period = month
	} else {
		summary.Period = time.Now().Format("2006-01")
	}

	c.JSON(http.StatusOK, gin.H{"summary": summary})
}

func (h *FinancialHandler) GetCashFlow(c *gin.Context) {
	months, _ := strconv.Atoi(c.DefaultQuery("months", "6"))
	if months < 1 || months > 24 {
		months = 6
	}

	entries, err := h.financialRepo.GetCashFlow(c.Request.Context(), months)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"cashFlow": entries})
}
