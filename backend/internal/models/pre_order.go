package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// PreOrderStatus defines lifecycle of a "pré-ordem"
type PreOrderStatus string

const (
	PreOrderStatusEvaluating PreOrderStatus = "evaluating" // Recebida e aguardando atendimento
	PreOrderStatusApproved   PreOrderStatus = "approved"   // Atendente aprovou (gatilho de conversão)
	PreOrderStatusConverted  PreOrderStatus = "converted"  // Já virou ServiceOrder
	PreOrderStatusCancelled  PreOrderStatus = "cancelled"
)

// PreOrder represents a public/pre-service request created from landing.
// It is converted into a ServiceOrder once all necessary data is confirmed by the attendant.
type PreOrder struct {
	ID primitive.ObjectID `bson:"_id,omitempty" json:"id"`

	// Human readable identifier (optional, but helpful for attendant UI).
	PreOrderNumber string `bson:"preOrderNumber" json:"preOrderNumber"`

	// Customer snapshot for quick display (landing -> pre-order).
	CustomerName  string `bson:"customerName" json:"customerName"`
	CustomerPhone string `bson:"customerPhone" json:"customerPhone"`
	CustomerID    primitive.ObjectID `bson:"customerId" json:"customerId"`

	EquipmentText      string `bson:"equipmentText" json:"equipmentText"`
	ProblemDescription string `bson:"problemDescription" json:"problemDescription"`

	DepartmentID   *primitive.ObjectID `bson:"departmentId,omitempty" json:"departmentId,omitempty"`
	DepartmentName string              `bson:"departmentName,omitempty" json:"departmentName,omitempty"`

	Status PreOrderStatus `bson:"status" json:"status"`

	ConvertedToOSID *primitive.ObjectID `bson:"convertedToOSId,omitempty" json:"convertedToOSId,omitempty"`
	ConvertedAt     *time.Time          `bson:"convertedAt,omitempty" json:"convertedAt,omitempty"`

	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
	CreatedBy primitive.ObjectID `bson:"createdBy" json:"createdBy"`
	UpdatedBy primitive.ObjectID `bson:"updatedBy" json:"updatedBy"`
}

