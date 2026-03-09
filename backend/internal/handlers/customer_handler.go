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
	customerRepo     *repository.CustomerRepository
	serviceOrderRepo *repository.ServiceOrderRepository
	employeeRepo     *repository.EmployeeRepository
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
	Name                      string          `json:"name" binding:"required"`
	CPF                       string          `json:"cpf"` // Opcional para clientes avulsos
	Phone                     string          `json:"phone" binding:"required"`
	Email                     string          `json:"email,omitempty"`
	Address                   *models.Address `json:"address,omitempty"`
	IsTemporary               bool            `json:"isTemporary,omitempty"`
	Notes                     string          `json:"notes,omitempty"`
	MaintenanceIntervalMonths int             `json:"maintenanceIntervalMonths,omitempty"` // 0 = sem alerta
}

type UpdateCustomerRequest struct {
	Name                      string          `json:"name,omitempty"`
	CPF                       string          `json:"cpf,omitempty"`
	Phone                     string          `json:"phone,omitempty"`
	Email                     string          `json:"email,omitempty"`
	Address                   *models.Address `json:"address,omitempty"`
	Notes                     string          `json:"notes,omitempty"`
	MaintenanceIntervalMonths *int            `json:"maintenanceIntervalMonths,omitempty"` // ponteiro para distinguir 0 explícito
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
	// Admin and Super Admin can create customers even without an Employee record
	currentEmployee, err := h.employeeRepo.GetEmployeeByUserID(ctx, currentUser.ID)
	if err != nil || currentEmployee == nil {
		// If user is admin or super admin, allow creation without Employee record
		if !currentUser.IsAdmin() {
			utils.RespondWithForbidden(c, "")
			return
		}
		// For admin/super admin without Employee, we'll use User ID for createdBy
	}

	// Check if customer with CPF already exists (only if CPF is provided)
	if req.CPF != "" {
		existingCustomer, err := h.customerRepo.GetCustomerByCPF(ctx, req.CPF)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}
		if existingCustomer != nil {
			utils.RespondWithConflict(c, "Cliente com este CPF já existe")
			return
		}
	}

	// Determine createdBy - use Employee ID if available, otherwise use User ID for super admin
	var createdBy primitive.ObjectID
	var updatedBy primitive.ObjectID
	if currentEmployee != nil {
		createdBy = currentEmployee.ID
		updatedBy = currentEmployee.ID
	} else {
		// For super admin without Employee, use User ID
		createdBy = currentUser.ID
		updatedBy = currentUser.ID
	}

	// Create customer
	customer := &models.Customer{
		Name:                      req.Name,
		CPF:                       req.CPF,
		Phone:                     req.Phone,
		Email:                     req.Email,
		Address:                   req.Address,
		IsTemporary:               req.IsTemporary,
		Notes:                     req.Notes,
		MaintenanceIntervalMonths: req.MaintenanceIntervalMonths,
		CreatedBy:                 createdBy,
		UpdatedBy:                 updatedBy,
		CreatedAt:                 time.Now(),
		UpdatedAt:                 time.Now(),
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
	// Admin and Super Admin can update customers even without an Employee record
	currentEmployee, err := h.employeeRepo.GetEmployeeByUserID(ctx, currentUser.ID)
	if err != nil || currentEmployee == nil {
		// If user is admin or super admin, allow update without Employee record
		if !currentUser.IsAdmin() {
			utils.RespondWithForbidden(c, "")
			return
		}
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
	if req.Notes != "" {
		customer.Notes = req.Notes
	}
	if req.MaintenanceIntervalMonths != nil {
		customer.MaintenanceIntervalMonths = *req.MaintenanceIntervalMonths
		// Recalcular próxima data de manutenção se houver data de última manutenção
		if customer.LastMaintenanceDate != nil && *req.MaintenanceIntervalMonths > 0 {
			next := customer.LastMaintenanceDate.AddDate(0, *req.MaintenanceIntervalMonths, 0)
			customer.NextMaintenanceDate = &next
		} else {
			customer.NextMaintenanceDate = nil
		}
		customer.MaintenanceAlertSent = false // Resetar flag ao alterar intervalo
	}
	// CPF não pode ser alterado (dado único)

	// Determine updatedBy - use Employee ID if available, otherwise use User ID for super admin
	if currentEmployee != nil {
		customer.UpdatedBy = currentEmployee.ID
	} else {
		customer.UpdatedBy = currentUser.ID
	}
	customer.UpdatedAt = time.Now()

	if err := h.customerRepo.UpdateCustomer(ctx, customerID, customer); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"customer": customer})
}

// DeleteCustomer deletes a customer
func (h *CustomerHandler) DeleteCustomer(c *gin.Context) {
	id := c.Param("id")
	customerID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()

	// Check if customer has service orders
	orders, err := h.serviceOrderRepo.GetServiceOrdersByCustomerID(ctx, customerID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if len(orders) > 0 {
		utils.RespondWithConflict(c, "Não é possível deletar cliente com ordens de serviço associadas")
		return
	}

	// Delete customer
	if err := h.customerRepo.DeleteCustomer(ctx, customerID); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
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
