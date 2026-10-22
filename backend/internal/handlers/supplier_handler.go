package handlers

import (
	"context"
	"fmt"
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

type SupplierHandler struct {
	supplierRepo *repository.SupplierRepository
	employeeRepo *repository.EmployeeRepository
	stockRepo    *repository.StockRepository
}

func NewSupplierHandler(
	supplierRepo *repository.SupplierRepository,
	employeeRepo *repository.EmployeeRepository,
	stockRepo *repository.StockRepository,
) *SupplierHandler {
	return &SupplierHandler{
		supplierRepo: supplierRepo,
		employeeRepo: employeeRepo,
		stockRepo:    stockRepo,
	}
}

type CreateSupplierRequest struct {
	Name        string          `json:"name" binding:"required"`
	CNPJ        string          `json:"cnpj,omitempty"`
	CPF         string          `json:"cpf,omitempty"`
	Email       string          `json:"email,omitempty"`
	Phone       string          `json:"phone,omitempty"`
	Address     *models.Address `json:"address,omitempty"`
	ContactName string          `json:"contactName,omitempty"`
	Notes       string          `json:"notes,omitempty"`
}

type CreatePurchaseOrderRequest struct {
	SupplierID      string                  `json:"supplierId" binding:"required"`
	Items           []models.PurchaseOrderItem `json:"items" binding:"required"`
	ShippingCost    float64                  `json:"shippingCost,omitempty"`
	ExpectedDelivery string                  `json:"expectedDelivery,omitempty"` // ISO date
	Notes           string                   `json:"notes,omitempty"`
}

func (h *SupplierHandler) resolveActor(c *gin.Context) (primitive.ObjectID, error) {
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		return primitive.NilObjectID, nil
	}
	return currentEmployee.ID, nil
}

func (h *SupplierHandler) generatePurchaseOrderNumber(ctx context.Context) (string, error) {
	year := time.Now().Year()
	prefix := fmt.Sprintf("PC-%d-", year)

	filter := bson.M{
		"orderNumber": bson.M{"$regex": fmt.Sprintf("^%s", prefix)},
	}

	count, err := h.supplierRepo.CountPurchaseOrders(ctx, filter)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s%04d", prefix, count+1), nil
}

// CreateSupplier handles POST /api/suppliers
func (h *SupplierHandler) CreateSupplier(c *gin.Context) {
	var req CreateSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	actor, _ := h.resolveActor(c)

	supplier := &models.Supplier{
		ID:          primitive.NewObjectID(),
		Name:        req.Name,
		CNPJ:        req.CNPJ,
		CPF:         req.CPF,
		Email:       req.Email,
		Phone:       req.Phone,
		Address:     req.Address,
		ContactName: req.ContactName,
		Notes:       req.Notes,
		IsActive:    true,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		CreatedBy:   actor,
		UpdatedBy:   actor,
	}

	if err := h.supplierRepo.CreateSupplier(ctx, supplier); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"supplier": supplier})
}

