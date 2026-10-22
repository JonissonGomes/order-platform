package services

import (
	"context"
	"fmt"
	"time"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type ReportService struct {
	serviceOrderRepo *repository.ServiceOrderRepository
	customerRepo     *repository.CustomerRepository
	stockRepo        *repository.StockRepository
	financialRepo    *repository.FinancialRepository
	departmentRepo   *repository.DepartmentRepository
	employeeRepo     *repository.EmployeeRepository
}

func NewReportService(
	serviceOrderRepo *repository.ServiceOrderRepository,
	customerRepo *repository.CustomerRepository,
	stockRepo *repository.StockRepository,
	financialRepo *repository.FinancialRepository,
	departmentRepo *repository.DepartmentRepository,
	employeeRepo *repository.EmployeeRepository,
) *ReportService {
	return &ReportService{
		serviceOrderRepo: serviceOrderRepo,
		customerRepo:     customerRepo,
		stockRepo:        stockRepo,
		financialRepo:    financialRepo,
		departmentRepo:   departmentRepo,
		employeeRepo:     employeeRepo,
	}
}

// GetServiceOrderReport generates service order report
func (s *ReportService) GetServiceOrderReport(ctx context.Context, filter models.ReportFilter) (*models.ServiceOrderReport, error) {
	// Build MongoDB filter
	mongoFilter := s.buildServiceOrderFilter(filter)

	// Get total orders
	totalOrders, err := s.serviceOrderRepo.CountServiceOrders(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	// Get orders by status
	ordersByStatus, err := s.getOrdersByStatus(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	// Get conversion rate (pending → delivered)
	conversionRate, err := s.getConversionRate(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	// Get average repair time
	avgRepairTime, err := s.getAverageRepairTime(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	// Get total revenue
	totalRevenue, err := s.getTotalRevenue(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	// Get revenue by period
	revenueByPeriod, err := s.getRevenueByPeriod(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	// Get orders by department
	ordersByDepartment, err := s.getOrdersByDepartment(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	// Get orders by employee
	ordersByEmployee, err := s.getOrdersByEmployee(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	// Get top customers
	topCustomers, err := s.getTopCustomers(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	return &models.ServiceOrderReport{
		TotalOrders:        totalOrders,
		OrdersByStatus:     ordersByStatus,
		ConversionRate:     conversionRate,
		AverageRepairTime:  avgRepairTime,
		TotalRevenue:       totalRevenue,
		RevenueByPeriod:    revenueByPeriod,
		OrdersByDepartment: ordersByDepartment,
		OrdersByEmployee:   ordersByEmployee,
		TopCustomers:       topCustomers,
	}, nil
}

// GetFinancialReport generates financial report
func (s *ReportService) GetFinancialReport(ctx context.Context, filter models.ReportFilter) (*models.FinancialReport, error) {
	// Build MongoDB filter
	mongoFilter := s.buildFinancialFilter(filter)

	// Get summary
	summary, err := s.financialRepo.GetSummary(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	// Get cash flow
	cashFlow, err := s.financialRepo.GetCashFlow(ctx, 6)
	if err != nil {
		return nil, err
	}

	// Get income by category
	incomeByCategory, err := s.getIncomeByCategory(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	// Get expenses by category
	expensesByCategory, err := s.getExpensesByCategory(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	// Get profitability by OS
	profitabilityByOS, err := s.getProfitabilityByOS(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	return &models.FinancialReport{
		TotalIncome:        summary.TotalIncome,
		TotalExpenses:      summary.TotalExpense,
		Balance:            summary.Balance,
		PendingIncome:      summary.PendingIncome,
		PendingExpenses:     summary.PendingExpense,
		CashFlow:           cashFlow,
		IncomeByCategory:   incomeByCategory,
		ExpensesByCategory: expensesByCategory,
		ProfitabilityByOS:  profitabilityByOS,
	}, nil
}

// GetStockReport generates stock report
func (s *ReportService) GetStockReport(ctx context.Context, filter models.ReportFilter) (*models.StockReport, error) {
	// Get summary
	summary, err := s.stockRepo.GetSummary(ctx)
	if err != nil {
		return nil, err
	}

	// Get top selling items
	topSellingItems, err := s.getTopSellingItems(ctx, filter)
	if err != nil {
		return nil, err
	}

	// Get stagnant items
	stagnantItems, err := s.getStagnantItems(ctx)
	if err != nil {
		return nil, err
	}

	// Get movements by period
	movementsByPeriod, err := s.getStockMovementsByPeriod(ctx, filter)
	if err != nil {
		return nil, err
	}

	// Calculate stock value vs sales
	stockValueVsSales, err := s.getStockValueVsSales(ctx, filter)
	if err != nil {
		return nil, err
	}

	return &models.StockReport{
		TotalItems:        int64(summary.TotalItems),
		ActiveItems:       int64(summary.ActiveItems),
		LowStockItems:     int64(summary.LowStockItems),
		OutOfStockItems:   int64(summary.OutOfStock),
		TotalStockValue:   summary.TotalValue,
		TopSellingItems:   topSellingItems,
		StagnantItems:     stagnantItems,
		MovementsByPeriod: movementsByPeriod,
		StockValueVsSales: stockValueVsSales,
	}, nil
}

// GetCustomerReport generates customer report
func (s *ReportService) GetCustomerReport(ctx context.Context, filter models.ReportFilter) (*models.CustomerReport, error) {
	// Build MongoDB filter
	mongoFilter := s.buildCustomerFilter(filter)

	// Get total customers
	totalCustomers, err := s.customerRepo.CountCustomers(ctx, mongoFilter)
	if err != nil {
		return nil, err
	}

	// Get active customers (with orders in period)
	activeCustomers, err := s.getActiveCustomers(ctx, filter)
	if err != nil {
		return nil, err
	}

	// Get average ticket
	avgTicket, err := s.getAverageTicket(ctx, filter)
	if err != nil {
		return nil, err
	}

	// Get most frequent customers
	mostFrequentCustomers, err := s.getMostFrequentCustomers(ctx, filter)
	if err != nil {
		return nil, err
	}

	// Get inactive customers
	inactiveCustomers, err := s.getInactiveCustomers(ctx, filter)
	if err != nil {
		return nil, err
	}

	// Get retention analysis
	retentionAnalysis, err := s.getRetentionAnalysis(ctx, filter)
	if err != nil {
		return nil, err
	}

	return &models.CustomerReport{
		TotalCustomers:          totalCustomers,
		ActiveCustomers:        activeCustomers,
		InactiveCustomers:      totalCustomers - activeCustomers,
		AverageTicket:          avgTicket,
		MostFrequentCustomers:   mostFrequentCustomers,
		InactiveCustomersList:  inactiveCustomers,
		RetentionAnalysis:      retentionAnalysis,
	}, nil
}

// GetDashboardReport generates comprehensive dashboard report
func (s *ReportService) GetDashboardReport(ctx context.Context, filter models.ReportFilter) (*models.DashboardReport, error) {
	// Get all sub-reports
	serviceOrderReport, err := s.GetServiceOrderReport(ctx, filter)
	if err != nil {
		return nil, err
	}

	financialReport, err := s.GetFinancialReport(ctx, filter)
	if err != nil {
		return nil, err
	}

	stockReport, err := s.GetStockReport(ctx, filter)
	if err != nil {
		return nil, err
	}

	customerReport, err := s.GetCustomerReport(ctx, filter)
	if err != nil {
		return nil, err
	}

	// Get summary
	summary, err := s.getDashboardSummary(ctx, filter)
	if err != nil {
		return nil, err
	}

	return &models.DashboardReport{
		ServiceOrders: *serviceOrderReport,
		Financial:     *financialReport,
		Stock:         *stockReport,
		Customers:     *customerReport,
		Summary:       *summary,
	}, nil
}

// Helper methods

func (s *ReportService) buildServiceOrderFilter(filter models.ReportFilter) bson.M {
	mongoFilter := bson.M{}

	if filter.StartDate != nil || filter.EndDate != nil {
		dateFilter := bson.M{}
		if filter.StartDate != nil {
			dateFilter["$gte"] = *filter.StartDate
		}
		if filter.EndDate != nil {
			dateFilter["$lte"] = *filter.EndDate
		}
		mongoFilter["createdAt"] = dateFilter
	}

	if filter.DepartmentID != nil {
		mongoFilter["departmentId"] = *filter.DepartmentID
	}

	if filter.Status != nil {
		mongoFilter["status"] = *filter.Status
	}

	if filter.EmployeeID != nil {
		mongoFilter["assignedTo"] = *filter.EmployeeID
	}

	return mongoFilter
}

func (s *ReportService) buildFinancialFilter(filter models.ReportFilter) bson.M {
	mongoFilter := bson.M{}

	if filter.StartDate != nil || filter.EndDate != nil {
		dateFilter := bson.M{}
		if filter.StartDate != nil {
			dateFilter["$gte"] = *filter.StartDate
		}
		if filter.EndDate != nil {
			dateFilter["$lte"] = *filter.EndDate
		}
		mongoFilter["referenceDate"] = dateFilter
	}

	if filter.Category != nil {
		mongoFilter["category"] = *filter.Category
	}

	if filter.Type != nil {
		mongoFilter["type"] = *filter.Type
	}

	return mongoFilter
}

func (s *ReportService) buildCustomerFilter(filter models.ReportFilter) bson.M {
	mongoFilter := bson.M{}

	if filter.StartDate != nil || filter.EndDate != nil {
		dateFilter := bson.M{}
		if filter.StartDate != nil {
			dateFilter["$gte"] = *filter.StartDate
		}
		if filter.EndDate != nil {
			dateFilter["$lte"] = *filter.EndDate
		}
		mongoFilter["createdAt"] = dateFilter
	}

	if filter.CustomerID != nil {
		mongoFilter["_id"] = *filter.CustomerID
	}

	return mongoFilter
}

func (s *ReportService) getOrdersByStatus(ctx context.Context, filter bson.M) (map[string]int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$status",
			"count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := s.serviceOrderRepo.Collection().Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	result := make(map[string]int64)
	for cursor.Next(ctx) {
		var doc struct {
			ID    string `bson:"_id"`
			Count int64  `bson:"count"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		result[doc.ID] = doc.Count
	}

	return result, nil
}

func (s *ReportService) getConversionRate(ctx context.Context, filter bson.M) (float64, error) {
	// Count pending orders
	pendingFilter := bson.M{}
	for k, v := range filter {
		pendingFilter[k] = v
	}
	pendingFilter["status"] = models.StatusPending

	pendingCount, err := s.serviceOrderRepo.CountServiceOrders(ctx, pendingFilter)
	if err != nil {
		return 0, err
	}

	if pendingCount == 0 {
		return 0, nil
	}

	// Count delivered orders
	deliveredFilter := bson.M{}
	for k, v := range filter {
		deliveredFilter[k] = v
	}
	deliveredFilter["status"] = models.StatusDelivered

	deliveredCount, err := s.serviceOrderRepo.CountServiceOrders(ctx, deliveredFilter)
	if err != nil {
		return 0, err
	}

	if deliveredCount == 0 {
		return 0, nil
	}

	return float64(deliveredCount) / float64(pendingCount) * 100, nil
}

func (s *ReportService) getAverageRepairTime(ctx context.Context, filter bson.M) (float64, error) {
	// Filter only delivered orders
	deliveredFilter := bson.M{}
	for k, v := range filter {
		deliveredFilter[k] = v
	}
	deliveredFilter["status"] = models.StatusDelivered

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: deliveredFilter}},
		{{Key: "$project", Value: bson.M{
			"repairTime": bson.M{
				"$divide": bson.A{
					bson.M{"$subtract": bson.A{"$updatedAt", "$createdAt"}},
					86400000, // milliseconds in a day
				},
			},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"avg":   bson.M{"$avg": "$repairTime"},
		}}},
	}

	cursor, err := s.serviceOrderRepo.Collection().Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	if cursor.Next(ctx) {
		var doc struct {
			Avg float64 `bson:"avg"`
		}
		if err := cursor.Decode(&doc); err != nil {
			return 0, err
		}
		return doc.Avg, nil
	}

	return 0, nil
}

func (s *ReportService) getTotalRevenue(ctx context.Context, filter bson.M) (float64, error) {
	// Get delivered orders
	deliveredFilter := bson.M{}
	for k, v := range filter {
		deliveredFilter[k] = v
	}
	deliveredFilter["status"] = models.StatusDelivered

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: deliveredFilter}},
		{{Key: "$group", Value: bson.M{
			"_id":     nil,
			"revenue": bson.M{"$sum": "$totalAmount"},
		}}},
	}

	cursor, err := s.serviceOrderRepo.Collection().Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	if cursor.Next(ctx) {
		var doc struct {
			Revenue float64 `bson:"revenue"`
		}
		if err := cursor.Decode(&doc); err != nil {
			return 0, err
		}
		return doc.Revenue, nil
	}

	return 0, nil
}

func (s *ReportService) getRevenueByPeriod(ctx context.Context, filter bson.M) ([]models.PeriodRevenue, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"status": models.StatusDelivered,
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"year":  bson.M{"$year": "$createdAt"},
				"month": bson.M{"$month": "$createdAt"},
			},
			"revenue": bson.M{"$sum": "$totalAmount"},
			"count":   bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id.year", Value: 1}, {Key: "_id.month", Value: 1}}}},
	}

	cursor, err := s.serviceOrderRepo.Collection().Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.PeriodRevenue
	for cursor.Next(ctx) {
		var doc struct {
			ID struct {
				Year  int `bson:"year"`
				Month int `bson:"month"`
			} `bson:"_id"`
			Revenue float64 `bson:"revenue"`
			Count   int64   `bson:"count"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		period := fmt.Sprintf("%04d-%02d", doc.ID.Year, doc.ID.Month)
		results = append(results, models.PeriodRevenue{
			Period:  period,
			Revenue: doc.Revenue,
			Count:   doc.Count,
		})
	}

	return results, nil
}

func (s *ReportService) getOrdersByDepartment(ctx context.Context, filter bson.M) ([]models.DepartmentCount, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$group", Value: bson.M{
			"_id":      "$departmentId",
			"count":    bson.M{"$sum": 1},
			"revenue":  bson.M{"$sum": "$totalAmount"},
		}}},
	}

	cursor, err := s.serviceOrderRepo.Collection().Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.DepartmentCount
	for cursor.Next(ctx) {
		var doc struct {
			ID      primitive.ObjectID `bson:"_id"`
			Count   int64              `bson:"count"`
			Revenue float64            `bson:"revenue"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}

		// Get department name
		dept, err := s.departmentRepo.GetDepartmentByID(ctx, doc.ID)
		deptName := "N/A"
		if err == nil && dept != nil {
			deptName = dept.Name
		}

		results = append(results, models.DepartmentCount{
			DepartmentID:   doc.ID,
			DepartmentName: deptName,
			Count:          doc.Count,
			Revenue:        doc.Revenue,
		})
	}

	return results, nil
}

func (s *ReportService) getOrdersByEmployee(ctx context.Context, filter bson.M) ([]models.EmployeeCount, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$group", Value: bson.M{
			"_id":      "$assignedTo",
			"count":    bson.M{"$sum": 1},
			"revenue":  bson.M{"$sum": "$totalAmount"},
		}}},
	}

	cursor, err := s.serviceOrderRepo.Collection().Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.EmployeeCount
	for cursor.Next(ctx) {
		var doc struct {
			ID      primitive.ObjectID `bson:"_id"`
			Count   int64              `bson:"count"`
			Revenue float64            `bson:"revenue"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}

		// Get employee name
		emp, err := s.employeeRepo.GetEmployeeByID(ctx, doc.ID)
		empName := "N/A"
		if err == nil && emp != nil {
			empName = emp.Name
		}

		results = append(results, models.EmployeeCount{
			EmployeeID:   doc.ID,
			EmployeeName: empName,
			Count:        doc.Count,
			Revenue:      doc.Revenue,
		})
	}

	return results, nil
}

func (s *ReportService) getTopCustomers(ctx context.Context, filter bson.M) ([]models.CustomerOrderCount, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$group", Value: bson.M{
			"_id":         "$customerId",
			"count":       bson.M{"$sum": 1},
			"totalRevenue": bson.M{"$sum": "$totalAmount"},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "totalRevenue", Value: -1}}}},
		{{Key: "$limit", Value: 10}},
	}

	cursor, err := s.serviceOrderRepo.Collection().Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.CustomerOrderCount
	for cursor.Next(ctx) {
		var doc struct {
			ID           primitive.ObjectID `bson:"_id"`
			Count        int64              `bson:"count"`
			TotalRevenue float64            `bson:"totalRevenue"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}

		// Get customer name
		customer, err := s.customerRepo.GetCustomerByID(ctx, doc.ID)
		customerName := "N/A"
		if err == nil && customer != nil {
			customerName = customer.Name
		}

		results = append(results, models.CustomerOrderCount{
			CustomerID:   doc.ID,
			CustomerName: customerName,
			Count:        doc.Count,
			TotalRevenue: doc.TotalRevenue,
		})
	}

	return results, nil
}

func (s *ReportService) getIncomeByCategory(ctx context.Context, filter bson.M) (map[string]float64, error) {
	incomeFilter := bson.M{}
	for k, v := range filter {
		incomeFilter[k] = v
	}
	incomeFilter["type"] = models.TransactionIncome

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: incomeFilter}},
		{{Key: "$group", Value: bson.M{
			"_id":    "$category",
			"amount": bson.M{"$sum": "$amount"},
		}}},
	}

	cursor, err := s.financialRepo.Collection().Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	result := make(map[string]float64)
	for cursor.Next(ctx) {
		var doc struct {
			ID     string  `bson:"_id"`
			Amount float64 `bson:"amount"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		result[doc.ID] = doc.Amount
	}

	return result, nil
}

func (s *ReportService) getExpensesByCategory(ctx context.Context, filter bson.M) (map[string]float64, error) {
	expenseFilter := bson.M{}
	for k, v := range filter {
		expenseFilter[k] = v
	}
	expenseFilter["type"] = models.TransactionExpense

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: expenseFilter}},
		{{Key: "$group", Value: bson.M{
			"_id":    "$category",
			"amount": bson.M{"$sum": "$amount"},
		}}},
	}

	cursor, err := s.financialRepo.Collection().Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	result := make(map[string]float64)
	for cursor.Next(ctx) {
		var doc struct {
			ID     string  `bson:"_id"`
			Amount float64 `bson:"amount"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		result[doc.ID] = doc.Amount
	}

	return result, nil
}

func (s *ReportService) getProfitabilityByOS(ctx context.Context, filter bson.M) ([]models.OSProfitability, error) {
	// This is a simplified version - in a real scenario, you'd need to calculate
	// costs from stock movements and other expenses
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"status": models.StatusDelivered,
		}}},
		{{Key: "$project", Value: bson.M{
			"orderNumber": 1,
			"totalAmount": 1,
			"costs":       0, // TODO: Calculate from stock movements
			"profit":      "$totalAmount",
			"profitMargin": 100,
		}}},
		{{Key: "$limit", Value: 50}},
	}

	cursor, err := s.serviceOrderRepo.Collection().Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.OSProfitability
	for cursor.Next(ctx) {
		var doc struct {
			ID          primitive.ObjectID `bson:"_id"`
			OrderNumber string             `bson:"orderNumber"`
			TotalAmount float64            `bson:"totalAmount"`
			Costs       float64            `bson:"costs"`
			Profit      float64            `bson:"profit"`
			ProfitMargin float64           `bson:"profitMargin"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}

		results = append(results, models.OSProfitability{
			OrderID:      doc.ID,
			OrderNumber:  doc.OrderNumber,
			Revenue:      doc.TotalAmount,
			Costs:        doc.Costs,
			Profit:       doc.Profit,
			ProfitMargin: doc.ProfitMargin,
		})
	}

	return results, nil
}

func (s *ReportService) getTopSellingItems(ctx context.Context, filter models.ReportFilter) ([]models.TopSellingItem, error) {
	// Get stock movements of type "out" (sales)
	dateFilter := bson.M{}
	if filter.StartDate != nil {
		dateFilter["$gte"] = *filter.StartDate
	}
	if filter.EndDate != nil {
		dateFilter["$lte"] = *filter.EndDate
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"type":       models.StockMovementOut,
			"createdAt":  dateFilter,
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":          "$stockItemId",
			"quantitySold": bson.M{"$sum": "$quantity"},
			"revenue":      bson.M{"$sum": bson.M{"$multiply": bson.A{"$quantity", "$unitCost"}}},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "quantitySold", Value: -1}}}},
		{{Key: "$limit", Value: 10}},
	}

	cursor, err := s.stockRepo.MovementsCollection().Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.TopSellingItem
	for cursor.Next(ctx) {
		var doc struct {
			ID           primitive.ObjectID `bson:"_id"`
			QuantitySold int64              `bson:"quantitySold"`
			Revenue      float64            `bson:"revenue"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}

		// Get item details
		item, err := s.stockRepo.GetItemByID(ctx, doc.ID)
		if err != nil || item == nil {
			continue
		}

		results = append(results, models.TopSellingItem{
			ItemID:       doc.ID,
			ItemName:     item.Name,
			SKU:          item.SKU,
			QuantitySold: doc.QuantitySold,
			Revenue:      doc.Revenue,
		})
	}

	return results, nil
}

func (s *ReportService) getStagnantItems(ctx context.Context) ([]models.StagnantItem, error) {
	// Get items with no movements in the last 90 days
	cutoffDate := time.Now().AddDate(0, 0, -90)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"isActive": true,
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "stock_movements",
			"localField":   "_id",
			"foreignField": "stockItemId",
			"as":           "movements",
		}}},
		{{Key: "$project", Value: bson.M{
			"name":        1,
			"sku":         1,
			"quantity":    1,
			"unitCost":    1,
			"lastMovement": bson.M{"$max": "$movements.createdAt"},
		}}},
		{{Key: "$match", Value: bson.M{
			"$or": bson.A{
				bson.M{"lastMovement": nil},
				bson.M{"lastMovement": bson.M{"$lt": cutoffDate}},
			},
		}}},
		{{Key: "$limit", Value: 20}},
	}

	cursor, err := s.stockRepo.ItemsCollection().Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.StagnantItem
	for cursor.Next(ctx) {
		var doc struct {
			ID           primitive.ObjectID `bson:"_id"`
			Name         string             `bson:"name"`
			SKU          string             `bson:"sku"`
			Quantity     int64              `bson:"quantity"`
			UnitCost     float64            `bson:"unitCost"`
			LastMovement *time.Time         `bson:"lastMovement"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}

		stockValue := float64(doc.Quantity) * doc.UnitCost

		results = append(results, models.StagnantItem{
			ItemID:       doc.ID,
			ItemName:     doc.Name,
			SKU:          doc.SKU,
			Quantity:     doc.Quantity,
			LastMovement: doc.LastMovement,
			StockValue:   stockValue,
		})
	}

	return results, nil
}

