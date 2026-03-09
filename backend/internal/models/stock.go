package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// StockItem representa um item/peça no estoque
type StockItem struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name         string             `bson:"name" json:"name"`
	SKU          string             `bson:"sku,omitempty" json:"sku,omitempty"`           // Código interno
	Category     string             `bson:"category" json:"category"`                     // Tela, Bateria, Cabo, IC, Conector, Outro
	Description  string             `bson:"description,omitempty" json:"description,omitempty"`
	Quantity     int                `bson:"quantity" json:"quantity"`                     // Quantidade atual
	MinQuantity  int                `bson:"minQuantity" json:"minQuantity"`               // Alerta de estoque mínimo
	CostPrice    float64            `bson:"costPrice" json:"costPrice"`                   // Preço de custo
	SellingPrice float64            `bson:"sellingPrice,omitempty" json:"sellingPrice,omitempty"` // Preço de venda sugerido
	Supplier     string             `bson:"supplier,omitempty" json:"supplier,omitempty"` // Fornecedor
	Location     string             `bson:"location,omitempty" json:"location,omitempty"` // Prateleira/Gaveta
	IsActive     bool               `bson:"isActive" json:"isActive"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
	CreatedBy    primitive.ObjectID `bson:"createdBy" json:"createdBy"`
	UpdatedBy    primitive.ObjectID `bson:"updatedBy" json:"updatedBy"`
}

// StockMovementType define o tipo de movimentação
type StockMovementType string

const (
	StockMovementIn         StockMovementType = "in"          // Entrada (compra)
	StockMovementOut        StockMovementType = "out"         // Saída (uso em OS)
	StockMovementAdjustment StockMovementType = "adjustment"  // Ajuste manual
	StockMovementReturn     StockMovementType = "return"      // Devolução
	StockMovementDamaged    StockMovementType = "damaged"     // Peça danificada
)

// StockMovementReason define o motivo da movimentação
type StockMovementReason string

const (
	ReasonPurchase     StockMovementReason = "purchase"       // Compra de peças
	ReasonUsedInOrder  StockMovementReason = "used_in_order"  // Usada em ordem de serviço
	ReasonReturned     StockMovementReason = "returned"       // Devolução ao fornecedor
	ReasonDamaged      StockMovementReason = "damaged"        // Peça danificada
	ReasonAdjustment   StockMovementReason = "adjustment"     // Ajuste de inventário
	ReasonInitial      StockMovementReason = "initial"        // Estoque inicial
)

// StockMovement representa uma movimentação de estoque
type StockMovement struct {
	ID             primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	StockItemID    primitive.ObjectID  `bson:"stockItemId" json:"stockItemId"`
	StockItem      *StockItem          `bson:"-" json:"stockItem,omitempty"`
	Type           StockMovementType   `bson:"type" json:"type"`
	Reason         StockMovementReason `bson:"reason" json:"reason"`
	Quantity       int                 `bson:"quantity" json:"quantity"` // Sempre positivo; direção definida por Type
	UnitCost       float64             `bson:"unitCost,omitempty" json:"unitCost,omitempty"`
	TotalCost      float64             `bson:"totalCost,omitempty" json:"totalCost,omitempty"`
	QuantityBefore int                 `bson:"quantityBefore" json:"quantityBefore"` // Saldo antes do movimento
	QuantityAfter  int                 `bson:"quantityAfter" json:"quantityAfter"`   // Saldo após o movimento
	ServiceOrderID *primitive.ObjectID `bson:"serviceOrderId,omitempty" json:"serviceOrderId,omitempty"`
	Notes          string              `bson:"notes,omitempty" json:"notes,omitempty"`
	CreatedAt      time.Time           `bson:"createdAt" json:"createdAt"`
	CreatedBy      primitive.ObjectID  `bson:"createdBy" json:"createdBy"`
}

// StockSummary representa o resumo do estoque
type StockSummary struct {
	TotalItems    int     `json:"totalItems"`
	ActiveItems   int     `json:"activeItems"`
	LowStockItems int     `json:"lowStockItems"`  // Quantidade abaixo do mínimo
	OutOfStock    int     `json:"outOfStock"`     // Quantidade zerada
	TotalValue    float64 `json:"totalValue"`     // Valor total do estoque (qty * costPrice)
}
