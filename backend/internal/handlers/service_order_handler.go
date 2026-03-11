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

type ServiceOrderHandler struct {
	serviceOrderRepo  *repository.ServiceOrderRepository
	customerRepo      *repository.CustomerRepository
	departmentRepo    *repository.DepartmentRepository
	employeeRepo      *repository.EmployeeRepository
	statusHistoryRepo *repository.StatusHistoryRepository
}

func NewServiceOrderHandler(
	serviceOrderRepo *repository.ServiceOrderRepository,
	customerRepo *repository.CustomerRepository,
	departmentRepo *repository.DepartmentRepository,
	employeeRepo *repository.EmployeeRepository,
	statusHistoryRepo *repository.StatusHistoryRepository,
) *ServiceOrderHandler {
	return &ServiceOrderHandler{
		serviceOrderRepo:  serviceOrderRepo,
		customerRepo:      customerRepo,
		departmentRepo:    departmentRepo,
		employeeRepo:      employeeRepo,
		statusHistoryRepo: statusHistoryRepo,
	}
}

type CreateCustomerForOrderRequest struct {
	Name    string          `json:"name" binding:"required"`
	CPF     string          `json:"cpf"` // Opcional para avulsos
	Phone   string          `json:"phone" binding:"required"`
	Email   string          `json:"email,omitempty"`
	Address *models.Address `json:"address,omitempty"`
}

type ServiceItemRequest struct {
	Name      string  `json:"name" binding:"required"`
	Quantity  float64 `json:"quantity" binding:"required"`
	UnitPrice float64 `json:"unitPrice"`
	ImageURL  string  `json:"imageUrl,omitempty"`
}

type PaymentInfoRequest struct {
	Method      string  `json:"method,omitempty"`
	DueDate     *string `json:"dueDate,omitempty"`
	Observation string  `json:"observation,omitempty"`
	Paid        bool    `json:"paid,omitempty"`
}

type DeliveryInfoRequest struct {
	Type         string          `json:"type"` // none, own, third
	Address      *models.Address `json:"address,omitempty"`
	DistanceKm   float64         `json:"distanceKm,omitempty"`
	Cost         float64         `json:"cost,omitempty"`
	ScheduledAt  *string         `json:"scheduledAt,omitempty"`
	Observations string          `json:"observations,omitempty"`
}

type CreateServiceOrderRequest struct {
	CustomerID          string                         `json:"customerId,omitempty"` // Opcional se criar cliente avulso
	Customer            *CreateCustomerForOrderRequest `json:"customer,omitempty"`   // Dados do cliente avulso
	ProductType         string                         `json:"productType" binding:"required"`
	ProductBrand        string                         `json:"productBrand" binding:"required"`
	ProductModel        string                         `json:"productModel" binding:"required"`
	SerialNumber        string                         `json:"serialNumber,omitempty"`
	AestheticConditions string                         `json:"aestheticConditions,omitempty"`
	ProblemDescription  string                         `json:"problemDescription" binding:"required"`
	InitialEvaluation   string                         `json:"initialEvaluation,omitempty"`
	TechnicalReport     string                         `json:"technicalReport,omitempty"`
	Solution            string                         `json:"solution,omitempty"`
	DepartmentID        string                         `json:"departmentId" binding:"required"`
	AssignedTo          string                         `json:"assignedTo,omitempty"`
	Images              []string                       `json:"images,omitempty"`
	ServiceItems        []ServiceItemRequest           `json:"serviceItems,omitempty"`
	EstimatedCost       float64                        `json:"estimatedCost,omitempty"`
	EstimatedDelivery   *string                        `json:"estimatedDelivery,omitempty"` // ISO 8601
	Priority            string                         `json:"priority,omitempty"`          // low, normal, high, urgent
	Payment             *PaymentInfoRequest            `json:"payment,omitempty"`
	Delivery            *DeliveryInfoRequest           `json:"delivery,omitempty"`
	WarrantyTerms       string                         `json:"warrantyTerms,omitempty"`
	Observations        string                         `json:"observations,omitempty"`
}