func (s *ReportService) getStockMovementsByPeriod(ctx context.Context, filter models.ReportFilter) ([]models.StockMovementPeriod, error) {
	dateFilter := bson.M{}
	if filter.StartDate != nil {
		dateFilter["$gte"] = *filter.StartDate
	}
	if filter.EndDate != nil {
		dateFilter["$lte"] = *filter.EndDate
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"createdAt": dateFilter,
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"year":  bson.M{"$year": "$createdAt"},
				"month": bson.M{"$month": "$createdAt"},
			},
			"incoming": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$eq": bson.A{"$type", models.StockMovementIn}}, "$quantity", 0,
			}}},
			"outgoing": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$eq": bson.A{"$type", models.StockMovementOut}}, "$quantity", 0,
			}}},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id.year", Value: 1}, {Key: "_id.month", Value: 1}}}},
	}

	cursor, err := s.stockRepo.MovementsCollection().Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.StockMovementPeriod
	for cursor.Next(ctx) {
		var doc struct {
			ID struct {
				Year  int `bson:"year"`
				Month int `bson:"month"`
			} `bson:"_id"`
			Incoming int64 `bson:"incoming"`
			Outgoing int64 `bson:"outgoing"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}

		period := fmt.Sprintf("%04d-%02d", doc.ID.Year, doc.ID.Month)
		results = append(results, models.StockMovementPeriod{
			Period:   period,
			Incoming: doc.Incoming,
			Outgoing: doc.Outgoing,
			Net:      doc.Incoming - doc.Outgoing,
		})
	}

	return results, nil
}

func (s *ReportService) getStockValueVsSales(ctx context.Context, filter models.ReportFilter) (float64, error) {
	// Get total stock value
	summary, err := s.stockRepo.GetSummary(ctx)
	if err != nil {
		return 0, err
	}

	// Get total sales in period
	dateFilter := bson.M{}
	if filter.StartDate != nil {
		dateFilter["$gte"] = *filter.StartDate
	}
	if filter.EndDate != nil {
		dateFilter["$lte"] = *filter.EndDate
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"type":      models.StockMovementOut,
			"createdAt": dateFilter,
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"sales": bson.M{"$sum": bson.M{"$multiply": bson.A{"$quantity", "$unitCost"}}},
		}}},
	}

	cursor, err := s.stockRepo.MovementsCollection().Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var totalSales float64
	if cursor.Next(ctx) {
		var doc struct {
			Sales float64 `bson:"sales"`
		}
		if err := cursor.Decode(&doc); err == nil {
			totalSales = doc.Sales
		}
	}

	if totalSales == 0 {
		return 0, nil
	}

	return summary.TotalValue / totalSales, nil
}

func (s *ReportService) getActiveCustomers(ctx context.Context, filter models.ReportFilter) (int64, error) {
	dateFilter := bson.M{}
	if filter.StartDate != nil {
		dateFilter["$gte"] = *filter.StartDate
	}
	if filter.EndDate != nil {
		dateFilter["$lte"] = *filter.EndDate
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"createdAt": dateFilter,
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": "$customerId",
		}}},
		{{Key: "$count", Value: "count"}},
	}

	cursor, err := s.serviceOrderRepo.Collection().Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	if cursor.Next(ctx) {
		var doc struct {
			Count int64 `bson:"count"`
		}
		if err := cursor.Decode(&doc); err == nil {
			return doc.Count, nil
		}
	}

	return 0, nil
}

func (s *ReportService) getAverageTicket(ctx context.Context, filter models.ReportFilter) (float64, error) {
	dateFilter := bson.M{}
	if filter.StartDate != nil {
		dateFilter["$gte"] = *filter.StartDate
	}
	if filter.EndDate != nil {
		dateFilter["$lte"] = *filter.EndDate
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"status":    models.StatusDelivered,
			"createdAt": dateFilter,
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"avg":   bson.M{"$avg": "$totalAmount"},
			"count": bson.M{"$sum": 1},
		}}},
	}

	cursor, err := s.serviceOrderRepo.Collection().Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	if cursor.Next(ctx) {
		var doc struct {
			Avg   float64 `bson:"avg"`
			Count int64   `bson:"count"`
		}
		if err := cursor.Decode(&doc); err == nil && doc.Count > 0 {
			return doc.Avg, nil
		}
	}

	return 0, nil
}

func (s *ReportService) getMostFrequentCustomers(ctx context.Context, filter models.ReportFilter) ([]models.CustomerOrderCount, error) {
	return s.getTopCustomers(ctx, s.buildServiceOrderFilter(filter))
}

func (s *ReportService) getInactiveCustomers(ctx context.Context, filter models.ReportFilter) ([]models.InactiveCustomer, error) {
	cutoffDate := time.Now().AddDate(0, -6, 0) // 6 months ago

	pipeline := mongo.Pipeline{
		{{Key: "$lookup", Value: bson.M{
			"from":         "service_orders",
			"localField":   "_id",
			"foreignField": "customerId",
			"as":           "orders",
		}}},
		{{Key: "$project", Value: bson.M{
			"name":         1,
			"lastOrderDate": bson.M{"$max": "$orders.createdAt"},
			"totalOrders":   bson.M{"$size": "$orders"},
			"totalRevenue":  bson.M{"$sum": "$orders.totalAmount"},
		}}},
		{{Key: "$match", Value: bson.M{
			"$or": bson.A{
				bson.M{"lastOrderDate": nil},
				bson.M{"lastOrderDate": bson.M{"$lt": cutoffDate}},
			},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "lastOrderDate", Value: 1}}}},
		{{Key: "$limit", Value: 50}},
	}

	cursor, err := s.customerRepo.Collection().Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []models.InactiveCustomer
	for cursor.Next(ctx) {
		var doc struct {
			ID              primitive.ObjectID `bson:"_id"`
			Name            string             `bson:"name"`
			LastOrderDate   *time.Time         `bson:"lastOrderDate"`
			TotalOrders     int64              `bson:"totalOrders"`
			TotalRevenue    float64            `bson:"totalRevenue"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}

		daysSinceLastOrder := int64(0)
		if doc.LastOrderDate != nil {
			daysSinceLastOrder = int64(time.Since(*doc.LastOrderDate).Hours() / 24)
		}

		results = append(results, models.InactiveCustomer{
			CustomerID:         doc.ID,
			CustomerName:       doc.Name,
			LastOrderDate:      doc.LastOrderDate,
			TotalOrders:        doc.TotalOrders,
			TotalRevenue:       doc.TotalRevenue,
			DaysSinceLastOrder: daysSinceLastOrder,
		})
	}

	return results, nil
}

