package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Product representa um item de estoque (peças, acessórios, aparelhos)
type Product struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	BranchID    primitive.ObjectID `bson:"branchId,omitempty" json:"branchId,omitempty"`
	Name        string             `bson:"name" json:"name"`
	SKU         string             `bson:"sku,omitempty" json:"sku,omitempty"`
	Barcode     string             `bson:"barcode,omitempty" json:"barcode,omitempty"`
	Category    string             `bson:"category,omitempty" json:"category,omitempty"`
	Cost        float64            `bson:"cost" json:"cost"`
	Price       float64            `bson:"price" json:"price"`
	Qty         int                `bson:"qty" json:"qty"`
	MinQty      int                `bson:"minQty" json:"minQty"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	IsActive    bool               `bson:"isActive" json:"isActive"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
	CreatedBy   primitive.ObjectID `bson:"createdBy" json:"createdBy"` // Employee ID
	UpdatedBy   primitive.ObjectID `bson:"updatedBy" json:"updatedBy"` // Employee ID
}
