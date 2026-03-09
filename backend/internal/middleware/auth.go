package middleware

import (
	"log"
	"net/http"

	"order-platform/backend/internal/auth"
	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const UserContextKey = "user"

// AuthMiddleware authenticates requests using JWT session cookies
func AuthMiddleware(userRepo *repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get session cookie
		cookie, err := c.Cookie("app_session_id")
		if err != nil || cookie == "" {
			log.Printf("[AuthMiddleware] No session cookie found for path: %s", c.Request.URL.Path)
			c.Set(UserContextKey, nil)
			c.Next()
			return
		}

		// Verify session token
		session, err := auth.VerifySessionToken(cookie)
		if err != nil {
			log.Printf("[AuthMiddleware] Session token verification failed: %v", err)
			c.Set(UserContextKey, nil)
			c.Next()
			return
		}

		ctx := c.Request.Context()

		// Get user from database
		userID, err := primitive.ObjectIDFromHex(session.UserID)
		if err != nil {
			log.Printf("[AuthMiddleware] Invalid user ID: %s", session.UserID)
			c.Set(UserContextKey, nil)
			c.Next()
			return
		}

		user, err := userRepo.GetUserByID(ctx, userID)
		if err != nil || user == nil {
			log.Printf("[AuthMiddleware] User not found: %s, error: %v", userID.Hex(), err)
			c.Set(UserContextKey, nil)
			c.Next()
			return
		}

		log.Printf("[AuthMiddleware] User authenticated: %s, Role: %s", user.Email, user.Role)

		// Update last signed in
		_ = userRepo.UpdateLastSignedIn(ctx, user.ID)

		c.Set(UserContextKey, user)
		c.Next()
	}
}

// RequireAuth ensures the user is authenticated
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get(UserContextKey)
		if !exists || user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequireAdmin ensures the user is an admin
func RequireAdmin() gin.HandlerFunc {
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

// GetUserFromContext retrieves the user from the context
func GetUserFromContext(c *gin.Context) *models.User {
	user, exists := c.Get(UserContextKey)
	if !exists {
		return nil
	}
	u, ok := user.(*models.User)
	if !ok {
		return nil
	}
	return u
}
