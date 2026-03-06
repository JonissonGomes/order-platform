package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ServiceOrderStatus string

const (
	StatusPending      ServiceOrderStatus = "pending"       // Aguardando Avaliação
	StatusEvaluating   ServiceOrderStatus = "evaluating"    // Em Avaliação
	StatusApproved     ServiceOrderStatus = "approved"      // Aprovado/Aguardando Conserto
	StatusWaitingParts ServiceOrderStatus = "waiting_parts" // Aguardando Peças
	StatusInRepair     ServiceOrderStatus = "in_repair"     // Em Conserto
	StatusTesting      ServiceOrderStatus = "testing"       // Em Teste
	StatusReady        ServiceOrderStatus = "ready"         // Pronto para Retirada
	StatusDelivered    ServiceOrderStatus = "delivered"     // Entregue
	StatusCancelled    ServiceOrderStatus = "cancelled"     // Cancelado
)

type ServiceOrder struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrderNumber        string             `bson:"orderNumber" json:"orderNumber"` // Único, gerado automaticamente
	CustomerID         primitive.ObjectID `bson:"customerId" json:"customerId"`
	Customer           *Customer          `bson:"-" json:"customer,omitempty"`    // Populado em queries
	ProductType        string             `bson:"productType" json:"productType"` // smartphone, notebook, tablet, etc.
	ProductBrand       string             `bson:"productBrand" json:"productBrand"`
	ProductModel       string             `bson:"productModel" json:"productModel"`
	ProblemDescription string             `bson:"problemDescription" json:"problemDescription"`
	InitialEvaluation  string             `bson:"initialEvaluation,omitempty" json:"initialEvaluation,omitempty"`
	Status             ServiceOrderStatus `bson:"status" json:"status"`
	DepartmentID       primitive.ObjectID `bson:"departmentId" json:"departmentId"`
	Department         *Department        `bson:"-" json:"department,omitempty"`
	AssignedTo         primitive.ObjectID `bson:"assignedTo,omitempty" json:"assignedTo,omitempty"` // Employee ID
	AssignedEmployee   *Employee          `bson:"-" json:"assignedEmployee,omitempty"`
	Images             []Image            `bson:"images,omitempty" json:"images,omitempty"`
	EstimatedCost      float64            `bson:"estimatedCost,omitempty" json:"estimatedCost,omitempty"`
	FinalCost          float64            `bson:"finalCost,omitempty" json:"finalCost,omitempty"`
	Notes              []Note             `bson:"notes,omitempty" json:"notes,omitempty"`
	CreatedAt          time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt          time.Time          `bson:"updatedAt" json:"updatedAt"`
	CreatedBy          primitive.ObjectID `bson:"createdBy" json:"createdBy"`                                 // Employee ID
	UpdatedBy          primitive.ObjectID `bson:"updatedBy" json:"updatedBy"`                                 // Employee ID
	StatusChangedBy    primitive.ObjectID `bson:"statusChangedBy,omitempty" json:"statusChangedBy,omitempty"` // Employee ID
	StatusChangedAt    time.Time          `bson:"statusChangedAt,omitempty" json:"statusChangedAt,omitempty"`
}

type Note struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Content   string             `bson:"content" json:"content"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	CreatedBy primitive.ObjectID `bson:"createdBy" json:"createdBy"` // Employee ID
}

// IsValidTransition verifica se a transição de status é válida
func IsValidStatusTransition(from, to ServiceOrderStatus) bool {
	validTransitions := map[ServiceOrderStatus][]ServiceOrderStatus{
		StatusPending:      {StatusEvaluating, StatusCancelled},
		StatusEvaluating:   {StatusApproved, StatusCancelled},
		StatusApproved:     {StatusWaitingParts, StatusInRepair, StatusCancelled},
		StatusWaitingParts: {StatusInRepair, StatusCancelled},
		StatusInRepair:     {StatusTesting, StatusWaitingParts, StatusCancelled},
		StatusTesting:      {StatusReady, StatusInRepair, StatusCancelled},
		StatusReady:        {StatusDelivered, StatusCancelled},
		StatusDelivered:    {}, // Estado final
		StatusCancelled:    {}, // Estado final
	}

	allowed, exists := validTransitions[from]
	if !exists {
		return false
	}

	for _, status := range allowed {
		if status == to {
			return true
		}
	}

	return false
}
