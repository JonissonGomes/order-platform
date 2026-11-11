package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type InventoryMovementType string

const (
	MovementIn        InventoryMovementType = "in"
	MovementOut       InventoryMovementType = "out"
	MovementAdjust    InventoryMovementType = "adjust"
	MovementSale      InventoryMovementType = "sale"
	MovementOSConsume InventoryMovementType = "os_consume"
)

// InventoryMovement registra toda alteração de quantidade de um produto
type InventoryMovement struct {
	ID        primitive.ObjectID    `bson:"_id,omitempty" json:"id"`
	BranchID  primitive.ObjectID    `bson:"branchId,omitempty" json:"branchId,omitempty"`
	ProductID primitive.ObjectID    `bson:"productId" json:"productId"`
	Type      InventoryMovementType `bson:"type" json:"type"`
	Qty       int                   `bson:"qty" json:"qty"` // Variação aplicada (negativa para saídas)
	UnitCost  float64               `bson:"unitCost,omitempty" json:"unitCost,omitempty"`
	RefType   string                `bson:"refType,omitempty" json:"refType,omitempty"`
	RefID     primitive.ObjectID    `bson:"refId,omitempty" json:"refId,omitempty"`
	Note      string                `bson:"note,omitempty" json:"note,omitempty"`
	CreatedAt time.Time             `bson:"createdAt" json:"createdAt"`
	CreatedBy primitive.ObjectID    `bson:"createdBy" json:"createdBy"` // Employee ID
}

// IsValidMovementType verifica se o tipo de movimentação é conhecido
func IsValidMovementType(t InventoryMovementType) bool {
	switch t {
	case MovementIn, MovementOut, MovementAdjust, MovementSale, MovementOSConsume:
		return true
	}
	return false
}
