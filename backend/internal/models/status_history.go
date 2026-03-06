package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type StatusHistory struct {
	ID               primitive.ObjectID   `bson:"_id,omitempty" json:"id"`
	ServiceOrderID   primitive.ObjectID   `bson:"serviceOrderId" json:"serviceOrderId"`
	PreviousStatus   ServiceOrderStatus   `bson:"previousStatus" json:"previousStatus"`
	NewStatus        ServiceOrderStatus   `bson:"newStatus" json:"newStatus"`
	ChangedBy        primitive.ObjectID   `bson:"changedBy" json:"changedBy"` // Employee ID
	ChangedByEmployee *Employee           `bson:"-" json:"changedByEmployee,omitempty"`
	EmployeeRole     EmployeeRole        `bson:"employeeRole" json:"employeeRole"`
	DepartmentID     primitive.ObjectID   `bson:"departmentId" json:"departmentId"`
	DepartmentName   string              `bson:"departmentName" json:"departmentName"`
	Notes            string              `bson:"notes,omitempty" json:"notes,omitempty"`
	ChangedAt        time.Time           `bson:"changedAt" json:"changedAt"`
}