type UpdateServiceOrderRequest struct {
	ProductType         string               `json:"productType,omitempty"`
	ProductBrand        string               `json:"productBrand,omitempty"`
	ProductModel        string               `json:"productModel,omitempty"`
	SerialNumber        string               `json:"serialNumber,omitempty"`
	AestheticConditions string               `json:"aestheticConditions,omitempty"`
	ProblemDescription  string               `json:"problemDescription,omitempty"`
	InitialEvaluation   string               `json:"initialEvaluation,omitempty"`
	TechnicalReport     string               `json:"technicalReport,omitempty"`
	Solution            string               `json:"solution,omitempty"`
	DepartmentID        string               `json:"departmentId,omitempty"`
	AssignedTo          string               `json:"assignedTo,omitempty"`
	Images              []string             `json:"images,omitempty"`
	ServiceItems        []ServiceItemRequest `json:"serviceItems,omitempty"`
	EstimatedCost       *float64             `json:"estimatedCost,omitempty"`
	FinalCost           *float64             `json:"finalCost,omitempty"`
	EstimatedDelivery   *string              `json:"estimatedDelivery,omitempty"` // ISO 8601
	ExitDate            *string              `json:"exitDate,omitempty"`          // Data de saída real (ISO 8601)
	Priority            string               `json:"priority,omitempty"`          // low, normal, high, urgent
	Payment             *PaymentInfoRequest  `json:"payment,omitempty"`
	Delivery            *DeliveryInfoRequest `json:"delivery,omitempty"`
	WarrantyTerms       string               `json:"warrantyTerms,omitempty"`
	Observations        string               `json:"observations,omitempty"`
}

type UpdateStatusRequest struct {
	Status              models.ServiceOrderStatus `json:"status" binding:"required"`
	Notes               string                    `json:"notes,omitempty"`
	DeliveryEvidenceURL string                    `json:"deliveryEvidenceUrl,omitempty"` // URL da imagem de evidência quando status for "delivered"
	DeliveryEvidenceID  string                    `json:"deliveryEvidenceId,omitempty"`  // PublicID da imagem de evidência
}

type AddNoteRequest struct {
	Content string `json:"content" binding:"required"`
}

// generateUniqueOrderNumber generates a unique random alphanumeric order number
func (h *ServiceOrderHandler) generateUniqueOrderNumber(ctx context.Context) (string, error) {
	maxAttempts := 100
	for i := 0; i < maxAttempts; i++ {
		// Generate random order number
		orderNumber, err := utils.GenerateRandomOrderNumber()
		if err != nil {
			return "", fmt.Errorf("failed to generate order number: %w", err)
		}

		// Verify uniqueness
		existing, err := h.serviceOrderRepo.GetServiceOrderByOrderNumber(ctx, orderNumber)
		if err != nil {
			return "", err
		}
		if existing == nil {
			// Number is unique, return it
			return orderNumber, nil
		}
		// If exists, try again
	}

	return "", fmt.Errorf("failed to generate unique order number after %d attempts", maxAttempts)
}

