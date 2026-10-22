package handlers

import (
	"net/http"
	"time"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/services"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ReportHandler struct {
	reportService *services.ReportService
}

func NewReportHandler(reportService *services.ReportService) *ReportHandler {
	return &ReportHandler{
		reportService: reportService,
	}
}

// GetServiceOrderReport handles GET /api/reports/service-orders
func (h *ReportHandler) GetServiceOrderReport(c *gin.Context) {
	filter, err := h.parseReportFilter(c)
	if err != nil {
		utils.RespondWithBadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()
	report, err := h.reportService.GetServiceOrderReport(ctx, *filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"report": report})
}

// GetFinancialReport handles GET /api/reports/financial
func (h *ReportHandler) GetFinancialReport(c *gin.Context) {
	filter, err := h.parseReportFilter(c)
	if err != nil {
		utils.RespondWithBadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()
	report, err := h.reportService.GetFinancialReport(ctx, *filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"report": report})
}

// GetStockReport handles GET /api/reports/stock
func (h *ReportHandler) GetStockReport(c *gin.Context) {
	filter, err := h.parseReportFilter(c)
	if err != nil {
		utils.RespondWithBadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()
	report, err := h.reportService.GetStockReport(ctx, *filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"report": report})
}

// GetCustomerReport handles GET /api/reports/customers
func (h *ReportHandler) GetCustomerReport(c *gin.Context) {
	filter, err := h.parseReportFilter(c)
	if err != nil {
		utils.RespondWithBadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()
	report, err := h.reportService.GetCustomerReport(ctx, *filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"report": report})
}

// GetDashboardReport handles GET /api/reports/dashboard
func (h *ReportHandler) GetDashboardReport(c *gin.Context) {
	filter, err := h.parseReportFilter(c)
	if err != nil {
		utils.RespondWithBadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()
	report, err := h.reportService.GetDashboardReport(ctx, *filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"report": report})
}

// ExportReport handles GET /api/reports/export
func (h *ReportHandler) ExportReport(c *gin.Context) {
	reportType := c.Query("report")
	exportType := c.Query("type") // pdf, excel, csv

	if reportType == "" || exportType == "" {
		utils.RespondWithBadRequest(c, "Parâmetros 'report' e 'type' são obrigatórios")
		return
	}

	// TODO: Implement PDF/Excel export
	// For now, return JSON
	c.JSON(http.StatusNotImplemented, gin.H{
		"message": "Exportação ainda não implementada. Use os endpoints de relatórios para obter dados em JSON.",
	})
}

// parseReportFilter parses query parameters into a ReportFilter
func (h *ReportHandler) parseReportFilter(c *gin.Context) (*models.ReportFilter, error) {
	filter := &models.ReportFilter{}

	// Parse dates
	if startDateStr := c.Query("startDate"); startDateStr != "" {
		startDate, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			return nil, err
		}
		filter.StartDate = &startDate
	}

	if endDateStr := c.Query("endDate"); endDateStr != "" {
		endDate, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			return nil, err
		}
		// Set end date to end of day
		endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		filter.EndDate = &endDate
	}

	// Parse department ID
	if deptIDStr := c.Query("departmentId"); deptIDStr != "" {
		deptID, err := primitive.ObjectIDFromHex(deptIDStr)
		if err != nil {
			return nil, err
		}
		filter.DepartmentID = &deptID
	}

	// Parse status
	if statusStr := c.Query("status"); statusStr != "" {
		status := models.ServiceOrderStatus(statusStr)
		filter.Status = &status
	}

	// Parse employee ID
	if empIDStr := c.Query("employeeId"); empIDStr != "" {
		empID, err := primitive.ObjectIDFromHex(empIDStr)
		if err != nil {
			return nil, err
		}
		filter.EmployeeID = &empID
	}

	// Parse customer ID
	if customerIDStr := c.Query("customerId"); customerIDStr != "" {
		customerID, err := primitive.ObjectIDFromHex(customerIDStr)
		if err != nil {
			return nil, err
		}
		filter.CustomerID = &customerID
	}

	// Parse category
	if categoryStr := c.Query("category"); categoryStr != "" {
		category := models.TransactionCategory(categoryStr)
		filter.Category = &category
	}

	// Parse type
	if typeStr := c.Query("type"); typeStr != "" {
		transactionType := models.TransactionType(typeStr)
		filter.Type = &transactionType
	}

	return filter, nil
}
