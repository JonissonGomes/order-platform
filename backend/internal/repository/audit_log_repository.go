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

const auditLogsCollection = "audit_logs"

type AuditLogRepository struct {
	collection *mongo.Collection
}

func NewAuditLogRepository(db *mongo.Database) *AuditLogRepository {
	repo := &AuditLogRepository{
		collection: db.Collection(auditLogsCollection),
	}

	// Índices para buscas comuns
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "entityId", Value: 1}, {Key: "entity", Value: 1}},
	})
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "userId", Value: 1}},
	})
	repo.collection.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "timestamp", Value: -1}},
	})

	return repo
}

// CreateAuditLog creates a new audit log entry
func (r *AuditLogRepository) CreateAuditLog(ctx context.Context, log *models.AuditLog) error {
	log.Timestamp = time.Now()
	_, err := r.collection.InsertOne(ctx, log)
	return err
}

// ListAuditLogs lists audit logs with pagination and filters
func (r *AuditLogRepository) ListAuditLogs(ctx context.Context, skip, limit int64, filter bson.M) ([]*models.AuditLog, error) {
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"timestamp": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var logs []*models.AuditLog
	if err := cursor.All(ctx, &logs); err != nil {
		return nil, err
	}

	return logs, nil
}

// CountAuditLogs counts audit logs matching the filter
func (r *AuditLogRepository) CountAuditLogs(ctx context.Context, filter bson.M) (int64, error) {
	return r.collection.CountDocuments(ctx, filter)
}

// GetAuditLogsByEntityID retrieves audit logs for a specific entity
func (r *AuditLogRepository) GetAuditLogsByEntityID(ctx context.Context, entity string, entityID primitive.ObjectID) ([]*models.AuditLog, error) {
	filter := bson.M{
		"entity":   entity,
		"entityId": entityID,
	}
	opts := options.Find().SetSort(bson.M{"timestamp": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var logs []*models.AuditLog
	if err := cursor.All(ctx, &logs); err != nil {
		return nil, err
	}

	return logs, nil
}
