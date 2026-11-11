package middleware

import (
	"context"
	"net/http"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AuditMiddleware creates middleware for logging actions
func AuditMiddleware(auditRepo *repository.AuditLogRepository, employeeRepo *repository.EmployeeRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip audit for GET requests (except specific ones)
		if c.Request.Method == http.MethodGet && c.Request.URL.Path != "/api/service-orders" {
			c.Next()
			return
		}

		// Skip audit for OPTIONS requests
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		// Execute the handler first
		c.Next()

		// Only log successful requests
		if c.Writer.Status() >= 400 {
			return
		}

		// Get user from context
		user, exists := c.Get(UserContextKey)
		if !exists || user == nil {
			return
		}

		u, ok := user.(*models.User)
		if !ok {
			return
		}

		// Get employee associated with user
		ctx := c.Request.Context()
		employee, err := employeeRepo.GetEmployeeByUserID(ctx, u.ID)
		if err != nil || employee == nil {
			// If no employee found, still log but with user info
			logAuditAction(c, auditRepo, u, nil, nil)
			return
		}

		// Get department info if available
		var department *models.Department
		if !employee.DepartmentID.IsZero() {
			// Department would be populated in handler if needed
		}

		logAuditAction(c, auditRepo, u, employee, department)
	}
}

func logAuditAction(c *gin.Context, auditRepo *repository.AuditLogRepository, user *models.User, employee *models.Employee, department *models.Department) {
	// Determine action type
	action := models.ActionUpdate
	switch c.Request.Method {
	case http.MethodPost:
		action = models.ActionCreate
	case http.MethodDelete:
		action = models.ActionDelete
	case http.MethodPatch:
		if c.Request.URL.Path[len(c.Request.URL.Path)-7:] == "/status" {
			action = models.ActionStatusChanged
		}
	}

	// Extract entity info from path
	entity := extractEntityFromPath(c.Request.URL.Path)
	entityID := extractEntityIDFromPath(c.Request.URL.Path)

	// Build audit log
	auditLog := &models.AuditLog{
		Action:    action,
		Entity:    entity,
		EntityID:  entityID,
		UserID:    user.ID,
		UserName:  user.Name,
		UserEmail: user.Email,
		UserRole:  models.EmployeeRole(user.Role), // Convert UserRole to EmployeeRole
		IP:        c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
	}

	// Add employee and department info if available
	if employee != nil {
		auditLog.UserRole = employee.Role
		if !employee.DepartmentID.IsZero() {
			auditLog.DepartmentID = employee.DepartmentID
			if department != nil {
				auditLog.DepartmentName = department.Name
			}
		}
	}

	// Log asynchronously (don't block the request)
	go func() {
		_ = auditRepo.CreateAuditLog(context.Background(), auditLog)
	}()
}

func extractEntityFromPath(path string) string {
	// Extract entity name from path like /api/service-orders -> ServiceOrder
	if len(path) < 5 {
		return "Unknown"
	}

	// Remove /api/ prefix
	if path[:5] == "/api/" {
		path = path[5:]
	}

	// Get first part before / or ?
	for i, char := range path {
		if char == '/' || char == '?' {
			path = path[:i]
			break
		}
	}

	// Convert to PascalCase
	if len(path) == 0 {
		return "Unknown"
	}

	// Simple conversion: service-orders -> ServiceOrder
	result := ""
	nextUpper := true
	for _, char := range path {
		if char == '-' {
			nextUpper = true
			continue
		}
		if nextUpper {
			result += string(char - 32) // Convert to uppercase
			nextUpper = false
		} else {
			result += string(char)
		}
	}

	return result
}

func extractEntityIDFromPath(path string) primitive.ObjectID {
	// Try to extract ID from path like /api/service-orders/507f1f77bcf86cd799439011
	parts := []rune(path)
	idStart := -1
	idEnd := len(parts)

	// Find last segment that looks like an ObjectID (24 hex chars)
	for i := len(parts) - 1; i >= 0; i-- {
		if parts[i] == '/' {
			if idStart != -1 {
				idStr := string(parts[idStart:idEnd])
				if len(idStr) == 24 {
					if id, err := primitive.ObjectIDFromHex(idStr); err == nil {
						return id
					}
				}
			}
			idStart = i + 1
			idEnd = len(parts)
			// Check for query params
			for j := idStart; j < len(parts); j++ {
				if parts[j] == '?' {
					idEnd = j
					break
				}
			}
		}
	}

	return primitive.NilObjectID
}
