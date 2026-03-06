package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type EmployeeRole string

const (
	EmployeeRoleAdmin             EmployeeRole = "admin"
	EmployeeRoleDepartmentManager EmployeeRole = "department_manager"
	EmployeeRoleAttendant         EmployeeRole = "attendant"
	EmployeeRoleTechnician        EmployeeRole = "technician"
)

type Employee struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID       primitive.ObjectID `bson:"userId" json:"userId"` // Referência ao User
	User         *User             `bson:"-" json:"user,omitempty"`
	Name         string            `bson:"name" json:"name"`
	Email        string            `bson:"email" json:"email"`
	Phone        string            `bson:"phone,omitempty" json:"phone,omitempty"`
	Role         EmployeeRole      `bson:"role" json:"role"`
	ProfileID    primitive.ObjectID `bson:"profileId,omitempty" json:"profileId,omitempty"` // Referência ao Profile
	Profile      *Profile          `bson:"-" json:"profile,omitempty"`
	DepartmentID primitive.ObjectID `bson:"departmentId,omitempty" json:"departmentId,omitempty"`
	Department   *Department       `bson:"-" json:"department,omitempty"`
	IsActive     bool              `bson:"isActive" json:"isActive"`
	CreatedAt    time.Time         `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time         `bson:"updatedAt" json:"updatedAt"`
	CreatedBy    primitive.ObjectID `bson:"createdBy" json:"createdBy"` // Employee ID
	UpdatedBy    primitive.ObjectID `bson:"updatedBy" json:"updatedBy"` // Employee ID
}

// CanChangeStatus verifica se o colaborador pode mudar para o status especificado
func (e *Employee) CanChangeStatus(status ServiceOrderStatus) bool {
	switch e.Role {
	case EmployeeRoleAdmin:
		return true
	case EmployeeRoleDepartmentManager:
		return true
	case EmployeeRoleAttendant:
		return status == StatusPending || status == StatusEvaluating || status == StatusApproved
	case EmployeeRoleTechnician:
		return status == StatusInRepair || status == StatusWaitingParts || status == StatusTesting || status == StatusReady
	default:
		return false
	}
}
