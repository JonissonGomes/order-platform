package handlers

import (
	"net/http"
	"strings"
	"time"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

type CustomerHandler struct {
	customerRepo *repository.CustomerRepository
	branchRepo   *repository.BranchRepository
}

func NewCustomerHandler(customerRepo *repository.CustomerRepository, branchRepo *repository.BranchRepository) *CustomerHandler {
	return &CustomerHandler{customerRepo: customerRepo, branchRepo: branchRepo}
}

type CreateCustomerRequest struct {
	Name     string          `json:"name" binding:"required"`
	CPF      string          `json:"cpf,omitempty"`
	Phone    string          `json:"phone" binding:"required"`
	Email    string          `json:"email,omitempty"`
	Address  *models.Address `json:"address,omitempty"`
	BranchID string          `json:"branchId,omitempty"`
}

type UpdateCustomerRequest struct {
	Name    *string         `json:"name,omitempty"`
	CPF     *string         `json:"cpf,omitempty"`
	Phone   *string         `json:"phone,omitempty"`
	Email   *string         `json:"email,omitempty"`
	Address *models.Address `json:"address,omitempty"`
}

// ListCustomers lista clientes (busca q por nome/cpf/telefone/email)
func (h *CustomerHandler) ListCustomers(c *gin.Context) {
	page, limit, skip := parsePagination(c)

	filter := bson.M{}
	if search := repository.SearchFilter(c.Query("q"), "name", "cpf", "phone", "email"); search != nil {
		filter = search
	}

	ctx := c.Request.Context()
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
	if customers == nil {
		customers = []*models.Customer{}
	}

	c.JSON(http.StatusOK, gin.H{"customers": customers, "total": total, "page": page, "limit": limit})
}

// GetCustomer retorna um cliente
func (h *CustomerHandler) GetCustomer(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}

	customer, err := h.customerRepo.GetCustomerByID(c.Request.Context(), id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if customer == nil {
		utils.RespondWithNotFound(c, utils.ErrCustomerNotFound)
		return
	}
	c.JSON(http.StatusOK, gin.H{"customer": customer})
}

// CreateCustomer cria um cliente
func (h *CustomerHandler) CreateCustomer(c *gin.Context) {
	var req CreateCustomerRequest
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

	customer := &models.Customer{
		BranchID:  branchID,
		Name:      strings.TrimSpace(req.Name),
		CPF:       onlyDigits(req.CPF),
		Phone:     strings.TrimSpace(req.Phone),
		Email:     strings.TrimSpace(req.Email),
		Address:   req.Address,
		CreatedBy: actor.ID,
		UpdatedBy: actor.ID,
	}
	if customer.Name == "" || customer.Phone == "" {
		utils.RespondWithBadRequest(c, "")
		return
	}

	if err := h.customerRepo.CreateCustomer(ctx, customer); err != nil {
		if isDuplicateKey(err) {
			utils.RespondWithConflict(c, "Já existe um cliente com este CPF")
			return
		}
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"customer": customer})
}

// UpdateCustomer atualiza um cliente
func (h *CustomerHandler) UpdateCustomer(c *gin.Context) {
	id, ok := parseIDParam(c, "id")
	if !ok {
		return
	}
	var req UpdateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithBadRequest(c, utils.SanitizeValidationError(err))
		return
	}
	actor := requireActor(c)
	if actor == nil {
		return
	}

	ctx := c.Request.Context()
	customer, err := h.customerRepo.GetCustomerByID(ctx, id)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}
	if customer == nil {
		utils.RespondWithNotFound(c, utils.ErrCustomerNotFound)
		return
	}

	applyCustomerUpdate(customer, &req)
	customer.UpdatedBy = actor.ID
	customer.UpdatedAt = time.Now()

	if err := h.customerRepo.UpdateCustomer(ctx, id, customer); err != nil {
		if isDuplicateKey(err) {
			utils.RespondWithConflict(c, "Já existe um cliente com este CPF")
			return
		}
		utils.RespondWithInternalError(c)
		return
	}
	c.JSON(http.StatusOK, gin.H{"customer": customer})
}

func applyCustomerUpdate(customer *models.Customer, req *UpdateCustomerRequest) {
	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		customer.Name = strings.TrimSpace(*req.Name)
	}
	if req.CPF != nil {
		customer.CPF = onlyDigits(*req.CPF)
	}
	if req.Phone != nil && strings.TrimSpace(*req.Phone) != "" {
		customer.Phone = strings.TrimSpace(*req.Phone)
	}
	if req.Email != nil {
		customer.Email = strings.TrimSpace(*req.Email)
	}
	if req.Address != nil {
		customer.Address = req.Address
	}
}

// onlyDigits mantém apenas dígitos (normaliza CPF/telefone)
func onlyDigits(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}
