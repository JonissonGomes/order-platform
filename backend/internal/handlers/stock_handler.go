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

type StockHandler struct {
	stockRepo    *repository.StockRepository
	employeeRepo *repository.EmployeeRepository
}

func NewStockHandler(stockRepo *repository.StockRepository, employeeRepo *repository.EmployeeRepository) *StockHandler {
	return &StockHandler{stockRepo: stockRepo, employeeRepo: employeeRepo}
}

// resolveCreatedBy retorna o ObjectID do criador (employee)
func (h *StockHandler) resolveCreatedBy(c *gin.Context) (primitive.ObjectID, error) {
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		return primitive.NilObjectID, nil
	}
	return currentEmployee.ID, nil
}

// ── Items ────────────────────────────────────────────────────────────────────

type CreateStockItemRequest struct {
	Name         string  `json:"name" binding:"required"`
	SKU          string  `json:"sku,omitempty"`
	Category     string  `json:"category" binding:"required"`
	Description  string  `json:"description,omitempty"`
	Quantity     int     `json:"quantity"`
	MinQuantity  int     `json:"minQuantity"`
	CostPrice    float64 `json:"costPrice"`
	SellingPrice float64 `json:"sellingPrice,omitempty"`
	Supplier     string  `json:"supplier,omitempty"`
	Location     string  `json:"location,omitempty"`
}

func (h *StockHandler) CreateItem(c *gin.Context) {
	var req CreateStockItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	createdBy, err := h.resolveCreatedBy(c)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	now := time.Now()
	initialQty := req.Quantity

	// Item é inserido com Quantity=0; o movimento de estoque inicial
	// será responsável por incrementar a quantidade via CreateMovement.
	item := &models.StockItem{
		ID:           primitive.NewObjectID(),
		Name:         req.Name,
		SKU:          req.SKU,
		Category:     req.Category,
		Description:  req.Description,
		Quantity:     0,
		MinQuantity:  req.MinQuantity,
		CostPrice:    req.CostPrice,
		SellingPrice: req.SellingPrice,
		Supplier:     req.Supplier,
		Location:     req.Location,
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
		CreatedBy:    createdBy,
		UpdatedBy:    createdBy,
	}

	if err := h.stockRepo.CreateItem(c.Request.Context(), item); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Registrar movimento de estoque inicial (se houver quantidade)
	if initialQty > 0 {
		mov := &models.StockMovement{
			ID:             primitive.NewObjectID(),
			StockItemID:    item.ID,
			Type:           models.StockMovementIn,
			Reason:         models.ReasonInitial,
			Quantity:       initialQty,
			UnitCost:       req.CostPrice,
			TotalCost:      float64(initialQty) * req.CostPrice,
			QuantityBefore: 0,
			QuantityAfter:  initialQty,
			Notes:          "Estoque inicial",
			CreatedAt:      now,
			CreatedBy:      createdBy,
		}
		_ = h.stockRepo.CreateMovement(c.Request.Context(), mov)
		item.Quantity = initialQty
	}

	c.JSON(http.StatusCreated, gin.H{"item": item})
}

func (h *StockHandler) ListItems(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	filter := bson.M{"isActive": true}
	if cat := c.Query("category"); cat != "" {
		filter["category"] = cat
	}
	if name := c.Query("name"); name != "" {
		filter["name"] = bson.M{"$regex": name, "$options": "i"}
	}
	if lowStock := c.Query("lowStock"); lowStock == "true" {
		filter["$expr"] = bson.M{"$and": bson.A{
			bson.M{"$gt": bson.A{"$minQuantity", 0}},
			bson.M{"$lte": bson.A{"$quantity", "$minQuantity"}},
		}}
	}

	items, total, err := h.stockRepo.ListItems(c.Request.Context(), filter, page, limit)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":      items,
		"pagination": gin.H{"page": page, "limit": limit, "total": total},
	})
}

func (h *StockHandler) GetItem(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		utils.RespondWithBadRequest(c, "ID inválido")
		return
	}
	item, err := h.stockRepo.GetItemByID(c.Request.Context(), id)
	if err != nil || item == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item não encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"item": item})
}

