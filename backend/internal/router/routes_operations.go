package router

import (
	"time"

	"order-platform/backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

// registerOperationRoutes registra clientes, ordens de serviço, estoque e caixa
func registerOperationRoutes(api *gin.RouterGroup, d *deps) {
	perm := middleware.RequirePermission

	customers := api.Group("/customers")
	customers.Use(d.auth, middleware.RequireAuth(), d.context, d.audit)
	{
		customers.GET("", perm("customers.read"), d.customer.ListCustomers)
		customers.GET("/:id", perm("customers.read"), d.customer.GetCustomer)
		customers.POST("", perm("customers.create"), d.customer.CreateCustomer)
		customers.PUT("/:id", perm("customers.update"), d.customer.UpdateCustomer)
	}

	orders := api.Group("/service-orders")
	orders.Use(d.auth, middleware.RequireAuth(), d.context, d.audit)
	{
		orders.GET("", perm("service_orders.read"), d.serviceOrder.ListServiceOrders)
		orders.GET("/:id", perm("service_orders.read"), d.serviceOrder.GetServiceOrder)
		orders.POST("", perm("service_orders.create"), d.serviceOrder.CreateServiceOrder)
		orders.PUT("/:id", perm("service_orders.update"), d.serviceOrder.UpdateServiceOrder)
		// O handler ainda valida a transição e Employee.CanChangeStatus (permissão por status)
		orders.PATCH("/:id/status", perm("service_orders.update"), d.serviceOrder.UpdateStatus)
		orders.PATCH("/:id/assign", perm("service_orders.update"), d.serviceOrder.Assign)
		orders.PUT("/:id/closeout", perm("service_orders.update"), d.serviceOrder.UpdateCloseout)
		orders.POST("/:id/parts", perm("service_orders.update"), d.serviceOrder.AddPart)
		orders.DELETE("/:id/parts/:partId", perm("service_orders.update"), d.serviceOrder.RemovePart)
		orders.POST("/:id/notes",
			middleware.RequireAnyPermission("notes.create", "service_orders.notes.create", "service_orders.update"),
			d.serviceOrder.AddNote)
	}

	products := api.Group("/products")
	products.Use(d.auth, middleware.RequireAuth(), d.context, d.audit)
	{
		products.GET("", perm("products.read"), d.product.ListProducts)
		products.GET("/barcode/:code", perm("products.read"), d.product.LookupByBarcode)
		products.GET("/:id", perm("products.read"), d.product.GetProduct)
		products.POST("", perm("products.create"), d.product.CreateProduct)
		products.PUT("/:id", perm("products.update"), d.product.UpdateProduct)
		products.POST("/:id/adjust", perm("inventory.adjust"), d.product.AdjustStock)
		products.GET("/:id/movements", perm("inventory.read"), d.product.ListMovements)
	}

	cash := api.Group("/cash")
	cash.Use(d.auth, middleware.RequireAuth(), d.context, d.audit)
	{
		cash.GET("/session", perm("cash.read"), d.cash.GetOpenSession)
		cash.POST("/open", perm("cash.open"), d.cash.OpenSession)
		cash.POST("/close", perm("cash.close"), d.cash.CloseSession)
		// Vendas/recebimentos exigem cash.sale; sangria/reforço exigem cash.movement (checado no handler)
		cash.POST("/movements", middleware.RequireAnyPermission("cash.sale", "cash.movement"), d.cash.AddMovement)
		cash.GET("/sessions/:id/movements", perm("cash.read"), d.cash.ListSessionMovements)
	}
}

// registerPortalRoutes registra rotas públicas do portal do cliente
func registerPortalRoutes(api *gin.RouterGroup, d *deps) {
	portal := api.Group("/portal")
	// Limite por IP para dificultar tentativa de adivinhar os 4 dígitos do telefone
	portal.Use(middleware.RateLimitByIP(20, 10*time.Minute))
	{
		portal.POST("/lookup", d.portal.Lookup)
		portal.POST("/respond", d.portal.Respond)
	}
}
