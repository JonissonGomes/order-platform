package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Supplier represents a supplier/vendor
type Supplier struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	CNPJ        string             `bson:"cnpj,omitempty" json:"cnpj,omitempty"`
	CPF         string             `bson:"cpf,omitempty" json:"cpf,omitempty"`
	Email       string             `bson:"email,omitempty" json:"email,omitempty"`
	Phone       string             `bson:"phone,omitempty" json:"phone,omitempty"`
	Address     *Address           `bson:"address,omitempty" json:"address,omitempty"`
	ContactName string             `bson:"contactName,omitempty" json:"contactName,omitempty"`
	Notes       string             `bson:"notes,omitempty" json:"notes,omitempty"`
	IsActive    bool               `bson:"isActive" json:"isActive"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
	CreatedBy   primitive.ObjectID `bson:"createdBy" json:"createdBy"`
	UpdatedBy   primitive.ObjectID `bson:"updatedBy" json:"updatedBy"`
}

// PurchaseOrderStatus defines the status of a purchase order
type PurchaseOrderStatus string

const (
	PurchaseOrderStatusDraft     PurchaseOrderStatus = "draft"     // Rascunho
	PurchaseOrderStatusSent      PurchaseOrderStatus = "sent"      // Enviado ao fornecedor
	PurchaseOrderStatusConfirmed PurchaseOrderStatus = "confirmed" // Confirmado pelo fornecedor
	PurchaseOrderStatusReceived  PurchaseOrderStatus = "received"  // Recebido
	PurchaseOrderStatusCancelled PurchaseOrderStatus = "cancelled" // Cancelado
)

// PurchaseOrderItem represents an item in a purchase order
type PurchaseOrderItem struct {
	StockItemID *primitive.ObjectID `bson:"stockItemId,omitempty" json:"stockItemId,omitempty"`
	Description string              `bson:"description" json:"description"`
	Quantity    float64             `bson:"quantity" json:"quantity"`
	UnitPrice   float64             `bson:"unitPrice" json:"unitPrice"`
	TotalPrice  float64             `bson:"totalPrice" json:"totalPrice"`
}

// PurchaseOrder represents a purchase order to a supplier
type PurchaseOrder struct {
	ID                primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	OrderNumber       string              `bson:"orderNumber" json:"orderNumber"` // Format: PC-YYYY-NNNN
	SupplierID        primitive.ObjectID  `bson:"supplierId" json:"supplierId"`
	Supplier          *Supplier           `bson:"-" json:"supplier,omitempty"`
	Items             []PurchaseOrderItem `bson:"items" json:"items"`
	Subtotal          float64             `bson:"subtotal" json:"subtotal"`
	ShippingCost      float64             `bson:"shippingCost" json:"shippingCost"`
	Total             float64             `bson:"total" json:"total"`
	Status            PurchaseOrderStatus `bson:"status" json:"status"`
	ExpectedDelivery  *time.Time          `bson:"expectedDelivery,omitempty" json:"expectedDelivery,omitempty"`
	ReceivedAt        *time.Time          `bson:"receivedAt,omitempty" json:"receivedAt,omitempty"`
	Notes             string              `bson:"notes,omitempty" json:"notes,omitempty"`
	CreatedAt         time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt         time.Time           `bson:"updatedAt" json:"updatedAt"`
	CreatedBy         primitive.ObjectID  `bson:"createdBy" json:"createdBy"`
	UpdatedBy         primitive.ObjectID  `bson:"updatedBy" json:"updatedBy"`
}

// QuotationRequest represents a quotation request from a supplier
type QuotationRequest struct {
	ID            primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	PurchaseOrderID primitive.ObjectID `bson:"purchaseOrderId" json:"purchaseOrderId"`
	SupplierID    primitive.ObjectID  `bson:"supplierId" json:"supplierId"`
	Supplier      *Supplier           `bson:"-" json:"supplier,omitempty"`
	Items         []PurchaseOrderItem `bson:"items" json:"items"`
	Total         float64             `bson:"total" json:"total"`
	ValidUntil    *time.Time          `bson:"validUntil,omitempty" json:"validUntil,omitempty"`
	Notes         string              `bson:"notes,omitempty" json:"notes,omitempty"`
	ReceivedAt    *time.Time          `bson:"receivedAt,omitempty" json:"receivedAt,omitempty"`
	CreatedAt     time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt     time.Time           `bson:"updatedAt" json:"updatedAt"`
}