// CreateServiceOrder creates a new service order
func (h *ServiceOrderHandler) CreateServiceOrder(c *gin.Context) {
	var req CreateServiceOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	// Determine createdBy
	createdBy := currentEmployee.ID

	// Handle customer: either use existing ID or create temporary customer
	var customerID primitive.ObjectID
	var customer *models.Customer

	if req.CustomerID != "" {
		// Use existing customer
		var err error
		customerID, err = primitive.ObjectIDFromHex(req.CustomerID)
		if err != nil {
			utils.RespondWithBadRequest(c, "ID do cliente inválido")
			return
		}

		// Verify customer exists
		customer, err = h.customerRepo.GetCustomerByID(ctx, customerID)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}
		if customer == nil {
			utils.RespondWithNotFound(c, "Cliente não encontrado")
			return
		}
	} else if req.Customer != nil {
		// Create temporary customer
		tempCustomer := &models.Customer{
			Name:        req.Customer.Name,
			CPF:         req.Customer.CPF, // Pode ser vazio para avulsos
			Phone:       req.Customer.Phone,
			Email:       req.Customer.Email,
			Address:     req.Customer.Address,
			IsTemporary: true,
			CreatedBy:   createdBy,
			UpdatedBy:   createdBy,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		// Check if customer with same phone already exists (if CPF not provided)
		if tempCustomer.CPF == "" {
			existing, err := h.customerRepo.GetCustomerByPhone(ctx, tempCustomer.Phone)
			if err != nil {
				utils.RespondWithInternalError(c)
				return
			}
			if existing != nil {
				// Use existing customer
				customerID = existing.ID
				customer = existing
			} else {
				// Create new temporary customer
				if err := h.customerRepo.CreateCustomer(ctx, tempCustomer); err != nil {
					utils.RespondWithInternalError(c)
					return
				}
				customerID = tempCustomer.ID
				customer = tempCustomer
			}
		} else {
			// Check if customer with CPF already exists
			existing, err := h.customerRepo.GetCustomerByCPF(ctx, tempCustomer.CPF)
			if err != nil {
				utils.RespondWithInternalError(c)
				return
			}
			if existing != nil {
				// Use existing customer
				customerID = existing.ID
				customer = existing
			} else {
				// Create new temporary customer
				if err := h.customerRepo.CreateCustomer(ctx, tempCustomer); err != nil {
					utils.RespondWithInternalError(c)
					return
				}
				customerID = tempCustomer.ID
				customer = tempCustomer
			}
		}
	} else {
		utils.RespondWithBadRequest(c, "É necessário informar o ID do cliente ou os dados do cliente avulso")
		return
	}

	departmentID, err := primitive.ObjectIDFromHex(req.DepartmentID)
	if err != nil {
		utils.RespondWithBadRequest(c, "ID do departamento inválido")
		return
	}

	// Verify department exists
	department, err := h.departmentRepo.GetDepartmentByID(ctx, departmentID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if department == nil {
		utils.RespondWithNotFound(c, "Departamento não encontrado")
		return
	}

	// Parse assignedTo if provided
	var assignedTo primitive.ObjectID
	if req.AssignedTo != "" {
		assignedTo, err = primitive.ObjectIDFromHex(req.AssignedTo)
		if err != nil {
			utils.RespondWithBadRequest(c, "ID do colaborador atribuído inválido")
			return
		}
	}

	// Generate unique order number using random alphanumeric format (ODG-XXXXXXXX)
	orderNumber, err := h.generateUniqueOrderNumber(ctx)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	// Debug log to verify the new format is being used
	fmt.Printf("[ServiceOrderHandler] Generated order number: %s\n", orderNumber)

	// Convert image URLs to Image models
	images := make([]models.Image, 0, len(req.Images))
	for _, url := range req.Images {
		images = append(images, models.Image{
			ID:         primitive.NewObjectID(),
			URL:        url,
			UploadedAt: time.Now(),
			UploadedBy: createdBy,
		})
	}

	// Parse estimated delivery date if provided
	var estimatedDelivery *time.Time
	if req.EstimatedDelivery != nil && *req.EstimatedDelivery != "" {
		parsed, err := time.Parse(time.RFC3339, *req.EstimatedDelivery)
		if err == nil {
			estimatedDelivery = &parsed
		}
	}

	// Set default priority if not provided
	priority := req.Priority
	if priority == "" {
		priority = "normal"
	}

	// Convert service items
	serviceItems := make([]models.ServiceItem, 0, len(req.ServiceItems))
	for _, item := range req.ServiceItems {
		serviceItems = append(serviceItems, models.ServiceItem{
			Name:      item.Name,
			Quantity:  item.Quantity,
			UnitPrice: item.UnitPrice,
			ImageURL:  item.ImageURL,
		})
	}

	// Parse payment info
	payment := models.PaymentInfo{}
	if req.Payment != nil {
		payment.Method = req.Payment.Method
		payment.Observation = req.Payment.Observation
		payment.Paid = req.Payment.Paid
		if req.Payment.DueDate != nil && *req.Payment.DueDate != "" {
			if parsed, err := time.Parse(time.RFC3339, *req.Payment.DueDate); err == nil {
				payment.DueDate = &parsed
			}
		}
	}

	// Parse delivery info
	var delivery *models.DeliveryInfo
	if req.Delivery != nil {
		delivery = &models.DeliveryInfo{
			Type:         models.DeliveryType(req.Delivery.Type),
			Address:      req.Delivery.Address,
			DistanceKm:   req.Delivery.DistanceKm,
			Cost:         req.Delivery.Cost,
			Observations: req.Delivery.Observations,
		}
		if req.Delivery.ScheduledAt != nil && *req.Delivery.ScheduledAt != "" {
			if parsed, err := time.Parse(time.RFC3339, *req.Delivery.ScheduledAt); err == nil {
				delivery.ScheduledAt = &parsed
			}
		}
	}

	now := time.Now()

	// Create service order
	order := &models.ServiceOrder{
		OrderNumber:         orderNumber,
		CustomerID:          customerID,
		ProductType:         req.ProductType,
		ProductBrand:        req.ProductBrand,
		ProductModel:        req.ProductModel,
		SerialNumber:        req.SerialNumber,
		AestheticConditions: req.AestheticConditions,
		ProblemDescription:  req.ProblemDescription,
		InitialEvaluation:   req.InitialEvaluation,
		TechnicalReport:     req.TechnicalReport,
		Solution:            req.Solution,
		Status:              models.StatusPending,
		DepartmentID:        departmentID,
		AssignedTo:          assignedTo,
		EntryDate:           &now,
		Images:              images,
		ServiceItems:        serviceItems,
		EstimatedCost:       req.EstimatedCost,
		EstimatedDelivery:   estimatedDelivery,
		Priority:            priority,
		Payment:             payment,
		Delivery:            delivery,
		WarrantyTerms:       req.WarrantyTerms,
		Observations:        req.Observations,
		Notes:               []models.Note{},
		CreatedBy:           createdBy,
		UpdatedBy:           createdBy,
		CreatedAt:           now,
		UpdatedAt:           now,
	}

	if err := h.serviceOrderRepo.CreateServiceOrder(ctx, order); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Populate customer before returning
	h.populateServiceOrderCustomer(ctx, order)

	c.JSON(http.StatusCreated, gin.H{"order": order})
}

// populateServiceOrderCustomer populates the Customer field for a service order
func (h *ServiceOrderHandler) populateServiceOrderCustomer(ctx context.Context, order *models.ServiceOrder) {
	if !order.CustomerID.IsZero() && order.Customer == nil {
		if customer, err := h.customerRepo.GetCustomerByID(ctx, order.CustomerID); err == nil && customer != nil {
			order.Customer = customer
		}
	}
}

// GetServiceOrder retrieves a service order by ID
func (h *ServiceOrderHandler) GetServiceOrder(c *gin.Context) {
	id := c.Param("id")
	orderID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()
	order, err := h.serviceOrderRepo.GetServiceOrderByID(ctx, orderID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if order == nil {
		utils.RespondWithNotFound(c, "Ordem de serviço não encontrada")
		return
	}

	h.populateServiceOrderCustomer(ctx, order)
	c.JSON(http.StatusOK, gin.H{"order": order})
}

// GetServiceOrderByOrderNumber retrieves a service order by order number (public)
func (h *ServiceOrderHandler) GetServiceOrderByOrderNumber(c *gin.Context) {
	orderNumber := c.Param("orderNumber")
	if orderNumber == "" {
		utils.RespondWithBadRequest(c, "Número da ordem é obrigatório")
		return
	}

	ctx := c.Request.Context()
	order, err := h.serviceOrderRepo.GetServiceOrderByOrderNumber(ctx, orderNumber)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if order == nil {
		utils.RespondWithNotFound(c, "Ordem de serviço não encontrada")
		return
	}

	c.JSON(http.StatusOK, gin.H{"order": order})
}

// ListServiceOrders lists service orders with filters
func (h *ServiceOrderHandler) ListServiceOrders(c *gin.Context) {
	ctx := c.Request.Context()
	filter := bson.M{}

	// Filter by status
	if status := c.Query("status"); status != "" {
		filter["status"] = status
	}

	// Filter by department
	if deptID := c.Query("departmentId"); deptID != "" {
		departmentID, err := primitive.ObjectIDFromHex(deptID)
		if err == nil {
			filter["departmentId"] = departmentID
		}
	}

	// Filter by customer
	if custID := c.Query("customerId"); custID != "" {
		customerID, err := primitive.ObjectIDFromHex(custID)
		if err == nil {
			filter["customerId"] = customerID
		}
	}

	// Filter by assigned employee
	if empID := c.Query("assignedTo"); empID != "" {
		employeeID, err := primitive.ObjectIDFromHex(empID)
		if err == nil {
			filter["assignedTo"] = employeeID
		}
	}

	// Filter by priority
	if priority := c.Query("priority"); priority != "" {
		filter["priority"] = priority
	}

	// Pagination
	page, _ := strconv.ParseInt(c.DefaultQuery("page", "1"), 10, 64)
	limit, _ := strconv.ParseInt(c.DefaultQuery("limit", "20"), 10, 64)
	if limit > 100 {
		limit = 100
	}
	skip := (page - 1) * limit

	orders, err := h.serviceOrderRepo.ListServiceOrders(ctx, skip, limit, filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Populate customer for each order
	for _, order := range orders {
		h.populateServiceOrderCustomer(ctx, order)
	}

	total, err := h.serviceOrderRepo.CountServiceOrders(ctx, filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"orders": orders,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// UpdateServiceOrder updates a service order
func (h *ServiceOrderHandler) UpdateServiceOrder(c *gin.Context) {
	id := c.Param("id")
	orderID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	var req UpdateServiceOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	// Determine updatedBy
	updatedBy := currentEmployee.ID

	// Get existing order
	order, err := h.serviceOrderRepo.GetServiceOrderByID(ctx, orderID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if order == nil {
		utils.RespondWithNotFound(c, "Ordem de serviço não encontrada")
		return
	}

	// Update fields
	if req.ProductType != "" {
		order.ProductType = req.ProductType
	}
	if req.ProductBrand != "" {
		order.ProductBrand = req.ProductBrand
	}
	if req.ProductModel != "" {
		order.ProductModel = req.ProductModel
	}
	if req.SerialNumber != "" {
		order.SerialNumber = req.SerialNumber
	}
	if req.AestheticConditions != "" {
		order.AestheticConditions = req.AestheticConditions
	}
	if req.ProblemDescription != "" {
		order.ProblemDescription = req.ProblemDescription
	}
	if req.InitialEvaluation != "" {
		order.InitialEvaluation = req.InitialEvaluation
	}
	if req.TechnicalReport != "" {
		order.TechnicalReport = req.TechnicalReport
	}
	if req.Solution != "" {
		order.Solution = req.Solution
	}
	if req.DepartmentID != "" {
		departmentID, err := primitive.ObjectIDFromHex(req.DepartmentID)
		if err != nil {
			utils.RespondWithBadRequest(c, "ID do departamento inválido")
			return
		}
		order.DepartmentID = departmentID
	}
	if req.AssignedTo != "" {
		assignedTo, err := primitive.ObjectIDFromHex(req.AssignedTo)
		if err != nil {
			utils.RespondWithBadRequest(c, "ID do colaborador inválido")
			return
		}
		order.AssignedTo = assignedTo
	}
	if req.EstimatedCost != nil {
		order.EstimatedCost = *req.EstimatedCost
	}
	if req.FinalCost != nil {
		order.FinalCost = *req.FinalCost
	}
	if req.WarrantyTerms != "" {
		order.WarrantyTerms = req.WarrantyTerms
	}
	if req.Observations != "" {
		order.Observations = req.Observations
	}
	if len(req.ServiceItems) > 0 {
		serviceItems := make([]models.ServiceItem, 0, len(req.ServiceItems))
		for _, item := range req.ServiceItems {
			serviceItems = append(serviceItems, models.ServiceItem{
				Name:      item.Name,
				Quantity:  item.Quantity,
				UnitPrice: item.UnitPrice,
				ImageURL:  item.ImageURL,
			})
		}
		order.ServiceItems = serviceItems
	}
	if req.Payment != nil {
		order.Payment.Method = req.Payment.Method
		order.Payment.Observation = req.Payment.Observation
		order.Payment.Paid = req.Payment.Paid
		if req.Payment.DueDate != nil && *req.Payment.DueDate != "" {
			if parsed, err := time.Parse(time.RFC3339, *req.Payment.DueDate); err == nil {
				order.Payment.DueDate = &parsed
			}
		}
	}
	if req.Delivery != nil {
		if order.Delivery == nil {
			order.Delivery = &models.DeliveryInfo{}
		}
		order.Delivery.Type = models.DeliveryType(req.Delivery.Type)
		order.Delivery.Address = req.Delivery.Address
		order.Delivery.DistanceKm = req.Delivery.DistanceKm
		order.Delivery.Cost = req.Delivery.Cost
		order.Delivery.Observations = req.Delivery.Observations
		if req.Delivery.ScheduledAt != nil && *req.Delivery.ScheduledAt != "" {
			if parsed, err := time.Parse(time.RFC3339, *req.Delivery.ScheduledAt); err == nil {
				order.Delivery.ScheduledAt = &parsed
			}
		}
	}
	if req.ExitDate != nil && *req.ExitDate != "" {
		if parsed, err := time.Parse(time.RFC3339, *req.ExitDate); err == nil {
			order.ExitDate = &parsed
		}
	}
	if req.EstimatedDelivery != nil && *req.EstimatedDelivery != "" {
		if parsed, err := time.Parse(time.RFC3339, *req.EstimatedDelivery); err == nil {
			order.EstimatedDelivery = &parsed
		}
	}

	order.UpdatedBy = updatedBy
	order.UpdatedAt = time.Now()

	if err := h.serviceOrderRepo.UpdateServiceOrder(ctx, orderID, order); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"order": order})
}

// UpdateServiceOrderStatus updates the status of a service order
func (h *ServiceOrderHandler) UpdateServiceOrderStatus(c *gin.Context) {
	id := c.Param("id")
	orderID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	var req UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	// Determine changedBy
	changedBy := currentEmployee.ID

	// Get existing order
	order, err := h.serviceOrderRepo.GetServiceOrderByID(ctx, orderID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if order == nil {
		utils.RespondWithNotFound(c, "Ordem de serviço não encontrada")
		return
	}

	// Admins and donos can transition to any status (they can fix mistakes / skip steps)
	isAdminUser := currentEmployee != nil && currentEmployee.IsAdmin()

	// Validate status transition for non-admins
	if !isAdminUser && !models.IsValidStatusTransition(order.Status, req.Status) {
		utils.RespondWithBadRequest(c, "Transição de status inválida")
		return
	}

	// Check if employee can change to this status
	if !isAdminUser && !currentEmployee.CanChangeStatus(req.Status) {
		utils.RespondWithForbidden(c, "Você não tem permissão para mudar para este status")
		return
	}

	previousStatus := order.Status
	order.Status = req.Status
	order.StatusChangedBy = changedBy
	order.StatusChangedAt = time.Now()
	order.UpdatedBy = changedBy
	order.UpdatedAt = time.Now()

	// Se status for "delivered" e houver evidência, salvar a imagem
	if req.Status == models.StatusDelivered && req.DeliveryEvidenceURL != "" {
		// Garantir que Delivery existe
		if order.Delivery == nil {
			order.Delivery = &models.DeliveryInfo{
				Type: models.DeliveryTypeNone,
			}
		}
		
		// Criar objeto Image para evidência
		evidenceImage := models.Image{
			ID:         primitive.NewObjectID(),
			URL:        req.DeliveryEvidenceURL,
			PublicID:   req.DeliveryEvidenceID,
			UploadedAt: time.Now(),
			UploadedBy: changedBy,
		}
		order.Delivery.DeliveryEvidence = &evidenceImage
		
		// Definir data de entrega se não estiver definida
		if order.Delivery.DeliveredAt == nil {
			now := time.Now()
			order.Delivery.DeliveredAt = &now
		}
	}

	// Update order
	if err := h.serviceOrderRepo.UpdateServiceOrder(ctx, orderID, order); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	// Create status history entry
	employeeRole := currentEmployee.Role
	departmentID := currentEmployee.DepartmentID

	statusHistory := &models.StatusHistory{
		ID:             primitive.NewObjectID(),
		ServiceOrderID: orderID,
		PreviousStatus: previousStatus,
		NewStatus:      req.Status,
		ChangedBy:      changedBy,
		EmployeeRole:   employeeRole,
		DepartmentID:   departmentID,
		Notes:          req.Notes,
		ChangedAt:      time.Now(),
	}

	// Get department name if available
	if currentEmployee != nil && !currentEmployee.DepartmentID.IsZero() {
		department, err := h.departmentRepo.GetDepartmentByID(ctx, currentEmployee.DepartmentID)
		if err == nil && department != nil {
			statusHistory.DepartmentName = department.Name
		}
	}

	if err := h.statusHistoryRepo.CreateStatusHistory(ctx, statusHistory); err != nil {
		// Log error but don't fail the request
		// Status was already updated
	}

	c.JSON(http.StatusOK, gin.H{
		"order":         order,
		"statusHistory": statusHistory,
	})
}

// AssignServiceOrder assigns a service order to an employee
func (h *ServiceOrderHandler) AssignServiceOrder(c *gin.Context) {
	id := c.Param("id")
	orderID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	var req struct {
		EmployeeID string `json:"employeeId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	// Determine updatedBy
	updatedBy := currentEmployee.ID

	// Get existing order
	order, err := h.serviceOrderRepo.GetServiceOrderByID(ctx, orderID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if order == nil {
		utils.RespondWithNotFound(c, "Ordem de serviço não encontrada")
		return
	}

	// Parse employee ID
	employeeID, err := primitive.ObjectIDFromHex(req.EmployeeID)
	if err != nil {
		utils.RespondWithBadRequest(c, "ID do colaborador inválido")
		return
	}

	// Verify employee exists
	employee, err := h.employeeRepo.GetEmployeeByID(ctx, employeeID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if employee == nil {
		utils.RespondWithNotFound(c, "Colaborador não encontrado")
		return
	}

	order.AssignedTo = employeeID
	order.UpdatedBy = updatedBy
	order.UpdatedAt = time.Now()

	if err := h.serviceOrderRepo.UpdateServiceOrder(ctx, orderID, order); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"order": order})
}

// AddNote adds a note to a service order
func (h *ServiceOrderHandler) AddNote(c *gin.Context) {
	id := c.Param("id")
	orderID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	var req AddNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}

	ctx := c.Request.Context()
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	// Determine createdBy
	noteCreatedBy := currentEmployee.ID

	// Get existing order
	order, err := h.serviceOrderRepo.GetServiceOrderByID(ctx, orderID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if order == nil {
		utils.RespondWithNotFound(c, "Ordem de serviço não encontrada")
		return
	}

	// Add note
	note := models.Note{
		ID:        primitive.NewObjectID(),
		Content:   req.Content,
		CreatedAt: time.Now(),
		CreatedBy: noteCreatedBy,
	}

	order.Notes = append(order.Notes, note)
	order.UpdatedBy = noteCreatedBy
	order.UpdatedAt = time.Now()

	if err := h.serviceOrderRepo.UpdateServiceOrder(ctx, orderID, order); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"order": order})
}

// GetServiceOrderHistory retrieves the complete history of a service order
func (h *ServiceOrderHandler) GetServiceOrderHistory(c *gin.Context) {
	id := c.Param("id")
	orderID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()

	// Get status history
	statusHistory, err := h.statusHistoryRepo.GetStatusHistoryByServiceOrderID(ctx, orderID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"statusHistory": statusHistory,
	})
}

// DeleteServiceOrder deletes a service order
func (h *ServiceOrderHandler) DeleteServiceOrder(c *gin.Context) {
	id := c.Param("id")
	orderID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()

	// Check if order exists
	order, err := h.serviceOrderRepo.GetServiceOrderByID(ctx, orderID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if order == nil {
		utils.RespondWithNotFound(c, "Ordem de serviço não encontrada")
		return
	}

	// Only allow deletion if order is pending or cancelled
	if order.Status != models.StatusPending && order.Status != models.StatusCancelled {
		utils.RespondWithBadRequest(c, "Apenas ordens pendentes ou canceladas podem ser deletadas")
		return
	}

	// Delete service order
	if err := h.serviceOrderRepo.DeleteServiceOrder(ctx, orderID); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
