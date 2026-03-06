package middleware

import (
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
		user, exists := c.Get(UserContextKey)
		if !exists || user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		u, ok := user.(*models.User)
		if !ok || !u.IsAdmin() {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}
