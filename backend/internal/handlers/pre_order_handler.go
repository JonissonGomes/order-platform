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

type PreOrderHandler struct {
	preOrderRepo     *repository.PreOrderRepository
	customerRepo     *repository.CustomerRepository
	departmentRepo   *repository.DepartmentRepository
	serviceOrderRepo *repository.ServiceOrderRepository
}

func NewPreOrderHandler(
	preOrderRepo *repository.PreOrderRepository,
	customerRepo *repository.CustomerRepository,
	departmentRepo *repository.DepartmentRepository,
	serviceOrderRepo *repository.ServiceOrderRepository,
) *PreOrderHandler {
	return &PreOrderHandler{
		preOrderRepo:     preOrderRepo,
		customerRepo:     customerRepo,
		departmentRepo:   departmentRepo,
		serviceOrderRepo: serviceOrderRepo,
	}
}

type CreatePreOrderPublicRequest struct {
	Name     string `json:"fullName" binding:"required"`
	Email    string `json:"email,omitempty"`
	Phone    string `json:"phone" binding:"required"`
	EquipmentText      string `json:"equipmentText" binding:"required"`
	ProblemDescription string `json:"problemDescription" binding:"required"`
}

type ApprovePreOrderStatusRequest struct {
	Status       models.PreOrderStatus `json:"status" binding:"required"`
	DepartmentID string                 `json:"departmentId,omitempty"`
}

type SearchPreOrdersPublicRequest struct {
	Phone string `json:"phone" binding:"required"`
}

func (h *PreOrderHandler) generatePreOrderNumber() (string, error) {
	// Use the same generator format used for OS, but with a different prefix.
	randomCode, err := utils.GenerateRandomOrderNumber()
	if err != nil {
		return "", err
	}
	// randomCode is "ODG-XXXXXXXX"
	return fmt.Sprintf("PRE-%s", randomCode[len("ODG-"):]), nil
}

// CreatePreOrderPublic handles POST /api/public/pre-orders
func (h *PreOrderHandler) CreatePreOrderPublic(c *gin.Context) {
	var req CreatePreOrderPublicRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.SanitizeValidationError(err)})
		return
	}

	ctx := c.Request.Context()
	customerPhone := req.Phone

	// Try to reuse existing customer by phone
	customer, err := h.customerRepo.GetCustomerByPhone(ctx, customerPhone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar cliente"})
		return
	}
	if customer == nil {
		customer = &models.Customer{
			Name:        req.Name,
			CPF:         "",
			Phone:       customerPhone,
			Email:       req.Email,
			Address:     nil,
			IsTemporary: true,
			IsSuspended: false,
			Notes:       "",
			CreatedBy:   primitive.NilObjectID,
			UpdatedBy:   primitive.NilObjectID,
		}
		if err := h.customerRepo.CreateCustomer(ctx, customer); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar cliente"})
			return
		}
	}

	preOrderNumber, err := h.generatePreOrderNumber()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar identificador da pré-ordem"})
		return
	}

	preOrder := &models.PreOrder{
		ID:                 primitive.NewObjectID(),
		PreOrderNumber:    preOrderNumber,
		CustomerName:      req.Name,
		CustomerPhone:     customerPhone,
		CustomerID:        customer.ID,
		EquipmentText:     req.EquipmentText,
		ProblemDescription: req.ProblemDescription,
		Status:            models.PreOrderStatusEvaluating,
		DepartmentID:      nil,
		DepartmentName:    "",
		ConvertedToOSID:  nil,
		ConvertedAt:       nil,
		CreatedBy:         primitive.NilObjectID,
		UpdatedBy:         primitive.NilObjectID,
	}

	if err := h.preOrderRepo.CreatePreOrder(ctx, preOrder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar pré-ordem"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"preOrder": preOrder,
		"message":  "Pré-ordem recebida com sucesso",
	})
}

