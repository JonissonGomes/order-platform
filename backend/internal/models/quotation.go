package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// QuotationStatus defines the status of a quotation
type QuotationStatus string

const (
	QuotationStatusDraft     QuotationStatus = "draft"     // Rascunho
	QuotationStatusSent      QuotationStatus = "sent"      // Enviado ao cliente
	QuotationStatusApproved QuotationStatus = "approved"  // Aprovado pelo cliente
	QuotationStatusRejected  QuotationStatus = "rejected"  // Rejeitado pelo cliente
	QuotationStatusExpired   QuotationStatus = "expired"   // Expirado
	QuotationStatusConverted QuotationStatus = "converted" // Convertido em OS
)

// QuotationItem represents an item in a quotation
type QuotationItem struct {
	Description string  `bson:"description" json:"description"`
	Quantity    float64 `bson:"quantity" json:"quantity"`
	UnitPrice   float64 `bson:"unitPrice" json:"unitPrice"`
	TotalPrice  float64 `bson:"totalPrice" json:"totalPrice"`
}

// Quotation represents a commercial quotation/proposal
type Quotation struct {
	ID              primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	QuotationNumber string              `bson:"quotationNumber" json:"quotationNumber"` // Format: COT-YYYY-NNNN
	CustomerID      primitive.ObjectID  `bson:"customerId" json:"customerId"`
	Customer        *Customer           `bson:"-" json:"customer,omitempty"`
	DepartmentID    primitive.ObjectID  `bson:"departmentId" json:"departmentId"`
	Department      *Department         `bson:"-" json:"department,omitempty"`
	Items           []QuotationItem     `bson:"items" json:"items"`
	Subtotal        float64             `bson:"subtotal" json:"subtotal"`
	Discount        float64             `bson:"discount" json:"discount"`
	Total           float64             `bson:"total" json:"total"`
	Status          QuotationStatus     `bson:"status" json:"status"`
	ValidUntil      *time.Time          `bson:"validUntil,omitempty" json:"validUntil,omitempty"`
	Notes           string              `bson:"notes,omitempty" json:"notes,omitempty"`
	ApprovedAt      *time.Time          `bson:"approvedAt,omitempty" json:"approvedAt,omitempty"`
	RejectedAt      *time.Time          `bson:"rejectedAt,omitempty" json:"rejectedAt,omitempty"`
	ConvertedToOSID *primitive.ObjectID `bson:"convertedToOSId,omitempty" json:"convertedToOSId,omitempty"`
	CreatedAt       time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time           `bson:"updatedAt" json:"updatedAt"`
	CreatedBy       primitive.ObjectID  `bson:"createdBy" json:"createdBy"`
	UpdatedBy       primitive.ObjectID  `bson:"updatedBy" json:"updatedBy"`
}
