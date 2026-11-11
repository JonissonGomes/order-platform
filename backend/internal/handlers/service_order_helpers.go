package handlers

import (
	"log"
	"strings"

	"order-platform/backend/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// deviceLabel combina marca e modelo para exibição
func deviceLabel(brand, model string) string {
	return strings.TrimSpace(strings.TrimSpace(brand) + " " + strings.TrimSpace(model))
}

// applyOrderUpdate aplica os campos informados na requisição à ordem
func applyOrderUpdate(order *models.ServiceOrder, req *UpdateServiceOrderRequest) error {
	if req.DepartmentID != nil {
		departmentID, err := parseOptionalID(*req.DepartmentID)
		if err != nil {
			return err
		}
		order.DepartmentID = departmentID
	}
	setString(&order.ProductType, req.ProductType)
	setString(&order.ProductBrand, req.ProductBrand)
	setString(&order.ProductModel, req.ProductModel)
	setString(&order.IMEI, req.IMEI)
	setString(&order.ServiceType, req.ServiceType)
	setString(&order.ProblemDescription, req.ProblemDescription)
	setString(&order.InitialEvaluation, req.InitialEvaluation)
	if req.Checklist != nil {
		order.Checklist = *req.Checklist
	}
	if req.EstimatedCost != nil {
		order.EstimatedCost = *req.EstimatedCost
	}
	if req.FinalCost != nil {
		order.FinalCost = *req.FinalCost
	}
	if req.DepositAmount != nil {
		order.DepositAmount = *req.DepositAmount
	}
	if req.WarrantyDays != nil {
		order.WarrantyDays = *req.WarrantyDays
	}
	if req.ExpectedAt != nil {
		order.ExpectedAt = req.ExpectedAt
	}

	if req.ProductBrand != nil || req.ProductModel != nil {
		order.DeviceLabel = deviceLabel(order.ProductBrand, order.ProductModel)
	}
	return nil
}

func setString(target *string, value *string) {
	if value != nil {
		*target = strings.TrimSpace(*value)
	}
}

// populateCustomers carrega os clientes de várias ordens com uma única consulta
func (h *ServiceOrderHandler) populateCustomers(c *gin.Context, orders []*models.ServiceOrder) error {
	ids := make([]primitive.ObjectID, 0, len(orders))
	for _, order := range orders {
		ids = append(ids, order.CustomerID)
	}
	customers, err := h.customerRepo.GetCustomersByIDs(c.Request.Context(), ids)
	if err != nil {
		return err
	}
	for _, order := range orders {
		order.Customer = customers[order.CustomerID]
	}
	return nil
}

// populateDetails carrega cliente, departamento e responsável de uma ordem
// (falhas parciais são registradas e não impedem a resposta)
func (h *ServiceOrderHandler) populateDetails(c *gin.Context, order *models.ServiceOrder) {
	ctx := c.Request.Context()
	order.StatusLabel = models.StatusLabel(order.Status)

	if customer, err := h.customerRepo.GetCustomerByID(ctx, order.CustomerID); err != nil {
		log.Printf("Warning: failed to load customer for order %s: %v", order.OrderNumber, err)
	} else {
		order.Customer = customer
	}
	if !order.DepartmentID.IsZero() {
		if department, err := h.departmentRepo.GetDepartmentByID(ctx, order.DepartmentID); err != nil {
			log.Printf("Warning: failed to load department for order %s: %v", order.OrderNumber, err)
		} else {
			order.Department = department
		}
	}
	if !order.AssignedTo.IsZero() {
		if employee, err := h.employeeRepo.GetEmployeeByID(ctx, order.AssignedTo); err != nil {
			log.Printf("Warning: failed to load assignee for order %s: %v", order.OrderNumber, err)
		} else {
			order.AssignedEmployee = employee
		}
	}
}

// recordHistory grava o histórico de status; falhas são apenas registradas em log
func (h *ServiceOrderHandler) recordHistory(c *gin.Context, order *models.ServiceOrder, from, to models.ServiceOrderStatus, notes string, actor *models.Employee) {
	ctx := c.Request.Context()

	entry := &models.StatusHistory{
		ServiceOrderID: order.ID,
		PreviousStatus: from,
		NewStatus:      to,
		ChangedBy:      actor.ID,
		EmployeeRole:   actor.Role,
		DepartmentID:   order.DepartmentID,
		Notes:          notes,
	}
	if !order.DepartmentID.IsZero() {
		if department, err := h.departmentRepo.GetDepartmentByID(ctx, order.DepartmentID); err == nil && department != nil {
			entry.DepartmentName = department.Name
		}
	}

	if err := h.historyRepo.CreateStatusHistory(ctx, entry); err != nil {
		log.Printf("Warning: failed to record status history for order %s: %v", order.OrderNumber, err)
	}
}
