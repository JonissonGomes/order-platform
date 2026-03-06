package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Image struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	URL        string             `bson:"url" json:"url"`           // URL do Cloudinary
	PublicID   string             `bson:"publicId" json:"publicId"` // ID público do Cloudinary
	Width      int                `bson:"width,omitempty" json:"width,omitempty"`
	Height     int                `bson:"height,omitempty" json:"height,omitempty"`
	Format     string             `bson:"format,omitempty" json:"format,omitempty"`
	Size       int64              `bson:"size,omitempty" json:"size,omitempty"` // Em bytes
	UploadedAt time.Time          `bson:"uploadedAt" json:"uploadedAt"`
	UploadedBy primitive.ObjectID `bson:"uploadedBy" json:"uploadedBy"` // Employee ID
}
