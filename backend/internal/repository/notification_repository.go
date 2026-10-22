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

const notificationsCollection = "notifications"

type NotificationRepository struct {
	collection *mongo.Collection
}

func NewNotificationRepository(db *mongo.Database) *NotificationRepository {
	repo := &NotificationRepository{
		collection: db.Collection(notificationsCollection),
	}

	// Indexes for common queries
	repo.collection.Indexes().CreateMany(context.Background(), []mongo.IndexModel{
		{Keys: bson.D{{Key: "userId", Value: 1}, {Key: "status", Value: 1}}},
		{Keys: bson.D{{Key: "createdAt", Value: -1}}},
		{Keys: bson.D{{Key: "entityType", Value: 1}, {Key: "entityId", Value: 1}}},
	})

	return repo
}

func (r *NotificationRepository) CreateNotification(ctx context.Context, notification *models.Notification) error {
	notification.CreatedAt = time.Now()
	_, err := r.collection.InsertOne(ctx, notification)
	return err
}

func (r *NotificationRepository) GetNotificationByID(ctx context.Context, id primitive.ObjectID) (*models.Notification, error) {
	var notification models.Notification
	filter := bson.M{"_id": id}

	err := r.collection.FindOne(ctx, filter).Decode(&notification)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &notification, nil
}

func (r *NotificationRepository) ListNotifications(ctx context.Context, userID primitive.ObjectID, skip, limit int64, filter bson.M) ([]*models.Notification, error) {
	if filter == nil {
		filter = bson.M{}
	}
	filter["userId"] = userID

	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"createdAt": -1})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var notifications []*models.Notification
	if err := cursor.All(ctx, &notifications); err != nil {
		return nil, err
	}

	return notifications, nil
}

func (r *NotificationRepository) CountUnreadNotifications(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	filter := bson.M{
		"userId": userID,
		"status": bson.M{"$in": []string{"pending", "sent"}},
	}
	return r.collection.CountDocuments(ctx, filter)
}

func (r *NotificationRepository) MarkAsRead(ctx context.Context, id primitive.ObjectID) error {
	now := time.Now()
	filter := bson.M{"_id": id}
	update := bson.M{
		"$set": bson.M{
			"status": models.NotificationStatusRead,
			"readAt": now,
		},
	}

	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

func (r *NotificationRepository) MarkAllAsRead(ctx context.Context, userID primitive.ObjectID) error {
	now := time.Now()
	filter := bson.M{
		"userId": userID,
		"status": bson.M{"$in": []string{"pending", "sent"}},
	}
	update := bson.M{
		"$set": bson.M{
			"status": models.NotificationStatusRead,
			"readAt": now,
		},
	}

	_, err := r.collection.UpdateMany(ctx, filter, update)
	return err
}

func (r *NotificationRepository) UpdateNotificationStatus(ctx context.Context, id primitive.ObjectID, status models.NotificationStatus) error {
	update := bson.M{
		"$set": bson.M{
			"status": status,
		},
	}

	if status == models.NotificationStatusSent {
		now := time.Now()
		update["$set"].(bson.M)["sentAt"] = now
	}

	filter := bson.M{"_id": id}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}
