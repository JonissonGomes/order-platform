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

const quotationsCollection = "quotations"

type QuotationRepository struct {
	collection *mongo.Collection
}

func NewQuotationRepository(db *mongo.Database) *QuotationRepository {
	repo := &QuotationRepository{
		collection: db.Collection(quotationsCollection),
	}

	// Create unique index for quotationNumber
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "quotationNumber", Value: 1}},
		Options: options.Index().SetUnique(true),
	}
	repo.collection.Indexes().CreateOne(context.Background(), indexModel)

	// Indexes for common queries
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "customerId", Value: 1}},
	})
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "status", Value: 1}},
	})
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "createdAt", Value: -1}},
	})

	return repo
}

func (r *QuotationRepository) CreateQuotation(ctx context.Context, quotation *models.Quotation) error {
	quotation.CreatedAt = time.Now()
	quotation.UpdatedAt = time.Now()
	_, err := r.collection.InsertOne(ctx, quotation)
	return err
}

func (r *QuotationRepository) GetQuotationByID(ctx context.Context, id primitive.ObjectID) (*models.Quotation, error) {
	var quotation models.Quotation
	filter := bson.M{"_id": id}

	err := r.collection.FindOne(ctx, filter).Decode(&quotation)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &quotation, nil
}

func (r *QuotationRepository) GetQuotationByNumber(ctx context.Context, quotationNumber string) (*models.Quotation, error) {
	var quotation models.Quotation
	filter := bson.M{"quotationNumber": quotationNumber}

	err := r.collection.FindOne(ctx, filter).Decode(&quotation)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &quotation, nil
}

func (r *QuotationRepository) UpdateQuotation(ctx context.Context, id primitive.ObjectID, quotation *models.Quotation) error {
	filter := bson.M{"_id": id}
	quotation.UpdatedAt = time.Now()
	update := bson.M{"$set": quotation}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

func (r *QuotationRepository) ListQuotations(ctx context.Context, skip, limit int64, filter bson.M) ([]*models.Quotation, error) {
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"createdAt": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var quotations []*models.Quotation
	if err := cursor.All(ctx, &quotations); err != nil {
		return nil, err
	}

	return quotations, nil
}

func (r *QuotationRepository) CountQuotations(ctx context.Context, filter bson.M) (int64, error) {
	return r.collection.CountDocuments(ctx, filter)
}

func (r *QuotationRepository) GetQuotationsByCustomerID(ctx context.Context, customerID primitive.ObjectID) ([]*models.Quotation, error) {
	filter := bson.M{"customerId": customerID}
	opts := options.Find().SetSort(bson.M{"createdAt": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var quotations []*models.Quotation
	if err := cursor.All(ctx, &quotations); err != nil {
		return nil, err
	}

	return quotations, nil
}

func (r *QuotationRepository) DeleteQuotation(ctx context.Context, id primitive.ObjectID) error {
	filter := bson.M{"_id": id}
	_, err := r.collection.DeleteOne(ctx, filter)
	return err
}
