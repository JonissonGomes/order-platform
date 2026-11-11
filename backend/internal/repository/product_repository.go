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

const productsCollection = "products"

type ProductRepository struct {
	collection *mongo.Collection
}

func NewProductRepository(db *mongo.Database) *ProductRepository {
	repo := &ProductRepository{collection: db.Collection(productsCollection)}

	// SKU e código de barras únicos por filial (apenas quando informados)
	for _, field := range []string{"sku", "barcode"} {
		repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
			Keys: bson.D{{Key: "branchId", Value: 1}, {Key: field, Value: 1}},
			Options: options.Index().SetUnique(true).SetPartialFilterExpression(
				bson.M{field: bson.M{"$type": "string"}},
			),
		})
	}
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "name", Value: 1}},
	})

	return repo
}

// CreateProduct creates a new product
func (r *ProductRepository) CreateProduct(ctx context.Context, product *models.Product) error {
	now := time.Now()
	product.CreatedAt = now
	product.UpdatedAt = now

	result, err := r.collection.InsertOne(ctx, product)
	if err != nil {
		return err
	}
	if id, ok := result.InsertedID.(primitive.ObjectID); ok {
		product.ID = id
	}
	return nil
}

// GetProductByID retrieves a product by ID
func (r *ProductRepository) GetProductByID(ctx context.Context, id primitive.ObjectID) (*models.Product, error) {
	return r.findOne(ctx, bson.M{"_id": id})
}

// GetByBarcode retrieves a product by barcode
func (r *ProductRepository) GetByBarcode(ctx context.Context, barcode string) (*models.Product, error) {
	return r.findOne(ctx, bson.M{"barcode": barcode})
}

// GetBySKU retrieves a product by SKU
func (r *ProductRepository) GetBySKU(ctx context.Context, sku string) (*models.Product, error) {
	return r.findOne(ctx, bson.M{"sku": sku})
}

// UpdateProduct updates a product (quantidade é alterada apenas via UpdateQty)
func (r *ProductRepository) UpdateProduct(ctx context.Context, id primitive.ObjectID, product *models.Product) error {
	product.UpdatedAt = time.Now()
	set := bson.M{
		"branchId":    product.BranchID,
		"name":        product.Name,
		"category":    product.Category,
		"cost":        product.Cost,
		"price":       product.Price,
		"minQty":      product.MinQty,
		"description": product.Description,
		"isActive":    product.IsActive,
		"updatedAt":   product.UpdatedAt,
		"updatedBy":   product.UpdatedBy,
	}
	// SKU/código de barras vazios são removidos (o índice único parcial só considera strings)
	unset := bson.M{}
	for field, value := range map[string]string{"sku": product.SKU, "barcode": product.Barcode} {
		if value == "" {
			unset[field] = ""
		} else {
			set[field] = value
		}
	}
	update := bson.M{"$set": set}
	if len(unset) > 0 {
		update["$unset"] = unset
	}

	_, err := r.collection.UpdateOne(ctx, bson.M{"_id": id}, update)
	return err
}

// UpdateQty aplica uma variação atômica (delta) na quantidade e retorna o produto atualizado.
// Retorna (nil, nil) se o produto não existir ou se o estoque ficaria negativo.
func (r *ProductRepository) UpdateQty(ctx context.Context, id primitive.ObjectID, delta int, updatedBy primitive.ObjectID) (*models.Product, error) {
	filter := bson.M{"_id": id}
	if delta < 0 {
		filter["qty"] = bson.M{"$gte": -delta}
	}
	update := bson.M{
		"$inc": bson.M{"qty": delta},
		"$set": bson.M{"updatedAt": time.Now(), "updatedBy": updatedBy},
	}

	var product models.Product
	err := r.collection.FindOneAndUpdate(ctx, filter, update,
		options.FindOneAndUpdate().SetReturnDocument(options.After)).Decode(&product)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &product, nil
}

// SetQty define a quantidade absoluta (ajuste de inventário) e retorna o produto atualizado
func (r *ProductRepository) SetQty(ctx context.Context, id primitive.ObjectID, qty int, updatedBy primitive.ObjectID) (*models.Product, error) {
	update := bson.M{"$set": bson.M{"qty": qty, "updatedAt": time.Now(), "updatedBy": updatedBy}}

	var product models.Product
	err := r.collection.FindOneAndUpdate(ctx, bson.M{"_id": id}, update,
		options.FindOneAndUpdate().SetReturnDocument(options.After)).Decode(&product)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &product, nil
}

// ListProducts lists products with pagination
func (r *ProductRepository) ListProducts(ctx context.Context, skip, limit int64, filter bson.M) ([]*models.Product, error) {
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"name": 1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	products := []*models.Product{}
	if err := cursor.All(ctx, &products); err != nil {
		return nil, err
	}
	return products, nil
}

// CountProducts counts products matching the filter
func (r *ProductRepository) CountProducts(ctx context.Context, filter bson.M) (int64, error) {
	return r.collection.CountDocuments(ctx, filter)
}

func (r *ProductRepository) findOne(ctx context.Context, filter bson.M) (*models.Product, error) {
	var product models.Product
	if err := r.collection.FindOne(ctx, filter).Decode(&product); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &product, nil
}
