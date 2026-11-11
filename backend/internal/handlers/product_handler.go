package handlers

import (
	"log"
	"net/http"
	"strings"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ProductHandler struct {
	productRepo  *repository.ProductRepository
	movementRepo *repository.InventoryMovementRepository
	branchRepo   *repository.BranchRepository
}

func NewProductHandler(
	productRepo *repository.ProductRepository,
	movementRepo *repository.InventoryMovementRepository,
	branchRepo *repository.BranchRepository,
) *ProductHandler {
	return &ProductHandler{productRepo: productRepo, movementRepo: movementRepo, branchRepo: branchRepo}
}

type CreateProductRequest struct {
	BranchID    string  `json:"branchId,omitempty"`
	Name        string  `json:"name" binding:"required"`
	SKU         string  `json:"sku,omitempty"`
	Barcode     string  `json:"barcode,omitempty"`
	Category    string  `json:"category,omitempty"`
	Cost        float64 `json:"cost" binding:"gte=0"`
	Price       float64 `json:"price" binding:"gte=0"`
	Qty         int     `json:"qty" binding:"gte=0"`
	MinQty      int     `json:"minQty" binding:"gte=0"`
	Description string  `json:"description,omitempty"`
}

type UpdateProductRequest struct {
	Name        *string  `json:"name,omitempty"`
	SKU         *string  `json:"sku,omitempty"`
	Barcode     *string  `json:"barcode,omitempty"`
	Category    *string  `json:"category,omitempty"`
	Cost        *float64 `json:"cost,omitempty"`
	Price       *float64 `json:"price,omitempty"`
	MinQty      *int     `json:"minQty,omitempty"`
	Description *string  `json:"description,omitempty"`
	IsActive    *bool    `json:"isActive,omitempty"`
}

// ListProducts lista produtos (filtros: q, category, branchId, isActive, lowStock=true)
func (h *ProductHandler) ListProducts(c *gin.Context) {
	page, limit, skip := parsePagination(c)

	filter := bson.M{}
	if search := repository.SearchFilter(c.Query("q"), "name", "sku", "barcode", "category"); search != nil {
		filter = search
	}
	if category := c.Query("category"); category != "" {
		filter["category"] = category
	}
	if raw := c.Query("branchId"); raw != "" {
		branchID, err := primitive.ObjectIDFromHex(raw)
		if err != nil {
			utils.RespondWithBadRequest(c, utils.ErrInvalidID)
			return
		}
		filter["branchId"] = branchID
	}
	if active := boolQuery(c, "isActive"); active != nil {
		filter["isActive"] = *active
	}
	if c.Query("lowStock") == "true" {
		filter["$expr"] = bson.M{"$lte": bson.A{"$qty", "$minQty"}}
	}

	ctx := c.Request.Context()
	products, err := h.productRepo.ListProducts(ctx, skip, limit, filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	total, err := h.productRepo.CountProducts(ctx, filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"products": products, "total": total, "page": page, "limit": limit})
}

// GetProduct retorna um produto
func (h *ProductHandler) GetProduct(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	product, err := h.productRepo.GetProductByID(c.Request.Context(), id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if product == nil {
		utils.RespondWithNotFound(c, utils.ErrProductNotFound)
		return
	}
	c.JSON(http.StatusOK, gin.H{"product": product})
}

// LookupByBarcode busca um produto pelo código de barras (ou SKU, como fallback)
func (h *ProductHandler) LookupByBarcode(c *gin.Context) {
	code := strings.TrimSpace(c.Param("code"))
	if code == "" {
		utils.RespondWithBadRequest(c, "")
		return
	}

	ctx := c.Request.Context()
	product, err := h.productRepo.GetByBarcode(ctx, code)
	if err == nil && product == nil {
		product, err = h.productRepo.GetBySKU(ctx, code)
	}
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if product == nil {
		utils.RespondWithNotFound(c, utils.ErrProductNotFound)
		return
	}
	c.JSON(http.StatusOK, gin.H{"product": product})
}

// CreateProduct cria um produto; se qty > 0 registra a movimentação de estoque inicial
func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var req CreateProductRequest
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

	product := &models.Product{
		BranchID:    branchID,
		Name:        strings.TrimSpace(req.Name),
		SKU:         strings.TrimSpace(req.SKU),
		Barcode:     strings.TrimSpace(req.Barcode),
		Category:    req.Category,
		Cost:        req.Cost,
		Price:       req.Price,
		Qty:         req.Qty,
		MinQty:      req.MinQty,
		Description: req.Description,
		IsActive:    true,
		CreatedBy:   actor.ID,
		UpdatedBy:   actor.ID,
	}
	if product.Name == "" {
		utils.RespondWithBadRequest(c, "")
		return
	}

	if err := h.productRepo.CreateProduct(ctx, product); err != nil {
		if isDuplicateKey(err) {
			utils.RespondWithConflict(c, "Já existe um produto com este SKU ou código de barras")
			return
		}
		utils.RespondWithInternalError(c)
		return
	}

	if product.Qty > 0 {
		movement := &models.InventoryMovement{
			BranchID:  product.BranchID,
			ProductID: product.ID,
			Type:      models.MovementIn,
			Qty:       product.Qty,
			UnitCost:  product.Cost,
			Note:      "Estoque inicial",
			CreatedBy: actor.ID,
		}
		if err := h.movementRepo.Create(ctx, movement); err != nil {
			log.Printf("Warning: failed to record initial stock movement for product %s: %v", product.ID.Hex(), err)
		}
	}

	c.JSON(http.StatusCreated, gin.H{"product": product})
}

// UpdateProduct atualiza dados do produto (a quantidade só muda via /adjust)
func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}
	actor := requireActor(c)
	if actor == nil {
		return
	}

	ctx := c.Request.Context()
	product, err := h.productRepo.GetProductByID(ctx, id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if product == nil {
		utils.RespondWithNotFound(c, utils.ErrProductNotFound)
		return
	}

	if !applyProductUpdate(product, &req) {
		utils.RespondWithBadRequest(c, "")
		return
	}
	product.UpdatedBy = actor.ID

	if err := h.productRepo.UpdateProduct(ctx, id, product); err != nil {
		if isDuplicateKey(err) {
			utils.RespondWithConflict(c, "Já existe um produto com este SKU ou código de barras")
			return
		}
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"product": product})
}

// applyProductUpdate aplica os campos informados; retorna false se algum valor for inválido
func applyProductUpdate(product *models.Product, req *UpdateProductRequest) bool {
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return false
		}
		product.Name = name
	}
	setString(&product.SKU, req.SKU)
	setString(&product.Barcode, req.Barcode)
	if req.Category != nil {
		product.Category = *req.Category
	}
	if req.Description != nil {
		product.Description = *req.Description
	}
	if req.Cost != nil {
		if *req.Cost < 0 {
			return false
		}
		product.Cost = *req.Cost
	}
	if req.Price != nil {
		if *req.Price < 0 {
			return false
		}
		product.Price = *req.Price
	}
	if req.MinQty != nil {
		if *req.MinQty < 0 {
			return false
		}
		product.MinQty = *req.MinQty
	}
	if req.IsActive != nil {
		product.IsActive = *req.IsActive
	}
	return true
}
