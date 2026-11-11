package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	DefaultBranchName = "ZTS Cell"
	DefaultBranchCode = "ZTS-01"
)

// Branch representa uma filial/loja
type Branch struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name"`
	Code      string             `bson:"code" json:"code"`
	Address   string             `bson:"address,omitempty" json:"address,omitempty"`
	Phone     string             `bson:"phone,omitempty" json:"phone,omitempty"`
	IsActive  bool               `bson:"isActive" json:"isActive"`
	IsDefault bool               `bson:"isDefault" json:"isDefault"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// EnsureDefaultBranch retorna a filial padrão (seed) "ZTS Cell" / "ZTS-01".
// O repositório usa este helper para criar a filial caso não exista nenhuma.
func EnsureDefaultBranch() *Branch {
	now := time.Now()
	return &Branch{
		Name:      DefaultBranchName,
		Code:      DefaultBranchCode,
		IsActive:  true,
		IsDefault: true,
		CreatedAt: now,
		UpdatedAt: now,
	}
}
