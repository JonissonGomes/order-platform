package services

import (
	"context"
	"fmt"
	"time"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AlertService struct {
	notificationService *NotificationService
	serviceOrderRepo    *repository.ServiceOrderRepository
	customerRepo       *repository.CustomerRepository
	stockRepo          *repository.StockRepository
	employeeRepo       *repository.EmployeeRepository
}

func NewAlertService(
	notificationService *NotificationService,
	serviceOrderRepo *repository.ServiceOrderRepository,
	customerRepo *repository.CustomerRepository,
	stockRepo *repository.StockRepository,
	employeeRepo *repository.EmployeeRepository,
) *AlertService {
	return &AlertService{
		notificationService: notificationService,
		serviceOrderRepo:    serviceOrderRepo,
		customerRepo:        customerRepo,
		stockRepo:           stockRepo,
		employeeRepo:        employeeRepo,
	}
}

// CheckAlerts runs all alert checks
func (s *AlertService) CheckAlerts(ctx context.Context) error {
	// Check overdue service orders
	if err := s.checkOverdueServiceOrders(ctx); err != nil {
		return fmt.Errorf("error checking overdue service orders: %w", err)
	}

	// Check low stock items
	if err := s.checkLowStockItems(ctx); err != nil {
		return fmt.Errorf("error checking low stock items: %w", err)
	}

	// Check pending maintenance
	if err := s.checkPendingMaintenance(ctx); err != nil {
		return fmt.Errorf("error checking pending maintenance: %w", err)
	}

	// Check expired quotations
	if err := s.checkExpiredQuotations(ctx); err != nil {
		return fmt.Errorf("error checking expired quotations: %w", err)
	}

	return nil
}

// checkOverdueServiceOrders checks for service orders that are overdue
func (s *AlertService) checkOverdueServiceOrders(ctx context.Context) error {
	// Get service orders with estimated delivery date in the past and status not delivered/cancelled
	now := time.Now()
	filter := bson.M{
		"estimatedDelivery": bson.M{"$lt": now},
		"status": bson.M{"$nin": []string{"delivered", "cancelled"}},
	}

	orders, err := s.serviceOrderRepo.ListServiceOrders(ctx, 0, 100, filter)
	if err != nil {
		return err
	}

	// Send alerts for overdue orders
	for _, order := range orders {
		// Get customer
		customer, _ := s.customerRepo.GetCustomerByID(ctx, order.CustomerID)
		if customer == nil {
			continue
		}

		// Get assigned employee or department manager
		var userID primitive.ObjectID
		if !order.AssignedTo.IsZero() {
			emp, _ := s.employeeRepo.GetEmployeeByID(ctx, order.AssignedTo)
			if emp != nil {
				userID = emp.UserID
			}
		}

		if !userID.IsZero() {
			notification := &models.Notification{
				ID:      primitive.NewObjectID(),
				UserID:  userID,
				Type:    models.NotificationTypeWarning,
				Channel: models.NotificationChannelInApp,
				Title:   "Ordem de Serviço Atrasada",
				Message: fmt.Sprintf("A ordem de serviço %s está atrasada. Previsão: %s", order.OrderNumber, order.EstimatedDelivery.Format("02/01/2006")),
				Status:  models.NotificationStatusPending,
				EntityType: "service_order",
				EntityID:   &order.ID,
			}
			s.notificationService.SendNotification(ctx, notification)
		}
	}

	return nil
}

// checkLowStockItems checks for items with low stock
func (s *AlertService) checkLowStockItems(ctx context.Context) error {
	// Get stock summary
	summary, err := s.stockRepo.GetSummary(ctx)
	if err != nil {
		return err
	}

	if summary.LowStockItems > 0 {
		// Get all admin users to notify
		// TODO: Get admin users from repository
		// For now, this is a placeholder
		notification := &models.Notification{
			ID:      primitive.NewObjectID(),
			Type:    models.NotificationTypeWarning,
			Channel: models.NotificationChannelInApp,
			Title:   "Alerta de Estoque Baixo",
			Message: fmt.Sprintf("Existem %d itens com estoque abaixo do mínimo", summary.LowStockItems),
			Status:  models.NotificationStatusPending,
			EntityType: "stock",
		}
		// TODO: Send to all admin users
		_ = notification
	}

	return nil
}

// checkPendingMaintenance checks for customers due for maintenance
func (s *AlertService) checkPendingMaintenance(ctx context.Context) error {
	// Get customers with maintenance interval set
	filter := bson.M{
		"maintenanceIntervalMonths": bson.M{"$gt": 0},
	}

	customers, err := s.customerRepo.ListCustomers(ctx, 0, 1000, filter)
	if err != nil {
		return err
	}

	for _, customer := range customers {
		if customer.MaintenanceIntervalMonths == 0 {
			continue
		}

		// Get last service order
		orders, err := s.serviceOrderRepo.GetServiceOrdersByCustomerID(ctx, customer.ID)
		if err != nil || len(orders) == 0 {
			continue
		}

		// Find last delivered order
		var lastOrderDate *time.Time
		for _, order := range orders {
			if order.Status == models.StatusDelivered && order.Delivery != nil && order.Delivery.DeliveredAt != nil {
				if lastOrderDate == nil || order.Delivery.DeliveredAt.After(*lastOrderDate) {
					lastOrderDate = order.Delivery.DeliveredAt
				}
			}
		}

		if lastOrderDate != nil {
			nextMaintenance := lastOrderDate.AddDate(0, customer.MaintenanceIntervalMonths, 0)
			daysUntilMaintenance := int(time.Until(nextMaintenance).Hours() / 24)

			// Alert if maintenance is due in the next 7 days
			if daysUntilMaintenance >= 0 && daysUntilMaintenance <= 7 {
				// TODO: Send notification to relevant employees
				_ = daysUntilMaintenance
			}
		}
	}

	return nil
}

// checkExpiredQuotations checks for expired quotations
func (s *AlertService) checkExpiredQuotations(ctx context.Context) error {
	// TODO: Implement when quotation repository is available
	// This would check for quotations with validUntil in the past and status not converted/approved/rejected
	return nil
}
