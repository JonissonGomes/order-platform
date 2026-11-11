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
	StatusUnrepairable ServiceOrderStatus = "unrepairable"  // Sem Conserto
)

type ServiceOrder struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrderNumber        string             `bson:"orderNumber" json:"orderNumber"` // Único, gerado automaticamente
	BranchID           primitive.ObjectID `bson:"branchId,omitempty" json:"branchId,omitempty"`
	CustomerID         primitive.ObjectID `bson:"customerId" json:"customerId"`
	Customer           *Customer          `bson:"-" json:"customer,omitempty"` // Populado em queries
	ProductType        string             `bson:"productType" json:"productType"` // smartphone, notebook, tablet, etc.
	ProductBrand       string             `bson:"productBrand" json:"productBrand"`
	ProductModel       string             `bson:"productModel" json:"productModel"`
	DeviceLabel        string             `bson:"deviceLabel,omitempty" json:"deviceLabel,omitempty"` // Exibição combinada (opcional)
	IMEI               string             `bson:"imei,omitempty" json:"imei,omitempty"`
	ServiceType        string             `bson:"serviceType,omitempty" json:"serviceType,omitempty"`
	ProblemDescription string             `bson:"problemDescription" json:"problemDescription"`
	InitialEvaluation  string             `bson:"initialEvaluation,omitempty" json:"initialEvaluation,omitempty"`
	Checklist          []string           `bson:"checklist,omitempty" json:"checklist,omitempty"`
	Status             ServiceOrderStatus `bson:"status" json:"status"`
	StatusLabel        string             `bson:"-" json:"statusLabel,omitempty"`
	DepartmentID       primitive.ObjectID `bson:"departmentId,omitempty" json:"departmentId,omitempty"`
	Department         *Department        `bson:"-" json:"department,omitempty"`
	AssignedTo         primitive.ObjectID `bson:"assignedTo,omitempty" json:"assignedTo,omitempty"` // Employee ID
	AssignedEmployee   *Employee          `bson:"-" json:"assignedEmployee,omitempty"`
	Images             []Image            `bson:"images,omitempty" json:"images,omitempty"`
	EstimatedCost      float64            `bson:"estimatedCost,omitempty" json:"estimatedCost,omitempty"`
	FinalCost          float64            `bson:"finalCost,omitempty" json:"finalCost,omitempty"`
	DepositAmount      float64            `bson:"depositAmount,omitempty" json:"depositAmount,omitempty"`
	WarrantyDays       int                `bson:"warrantyDays,omitempty" json:"warrantyDays,omitempty"`
	ExpectedAt         *time.Time         `bson:"expectedAt,omitempty" json:"expectedAt,omitempty"`
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
	IsPublic  bool               `bson:"isPublic" json:"isPublic"` // Visível no portal do cliente
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	CreatedBy primitive.ObjectID `bson:"createdBy" json:"createdBy"` // Employee ID
}

var validTransitions = map[ServiceOrderStatus][]ServiceOrderStatus{
	StatusPending:      {StatusEvaluating, StatusCancelled},
	StatusEvaluating:   {StatusApproved, StatusUnrepairable, StatusCancelled},
	StatusApproved:     {StatusWaitingParts, StatusInRepair, StatusCancelled},
	StatusWaitingParts: {StatusInRepair, StatusUnrepairable, StatusCancelled},
	StatusInRepair:     {StatusTesting, StatusWaitingParts, StatusUnrepairable, StatusCancelled},
	StatusTesting:      {StatusReady, StatusInRepair, StatusUnrepairable, StatusCancelled},
	StatusReady:        {StatusDelivered, StatusCancelled},
	StatusDelivered:    {}, // Estado final
	StatusCancelled:    {}, // Estado final
	StatusUnrepairable: {}, // Estado final
}

// IsValidStatusTransition verifica se a transição de status é válida
func IsValidStatusTransition(from, to ServiceOrderStatus) bool {
	for _, status := range validTransitions[from] {
		if status == to {
			return true
		}
	}
	return false
}

// IsValidStatus verifica se o status é conhecido
func IsValidStatus(status ServiceOrderStatus) bool {
	_, ok := validTransitions[status]
	return ok
}

var statusLabels = map[ServiceOrderStatus]string{
	StatusPending:      "Aguardando avaliação",
	StatusEvaluating:   "Em avaliação",
	StatusApproved:     "Aprovado",
	StatusWaitingParts: "Aguardando peças",
	StatusInRepair:     "Em conserto",
	StatusTesting:      "Em teste",
	StatusReady:        "Pronto para retirada",
	StatusDelivered:    "Entregue",
	StatusCancelled:    "Cancelado",
	StatusUnrepairable: "Sem conserto",
}

// StatusLabel retorna o rótulo em pt-BR do status
func StatusLabel(status ServiceOrderStatus) string {
	if label, ok := statusLabels[status]; ok {
		return label
	}
	return string(status)
}
