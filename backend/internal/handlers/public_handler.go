package handlers

import (
	"net/http"

	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type PublicHandler struct {
	customerRepo     *repository.CustomerRepository
	serviceOrderRepo *repository.ServiceOrderRepository
}

func NewPublicHandler(
	customerRepo *repository.CustomerRepository,
	serviceOrderRepo *repository.ServiceOrderRepository,
) *PublicHandler {
	return &PublicHandler{
		customerRepo:     customerRepo,
		serviceOrderRepo: serviceOrderRepo,
	}
}

type SearchServiceOrderRequest struct {
	OrderNumber string `json:"orderNumber,omitempty"`
	CPF         string `json:"cpf,omitempty"`
	Phone       string `json:"phone,omitempty"`
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
				"orderNumber":       order.OrderNumber,
				"status":            order.Status,
				"productType":       order.ProductType,
				"productBrand":      order.ProductBrand,
				"productModel":      order.ProductModel,
				"problemDescription": order.ProblemDescription,
				"createdAt":         order.CreatedAt,
				"updatedAt":         order.UpdatedAt,
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
				"orderNumber":       order.OrderNumber,
				"status":            order.Status,
				"productType":       order.ProductType,
				"productBrand":      order.ProductBrand,
				"productModel":      order.ProductModel,
				"createdAt":         order.CreatedAt,
				"updatedAt":         order.UpdatedAt,
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
				"orderNumber":       order.OrderNumber,
				"status":            order.Status,
				"productType":       order.ProductType,
				"productBrand":      order.ProductBrand,
				"productModel":      order.ProductModel,
				"createdAt":         order.CreatedAt,
				"updatedAt":         order.UpdatedAt,
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

	utils.RespondWithBadRequest(c, "É necessário informar número da ordem, CPF ou telefone")
}
