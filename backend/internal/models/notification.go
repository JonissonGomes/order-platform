package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// NotificationType defines the type of notification
type NotificationType string

const (
	NotificationTypeInfo    NotificationType = "info"
	NotificationTypeSuccess NotificationType = "success"
	NotificationTypeWarning NotificationType = "warning"
	NotificationTypeError   NotificationType = "error"
)

// NotificationChannel defines the channel for notification delivery
type NotificationChannel string

const (
	NotificationChannelInApp NotificationChannel = "in_app"
	NotificationChannelEmail NotificationChannel = "email"
	NotificationChannelSMS   NotificationChannel = "sms"
	NotificationChannelPush  NotificationChannel = "push"
)

// NotificationStatus defines the status of a notification
type NotificationStatus string

const (
	NotificationStatusPending NotificationStatus = "pending"
	NotificationStatusSent    NotificationStatus = "sent"
	NotificationStatusFailed  NotificationStatus = "failed"
	NotificationStatusRead    NotificationStatus = "read"
)

// Notification represents a notification in the system
type Notification struct {
	ID        primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	UserID    primitive.ObjectID  `bson:"userId" json:"userId"`
	Type      NotificationType    `bson:"type" json:"type"`
	Channel   NotificationChannel `bson:"channel" json:"channel"`
	Title     string              `bson:"title" json:"title"`
	Message   string              `bson:"message" json:"message"`
	Status    NotificationStatus  `bson:"status" json:"status"`
	ReadAt    *time.Time          `bson:"readAt,omitempty" json:"readAt,omitempty"`
	SentAt    *time.Time          `bson:"sentAt,omitempty" json:"sentAt,omitempty"`
	EntityType string             `bson:"entityType,omitempty" json:"entityType,omitempty"` // service_order, customer, etc.
	EntityID   *primitive.ObjectID `bson:"entityId,omitempty" json:"entityId,omitempty"`
	Metadata  map[string]interface{} `bson:"metadata,omitempty" json:"metadata,omitempty"`
	CreatedAt time.Time           `bson:"createdAt" json:"createdAt"`
}

// NotificationTemplate represents a notification template
type NotificationTemplate struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	Type        NotificationType   `bson:"type" json:"type"`
	Channel     NotificationChannel `bson:"channel" json:"channel"`
	Subject     string             `bson:"subject" json:"subject"`
	Body        string             `bson:"body" json:"body"` // Supports {{variable}} placeholders
	IsActive    bool               `bson:"isActive" json:"isActive"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}
