package handlers

import (
	"net/http"
	"time"

	"order-platform/backend/internal/auth"
	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PublicHandler struct {
	customerRepo     *repository.CustomerRepository
	serviceOrderRepo *repository.ServiceOrderRepository
	employeeRepo     *repository.EmployeeRepository
}

func NewPublicHandler(
	customerRepo *repository.CustomerRepository,
	serviceOrderRepo *repository.ServiceOrderRepository,
	employeeRepo *repository.EmployeeRepository,
) *PublicHandler {
	return &PublicHandler{
		customerRepo:     customerRepo,
		serviceOrderRepo: serviceOrderRepo,
		employeeRepo:     employeeRepo,
	}
}

type SearchServiceOrderRequest struct {
	OrderNumber string `json:"orderNumber,omitempty"`
	CPF         string `json:"cpf,omitempty"`
	Phone       string `json:"phone,omitempty"`
	Email       string `json:"email,omitempty"`
}

// SearchServiceOrder searches for a service order by order number, CPF, or phone
// This is a public endpoint (no auth required)
func (h *PublicHandler) SearchServiceOrder(c *gin.Context) {
	var req SearchServiceOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()

	// Search by order number (highest priority)
	if req.OrderNumber != "" {
		order, err := h.serviceOrderRepo.GetServiceOrderByOrderNumber(ctx, req.OrderNumber)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}
		if order == nil {
			utils.RespondWithNotFound(c, "Ordem de serviço não encontrada")
			return
		}

		// Return order with limited information (public view)
		c.JSON(http.StatusOK, gin.H{
			"order": gin.H{
				"orderNumber":        order.OrderNumber,
				"status":             order.Status,
				"productType":        order.ProductType,
				"productBrand":       order.ProductBrand,
				"productModel":       order.ProductModel,
				"problemDescription": order.ProblemDescription,
				"createdAt":          order.CreatedAt,
				"updatedAt":          order.UpdatedAt,
			},
		})
		return
	}

	// Search by CPF
	if req.CPF != "" {
		customer, err := h.customerRepo.GetCustomerByCPF(ctx, req.CPF)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}
		if customer == nil {
			utils.RespondWithNotFound(c, "Cliente não encontrado")
			return
		}

		// Get all orders for this customer
		orders, err := h.serviceOrderRepo.GetServiceOrdersByCustomerID(ctx, customer.ID)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}

		// Return limited information
		publicOrders := make([]gin.H, 0, len(orders))
		for _, order := range orders {
			publicOrders = append(publicOrders, gin.H{
				"orderNumber":  order.OrderNumber,
				"status":       order.Status,
				"productType":  order.ProductType,
				"productBrand": order.ProductBrand,
				"productModel": order.ProductModel,
				"createdAt":    order.CreatedAt,
				"updatedAt":    order.UpdatedAt,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"customer": gin.H{
				"name": customer.Name,
			},
			"orders": publicOrders,
		})
		return
	}

	// Search by phone
	if req.Phone != "" {
		customer, err := h.customerRepo.GetCustomerByPhone(ctx, req.Phone)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}
		if customer == nil {
			utils.RespondWithNotFound(c, "Cliente não encontrado")
			return
		}

		// Get all orders for this customer
		orders, err := h.serviceOrderRepo.GetServiceOrdersByCustomerID(ctx, customer.ID)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}

		// Return limited information
		publicOrders := make([]gin.H, 0, len(orders))
		for _, order := range orders {
			publicOrders = append(publicOrders, gin.H{
				"orderNumber":  order.OrderNumber,
				"status":       order.Status,
				"productType":  order.ProductType,
				"productBrand": order.ProductBrand,
				"productModel": order.ProductModel,
				"createdAt":    order.CreatedAt,
				"updatedAt":    order.UpdatedAt,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"customer": gin.H{
				"name": customer.Name,
			},
			"orders": publicOrders,
		})
		return
	}

	// Search by email
	if req.Email != "" {
		customer, err := h.customerRepo.GetCustomerByEmail(ctx, req.Email)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}
		if customer == nil {
			utils.RespondWithNotFound(c, "Cliente não encontrado")
			return
		}

		// Get all orders for this customer
		orders, err := h.serviceOrderRepo.GetServiceOrdersByCustomerID(ctx, customer.ID)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}

		// Return limited information
		publicOrders := make([]gin.H, 0, len(orders))
		for _, order := range orders {
			publicOrders = append(publicOrders, gin.H{
				"orderNumber":  order.OrderNumber,
				"status":       order.Status,
				"productType":  order.ProductType,
				"productBrand": order.ProductBrand,
				"productModel": order.ProductModel,
				"createdAt":    order.CreatedAt,
				"updatedAt":    order.UpdatedAt,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"customer": gin.H{
				"name": customer.Name,
			},
			"orders": publicOrders,
		})
		return
	}

	utils.RespondWithBadRequest(c, "É necessário informar número da ordem, CPF, telefone ou email")
}

type RegisterCustomerRequest struct {
	Name     string          `json:"name" binding:"required"`
	Email    string          `json:"email" binding:"required,email"`
	Password string          `json:"password" binding:"required,min=6"`
	CPF      string          `json:"cpf,omitempty"`
	Phone    string          `json:"phone" binding:"required"`
	Address  *models.Address `json:"address,omitempty"`
	Notes    string          `json:"notes,omitempty"`
}

// RegisterCustomer creates a new customer account (public endpoint)
// This creates both a User and a Customer record
func (h *PublicHandler) RegisterCustomer(c *gin.Context) {
	var req RegisterCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()

	// Check if customer with email already exists
	existingCustomerByEmail, err := h.customerRepo.GetCustomerByEmail(ctx, req.Email)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if existingCustomerByEmail != nil {
		utils.RespondWithConflict(c, "Email já cadastrado")
		return
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

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Create customer with authentication fields
	customer := &models.Customer{
		Name:                      req.Name,
		CPF:                       req.CPF,
		Phone:                     req.Phone,
		Email:                     req.Email,
		Password:                  hashedPassword,
		Address:                   req.Address,
		Notes:                     req.Notes,
		MaintenanceIntervalMonths: 0,
		IsTemporary:               false,
		IsSuspended:               false,
		CreatedBy:                 primitive.NilObjectID, // Public registration, no employee creator
		UpdatedBy:                 primitive.NilObjectID,
		// CreatedAt and UpdatedAt will be set by CreateCustomer
	}

	if err := h.customerRepo.CreateCustomer(ctx, customer); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Create session token
	sessionPayload := auth.SessionPayload{
		UserID: customer.ID.Hex(),
		Email:  customer.Email,
		Name:   customer.Name,
		Role:   "customer",
		Type:   "customer",
	}

	oneYear := 365 * 24 * time.Hour
	sessionToken, err := auth.CreateSessionToken(sessionPayload, oneYear)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Set cookie
	c.SetCookie(
		"app_session_id",
		sessionToken,
		int(oneYear.Seconds()),
		"/",
		"",
		false, // isSecureRequest would need to be implemented
		true,
	)

	c.JSON(http.StatusCreated, gin.H{
		"user": gin.H{
			"id":    customer.ID.Hex(),
			"email": customer.Email,
			"name":  customer.Name,
			"role":  "customer",
			"type":  "customer",
		},
		"customer": gin.H{
			"id":    customer.ID.Hex(),
			"name":  customer.Name,
			"email": customer.Email,
		},
	})
}
