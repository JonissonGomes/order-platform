package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TransactionType define se é receita ou despesa
type TransactionType string

const (
	TransactionIncome  TransactionType = "income"  // Receita
	TransactionExpense TransactionType = "expense" // Despesa
)

// TransactionCategory categorias de receita e despesa
type TransactionCategory string

const (
	// Receitas
	CategoryServiceOrder TransactionCategory = "service_order" // Pagamento de OS
	CategoryOtherIncome  TransactionCategory = "other_income"  // Outras receitas

	// Despesas
	CategoryPartsPurchase TransactionCategory = "parts_purchase" // Compra de peças
	CategorySalary        TransactionCategory = "salary"         // Salários
	CategoryRent          TransactionCategory = "rent"           // Aluguel
	CategoryUtilities     TransactionCategory = "utilities"      // Água/Luz/Internet
	CategoryEquipment     TransactionCategory = "equipment"      // Equipamentos
	CategoryMarketing     TransactionCategory = "marketing"      // Marketing
	CategoryOtherExpense  TransactionCategory = "other_expense"  // Outras despesas
)

// Transaction representa uma transação financeira
type Transaction struct {
	ID             primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Type           TransactionType     `bson:"type" json:"type"`
	Category       TransactionCategory `bson:"category" json:"category"`
	Description    string              `bson:"description" json:"description"`
	Amount         float64             `bson:"amount" json:"amount"` // Sempre positivo
	PaymentMethod  string              `bson:"paymentMethod" json:"paymentMethod"` // pix, cartao_credito, cartao_debito, dinheiro, boleto
	ServiceOrderID *primitive.ObjectID `bson:"serviceOrderId,omitempty" json:"serviceOrderId,omitempty"`
	ServiceOrder   *ServiceOrder       `bson:"-" json:"serviceOrder,omitempty"`
	StockItemID    *primitive.ObjectID `bson:"stockItemId,omitempty" json:"stockItemId,omitempty"` // Para compra de peças
	ReferenceDate  time.Time           `bson:"referenceDate" json:"referenceDate"` // Data de competência
	DueDate        *time.Time          `bson:"dueDate,omitempty" json:"dueDate,omitempty"`
	PaidAt         *time.Time          `bson:"paidAt,omitempty" json:"paidAt,omitempty"`
	IsPaid         bool                `bson:"isPaid" json:"isPaid"`
	Notes          string              `bson:"notes,omitempty" json:"notes,omitempty"`
	CreatedAt      time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt      time.Time           `bson:"updatedAt" json:"updatedAt"`
	CreatedBy      primitive.ObjectID  `bson:"createdBy" json:"createdBy"`
	UpdatedBy      primitive.ObjectID  `bson:"updatedBy" json:"updatedBy"`
}

// FinancialSummary resumo financeiro de um período
type FinancialSummary struct {
	Period          string  `json:"period"`          // YYYY-MM
	TotalIncome     float64 `json:"totalIncome"`
	TotalExpense    float64 `json:"totalExpense"`
	Balance         float64 `json:"balance"`         // TotalIncome - TotalExpense
	PendingIncome   float64 `json:"pendingIncome"`   // A receber
	PendingExpense  float64 `json:"pendingExpense"`  // A pagar
	TransactionCount int   `json:"transactionCount"`
}

// CashFlowEntry representa um mês no fluxo de caixa
type CashFlowEntry struct {
	Month    string  `json:"month"`   // YYYY-MM
	Income   float64 `json:"income"`
	Expense  float64 `json:"expense"`
	Balance  float64 `json:"balance"`
}
