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

// DeliveryType define o tipo de entrega
type DeliveryType string

const (
	DeliveryTypeNone  DeliveryType = "none"  // Retirada pelo cliente
	DeliveryTypeOwn   DeliveryType = "own"   // Entrega própria
	DeliveryTypeThird DeliveryType = "third" // Serviço terceirizado
)

// ServiceItem representa um item de serviço na OS (ex: "Reparo na placa mãe")
type ServiceItem struct {
	Name      string  `bson:"name" json:"name"`
	Quantity  float64 `bson:"quantity" json:"quantity"`
	UnitPrice float64 `bson:"unitPrice" json:"unitPrice"`
	ImageURL  string  `bson:"imageUrl,omitempty" json:"imageUrl,omitempty"`
}

// PaymentInfo armazena dados de pagamento da OS
type PaymentInfo struct {
	Method      string     `bson:"method,omitempty" json:"method,omitempty"` // pix, cartao, dinheiro, boleto
	DueDate     *time.Time `bson:"dueDate,omitempty" json:"dueDate,omitempty"`
	Observation string     `bson:"observation,omitempty" json:"observation,omitempty"` // ex: "PAGO ASS DIEGO"
	Paid        bool       `bson:"paid" json:"paid"`
}

// DeliveryInfo armazena dados de entrega em domicílio
type DeliveryInfo struct {
	Type            DeliveryType `bson:"type" json:"type"`
	Address         *Address     `bson:"address,omitempty" json:"address,omitempty"` // endereço de entrega
	DistanceKm      float64      `bson:"distanceKm,omitempty" json:"distanceKm,omitempty"`
	Cost            float64      `bson:"cost,omitempty" json:"cost,omitempty"`
	ScheduledAt     *time.Time   `bson:"scheduledAt,omitempty" json:"scheduledAt,omitempty"`
	DeliveredAt     *time.Time   `bson:"deliveredAt,omitempty" json:"deliveredAt,omitempty"`
	Observations    string       `bson:"observations,omitempty" json:"observations,omitempty"`
	DeliveryEvidence *Image      `bson:"deliveryEvidence,omitempty" json:"deliveryEvidence,omitempty"` // Evidência de conserto/entrega
}

type ServiceOrder struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	OrderNumber string             `bson:"orderNumber" json:"orderNumber"` // Único, gerado automaticamente
	CustomerID  primitive.ObjectID `bson:"customerId" json:"customerId"`
	Customer    *Customer          `bson:"-" json:"customer,omitempty"` // Populado em queries

	// Dados do equipamento
	ProductType  string `bson:"productType" json:"productType"` // smartphone, notebook, tablet, etc.
	ProductBrand string `bson:"productBrand" json:"productBrand"`
	ProductModel string `bson:"productModel" json:"productModel"`
	SerialNumber string `bson:"serialNumber,omitempty" json:"serialNumber,omitempty"` // Número de série

	// Diagnóstico e laudo
	AestheticConditions string `bson:"aestheticConditions,omitempty" json:"aestheticConditions,omitempty"` // Condições estéticas
	ProblemDescription  string `bson:"problemDescription" json:"problemDescription"`                       // Defeitos relatados
	InitialEvaluation   string `bson:"initialEvaluation,omitempty" json:"initialEvaluation,omitempty"`     // Avaliação inicial
	TechnicalReport     string `bson:"technicalReport,omitempty" json:"technicalReport,omitempty"`         // Laudo técnico detalhado
	Solution            string `bson:"solution,omitempty" json:"solution,omitempty"`                       // Solução proposta/executada

	// Status e fluxo
	Status           ServiceOrderStatus `bson:"status" json:"status"`
	DepartmentID     primitive.ObjectID `bson:"departmentId" json:"departmentId"`
	Department       *Department        `bson:"-" json:"department,omitempty"`
	AssignedTo       primitive.ObjectID `bson:"assignedTo,omitempty" json:"assignedTo,omitempty"` // Employee ID
	AssignedEmployee *Employee          `bson:"-" json:"assignedEmployee,omitempty"`

	// Datas de entrada/saída
	EntryDate *time.Time `bson:"entryDate,omitempty" json:"entryDate,omitempty"` // Data de entrada (= createdAt por padrão)
	ExitDate  *time.Time `bson:"exitDate,omitempty" json:"exitDate,omitempty"`   // Data de saída (entrega real)

	// Imagens e arquivos
	Images []Image `bson:"images,omitempty" json:"images,omitempty"`

	// Serviços executados (lista de itens)
	ServiceItems []ServiceItem `bson:"serviceItems,omitempty" json:"serviceItems,omitempty"`

	// Custos
	EstimatedCost float64 `bson:"estimatedCost,omitempty" json:"estimatedCost,omitempty"`
	FinalCost     float64 `bson:"finalCost,omitempty" json:"finalCost,omitempty"`

	// Pagamento
	Payment PaymentInfo `bson:"payment,omitempty" json:"payment,omitempty"`

	// Entrega em domicílio
	Delivery *DeliveryInfo `bson:"delivery,omitempty" json:"delivery,omitempty"`

	// Metadados
	EstimatedDelivery *time.Time `bson:"estimatedDelivery,omitempty" json:"estimatedDelivery,omitempty"` // Data estimada de entrega
	Priority          string     `bson:"priority,omitempty" json:"priority,omitempty"`                   // low, normal, high, urgent
	WarrantyTerms     string     `bson:"warrantyTerms,omitempty" json:"warrantyTerms,omitempty"`         // Termos de garantia
	Observations      string     `bson:"observations,omitempty" json:"observations,omitempty"`           // Observações finais

	Notes []Note `bson:"notes,omitempty" json:"notes,omitempty"`

	CreatedAt       time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time          `bson:"updatedAt" json:"updatedAt"`
	CreatedBy       primitive.ObjectID `bson:"createdBy" json:"createdBy"`
	UpdatedBy       primitive.ObjectID `bson:"updatedBy" json:"updatedBy"`
	StatusChangedBy primitive.ObjectID `bson:"statusChangedBy,omitempty" json:"statusChangedBy,omitempty"`
	StatusChangedAt time.Time          `bson:"statusChangedAt,omitempty" json:"statusChangedAt,omitempty"`
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
