package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Department struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
	ManagerID   primitive.ObjectID `bson:"managerId,omitempty" json:"managerId,omitempty"` // Employee ID
	Manager     *Employee          `bson:"-" json:"manager,omitempty"`
	IsActive    bool               `bson:"isActive" json:"isActive"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
	CreatedBy   primitive.ObjectID `bson:"createdBy" json:"createdBy"` // Employee ID
	UpdatedBy   primitive.ObjectID `bson:"updatedBy" json:"updatedBy"` // Employee ID
}