func (s *ReportService) getRetentionAnalysis(ctx context.Context, filter models.ReportFilter) (models.RetentionAnalysis, error) {
	// This is a simplified version - full retention analysis would require
	// tracking customer cohorts and their return behavior
	dateFilter := bson.M{}
	if filter.StartDate != nil {
		dateFilter["$gte"] = *filter.StartDate
	}
	if filter.EndDate != nil {
		dateFilter["$lte"] = *filter.EndDate
	}

	// Get new customers (first order in period)
	newCustomersPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"createdAt": dateFilter,
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": "$customerId",
			"firstOrder": bson.M{"$min": "$createdAt"},
		}}},
		{{Key: "$match", Value: bson.M{
			"firstOrder": dateFilter,
		}}},
		{{Key: "$count", Value: "count"}},
	}

	cursor, err := s.serviceOrderRepo.Collection().Aggregate(ctx, newCustomersPipeline)
	if err != nil {
		return models.RetentionAnalysis{}, err
	}
	defer cursor.Close(ctx)

	var newCustomers int64
	if cursor.Next(ctx) {
		var doc struct {
			Count int64 `bson:"count"`
		}
		if err := cursor.Decode(&doc); err == nil {
			newCustomers = doc.Count
		}
	}

	// Get returning customers (had orders before period and in period)
	returningCustomersPipeline := mongo.Pipeline{
		{{Key: "$group", Value: bson.M{
			"_id":         "$customerId",
			"ordersInPeriod": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$and": bson.A{
					bson.M{"$gte": bson.A{"$createdAt", filter.StartDate}},
					bson.M{"$lte": bson.A{"$createdAt", filter.EndDate}},
				}}, 1, 0,
			}}},
			"ordersBeforePeriod": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$lt": bson.A{"$createdAt", filter.StartDate}}, 1, 0,
			}}},
		}}},
		{{Key: "$match", Value: bson.M{
			"ordersInPeriod":     bson.M{"$gt": 0},
			"ordersBeforePeriod": bson.M{"$gt": 0},
		}}},
		{{Key: "$count", Value: "count"}},
	}

	cursor, err = s.serviceOrderRepo.Collection().Aggregate(ctx, returningCustomersPipeline)
	if err != nil {
		return models.RetentionAnalysis{}, err
	}
	defer cursor.Close(ctx)

	var returningCustomers int64
	if cursor.Next(ctx) {
		var doc struct {
			Count int64 `bson:"count"`
		}
		if err := cursor.Decode(&doc); err == nil {
			returningCustomers = doc.Count
		}
	}

	totalCustomers := newCustomers + returningCustomers
	retentionRate := float64(0)
	churnRate := float64(0)
	if totalCustomers > 0 {
		retentionRate = float64(returningCustomers) / float64(totalCustomers) * 100
		churnRate = float64(newCustomers) / float64(totalCustomers) * 100
	}

	return models.RetentionAnalysis{
		NewCustomers:      newCustomers,
		ReturningCustomers: returningCustomers,
		RetentionRate:      retentionRate,
		ChurnRate:          churnRate,
	}, nil
}