// SearchPreOrdersPublic searches pre-orders by phone (public endpoint).
// Only pre-orders in evaluating/approved are returned for "tracking" UX.
func (h *PreOrderHandler) SearchPreOrdersPublic(c *gin.Context) {
	var req SearchPreOrdersPublicRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.SanitizeValidationError(err)})
		return
	}

	ctx := c.Request.Context()

	customer, err := h.customerRepo.GetCustomerByPhone(ctx, req.Phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar cliente"})
		return
	}

	// If there's no customer, return 404-like behavior (no data found).
	if customer == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Nenhuma pré-ordem encontrada"})
		return
	}

	page, _ := strconv.ParseInt(c.DefaultQuery("page", "1"), 10, 64)
	limit, _ := strconv.ParseInt(c.DefaultQuery("limit", "20"), 10, 64)
	if limit > 100 {
		limit = 100
	}
	skip := (page - 1) * limit

	filter := bson.M{
		"customerPhone": req.Phone,
		"status": bson.M{
			"$in": bson.A{
				models.PreOrderStatusEvaluating,
				models.PreOrderStatusApproved,
			},
		},
	}

	preOrders, err := h.preOrderRepo.ListPreOrders(ctx, skip, limit, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar pré-ordens"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"preOrders": preOrders,
		"customer": gin.H{
			"name": customer.Name,
		},
	})
}

