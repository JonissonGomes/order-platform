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

type CustomerHandler struct {
	customerRepo      *repository.CustomerRepository
	serviceOrderRepo  *repository.ServiceOrderRepository
	employeeRepo      *repository.EmployeeRepository
}

func NewCustomerHandler(
	customerRepo *repository.CustomerRepository,
	serviceOrderRepo *repository.ServiceOrderRepository,
	employeeRepo *repository.EmployeeRepository,
) *CustomerHandler {
	return &CustomerHandler{
		customerRepo:     customerRepo,
		serviceOrderRepo: serviceOrderRepo,
		employeeRepo:     employeeRepo,
	}
}

type CreateCustomerRequest struct {
	Name    string          `json:"name" binding:"required"`
	CPF     string          `json:"cpf" binding:"required"`
	Phone   string          `json:"phone" binding:"required"`
	Email   string          `json:"email,omitempty"`
	Address *models.Address `json:"address,omitempty"`
}

type UpdateCustomerRequest struct {
	Name    string          `json:"name,omitempty"`
	CPF     string          `json:"cpf,omitempty"`
	Phone   string          `json:"phone,omitempty"`
	Email   string          `json:"email,omitempty"`
	Address *models.Address `json:"address,omitempty"`
}

// CreateCustomer creates a new customer
func (h *CustomerHandler) CreateCustomer(c *gin.Context) {
	var req CreateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	currentUser := middleware.GetUserFromContext(c)
	if currentUser == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	// Get current employee
	currentEmployee, err := h.employeeRepo.GetEmployeeByUserID(ctx, currentUser.ID)
	if err != nil || currentEmployee == nil {
		utils.RespondWithForbidden(c, "")
		return
	}

	// Check if customer with CPF already exists
	existingCustomer, err := h.customerRepo.GetCustomerByCPF(ctx, req.CPF)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if existingCustomer != nil {
		utils.RespondWithConflict(c, "Cliente com este CPF já existe")
		return
	}

	// Create customer
	customer := &models.Customer{
		Name:      req.Name,
		CPF:       req.CPF,
		Phone:     req.Phone,
		Email:     req.Email,
		Address:   req.Address,
		CreatedBy: currentEmployee.ID,
		UpdatedBy: currentEmployee.ID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := h.customerRepo.CreateCustomer(ctx, customer); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusCreated, gin.H{"customer": customer})
}

// GetCustomer retrieves a customer by ID
func (h *CustomerHandler) GetCustomer(c *gin.Context) {
	id := c.Param("id")
	customerID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()
	customer, err := h.customerRepo.GetCustomerByID(ctx, customerID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if customer == nil {
		utils.RespondWithNotFound(c, "Cliente não encontrado")
		return
	}

	c.JSON(http.StatusOK, gin.H{"customer": customer})
}

// GetCustomerByCPF retrieves a customer by CPF
func (h *CustomerHandler) GetCustomerByCPF(c *gin.Context) {
	cpf := c.Query("cpf")
	if cpf == "" {
		utils.RespondWithBadRequest(c, "CPF é obrigatório")
		return
	}

	ctx := c.Request.Context()
	customer, err := h.customerRepo.GetCustomerByCPF(ctx, cpf)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if customer == nil {
		utils.RespondWithNotFound(c, "Cliente não encontrado")
		return
	}

	c.JSON(http.StatusOK, gin.H{"customer": customer})
}

// GetCustomerByPhone retrieves a customer by phone
func (h *CustomerHandler) GetCustomerByPhone(c *gin.Context) {
	phone := c.Query("phone")
	if phone == "" {
		utils.RespondWithBadRequest(c, "Telefone é obrigatório")
		return
	}

	ctx := c.Request.Context()
	customer, err := h.customerRepo.GetCustomerByPhone(ctx, phone)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if customer == nil {
		utils.RespondWithNotFound(c, "Cliente não encontrado")
		return
	}

	c.JSON(http.StatusOK, gin.H{"customer": customer})
}

// ListCustomers lists customers with pagination
func (h *CustomerHandler) ListCustomers(c *gin.Context) {
	ctx := c.Request.Context()
	filter := bson.M{}

	// Filter by name (search)
	if name := c.Query("name"); name != "" {
		filter["name"] = bson.M{"$regex": name, "$options": "i"}
	}

	// Filter by CPF
	if cpf := c.Query("cpf"); cpf != "" {
		filter["cpf"] = cpf
	}

	// Filter by phone
	if phone := c.Query("phone"); phone != "" {
		filter["phone"] = phone
	}

	// Pagination
	page, _ := strconv.ParseInt(c.DefaultQuery("page", "1"), 10, 64)
	limit, _ := strconv.ParseInt(c.DefaultQuery("limit", "20"), 10, 64)
	if limit > 100 {
		limit = 100
	}
	skip := (page - 1) * limit

	customers, err := h.customerRepo.ListCustomers(ctx, skip, limit, filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	total, err := h.customerRepo.CountCustomers(ctx, filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"customers": customers,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// UpdateCustomer updates a customer
func (h *CustomerHandler) UpdateCustomer(c *gin.Context) {
	id := c.Param("id")
	customerID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	var req UpdateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	currentUser := middleware.GetUserFromContext(c)
	if currentUser == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	// Get current employee
	currentEmployee, err := h.employeeRepo.GetEmployeeByUserID(ctx, currentUser.ID)
	if err != nil || currentEmployee == nil {
		utils.RespondWithForbidden(c, "")
		return
	}

	// Get existing customer
	customer, err := h.customerRepo.GetCustomerByID(ctx, customerID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if customer == nil {
		utils.RespondWithNotFound(c, "Cliente não encontrado")
		return
	}

	// Update fields
	if req.Name != "" {
		customer.Name = req.Name
	}
	if req.Phone != "" {
		customer.Phone = req.Phone
	}
	if req.Email != "" {
		customer.Email = req.Email
	}
	if req.Address != nil {
		customer.Address = req.Address
	}
	// CPF não pode ser alterado (dado único)

	customer.UpdatedBy = currentEmployee.ID
	customer.UpdatedAt = time.Now()

	if err := h.customerRepo.UpdateCustomer(ctx, customerID, customer); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"customer": customer})
}

// GetCustomerServiceOrders retrieves all service orders for a customer
func (h *CustomerHandler) GetCustomerServiceOrders(c *gin.Context) {
	id := c.Param("id")
	customerID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()
	orders, err := h.serviceOrderRepo.GetServiceOrdersByCustomerID(ctx, customerID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"orders": orders})
}
