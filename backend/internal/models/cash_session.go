package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CashSessionStatus string

const (
	CashSessionOpen   CashSessionStatus = "open"
	CashSessionClosed CashSessionStatus = "closed"
)

type CashMovementType string

const (
	CashIn  CashMovementType = "in"
	CashOut CashMovementType = "out"
)

type CashMovementKind string

const (
	CashKindSale      CashMovementKind = "sale"
	CashKindOSDeposit CashMovementKind = "os_deposit"
	CashKindOSBalance CashMovementKind = "os_balance"
	CashKindWithdraw  CashMovementKind = "withdraw"
	CashKindFloat     CashMovementKind = "float"
	CashKindOther     CashMovementKind = "other"
)

type PaymentMethod string

const (
	PaymentPix    PaymentMethod = "pix"
	PaymentDebit  PaymentMethod = "debit"
	PaymentCredit PaymentMethod = "credit"
	PaymentCash   PaymentMethod = "cash"
)

// CashSession representa um turno de caixa (abertura até fechamento)
type CashSession struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	BranchID       primitive.ObjectID `bson:"branchId" json:"branchId"`
	OpenedBy       primitive.ObjectID `bson:"openedBy" json:"openedBy"`
	ClosedBy       primitive.ObjectID `bson:"closedBy,omitempty" json:"closedBy,omitempty"`
	OpenedAt       time.Time          `bson:"openedAt" json:"openedAt"`
	ClosedAt       *time.Time         `bson:"closedAt,omitempty" json:"closedAt,omitempty"`
	OpeningFloat   float64            `bson:"openingFloat" json:"openingFloat"`
	ClosingCounted *float64           `bson:"closingCounted,omitempty" json:"closingCounted,omitempty"`
	ExpectedTotal  *float64           `bson:"expectedTotal,omitempty" json:"expectedTotal,omitempty"`
	Difference     *float64           `bson:"difference,omitempty" json:"difference,omitempty"`
	Status         CashSessionStatus  `bson:"status" json:"status"`
	Notes          string             `bson:"notes,omitempty" json:"notes,omitempty"`
}

// CashMovement representa uma entrada/saída dentro de uma sessão de caixa
type CashMovement struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	SessionID   primitive.ObjectID `bson:"sessionId" json:"sessionId"`
	BranchID    primitive.ObjectID `bson:"branchId" json:"branchId"`
	Type        CashMovementType   `bson:"type" json:"type"`
	Kind        CashMovementKind   `bson:"kind" json:"kind"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	Method      PaymentMethod      `bson:"method" json:"method"`
	Amount      float64            `bson:"amount" json:"amount"`
	RefType     string             `bson:"refType,omitempty" json:"refType,omitempty"`
	RefID       primitive.ObjectID `bson:"refId,omitempty" json:"refId,omitempty"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	CreatedBy   primitive.ObjectID `bson:"createdBy" json:"createdBy"` // Employee ID
}

// IsValidCashKind verifica se o tipo de lançamento é conhecido
func IsValidCashKind(k CashMovementKind) bool {
	switch k {
	case CashKindSale, CashKindOSDeposit, CashKindOSBalance, CashKindWithdraw, CashKindFloat, CashKindOther:
		return true
	}
	return false
}

// IsValidPaymentMethod verifica se a forma de pagamento é conhecida
func IsValidPaymentMethod(m PaymentMethod) bool {
	switch m {
	case PaymentPix, PaymentDebit, PaymentCredit, PaymentCash:
		return true
	}
	return false
}
