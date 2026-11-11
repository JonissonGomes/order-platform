package handlers

import (
	"net/http"
	"strings"
	"time"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/notifications"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	orderCodeLength  = 8
	orderCodeRetries = 8
)

type ServiceOrderHandler struct {
	orderRepo      *repository.ServiceOrderRepository
	customerRepo   *repository.CustomerRepository
	departmentRepo *repository.DepartmentRepository
	historyRepo    *repository.StatusHistoryRepository
	employeeRepo   *repository.EmployeeRepository
	branchRepo     *repository.BranchRepository
	productRepo    *repository.ProductRepository
	movementRepo   *repository.InventoryMovementRepository
	notifier       notifications.NotificationChannel
}

func NewServiceOrderHandler(
	orderRepo *repository.ServiceOrderRepository,
	customerRepo *repository.CustomerRepository,
	departmentRepo *repository.DepartmentRepository,
	historyRepo *repository.StatusHistoryRepository,
	employeeRepo *repository.EmployeeRepository,
	branchRepo *repository.BranchRepository,
	productRepo *repository.ProductRepository,
	movementRepo *repository.InventoryMovementRepository,
	notifier notifications.NotificationChannel,
) *ServiceOrderHandler {
	if notifier == nil {
		notifier = notifications.NoopChannel{}
	}
	return &ServiceOrderHandler{
		orderRepo:      orderRepo,
		customerRepo:   customerRepo,
		departmentRepo: departmentRepo,
		historyRepo:    historyRepo,
		employeeRepo:   employeeRepo,
		branchRepo:     branchRepo,
		productRepo:    productRepo,
		movementRepo:   movementRepo,
		notifier:       notifier,
	}
}

type CreateServiceOrderRequest struct {
	CustomerID         string     `json:"customerId" binding:"required"`
	BranchID           string     `json:"branchId,omitempty"`
	DepartmentID       string     `json:"departmentId,omitempty"`
	AssignedTo         string     `json:"assignedTo,omitempty"`
	ProductType        string     `json:"productType,omitempty"`
	ProductBrand       string     `json:"productBrand,omitempty"`
	ProductModel       string     `json:"productModel,omitempty"`
	IMEI               string     `json:"imei,omitempty"`
	ServiceType        string     `json:"serviceType,omitempty"`
	ProblemDescription string     `json:"problemDescription" binding:"required"`
	InitialEvaluation  string     `json:"initialEvaluation,omitempty"`
	Checklist          []string   `json:"checklist,omitempty"`
	EstimatedCost      float64    `json:"estimatedCost,omitempty"`
	DepositAmount      float64    `json:"depositAmount,omitempty"`
	WarrantyDays       int        `json:"warrantyDays,omitempty"`
	ExpectedAt         *time.Time `json:"expectedAt,omitempty"`
}

type UpdateServiceOrderRequest struct {
	DepartmentID       *string    `json:"departmentId,omitempty"`
	ProductType        *string    `json:"productType,omitempty"`
	ProductBrand       *string    `json:"productBrand,omitempty"`
	ProductModel       *string    `json:"productModel,omitempty"`
	IMEI               *string    `json:"imei,omitempty"`
	ServiceType        *string    `json:"serviceType,omitempty"`
	ProblemDescription *string    `json:"problemDescription,omitempty"`
	InitialEvaluation  *string    `json:"initialEvaluation,omitempty"`
	Checklist          *[]string  `json:"checklist,omitempty"`
	EstimatedCost      *float64   `json:"estimatedCost,omitempty"`
	FinalCost          *float64   `json:"finalCost,omitempty"`
	DepositAmount      *float64   `json:"depositAmount,omitempty"`
	WarrantyDays       *int       `json:"warrantyDays,omitempty"`
	ExpectedAt         *time.Time `json:"expectedAt,omitempty"`
}

