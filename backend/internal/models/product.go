package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Product struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Type        string             `bson:"type" json:"type"` // smartphone, notebook, tablet, etc.
	Brand       string             `bson:"brand" json:"brand"`
	Model       string             `bson:"model" json:"model"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
	CreatedBy   primitive.ObjectID `bson:"createdBy" json:"createdBy"` // Employee ID
	UpdatedBy   primitive.ObjectID `bson:"updatedBy" json:"updatedBy"` // Employee ID
}
