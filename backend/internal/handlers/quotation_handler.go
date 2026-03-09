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

type QuotationHandler struct {
	quotationRepo *repository.QuotationRepository
	customerRepo  *repository.CustomerRepository
	departmentRepo *repository.DepartmentRepository
	serviceOrderRepo *repository.ServiceOrderRepository
	employeeRepo  *repository.EmployeeRepository
}

func NewQuotationHandler(
	quotationRepo *repository.QuotationRepository,
	customerRepo *repository.CustomerRepository,
	departmentRepo *repository.DepartmentRepository,
	serviceOrderRepo *repository.ServiceOrderRepository,
	employeeRepo *repository.EmployeeRepository,
) *QuotationHandler {
	return &QuotationHandler{
		quotationRepo:    quotationRepo,
		customerRepo:     customerRepo,
		departmentRepo:   departmentRepo,
		serviceOrderRepo: serviceOrderRepo,
		employeeRepo:     employeeRepo,
	}
}

type CreateQuotationRequest struct {
	CustomerID   string                `json:"customerId" binding:"required"`
	DepartmentID string                `json:"departmentId" binding:"required"`
	Items        []models.QuotationItem `json:"items" binding:"required"`
	Discount     float64               `json:"discount,omitempty"`
	ValidUntil   string                `json:"validUntil,omitempty"` // ISO date
	Notes        string                `json:"notes,omitempty"`
}

type UpdateQuotationRequest struct {
	Items      []models.QuotationItem `json:"items,omitempty"`
	Discount   *float64                `json:"discount,omitempty"`
	Status     *models.QuotationStatus `json:"status,omitempty"`
	ValidUntil *string                 `json:"validUntil,omitempty"`
	Notes      string                  `json:"notes,omitempty"`
}

