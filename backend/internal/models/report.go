package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ReportType defines the type of report
type ReportType string

const (
	ReportTypeServiceOrders ReportType = "service-orders"
	ReportTypeFinancial     ReportType = "financial"
	ReportTypeStock         ReportType = "stock"
	ReportTypeCustomers    ReportType = "customers"
	ReportTypeDashboard    ReportType = "dashboard"
)

// ReportFilter represents filters for generating reports
type ReportFilter struct {
	StartDate     *time.Time              `json:"startDate,omitempty"`
	EndDate       *time.Time              `json:"endDate,omitempty"`
	DepartmentID  *primitive.ObjectID     `json:"departmentId,omitempty"`
	Status        *ServiceOrderStatus     `json:"status,omitempty"`
	EmployeeID    *primitive.ObjectID     `json:"employeeId,omitempty"`
	CustomerID    *primitive.ObjectID     `json:"customerId,omitempty"`
	Category      *TransactionCategory     `json:"category,omitempty"`
	Type          *TransactionType         `json:"type,omitempty"`
}

// ServiceOrderReport represents service order report data
type ServiceOrderReport struct {
	TotalOrders           int64                  `json:"totalOrders"`
	OrdersByStatus        map[string]int64      `json:"ordersByStatus"`
	ConversionRate        float64               `json:"conversionRate"`        // pending → delivered
	AverageRepairTime     float64               `json:"averageRepairTime"`    // in days
	TotalRevenue          float64               `json:"totalRevenue"`
	RevenueByPeriod       []PeriodRevenue       `json:"revenueByPeriod"`
	OrdersByDepartment    []DepartmentCount     `json:"ordersByDepartment"`
	OrdersByEmployee      []EmployeeCount       `json:"ordersByEmployee"`
	TopCustomers          []CustomerOrderCount  `json:"topCustomers"`
}

// PeriodRevenue represents revenue for a specific period
type PeriodRevenue struct {
	Period string  `json:"period"` // "2024-01", "2024-02", etc.
	Revenue float64 `json:"revenue"`
	Count   int64   `json:"count"`
}

// DepartmentCount represents count of orders by department
type DepartmentCount struct {
	DepartmentID   primitive.ObjectID `json:"departmentId"`
	DepartmentName string             `json:"departmentName"`
	Count          int64              `json:"count"`
	Revenue        float64            `json:"revenue"`
}

// EmployeeCount represents count of orders by employee
type EmployeeCount struct {
	EmployeeID   primitive.ObjectID `json:"employeeId"`
	EmployeeName string             `json:"employeeName"`
	Count        int64              `json:"count"`
	Revenue      float64            `json:"revenue"`
}

// CustomerOrderCount represents order count for a customer
type CustomerOrderCount struct {
	CustomerID   primitive.ObjectID `json:"customerId"`
	CustomerName string             `json:"customerName"`
	Count        int64              `json:"count"`
	TotalRevenue float64            `json:"totalRevenue"`
}

// FinancialReport represents financial report data
type FinancialReport struct {
	TotalIncome      float64            `json:"totalIncome"`
	TotalExpenses    float64            `json:"totalExpenses"`
	Balance          float64            `json:"balance"`
	PendingIncome    float64            `json:"pendingIncome"`
	PendingExpenses  float64            `json:"pendingExpenses"`
	CashFlow         []CashFlowEntry    `json:"cashFlow"`
	IncomeByCategory map[string]float64 `json:"incomeByCategory"`
	ExpensesByCategory map[string]float64 `json:"expensesByCategory"`
	ProfitabilityByOS []OSProfitability `json:"profitabilityByOS"`
}

// OSProfitability represents profitability analysis for a service order
type OSProfitability struct {
	OrderID      primitive.ObjectID `json:"orderId"`
	OrderNumber  string             `json:"orderNumber"`
	Revenue      float64            `json:"revenue"`
	Costs        float64            `json:"costs"`
	Profit       float64            `json:"profit"`
	ProfitMargin float64            `json:"profitMargin"` // percentage
}

