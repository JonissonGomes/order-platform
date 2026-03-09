package middleware

import (
	"log"
	"net/http"

	"order-platform/backend/internal/models"

	"github.com/gin-gonic/gin"
)

// RequireSuperAdmin ensures the user is a super admin
func RequireSuperAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get(UserContextKey)
		if !exists || user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		u, ok := user.(*models.User)
		if !ok || !u.IsSuperAdmin() {
			c.JSON(http.StatusForbidden, gin.H{"error": "Super admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireAdminOrSuperAdmin ensures the user is admin or super admin
func RequireAdminOrSuperAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("[RequireAdminOrSuperAdmin] Starting check for path: %s", c.Request.URL.Path)

		user, exists := c.Get(UserContextKey)
		if !exists || user == nil {
			log.Printf("[RequireAdminOrSuperAdmin] No user in context")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		u, ok := user.(*models.User)
		if !ok {
			log.Printf("[RequireAdminOrSuperAdmin] User type assertion failed, type: %T", user)
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid user context"})
			c.Abort()
			return
		}

		// Debug: log user role for troubleshooting
		log.Printf("[RequireAdminOrSuperAdmin] User: %s, Role: %s (type: %T, value: %q), IsAdmin: %v, IsSuperAdmin: %v",
			u.Email, u.Role, u.Role, string(u.Role), u.IsAdmin(), u.IsSuperAdmin())

		// Check if user is admin or super admin
		if !u.IsAdmin() {
			log.Printf("[RequireAdminOrSuperAdmin] Access denied - User is not admin or super admin")
			c.JSON(http.StatusForbidden, gin.H{"error": "Você não tem permissão para realizar esta ação"})
			c.Abort()
			return
		}

		log.Printf("[RequireAdminOrSuperAdmin] Access granted")
		c.Next()
	}
}
