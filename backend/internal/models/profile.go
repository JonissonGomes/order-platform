package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Profile struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	Permissions []string           `bson:"permissions" json:"permissions"` // Lista de permissões (ex: "service_orders.create", "cash.*")
	IsDefault   bool               `bson:"isDefault" json:"isDefault"`     // Indica se é um perfil padrão do sistema
	IsActive    bool               `bson:"isActive" json:"isActive"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// ProfileNameSuperAdmin é o nome legado do perfil removido do produto
// (super admin passa a existir apenas via SUPER_ADMIN_* no ENV).
const ProfileNameSuperAdmin = "Super Admin"

// IsSuperAdminProfile indica se o perfil é o legado de acesso total (não atribuível).
func IsSuperAdminProfile(p *Profile) bool {
	return p != nil && p.Name == ProfileNameSuperAdmin
}

// DefaultProfiles retorna os perfis padrão do sistema (sem Super Admin — só ENV).
func DefaultProfiles() []*Profile {
	return []*Profile{
		{
			Name:        "Admin",
			Description: "Administrador do sistema",
			Permissions: []string{
				"users.*", "employees.*", "departments.*", "profiles.*", "branches.*",
				"customers.*", "service_orders.*", "products.*", "inventory.*",
				"cash.*", "reports.*", "dashboard.read",
			},
			IsDefault: true,
			IsActive:  true,
		},
		{
			Name:        "Gerente de Departamento",
			Description: "Gerencia um departamento específico",
			Permissions: []string{
				"employees.read", "employees.update", "departments.read",
				"service_orders.*", "products.read", "inventory.read", "cash.read",
				"reports.department", "dashboard.read", "customers.*",
			},
			IsDefault: true,
			IsActive:  true,
		},
		{
			Name:        "Atendente",
			Description: "Atende clientes e cria ordens de serviço",
			Permissions: []string{
				"customers.*",
				"service_orders.create", "service_orders.read", "service_orders.update",
				"products.read", "cash.sale", "cash.read", "dashboard.read",
			},
			IsDefault: true,
			IsActive:  true,
		},
		{
			Name:        "Técnico",
			Description: "Realiza consertos e atualiza status técnico",
			Permissions: []string{
				"service_orders.read", "service_orders.update",
				"notes.create", "service_orders.notes.create",
				"products.read", "inventory.read", "dashboard.read",
			},
			IsDefault: true,
			IsActive:  true,
		},
		{
			Name:        "Caixa",
			Description: "Opera o caixa: abertura, vendas, recebimentos e fechamento",
			Permissions: []string{
				"cash.*", "customers.read", "service_orders.read",
				"products.read", "dashboard.read",
			},
			IsDefault: true,
			IsActive:  true,
		},
		{
			Name:        "Estoque",
			Description: "Gerencia produtos e movimentações de estoque",
			Permissions: []string{
				"products.*", "inventory.*", "dashboard.read",
			},
			IsDefault: true,
			IsActive:  true,
		},
	}
}