func (h *StockHandler) UpdateItem(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		utils.RespondWithBadRequest(c, "ID inválido")
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}
	// Remover campos protegidos
	delete(req, "quantity")
	delete(req, "_id")
	delete(req, "createdAt")
	delete(req, "createdBy")

	if err := h.stockRepo.UpdateItem(c.Request.Context(), id, req); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	item, _ := h.stockRepo.GetItemByID(c.Request.Context(), id)
	c.JSON(http.StatusOK, gin.H{"item": item})
}

func (h *StockHandler) GetSummary(c *gin.Context) {
	summary, err := h.stockRepo.GetSummary(c.Request.Context())
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"summary": summary})
}

// ── Movements ────────────────────────────────────────────────────────────────

type CreateMovementRequest struct {
	Type           models.StockMovementType   `json:"type" binding:"required"`
	Reason         models.StockMovementReason `json:"reason" binding:"required"`
	Quantity       int                        `json:"quantity" binding:"required,min=1"`
	UnitCost       float64                    `json:"unitCost,omitempty"`
	ServiceOrderID string                     `json:"serviceOrderId,omitempty"`
	Notes          string                     `json:"notes,omitempty"`
	// Para ajuste: newQuantity indica a quantidade final desejada
	NewQuantity *int `json:"newQuantity,omitempty"`
}

func (h *StockHandler) CreateMovement(c *gin.Context) {
	itemID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		utils.RespondWithBadRequest(c, "ID inválido")
		return
	}

	var req CreateMovementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	item, err := h.stockRepo.GetItemByID(ctx, itemID)
	if err != nil || item == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item não encontrado"})
		return
	}

	createdBy, _ := h.resolveCreatedBy(c)

	qtyBefore := item.Quantity
	var qtyAfter int

	switch req.Type {
	case models.StockMovementIn, models.StockMovementReturn:
		qtyAfter = qtyBefore + req.Quantity
	case models.StockMovementOut, models.StockMovementDamaged:
		if req.Quantity > qtyBefore {
			utils.RespondWithBadRequest(c, "Quantidade insuficiente em estoque")
			return
		}
		qtyAfter = qtyBefore - req.Quantity
	case models.StockMovementAdjustment:
		if req.NewQuantity == nil {
			utils.RespondWithBadRequest(c, "Para ajuste, informe newQuantity")
			return
		}
		qtyAfter = *req.NewQuantity
	}

	mov := &models.StockMovement{
		ID:             primitive.NewObjectID(),
		StockItemID:    itemID,
		Type:           req.Type,
		Reason:         req.Reason,
		Quantity:       req.Quantity,
		UnitCost:       req.UnitCost,
		TotalCost:      float64(req.Quantity) * req.UnitCost,
		QuantityBefore: qtyBefore,
		QuantityAfter:  qtyAfter,
		Notes:          req.Notes,
		CreatedAt:      time.Now(),
		CreatedBy:      createdBy,
	}

	if req.ServiceOrderID != "" {
		oid, err := primitive.ObjectIDFromHex(req.ServiceOrderID)
		if err == nil {
			mov.ServiceOrderID = &oid
		}
	}

	if err := h.stockRepo.CreateMovement(ctx, mov); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Recarregar item com quantidade atualizada
	updatedItem, _ := h.stockRepo.GetItemByID(ctx, itemID)
	c.JSON(http.StatusCreated, gin.H{"movement": mov, "item": updatedItem})
}

func (h *StockHandler) ListMovements(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}

	filter := bson.M{}
	if itemID := c.Param("id"); itemID != "" {
		oid, err := primitive.ObjectIDFromHex(itemID)
		if err != nil {
			utils.RespondWithBadRequest(c, "ID inválido")
			return
		}
		filter["stockItemId"] = oid
	}
	if t := c.Query("type"); t != "" {
		filter["type"] = t
	}

	movs, total, err := h.stockRepo.ListMovements(c.Request.Context(), filter, page, limit)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Enriquecer com dados do item
	ctx := c.Request.Context()
	for _, mov := range movs {
		item, _ := h.stockRepo.GetItemByID(ctx, mov.StockItemID)
		mov.StockItem = item
	}

	c.JSON(http.StatusOK, gin.H{
		"movements":  movs,
		"pagination": gin.H{"page": page, "limit": limit, "total": total},
	})
}
