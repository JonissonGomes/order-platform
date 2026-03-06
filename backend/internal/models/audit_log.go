package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuditAction string

const (
	ActionCreate        AuditAction = "create"
	ActionUpdate        AuditAction = "update"
	ActionDelete        AuditAction = "delete"
	ActionStatusChanged AuditAction = "status_changed"
	ActionAssigned      AuditAction = "assigned"
	ActionUnassigned    AuditAction = "unassigned"
)

type AuditLog struct {
	ID             primitive.ObjectID     `bson:"_id,omitempty" json:"id"`
	Action         AuditAction            `bson:"action" json:"action"`
	Entity         string                 `bson:"entity" json:"entity"` // ServiceOrder, Customer, Employee, etc.
	EntityID       primitive.ObjectID     `bson:"entityId" json:"entityId"`
	UserID         primitive.ObjectID     `bson:"userId" json:"userId"` // Employee ID
	UserName       string                 `bson:"userName" json:"userName"`
	UserEmail      string                 `bson:"userEmail" json:"userEmail"`
	UserRole       EmployeeRole           `bson:"userRole" json:"userRole"`
	DepartmentID   primitive.ObjectID     `bson:"departmentId,omitempty" json:"departmentId,omitempty"`
	DepartmentName string                 `bson:"departmentName,omitempty" json:"departmentName,omitempty"`
	Changes        map[string]interface{} `bson:"changes,omitempty" json:"changes,omitempty"` // Valores anteriores e novos
	IP             string                 `bson:"ip,omitempty" json:"ip,omitempty"`
	UserAgent      string                 `bson:"userAgent,omitempty" json:"userAgent,omitempty"`
	Timestamp      time.Time              `bson:"timestamp" json:"timestamp"`
}