// GetSupplier handles GET /api/suppliers/:id
func (h *SupplierHandler) GetSupplier(c *gin.Context) {
	id := c.Param("id")
	supplierID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()
	supplier, err := h.supplierRepo.GetSupplierByID(ctx, supplierID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	if supplier == nil {
		utils.RespondWithNotFound(c, "Fornecedor não encontrado")
		return
	}

	c.JSON(http.StatusOK, gin.H{"supplier": supplier})
}

// ListSuppliers handles GET /api/suppliers
func (h *SupplierHandler) ListSuppliers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")

	ctx := c.Request.Context()

	filter := bson.M{}
	if search != "" {
		filter["$or"] = []bson.M{
			{"name": bson.M{"$regex": search, "$options": "i"}},
			{"cnpj": bson.M{"$regex": search, "$options": "i"}},
			{"cpf": bson.M{"$regex": search, "$options": "i"}},
			{"email": bson.M{"$regex": search, "$options": "i"}},
		}
	}

	skip := int64((page - 1) * limit)
	suppliers, err := h.supplierRepo.ListSuppliers(ctx, skip, int64(limit), filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	total, _ := h.supplierRepo.CountSuppliers(ctx, filter)

	c.JSON(http.StatusOK, gin.H{
		"suppliers": suppliers,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// UpdateSupplier handles PUT /api/suppliers/:id
func (h *SupplierHandler) UpdateSupplier(c *gin.Context) {
	id := c.Param("id")
	supplierID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	var req CreateSupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	actor, _ := h.resolveActor(c)

	supplier, err := h.supplierRepo.GetSupplierByID(ctx, supplierID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	if supplier == nil {
		utils.RespondWithNotFound(c, "Fornecedor não encontrado")
		return
	}

	// Update fields
	if req.Name != "" {
		supplier.Name = req.Name
	}
	if req.CNPJ != "" {
		supplier.CNPJ = req.CNPJ
	}
	if req.CPF != "" {
		supplier.CPF = req.CPF
	}
	if req.Email != "" {
		supplier.Email = req.Email
	}
	if req.Phone != "" {
		supplier.Phone = req.Phone
	}
	if req.Address != nil {
		supplier.Address = req.Address
	}
	if req.ContactName != "" {
		supplier.ContactName = req.ContactName
	}
	if req.Notes != "" {
		supplier.Notes = req.Notes
	}

	supplier.UpdatedBy = actor

	if err := h.supplierRepo.UpdateSupplier(ctx, supplierID, supplier); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"supplier": supplier})
}

// DeleteSupplier handles DELETE /api/suppliers/:id
func (h *SupplierHandler) DeleteSupplier(c *gin.Context) {
	id := c.Param("id")
	supplierID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()

	if err := h.supplierRepo.DeleteSupplier(ctx, supplierID); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Fornecedor excluído com sucesso"})
}

// CreatePurchaseOrder handles POST /api/purchase-orders
func (h *SupplierHandler) CreatePurchaseOrder(c *gin.Context) {
	var req CreatePurchaseOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	actor, _ := h.resolveActor(c)

	supplierID, err := primitive.ObjectIDFromHex(req.SupplierID)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	// Generate order number
	orderNumber, err := h.generatePurchaseOrderNumber(ctx)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Calculate totals
	subtotal := 0.0
	for i := range req.Items {
		req.Items[i].TotalPrice = req.Items[i].Quantity * req.Items[i].UnitPrice
		subtotal += req.Items[i].TotalPrice
	}
	total := subtotal + req.ShippingCost

	// Parse expected delivery
	var expectedDelivery *time.Time
	if req.ExpectedDelivery != "" {
		parsed, err := time.Parse("2006-01-02", req.ExpectedDelivery)
		if err == nil {
			expectedDelivery = &parsed
		}
	}

	order := &models.PurchaseOrder{
		ID:               primitive.NewObjectID(),
		OrderNumber:      orderNumber,
		SupplierID:       supplierID,
		Items:            req.Items,
		Subtotal:         subtotal,
		ShippingCost:     req.ShippingCost,
		Total:            total,
		Status:           models.PurchaseOrderStatusDraft,
		ExpectedDelivery: expectedDelivery,
		Notes:            req.Notes,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
		CreatedBy:        actor,
		UpdatedBy:        actor,
	}

	if err := h.supplierRepo.CreatePurchaseOrder(ctx, order); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Populate supplier
	supplier, _ := h.supplierRepo.GetSupplierByID(ctx, supplierID)
	order.Supplier = supplier

	c.JSON(http.StatusOK, gin.H{"purchaseOrder": order})
}

// GetPurchaseOrder handles GET /api/purchase-orders/:id
func (h *SupplierHandler) GetPurchaseOrder(c *gin.Context) {
	id := c.Param("id")
	orderID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()
	order, err := h.supplierRepo.GetPurchaseOrderByID(ctx, orderID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	if order == nil {
		utils.RespondWithNotFound(c, "Pedido de compra não encontrado")
		return
	}

	// Populate supplier
	if !order.SupplierID.IsZero() {
		supplier, _ := h.supplierRepo.GetSupplierByID(ctx, order.SupplierID)
		order.Supplier = supplier
	}

	c.JSON(http.StatusOK, gin.H{"purchaseOrder": order})
}

// ListPurchaseOrders handles GET /api/purchase-orders
func (h *SupplierHandler) ListPurchaseOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")
	supplierID := c.Query("supplierId")

	ctx := c.Request.Context()

	filter := bson.M{}
	if status != "" {
		filter["status"] = models.PurchaseOrderStatus(status)
	}
	if supplierID != "" {
		supplierObjID, err := primitive.ObjectIDFromHex(supplierID)
		if err == nil {
			filter["supplierId"] = supplierObjID
		}
	}

	skip := int64((page - 1) * limit)
	orders, err := h.supplierRepo.ListPurchaseOrders(ctx, skip, int64(limit), filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Populate suppliers
	for _, order := range orders {
		if !order.SupplierID.IsZero() {
			supplier, _ := h.supplierRepo.GetSupplierByID(ctx, order.SupplierID)
			order.Supplier = supplier
		}
	}

	total, _ := h.supplierRepo.CountPurchaseOrders(ctx, filter)

	c.JSON(http.StatusOK, gin.H{
		"purchaseOrders": orders,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// UpdatePurchaseOrder handles PUT /api/purchase-orders/:id
func (h *SupplierHandler) UpdatePurchaseOrder(c *gin.Context) {
	id := c.Param("id")
	orderID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	var req struct {
		Items            []models.PurchaseOrderItem `json:"items,omitempty"`
		ShippingCost     *float64                   `json:"shippingCost,omitempty"`
		Status           *models.PurchaseOrderStatus `json:"status,omitempty"`
		ExpectedDelivery *string                    `json:"expectedDelivery,omitempty"`
		Notes            string                     `json:"notes,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	actor, _ := h.resolveActor(c)

	order, err := h.supplierRepo.GetPurchaseOrderByID(ctx, orderID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	if order == nil {
		utils.RespondWithNotFound(c, "Pedido de compra não encontrado")
		return
	}

	// Update fields
	if req.Items != nil {
		order.Items = req.Items
		// Recalculate totals
		subtotal := 0.0
		for i := range order.Items {
			order.Items[i].TotalPrice = order.Items[i].Quantity * order.Items[i].UnitPrice
			subtotal += order.Items[i].TotalPrice
		}
		order.Subtotal = subtotal
		if req.ShippingCost != nil {
			order.ShippingCost = *req.ShippingCost
		}
		order.Total = order.Subtotal + order.ShippingCost
	}

	if req.ShippingCost != nil {
		order.ShippingCost = *req.ShippingCost
		order.Total = order.Subtotal + order.ShippingCost
	}

	if req.Status != nil {
		order.Status = *req.Status
		if *req.Status == models.PurchaseOrderStatusReceived {
			now := time.Now()
			order.ReceivedAt = &now
		}
	}

	if req.ExpectedDelivery != nil {
		parsed, err := time.Parse("2006-01-02", *req.ExpectedDelivery)
		if err == nil {
			order.ExpectedDelivery = &parsed
		}
	}

	if req.Notes != "" {
		order.Notes = req.Notes
	}

	order.UpdatedBy = actor

	if err := h.supplierRepo.UpdatePurchaseOrder(ctx, orderID, order); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Populate supplier
	if !order.SupplierID.IsZero() {
		supplier, _ := h.supplierRepo.GetSupplierByID(ctx, order.SupplierID)
		order.Supplier = supplier
	}

	c.JSON(http.StatusOK, gin.H{"purchaseOrder": order})
}

// DeletePurchaseOrder handles DELETE /api/purchase-orders/:id
func (h *SupplierHandler) DeletePurchaseOrder(c *gin.Context) {
	id := c.Param("id")
	orderID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()

	if err := h.supplierRepo.DeletePurchaseOrder(ctx, orderID); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pedido de compra excluído com sucesso"})
}
