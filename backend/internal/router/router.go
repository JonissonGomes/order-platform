package router

import (
	"context"
	"log"

	"order-platform/backend/internal/bootstrap"
	"order-platform/backend/internal/config"
	"order-platform/backend/internal/database"
	"order-platform/backend/internal/handlers"
	"order-platform/backend/internal/middleware"
	"order-platform/backend/internal/notifications"
	"order-platform/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// deps agrupa as dependências compartilhadas pelas rotas
type deps struct {
	// Middlewares comuns a todas as rotas protegidas
	auth    gin.HandlerFunc // autenticação via cookie de sessão
	context gin.HandlerFunc // carrega colaborador + permissões
	audit   gin.HandlerFunc // auditoria de ações de escrita

	// Handlers
	branch       *handlers.BranchHandler
	department   *handlers.DepartmentHandler
	customer     *handlers.CustomerHandler
	serviceOrder *handlers.ServiceOrderHandler
	product      *handlers.ProductHandler
	cash         *handlers.CashHandler
	portal       *handlers.PortalHandler
	profile      *handlers.ProfileHandler
	employee     *handlers.EmployeeHandler
}

func New(db *database.MongoDB) *gin.Engine {
	// Set Gin mode based on environment
	gin.SetMode(gin.ReleaseMode)

	r := gin.Default()

	// CORS middleware
	r.Use(corsMiddleware(config.Get().CORSOrigins))

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Database)
	employeeRepo := repository.NewEmployeeRepository(db.Database)
	profileRepo := repository.NewProfileRepository(db.Database)
	branchRepo := repository.NewBranchRepository(db.Database)
	customerRepo := repository.NewCustomerRepository(db.Database)
	departmentRepo := repository.NewDepartmentRepository(db.Database)
	serviceOrderRepo := repository.NewServiceOrderRepository(db.Database)
	statusHistoryRepo := repository.NewStatusHistoryRepository(db.Database)
	productRepo := repository.NewProductRepository(db.Database)
	movementRepo := repository.NewInventoryMovementRepository(db.Database)
	cashRepo := repository.NewCashSessionRepository(db.Database)
	counterRepo := repository.NewCounterRepository(db.Database)
	auditLogRepo := repository.NewAuditLogRepository(db.Database)

	initializeDefaults(profileRepo, branchRepo)
	bootstrap.EnsureAdminsFromEnv(context.Background(), userRepo, employeeRepo, profileRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo, employeeRepo, profileRepo)
	d := &deps{
		auth:    middleware.AuthMiddleware(userRepo),
		context: middleware.LoadEmployeeContext(employeeRepo, profileRepo),
		audit:   middleware.AuditMiddleware(auditLogRepo, employeeRepo),

		branch:     handlers.NewBranchHandler(branchRepo),
		department: handlers.NewDepartmentHandler(departmentRepo, branchRepo),
		customer:   handlers.NewCustomerHandler(customerRepo, branchRepo),
		serviceOrder: handlers.NewServiceOrderHandler(
			serviceOrderRepo, customerRepo, departmentRepo, statusHistoryRepo,
			employeeRepo, branchRepo, counterRepo, notifications.NoopChannel{},
		),
		product:  handlers.NewProductHandler(productRepo, movementRepo, branchRepo),
		cash:     handlers.NewCashHandler(cashRepo, branchRepo),
		portal:   handlers.NewPortalHandler(serviceOrderRepo, customerRepo, statusHistoryRepo),
		profile:  handlers.NewProfileHandler(profileRepo),
		employee: handlers.NewEmployeeHandler(userRepo, employeeRepo, profileRepo),
	}

	// API routes
	api := r.Group("/api")
	registerAuthRoutes(api, d, authHandler)
	registerOrganizationRoutes(api, d)
	registerOperationRoutes(api, d)
	registerPortalRoutes(api, d)

	return r
}

// initializeDefaults cria perfis e filial padrão (ZTS Cell) caso ainda não existam
func initializeDefaults(profileRepo *repository.ProfileRepository, branchRepo *repository.BranchRepository) {
	ctx := context.Background()

	if err := profileRepo.InitializeDefaultProfiles(ctx); err != nil {
		log.Printf("Warning: Failed to initialize default profiles: %v", err)
	} else {
		log.Println("Default profiles initialized/verified successfully")
	}

	if err := branchRepo.InitializeDefaultBranch(ctx); err != nil {
		log.Printf("Warning: Failed to initialize default branch: %v", err)
	} else {
		log.Println("Default branch initialized/verified successfully")
	}
}
