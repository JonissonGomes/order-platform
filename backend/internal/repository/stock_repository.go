package repository

import (
	"context"
	"time"

	"order-platform/backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	stockItemsCollection     = "stock_items"
	stockMovementsCollection = "stock_movements"
)

type StockRepository struct {
	items     *mongo.Collection
	movements *mongo.Collection
}

func NewStockRepository(db *mongo.Database) *StockRepository {
	repo := &StockRepository{
		items:     db.Collection(stockItemsCollection),
		movements: db.Collection(stockMovementsCollection),
	}

	// Índice único por SKU (somente quando SKU não é vazio)
	repo.items.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys:    bson.D{{Key: "sku", Value: 1}},
		Options: options.Index().SetUnique(true).SetSparse(true),
	})
	// Índice para busca por categoria
	repo.items.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "category", Value: 1}},
	})
	// Índice em movimentos por item
	repo.movements.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "stockItemId", Value: 1}, {Key: "createdAt", Value: -1}},
	})

	return repo
}

// ── Items ────────────────────────────────────────────────────────────────────

func (r *StockRepository) CreateItem(ctx context.Context, item *models.StockItem) error {
	_, err := r.items.InsertOne(ctx, item)
	return err
}

func (r *StockRepository) GetItemByID(ctx context.Context, id primitive.ObjectID) (*models.StockItem, error) {
	var item models.StockItem
	err := r.items.FindOne(ctx, bson.M{"_id": id}).Decode(&item)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &item, err
}

func (r *StockRepository) UpdateItem(ctx context.Context, id primitive.ObjectID, update bson.M) error {
	update["updatedAt"] = time.Now()
	_, err := r.items.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": update})
	return err
}

func (r *StockRepository) ListItems(ctx context.Context, filter bson.M, page, limit int) ([]*models.StockItem, int64, error) {
	total, err := r.items.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "name", Value: 1}}).
		SetSkip(int64((page - 1) * limit)).
		SetLimit(int64(limit))

	cursor, err := r.items.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var items []*models.StockItem
	if err := cursor.All(ctx, &items); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// GetSummary retorna resumo geral do estoque
func (r *StockRepository) GetSummary(ctx context.Context) (*models.StockSummary, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"isActive": true}}},
		{{Key: "$group", Value: bson.M{
			"_id":          nil,
			"totalItems":   bson.M{"$sum": 1},
			"lowStockItems": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$and": bson.A{
					bson.M{"$gt": bson.A{"$minQuantity", 0}},
					bson.M{"$lte": bson.A{"$quantity", "$minQuantity"}},
					bson.M{"$gt": bson.A{"$quantity", 0}},
				}},
				1, 0,
			}}},
			"outOfStock": bson.M{"$sum": bson.M{"$cond": bson.A{
				bson.M{"$lte": bson.A{"$quantity", 0}}, 1, 0,
			}}},
			"totalValue": bson.M{"$sum": bson.M{"$multiply": bson.A{"$quantity", "$costPrice"}}},
		}}},
	}

	cursor, err := r.items.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []struct {
		TotalItems    int     `bson:"totalItems"`
		LowStockItems int     `bson:"lowStockItems"`
		OutOfStock    int     `bson:"outOfStock"`
		TotalValue    float64 `bson:"totalValue"`
	}
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}

	summary := &models.StockSummary{}
	if len(results) > 0 {
		summary.ActiveItems = results[0].TotalItems
		summary.TotalItems = results[0].TotalItems
		summary.LowStockItems = results[0].LowStockItems
		summary.OutOfStock = results[0].OutOfStock
		summary.TotalValue = results[0].TotalValue
	}
	return summary, nil
}

// ── Movements ────────────────────────────────────────────────────────────────

// CreateMovement registra o movimento e atualiza a quantidade do item atomicamente
func (r *StockRepository) CreateMovement(ctx context.Context, mov *models.StockMovement) error {
	// Atualiza quantidade do item
	var delta int
	switch mov.Type {
	case models.StockMovementIn, models.StockMovementReturn:
		delta = mov.Quantity
	case models.StockMovementOut, models.StockMovementDamaged:
		delta = -mov.Quantity
	case models.StockMovementAdjustment:
		// Para ajuste, o Quantity já é o valor final desejado
		// QuantityAfter - QuantityBefore já está setado pelo handler
		delta = mov.QuantityAfter - mov.QuantityBefore
	}

	_, err := r.items.UpdateOne(ctx,
		bson.M{"_id": mov.StockItemID},
		bson.M{"$inc": bson.M{"quantity": delta}, "$set": bson.M{"updatedAt": time.Now()}},
	)
	if err != nil {
		return err
	}

	_, err = r.movements.InsertOne(ctx, mov)
	return err
}

func (r *StockRepository) ListMovements(ctx context.Context, filter bson.M, page, limit int) ([]*models.StockMovement, int64, error) {
	total, err := r.movements.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetSkip(int64((page - 1) * limit)).
		SetLimit(int64(limit))

	cursor, err := r.movements.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var movs []*models.StockMovement
	if err := cursor.All(ctx, &movs); err != nil {
		return nil, 0, err
	}
	return movs, total, nil
}
