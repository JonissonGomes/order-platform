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
// Now works with Employee or Customer instead of User
func AuthMiddleware(employeeRepo *repository.EmployeeRepository, customerRepo *repository.CustomerRepository) gin.HandlerFunc {
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

		// Get user from database (Employee or Customer)
		userID, err := primitive.ObjectIDFromHex(session.UserID)
		if err != nil {
			log.Printf("[AuthMiddleware] Invalid user ID: %s", session.UserID)
			c.Set(UserContextKey, nil)
			c.Next()
			return
		}

		// Determine type from session (default to employee for backward compatibility)
		userType := session.Type
		if userType == "" {
			userType = "employee" // Default for old tokens
		}

		var authenticated interface{}
		var email string
		var role string
		var isSuspended bool

		if userType == "customer" {
			customer, err := customerRepo.GetCustomerByID(ctx, userID)
			if err != nil || customer == nil {
				log.Printf("[AuthMiddleware] Customer not found: %s, error: %v", userID.Hex(), err)
				c.Set(UserContextKey, nil)
				c.Next()
				return
			}
			authenticated = customer
			email = customer.Email
			role = "customer"
			isSuspended = false // Customers don't have suspension yet
		} else {
			// Default to employee
			employee, err := employeeRepo.GetEmployeeByID(ctx, userID)
			if err != nil || employee == nil {
				log.Printf("[AuthMiddleware] Employee not found: %s, error: %v", userID.Hex(), err)
				c.Set(UserContextKey, nil)
				c.Next()
				return
			}
			authenticated = employee
			email = employee.Email
			role = string(employee.Role)
			isSuspended = employee.IsSuspended
		}

		log.Printf("[AuthMiddleware] User authenticated: %s, Role: %s, Type: %s", email, role, userType)

		// Check if user is suspended
		if isSuspended {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Sua conta está suspensa. Entre em contato com o time de gestão de pessoas.",
				"code":  "USER_SUSPENDED",
			})
			c.Abort()
			return
		}

		// Update last signed in
		if userType == "customer" {
			_ = customerRepo.UpdateLastSignedIn(ctx, userID)
		} else {
			_ = employeeRepo.UpdateLastSignedIn(ctx, userID)
		}

		c.Set(UserContextKey, authenticated)
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

// RequireAdmin ensures the user is an admin (Employee with admin role)
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get(UserContextKey)
		if !exists || user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}

		// Check if it's an employee with admin role
		employee, ok := user.(*models.Employee)
		if !ok || !employee.IsAdmin() {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// GetUserFromContext retrieves the user (Employee or Customer) from the context
// Returns Employee if it's an employee, Customer if it's a customer, or nil
func GetUserFromContext(c *gin.Context) interface{} {
	user, exists := c.Get(UserContextKey)
	if !exists {
		return nil
	}
	return user
}

// GetEmployeeFromContext retrieves the employee from the context (returns nil if not an employee)
func GetEmployeeFromContext(c *gin.Context) *models.Employee {
	user := GetUserFromContext(c)
	if user == nil {
		return nil
	}
	employee, ok := user.(*models.Employee)
	if !ok {
		return nil
	}
	return employee
}

// GetCustomerFromContext retrieves the customer from the context (returns nil if not a customer)
func GetCustomerFromContext(c *gin.Context) *models.Customer {
	user := GetUserFromContext(c)
	if user == nil {
		return nil
	}
	customer, ok := user.(*models.Customer)
	if !ok {
		return nil
	}
	return customer
}
