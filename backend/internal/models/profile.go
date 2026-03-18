package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Profile struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name              string             `bson:"name" json:"name"`
	Description       string             `bson:"description,omitempty" json:"description,omitempty"`
	Permissions       []string           `bson:"permissions" json:"permissions"`                                 // Permissões de visualização (view)
	EditPermissions   []string           `bson:"editPermissions,omitempty" json:"editPermissions,omitempty"`     // Permissões de edição
	DeletePermissions []string           `bson:"deletePermissions,omitempty" json:"deletePermissions,omitempty"` // Permissões de exclusão
	IsDefault         bool               `bson:"isDefault" json:"isDefault"`                                     // Indica se é um perfil padrão do sistema
	IsActive          bool               `bson:"isActive" json:"isActive"`
	CreatedAt         time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt         time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// DefaultProfiles retorna os perfis padrão do sistema
func DefaultProfiles() []*Profile {
	return []*Profile{
		{
			Name:        "Dono",
			Description: "Acesso total ao sistema",
			Permissions: []string{
				"*", // Todas as permissões
			},
			IsDefault: true,
			IsActive:  true,
		},
		{
			Name:        "Administrador",
			Description: "Acesso completo ao seu departamento (colaboradores, ordens de serviço, clientes e relatórios do departamento). Não gerencia perfis nem configurações globais do sistema.",
			Permissions: []string{
				"employees.read",
				"employees.create",
				"employees.update",
				"employees.delete",
				"departments.read",
				"departments.update",
				"customers.*",
				"service_orders.*",
				"pre_orders.*",
				"reports.department",
			},
			EditPermissions: []string{
				"employees",
				"departments",
				"customers",
				"service_orders",
				"pre_orders",
			},
			DeletePermissions: []string{
				"employees",
				"service_orders",
			},
			IsDefault: true,
			IsActive:  true,
		},
		{
			Name:        "Gerente",
			Description: "Gerencia um departamento específico",
			Permissions: []string{
				"employees.read",
				"employees.update",
				"departments.read",
				"service_orders.*",
				"pre_orders.*",
				"reports.department",
			},
			EditPermissions: []string{
				"pre_orders",
			},
			IsDefault: true,
			IsActive:  true,
		},
		{
			Name:        "Atendente",
			Description: "Atende clientes e cria ordens de serviço",
			Permissions: []string{
				"customers.*",
				"service_orders.create",
				"service_orders.read",
				"service_orders.update",
				"service_orders.status.pending",
				"service_orders.status.evaluating",
				"service_orders.status.approved",
				"pre_orders.*",
			},
			IsDefault: true,
			IsActive:  true,
			EditPermissions: []string{
				"pre_orders",
			},
		},
		{
			Name:        "Técnico",
			Description: "Realiza consertos e atualiza status técnico",
			Permissions: []string{
				"service_orders.read",
				"service_orders.update",
				"service_orders.status.in_repair",
				"service_orders.status.waiting_parts",
				"service_orders.status.testing",
				"service_orders.status.ready",
				"service_orders.notes.create",
			},
			IsDefault: true,
			IsActive:  true,
		},
		{
			Name:        "User",
			Description: "Usuário básico do sistema (clientes)",
			Permissions: []string{
				"service_orders.read.own",
				"customers.read.own",
			},
			IsDefault: true,
			IsActive:  true,
		},
	}
}
