package handlers

import (
	"context"
	"strconv"

	"order-platform/backend/internal/middleware"
	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

const (
	defaultPageSize = 50
	maxPageSize     = 200
)

// currentActor retorna o colaborador que está executando a ação.
// Admins/super admins sem cadastro de colaborador recebem um colaborador "sintético"
// (ID zerado) para que auditoria e campos createdBy continuem funcionando.
// Retorna nil se não houver colaborador nem super admin.
func currentActor(c *gin.Context) *models.Employee {
	if employee := middleware.GetEmployeeFromContext(c); employee != nil {
		return employee
	}
	if user := middleware.GetUserFromContext(c); user != nil && user.IsAdmin() {
		return &models.Employee{
			UserID:   user.ID,
			Name:     user.Name,
			Email:    user.Email,
			Role:     models.EmployeeRoleAdmin,
			IsActive: true,
		}
	}
	return nil
}

// requireActor responde 403 e retorna nil quando não há colaborador associado ao usuário
func requireActor(c *gin.Context) *models.Employee {
	actor := currentActor(c)
	if actor == nil {
		utils.RespondWithForbidden(c, "")
	}
	return actor
}

// parseIDParam lê um ObjectID do parâmetro de rota; responde 400 em caso de erro
func parseIDParam(c *gin.Context, name string) (primitive.ObjectID, bool) {
	id, err := primitive.ObjectIDFromHex(c.Param(name))
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return primitive.NilObjectID, false
	}
	return id, true
}

// parseOptionalID converte um ID opcional (vazio => NilObjectID)
func parseOptionalID(value string) (primitive.ObjectID, error) {
	if value == "" {
		return primitive.NilObjectID, nil
	}
	return primitive.ObjectIDFromHex(value)
}

// parsePagination lê page/limit da query string
func parsePagination(c *gin.Context) (page, limit, skip int64) {
	page, _ = strconv.ParseInt(c.DefaultQuery("page", "1"), 10, 64)
	limit, _ = strconv.ParseInt(c.DefaultQuery("limit", strconv.Itoa(defaultPageSize)), 10, 64)
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = defaultPageSize
	}
	if limit > maxPageSize {
		limit = maxPageSize
	}
	return page, limit, (page - 1) * limit
}

// resolveBranchID retorna o ID da filial informada ou, se vazio, o da filial padrão
func resolveBranchID(ctx context.Context, branchRepo *repository.BranchRepository, raw string) (primitive.ObjectID, error) {
	if raw != "" {
		return primitive.ObjectIDFromHex(raw)
	}
	branch, err := branchRepo.GetDefault(ctx)
	if err != nil {
		return primitive.NilObjectID, err
	}
	if branch == nil {
		return primitive.NilObjectID, mongo.ErrNoDocuments
	}
	return branch.ID, nil
}

// isDuplicateKey informa se o erro é de chave duplicada (índice único)
func isDuplicateKey(err error) bool {
	return mongo.IsDuplicateKeyError(err)
}

// boolQuery converte "true"/"false" da query em *bool (nil se ausente/inválido)
func boolQuery(c *gin.Context, name string) *bool {
	switch c.Query(name) {
	case "true":
		v := true
		return &v
	case "false":
		v := false
		return &v
	}
	return nil
}
