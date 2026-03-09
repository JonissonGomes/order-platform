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
	suppliersCollection     = "suppliers"
	purchaseOrdersCollection = "purchase_orders"
)

type SupplierRepository struct {
	suppliers     *mongo.Collection
	purchaseOrders *mongo.Collection
}

func NewSupplierRepository(db *mongo.Database) *SupplierRepository {
	repo := &SupplierRepository{
		suppliers:      db.Collection(suppliersCollection),
		purchaseOrders: db.Collection(purchaseOrdersCollection),
	}

	// Create unique index for CNPJ (when not empty)
	repo.suppliers.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys:    bson.D{{Key: "cnpj", Value: 1}},
		Options: options.Index().SetUnique(true).SetSparse(true),
	})

	// Create unique index for CPF (when not empty)
	repo.suppliers.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys:    bson.D{{Key: "cpf", Value: 1}},
		Options: options.Index().SetUnique(true).SetSparse(true),
	})

	// Indexes for purchase orders
	repo.purchaseOrders.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys:    bson.D{{Key: "orderNumber", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	repo.purchaseOrders.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "supplierId", Value: 1}},
	})
	repo.purchaseOrders.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "status", Value: 1}},
	})

	return repo
}

// ── Suppliers ────────────────────────────────────────────────────────────────

func (r *SupplierRepository) CreateSupplier(ctx context.Context, supplier *models.Supplier) error {
	supplier.CreatedAt = time.Now()
	supplier.UpdatedAt = time.Now()
	_, err := r.suppliers.InsertOne(ctx, supplier)
	return err
}

func (r *SupplierRepository) GetSupplierByID(ctx context.Context, id primitive.ObjectID) (*models.Supplier, error) {
	var supplier models.Supplier
	filter := bson.M{"_id": id}

	err := r.suppliers.FindOne(ctx, filter).Decode(&supplier)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &supplier, nil
}

func (r *SupplierRepository) UpdateSupplier(ctx context.Context, id primitive.ObjectID, supplier *models.Supplier) error {
	filter := bson.M{"_id": id}
	supplier.UpdatedAt = time.Now()
	update := bson.M{"$set": supplier}

	_, err := r.suppliers.UpdateOne(ctx, filter, update)
	return err
}

func (r *SupplierRepository) ListSuppliers(ctx context.Context, skip, limit int64, filter bson.M) ([]*models.Supplier, error) {
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"name": 1})

	cursor, err := r.suppliers.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var suppliers []*models.Supplier
	if err := cursor.All(ctx, &suppliers); err != nil {
		return nil, err
	}

	return suppliers, nil
}

func (r *SupplierRepository) CountSuppliers(ctx context.Context, filter bson.M) (int64, error) {
	return r.suppliers.CountDocuments(ctx, filter)
}

func (r *SupplierRepository) DeleteSupplier(ctx context.Context, id primitive.ObjectID) error {
	filter := bson.M{"_id": id}
	_, err := r.suppliers.DeleteOne(ctx, filter)
	return err
}

// ── Purchase Orders ──────────────────────────────────────────────────────────

func (r *SupplierRepository) CreatePurchaseOrder(ctx context.Context, order *models.PurchaseOrder) error {
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()
	_, err := r.purchaseOrders.InsertOne(ctx, order)
	return err
}

func (r *SupplierRepository) GetPurchaseOrderByID(ctx context.Context, id primitive.ObjectID) (*models.PurchaseOrder, error) {
	var order models.PurchaseOrder
	filter := bson.M{"_id": id}

	err := r.purchaseOrders.FindOne(ctx, filter).Decode(&order)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &order, nil
}

func (r *SupplierRepository) GetPurchaseOrderByNumber(ctx context.Context, orderNumber string) (*models.PurchaseOrder, error) {
	var order models.PurchaseOrder
	filter := bson.M{"orderNumber": orderNumber}

	err := r.purchaseOrders.FindOne(ctx, filter).Decode(&order)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &order, nil
}

func (r *SupplierRepository) UpdatePurchaseOrder(ctx context.Context, id primitive.ObjectID, order *models.PurchaseOrder) error {
	filter := bson.M{"_id": id}
	order.UpdatedAt = time.Now()
	update := bson.M{"$set": order}

	_, err := r.purchaseOrders.UpdateOne(ctx, filter, update)
	return err
}

func (r *SupplierRepository) ListPurchaseOrders(ctx context.Context, skip, limit int64, filter bson.M) ([]*models.PurchaseOrder, error) {
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"createdAt": -1})

	cursor, err := r.purchaseOrders.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var orders []*models.PurchaseOrder
	if err := cursor.All(ctx, &orders); err != nil {
		return nil, err
	}

	return orders, nil
}

func (r *SupplierRepository) CountPurchaseOrders(ctx context.Context, filter bson.M) (int64, error) {
	return r.purchaseOrders.CountDocuments(ctx, filter)
}

func (r *SupplierRepository) GetPurchaseOrdersBySupplierID(ctx context.Context, supplierID primitive.ObjectID) ([]*models.PurchaseOrder, error) {
	filter := bson.M{"supplierId": supplierID}
	opts := options.Find().SetSort(bson.M{"createdAt": -1})

	cursor, err := r.purchaseOrders.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var orders []*models.PurchaseOrder
	if err := cursor.All(ctx, &orders); err != nil {
		return nil, err
	}

	return orders, nil
}

func (r *SupplierRepository) DeletePurchaseOrder(ctx context.Context, id primitive.ObjectID) error {
	filter := bson.M{"_id": id}
	_, err := r.purchaseOrders.DeleteOne(ctx, filter)
	return err
}