// ListPreOrders handles GET /api/pre-orders
func (h *PreOrderHandler) ListPreOrders(c *gin.Context) {
	page, _ := strconv.ParseInt(c.DefaultQuery("page", "1"), 10, 64)
	limit, _ := strconv.ParseInt(c.DefaultQuery("limit", "20"), 10, 64)
	if limit > 100 {
		limit = 100
	}
	skip := (page - 1) * limit

	ctx := c.Request.Context()
	filter := bson.M{}

	// Segurança/UX: por padrão, mostrar somente o departamento do funcionário logado.
	currentEmployee := middleware.GetEmployeeFromContext(c)

	if status := c.Query("status"); status != "" {
		filter["status"] = models.PreOrderStatus(status)
	}

	deptID := c.Query("departmentId")
	if deptID == "" {
		// Importante: Pré-ordens no status inicial chegam sem departmentId (atendente escolhe).
		// Então exibimos:
		// - pré-ordens do departamento do atendente (departmentId preenchido)
		// - pré-ordens "sem departamento" (departmentId ausente/nulo)
		if currentEmployee != nil && !currentEmployee.DepartmentID.IsZero() {
			orFilter := bson.A{
				bson.M{"departmentId": currentEmployee.DepartmentID},
				bson.M{"departmentId": nil},
				bson.M{"departmentId": bson.M{"$exists": false}},
			}
			filter["$or"] = orFilter
		}
	} else {
		departmentID, err := primitive.ObjectIDFromHex(deptID)
		if err == nil {
			// Se o funcionário tiver departamento vinculado, impedir leitura de outros departamentos.
			if currentEmployee != nil && !currentEmployee.DepartmentID.IsZero() && currentEmployee.DepartmentID != departmentID {
				// Dono/Admin podem visualizar tudo; dept_manager e attendant apenas o próprio.
				if currentEmployee.Role != "dono" && currentEmployee.Role != "admin" {
					c.JSON(http.StatusForbidden, gin.H{"error": "Você só pode visualizar pré-ordens do seu departamento"})
					return
				}
			}

			// Exibir também pré-ordens sem departmentId (evaluating) para o atendente.
			orFilter := bson.A{
				bson.M{"departmentId": departmentID},
				bson.M{"departmentId": nil},
				bson.M{"departmentId": bson.M{"$exists": false}},
			}
			filter["$or"] = orFilter
		}
	}

	preOrders, err := h.preOrderRepo.ListPreOrders(ctx, skip, limit, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar pré-ordens"})
		return
	}

	// Populate departmentName (if set)
	for _, po := range preOrders {
		if po.DepartmentID != nil && !po.DepartmentID.IsZero() {
			dept, err := h.departmentRepo.GetDepartmentByID(ctx, *po.DepartmentID)
			if err == nil && dept != nil {
				po.DepartmentName = dept.Name
			}
		}
	}

	total, err := h.preOrderRepo.CountPreOrders(ctx, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao contar pré-ordens"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"preOrders": preOrders,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// UpdatePreOrderStatusAndConvert handles PATCH /api/pre-orders/:id/status
// When status is "approved", it converts the PreOrder into a ServiceOrder.
func (h *PreOrderHandler) UpdatePreOrderStatusAndConvert(c *gin.Context) {
	id := c.Param("id")
	preOrderID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	var req ApprovePreOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": utils.SanitizeValidationError(err)})
		return
	}

	ctx := c.Request.Context()
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Não autorizado"})
		return
	}

	preOrder, err := h.preOrderRepo.GetPreOrderByID(ctx, preOrderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar pré-ordem"})
		return
	}
	if preOrder == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pré-ordem não encontrada"})
		return
	}

	if preOrder.Status == models.PreOrderStatusConverted {
		c.JSON(http.StatusConflict, gin.H{"error": "Pré-ordem já convertida"})
		return
	}
	if preOrder.Status == models.PreOrderStatusCancelled {
		c.JSON(http.StatusConflict, gin.H{"error": "Pré-ordem cancelada"})
		return
	}

	if req.Status != models.PreOrderStatusApproved {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Somente status approved é suportado por este endpoint"})
		return
	}

	// Role validation
	if currentEmployee.Role != "attendant" && currentEmployee.Role != "dono" && currentEmployee.Role != "admin" && currentEmployee.Role != "department_manager" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Você não tem permissão para aprovar"})
		return
	}

	// Resolve department
	departmentID := primitive.ObjectID{}
	if req.DepartmentID != "" {
		departmentID, err = primitive.ObjectIDFromHex(req.DepartmentID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ID do departamento inválido"})
			return
		}
	} else if !currentEmployee.DepartmentID.IsZero() {
		departmentID = currentEmployee.DepartmentID
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "departmentId é obrigatório para aprovar"})
		return
	}

	// Enforce employee department when linked
	if !currentEmployee.DepartmentID.IsZero() && currentEmployee.DepartmentID != departmentID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Você só pode aprovar pré-ordens do seu departamento"})
		return
	}

	// Basic required data check before conversion
	if preOrder.EquipmentText == "" || preOrder.ProblemDescription == "" || preOrder.CustomerID.IsZero() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Pré-ordem incompleta para conversão"})
		return
	}

	// Ensure department exists (and fetch name)
	dept, err := h.departmentRepo.GetDepartmentByID(ctx, departmentID)
	if err != nil || dept == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Departamento inválido"})
		return
	}

	// Generate OS order number (must be unique)
	orderNumber, err := h.generateUniqueOrderNumber(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar número da ordem"})
		return
	}

	now := time.Now()
	order := &models.ServiceOrder{
		OrderNumber:         orderNumber,
		CustomerID:          preOrder.CustomerID,
		ProductType:         preOrder.EquipmentText,
		ProductBrand:        "",
		ProductModel:        "",
		SerialNumber:        "",
		AestheticConditions: "",
		ProblemDescription:  preOrder.ProblemDescription,
		Status:              models.StatusPending,
		DepartmentID:        departmentID,
		EntryDate:           &now,
		Images:              []models.Image{},
		ServiceItems:        []models.ServiceItem{},
		Notes:               []models.Note{},
		CreatedBy:           currentEmployee.ID,
		UpdatedBy:           currentEmployee.ID,
		CreatedAt:           now,
		UpdatedAt:           now,
	}

	if err := h.serviceOrderRepo.CreateServiceOrder(ctx, order); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar ordem de serviço"})
		return
	}

	convertedTo := order.ID
	preOrder.ConvertedToOSID = &convertedTo
	preOrder.ConvertedAt = &now
	preOrder.DepartmentID = &departmentID
	preOrder.DepartmentName = dept.Name
	preOrder.Status = models.PreOrderStatusConverted
	preOrder.UpdatedBy = currentEmployee.ID
	preOrder.UpdatedAt = now

	if err := h.preOrderRepo.UpdatePreOrder(ctx, preOrder.ID, preOrder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar pré-ordem após conversão"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"preOrder": preOrder,
		"order":    order,
	})
}

func (h *PreOrderHandler) generateUniqueOrderNumber(ctx context.Context) (string, error) {
	maxAttempts := 100
	for i := 0; i < maxAttempts; i++ {
		orderNumber, err := utils.GenerateRandomOrderNumber()
		if err != nil {
			return "", fmt.Errorf("failed to generate order number: %w", err)
		}
		existing, err := h.serviceOrderRepo.GetServiceOrderByOrderNumber(ctx, orderNumber)
		if err != nil {
			return "", err
		}
		if existing == nil {
			return orderNumber, nil
		}
	}
	return "", fmt.Errorf("failed to generate unique order number after %d attempts", maxAttempts)
}