// StockReport represents stock report data
type StockReport struct {
	TotalItems        int64                  `json:"totalItems"`
	ActiveItems       int64                  `json:"activeItems"`
	LowStockItems     int64                  `json:"lowStockItems"`
	OutOfStockItems   int64                  `json:"outOfStockItems"`
	TotalStockValue   float64                `json:"totalStockValue"`
	TopSellingItems   []TopSellingItem       `json:"topSellingItems"`
	StagnantItems     []StagnantItem         `json:"stagnantItems"`
	MovementsByPeriod []StockMovementPeriod  `json:"movementsByPeriod"`
	StockValueVsSales float64                `json:"stockValueVsSales"`
}

// TopSellingItem represents a top selling stock item
type TopSellingItem struct {
	ItemID      primitive.ObjectID `json:"itemId"`
	ItemName    string             `json:"itemName"`
	SKU         string             `json:"sku"`
	QuantitySold int64             `json:"quantitySold"`
	Revenue     float64            `json:"revenue"`
}

// StagnantItem represents a stagnant stock item (no movement)
type StagnantItem struct {
	ItemID      primitive.ObjectID `json:"itemId"`
	ItemName    string             `json:"itemName"`
	SKU         string             `json:"sku"`
	Quantity    int64              `json:"quantity"`
	LastMovement *time.Time         `json:"lastMovement,omitempty"`
	StockValue  float64            `json:"stockValue"`
}

// StockMovementPeriod represents stock movements for a period
type StockMovementPeriod struct {
	Period   string `json:"period"` // "2024-01", "2024-02", etc.
	Incoming int64  `json:"incoming"`
	Outgoing int64  `json:"outgoing"`
	Net      int64  `json:"net"`
}

// CustomerReport represents customer report data
type CustomerReport struct {
	TotalCustomers      int64                  `json:"totalCustomers"`
	ActiveCustomers     int64                  `json:"activeCustomers"`
	InactiveCustomers   int64                  `json:"inactiveCustomers"`
	AverageTicket       float64                `json:"averageTicket"`
	MostFrequentCustomers []CustomerOrderCount `json:"mostFrequentCustomers"`
	InactiveCustomersList []InactiveCustomer   `json:"inactiveCustomersList"`
	RetentionAnalysis   RetentionAnalysis      `json:"retentionAnalysis"`
}

// InactiveCustomer represents a customer with no recent orders
type InactiveCustomer struct {
	CustomerID     primitive.ObjectID `json:"customerId"`
	CustomerName   string             `json:"customerName"`
	LastOrderDate  *time.Time         `json:"lastOrderDate,omitempty"`
	TotalOrders    int64              `json:"totalOrders"`
	TotalRevenue   float64            `json:"totalRevenue"`
	DaysSinceLastOrder int64          `json:"daysSinceLastOrder"`
}

// RetentionAnalysis represents customer retention metrics
type RetentionAnalysis struct {
	NewCustomers      int64   `json:"newCustomers"`      // in period
	ReturningCustomers int64  `json:"returningCustomers"` // in period
	RetentionRate     float64 `json:"retentionRate"`    // percentage
	ChurnRate         float64 `json:"churnRate"`         // percentage
}

// DashboardReport represents comprehensive dashboard data
type DashboardReport struct {
	ServiceOrders ServiceOrderReport `json:"serviceOrders"`
	Financial     FinancialReport    `json:"financial"`
	Stock         StockReport        `json:"stock"`
	Customers     CustomerReport     `json:"customers"`
	Summary       DashboardSummary   `json:"summary"`
}

// DashboardSummary represents summary metrics for dashboard
type DashboardSummary struct {
	TotalRevenue      float64 `json:"totalRevenue"`
	TotalOrders       int64   `json:"totalOrders"`
	PendingOrders     int64   `json:"pendingOrders"`
	ReadyOrders       int64   `json:"readyOrders"`
	LowStockAlerts    int64   `json:"lowStockAlerts"`
	ActiveCustomers   int64   `json:"activeCustomers"`
	MonthlyGrowth     float64 `json:"monthlyGrowth"`     // percentage
	AverageTicket     float64 `json:"averageTicket"`
}