func (h *QuotationHandler) resolveActor(c *gin.Context) (primitive.ObjectID, error) {
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

func (h *QuotationHandler) generateQuotationNumber(ctx context.Context) (string, error) {
	year := time.Now().Year()
	prefix := fmt.Sprintf("COT-%d-", year)

	filter := bson.M{
		"quotationNumber": bson.M{"$regex": fmt.Sprintf("^%s", prefix)},
	}

	count, err := h.quotationRepo.CountQuotations(ctx, filter)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s%04d", prefix, count+1), nil
}

// CreateQuotation handles POST /api/quotations
func (h *QuotationHandler) CreateQuotation(c *gin.Context) {
	var req CreateQuotationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	actor, _ := h.resolveActor(c)

	customerID, err := primitive.ObjectIDFromHex(req.CustomerID)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	departmentID, err := primitive.ObjectIDFromHex(req.DepartmentID)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	// Generate quotation number
	quotationNumber, err := h.generateQuotationNumber(ctx)
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
	total := subtotal - req.Discount

	// Parse validUntil
	var validUntil *time.Time
	if req.ValidUntil != "" {
		parsed, err := time.Parse("2006-01-02", req.ValidUntil)
		if err == nil {
			validUntil = &parsed
		}
	}

	quotation := &models.Quotation{
		ID:              primitive.NewObjectID(),
		QuotationNumber: quotationNumber,
		CustomerID:     customerID,
		DepartmentID:   departmentID,
		Items:          req.Items,
		Subtotal:       subtotal,
		Discount:       req.Discount,
		Total:          total,
		Status:         models.QuotationStatusDraft,
		ValidUntil:     validUntil,
		Notes:          req.Notes,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
		CreatedBy:      actor,
		UpdatedBy:      actor,
	}

	if err := h.quotationRepo.CreateQuotation(ctx, quotation); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Populate customer
	customer, _ := h.customerRepo.GetCustomerByID(ctx, customerID)
	quotation.Customer = customer

	c.JSON(http.StatusOK, gin.H{"quotation": quotation})
}

// GetQuotation handles GET /api/quotations/:id
func (h *QuotationHandler) GetQuotation(c *gin.Context) {
	id := c.Param("id")
	quotationID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()
	quotation, err := h.quotationRepo.GetQuotationByID(ctx, quotationID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	if quotation == nil {
		utils.RespondWithNotFound(c, "Orçamento não encontrado")
		return
	}

	// Populate customer
	if !quotation.CustomerID.IsZero() {
		customer, _ := h.customerRepo.GetCustomerByID(ctx, quotation.CustomerID)
		quotation.Customer = customer
	}

	c.JSON(http.StatusOK, gin.H{"quotation": quotation})
}

// ListQuotations handles GET /api/quotations
func (h *QuotationHandler) ListQuotations(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")
	customerID := c.Query("customerId")

	ctx := c.Request.Context()

	filter := bson.M{}
	if status != "" {
		filter["status"] = models.QuotationStatus(status)
	}
	if customerID != "" {
		customerObjID, err := primitive.ObjectIDFromHex(customerID)
		if err == nil {
			filter["customerId"] = customerObjID
		}
	}

	skip := int64((page - 1) * limit)
	quotations, err := h.quotationRepo.ListQuotations(ctx, skip, int64(limit), filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Populate customers
	for _, quotation := range quotations {
		if !quotation.CustomerID.IsZero() {
			customer, _ := h.customerRepo.GetCustomerByID(ctx, quotation.CustomerID)
			quotation.Customer = customer
		}
	}

	total, _ := h.quotationRepo.CountQuotations(ctx, filter)

	c.JSON(http.StatusOK, gin.H{
		"quotations": quotations,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// UpdateQuotation handles PUT /api/quotations/:id
func (h *QuotationHandler) UpdateQuotation(c *gin.Context) {
	id := c.Param("id")
	quotationID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	var req UpdateQuotationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	actor, _ := h.resolveActor(c)

	quotation, err := h.quotationRepo.GetQuotationByID(ctx, quotationID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	if quotation == nil {
		utils.RespondWithNotFound(c, "Orçamento não encontrado")
		return
	}

	// Update fields
	if req.Items != nil {
		quotation.Items = req.Items
		// Recalculate totals
		subtotal := 0.0
		for i := range quotation.Items {
			quotation.Items[i].TotalPrice = quotation.Items[i].Quantity * quotation.Items[i].UnitPrice
			subtotal += quotation.Items[i].TotalPrice
		}
		quotation.Subtotal = subtotal
		if req.Discount != nil {
			quotation.Discount = *req.Discount
		}
		quotation.Total = quotation.Subtotal - quotation.Discount
	}

	if req.Discount != nil {
		quotation.Discount = *req.Discount
		quotation.Total = quotation.Subtotal - quotation.Discount
	}

	if req.Status != nil {
		quotation.Status = *req.Status
		if *req.Status == models.QuotationStatusApproved {
			now := time.Now()
			quotation.ApprovedAt = &now
		}
		if *req.Status == models.QuotationStatusRejected {
			now := time.Now()
			quotation.RejectedAt = &now
		}
	}

	if req.ValidUntil != nil {
		parsed, err := time.Parse("2006-01-02", *req.ValidUntil)
		if err == nil {
			quotation.ValidUntil = &parsed
		}
	}

	if req.Notes != "" {
		quotation.Notes = req.Notes
	}

	quotation.UpdatedBy = actor

	if err := h.quotationRepo.UpdateQuotation(ctx, quotationID, quotation); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Populate customer
	if !quotation.CustomerID.IsZero() {
		customer, _ := h.customerRepo.GetCustomerByID(ctx, quotation.CustomerID)
		quotation.Customer = customer
	}

	c.JSON(http.StatusOK, gin.H{"quotation": quotation})
}

// ConvertToServiceOrder handles POST /api/quotations/:id/convert
func (h *QuotationHandler) ConvertToServiceOrder(c *gin.Context) {
	id := c.Param("id")
	quotationID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()
	actor, _ := h.resolveActor(c)

	quotation, err := h.quotationRepo.GetQuotationByID(ctx, quotationID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	if quotation == nil {
		utils.RespondWithNotFound(c, "Orçamento não encontrado")
		return
	}

	if quotation.Status != models.QuotationStatusApproved {
		utils.RespondWithBadRequest(c, "Apenas orçamentos aprovados podem ser convertidos em OS")
		return
	}

	// TODO: Create service order from quotation
	// This is a simplified version - full implementation would map all quotation fields to service order
	serviceOrderID := primitive.NewObjectID()
	quotation.ConvertedToOSID = &serviceOrderID
	quotation.Status = models.QuotationStatusConverted
	quotation.UpdatedBy = actor

	if err := h.quotationRepo.UpdateQuotation(ctx, quotationID, quotation); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Orçamento convertido em ordem de serviço",
		"serviceOrderId": serviceOrderID.Hex(),
		"quotation": quotation,
	})
}

// DeleteQuotation handles DELETE /api/quotations/:id
func (h *QuotationHandler) DeleteQuotation(c *gin.Context) {
	id := c.Param("id")
	quotationID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()

	if err := h.quotationRepo.DeleteQuotation(ctx, quotationID); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Orçamento excluído com sucesso"})
}