// ListServiceOrders lista ordens (filtros: status, q, branchId, assignedTo, customerId)
func (h *ServiceOrderHandler) ListServiceOrders(c *gin.Context) {
	page, limit, skip := parsePagination(c)
	ctx := c.Request.Context()

	filter, err := h.buildListFilter(c)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	orders, err := h.orderRepo.ListServiceOrders(ctx, skip, limit, filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	total, err := h.orderRepo.CountServiceOrders(ctx, filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if err := h.populateCustomers(c, orders); err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	for _, order := range orders {
		order.StatusLabel = models.StatusLabel(order.Status)
	}

	c.JSON(http.StatusOK, gin.H{"orders": orders, "total": total, "page": page, "limit": limit})
}

// GetServiceOrder retorna uma ordem com cliente, departamento, responsável e histórico
func (h *ServiceOrderHandler) GetServiceOrder(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}

	ctx := c.Request.Context()
	order, err := h.orderRepo.GetServiceOrderByID(ctx, id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if order == nil {
		utils.RespondWithNotFound(c, utils.ErrOrderNotFound)
		return
	}

	h.populateDetails(c, order)
	history, err := h.historyRepo.GetStatusHistoryByServiceOrderID(ctx, id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if history == nil {
		history = []*models.StatusHistory{}
	}

	c.JSON(http.StatusOK, gin.H{"order": order, "history": history})
}

// CreateServiceOrder cria uma ordem com código alfanumérico único (sem prefixo OS-).
func (h *ServiceOrderHandler) CreateServiceOrder(c *gin.Context) {
	var req CreateServiceOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}
	actor := requireActor(c)
	if actor == nil {
		return
	}

	ctx := c.Request.Context()
	order, ok := h.orderFromRequest(c, &req, actor)
	if !ok {
		return
	}

	var created bool
	for attempt := 0; attempt < orderCodeRetries; attempt++ {
		code, err := utils.RandomOrderCode(orderCodeLength)
		if err != nil {
			utils.RespondWithInternalError(c)
			return
		}
		order.OrderNumber = code
		if err := h.orderRepo.CreateServiceOrder(ctx, order); err != nil {
			if isDuplicateKey(err) {
				continue
			}
			utils.RespondWithInternalError(c)
			return
		}
		created = true
		break
	}
	if !created {
		utils.RespondWithInternalError(c)
		return
	}

	h.recordHistory(c, order, "", models.StatusPending, "Ordem de serviço criada", actor)

	order.StatusLabel = models.StatusLabel(order.Status)
	c.JSON(http.StatusCreated, gin.H{"order": order})
}

// UpdateServiceOrder atualiza os dados da ordem (não altera status; use /status)
func (h *ServiceOrderHandler) UpdateServiceOrder(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req UpdateServiceOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}
	actor := requireActor(c)
	if actor == nil {
		return
	}

	ctx := c.Request.Context()
	order, err := h.orderRepo.GetServiceOrderByID(ctx, id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if order == nil {
		utils.RespondWithNotFound(c, utils.ErrOrderNotFound)
		return
	}

	if err := applyOrderUpdate(order, &req); err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}
	order.UpdatedBy = actor.ID

	if err := h.orderRepo.UpdateServiceOrder(ctx, id, order); err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	order.StatusLabel = models.StatusLabel(order.Status)
	c.JSON(http.StatusOK, gin.H{"order": order})
}

// orderFromRequest valida a requisição e monta a ordem (status inicial: pending)
func (h *ServiceOrderHandler) orderFromRequest(c *gin.Context, req *CreateServiceOrderRequest, actor *models.Employee) (*models.ServiceOrder, bool) {
	ctx := c.Request.Context()

	customerID, err := primitive.ObjectIDFromHex(req.CustomerID)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return nil, false
	}
	customer, err := h.customerRepo.GetCustomerByID(ctx, customerID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return nil, false
	}
	if customer == nil {
		utils.RespondWithBadRequest(c, utils.ErrCustomerNotFound)
		return nil, false
	}

	branchID, err := resolveBranchID(ctx, h.branchRepo, req.BranchID)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrBranchNotFound)
		return nil, false
	}
	departmentID, err1 := parseOptionalID(req.DepartmentID)
	assignedTo, err2 := parseOptionalID(req.AssignedTo)
	if err1 != nil || err2 != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return nil, false
	}
	if strings.TrimSpace(req.ProblemDescription) == "" {
		utils.RespondWithBadRequest(c, "")
		return nil, false
	}

	return &models.ServiceOrder{
		BranchID:           branchID,
		CustomerID:         customerID,
		ProductType:        req.ProductType,
		ProductBrand:       req.ProductBrand,
		ProductModel:       req.ProductModel,
		DeviceLabel:        deviceLabel(req.ProductBrand, req.ProductModel),
		IMEI:               strings.TrimSpace(req.IMEI),
		ServiceType:        req.ServiceType,
		ProblemDescription: strings.TrimSpace(req.ProblemDescription),
		InitialEvaluation:  req.InitialEvaluation,
		Checklist:          req.Checklist,
		Status:             models.StatusPending,
		DepartmentID:       departmentID,
		AssignedTo:         assignedTo,
		EstimatedCost:      req.EstimatedCost,
		DepositAmount:      req.DepositAmount,
		WarrantyDays:       req.WarrantyDays,
		ExpectedAt:         req.ExpectedAt,
		StatusChangedBy:    actor.ID,
		StatusChangedAt:    time.Now(),
		CreatedBy:          actor.ID,
		UpdatedBy:          actor.ID,
	}, true
}

func (h *ServiceOrderHandler) buildListFilter(c *gin.Context) (bson.M, error) {
	filter := bson.M{}
	if status := c.Query("status"); status != "" {
		filter["status"] = status
	}
	for param, field := range map[string]string{"branchId": "branchId", "assignedTo": "assignedTo", "customerId": "customerId"} {
		if raw := c.Query(param); raw != "" {
			oid, err := primitive.ObjectIDFromHex(raw)
			if err != nil {
				return nil, err
			}
			filter[field] = oid
		}
	}

	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		return filter, nil
	}

	search := repository.SearchFilter(q, "orderNumber", "imei", "productBrand", "productModel", "deviceLabel")
	or := search["$or"].(bson.A)
	// Inclui ordens de clientes cujo nome/telefone/CPF casam com a busca
	customers, err := h.customerRepo.ListCustomers(c.Request.Context(), 0, 100,
		repository.SearchFilter(q, "name", "phone", "cpf"))
	if err == nil && len(customers) > 0 {
		ids := make([]primitive.ObjectID, len(customers))
		for i, customer := range customers {
			ids[i] = customer.ID
		}
		or = append(or, bson.M{"customerId": bson.M{"$in": ids}})
	}
	filter["$and"] = bson.A{bson.M{"$or": or}}
	return filter, nil
}
