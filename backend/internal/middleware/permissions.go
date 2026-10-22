package middleware

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// RequireSuperAdmin ensures the user is a super admin (Dono)
func RequireSuperAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		employee := GetEmployeeFromContext(c)
		if employee == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		if !employee.IsDono() {
			c.JSON(http.StatusForbidden, gin.H{"error": "Super admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireAdminOrSuperAdmin ensures the user is admin or super admin (Dono)
func RequireAdminOrSuperAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("[RequireAdminOrSuperAdmin] Starting check for path: %s", c.Request.URL.Path)

		employee := GetEmployeeFromContext(c)
		if employee == nil {
			log.Printf("[RequireAdminOrSuperAdmin] No employee in context")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		// Debug: log employee role for troubleshooting
		log.Printf("[RequireAdminOrSuperAdmin] Employee: %s, Role: %s, IsAdmin: %v, IsDono: %v",
			employee.Email, employee.Role, employee.IsAdmin(), employee.IsDono())

		// Check if employee is admin or dono
		if !employee.IsAdmin() {
			log.Printf("[RequireAdminOrSuperAdmin] Access denied - Employee is not admin or dono")
			c.JSON(http.StatusForbidden, gin.H{"error": "Você não tem permissão para realizar esta ação"})
			c.Abort()
			return
		}

		log.Printf("[RequireAdminOrSuperAdmin] Access granted")
		c.Next()
	}
}