func (s *ReportService) getDashboardSummary(ctx context.Context, filter models.ReportFilter) (*models.DashboardSummary, error) {
	// Get pending orders
	pendingFilter := s.buildServiceOrderFilter(filter)
	pendingFilter["status"] = models.StatusPending
	pendingOrders, _ := s.serviceOrderRepo.CountServiceOrders(ctx, pendingFilter)

	// Get ready orders
	readyFilter := s.buildServiceOrderFilter(filter)
	readyFilter["status"] = models.StatusReady
	readyOrders, _ := s.serviceOrderRepo.CountServiceOrders(ctx, readyFilter)

	// Get total orders
	totalOrders, _ := s.serviceOrderRepo.CountServiceOrders(ctx, s.buildServiceOrderFilter(filter))

	// Get total revenue
	totalRevenue, _ := s.getTotalRevenue(ctx, s.buildServiceOrderFilter(filter))

	// Get low stock alerts
	stockSummary, _ := s.stockRepo.GetSummary(ctx)
	lowStockAlerts := int64(stockSummary.LowStockItems)

	// Get active customers
	activeCustomers, _ := s.getActiveCustomers(ctx, filter)

	// Get average ticket
	avgTicket, _ := s.getAverageTicket(ctx, filter)

	// Calculate monthly growth (simplified - compare current month with previous)
	monthlyGrowth := float64(0) // TODO: Implement proper growth calculation

	return &models.DashboardSummary{
		TotalRevenue:    totalRevenue,
		TotalOrders:     totalOrders,
		PendingOrders:   pendingOrders,
		ReadyOrders:     readyOrders,
		LowStockAlerts:  lowStockAlerts,
		ActiveCustomers: activeCustomers,
		MonthlyGrowth:   monthlyGrowth,
		AverageTicket:   avgTicket,
	}, nil
}
