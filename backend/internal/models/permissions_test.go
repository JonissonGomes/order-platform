package models

import "testing"

func TestHasPermission(t *testing.T) {
	cases := []struct {
		name     string
		perms    []string
		required string
		want     bool
	}{
		{"super admin", []string{"*"}, "anything.here", true},
		{"exact", []string{"cash.read"}, "cash.read", true},
		{"resource wildcard", []string{"service_orders.*"}, "service_orders.status.ready", true},
		{"wildcard not prefix of other resource", []string{"service_orders.*"}, "service_orders_x.read", false},
		{"different action", []string{"cash.read"}, "cash.sale", false},
		{"empty", nil, "cash.read", false},
		{"wildcard grants wildcard subset", []string{"service_orders.*"}, "service_orders.status.*", true},
		{"specific does not grant wildcard", []string{"service_orders.status.ready"}, "service_orders.*", false},
	}
	for _, tc := range cases {
		if got := HasPermission(tc.perms, tc.required); got != tc.want {
			t.Errorf("%s: HasPermission(%v, %q) = %v, want %v", tc.name, tc.perms, tc.required, got, tc.want)
		}
	}
}

func TestStatusTransitions(t *testing.T) {
	valid := [][2]ServiceOrderStatus{
		{StatusPending, StatusEvaluating},
		{StatusEvaluating, StatusApproved},
		{StatusEvaluating, StatusUnrepairable},
		{StatusReady, StatusDelivered},
	}
	for _, v := range valid {
		if !IsValidStatusTransition(v[0], v[1]) {
			t.Errorf("%s -> %s deveria ser válido", v[0], v[1])
		}
	}
	invalid := [][2]ServiceOrderStatus{
		{StatusPending, StatusApproved},
		{StatusUnrepairable, StatusInRepair},
		{StatusDelivered, StatusCancelled},
	}
	for _, v := range invalid {
		if IsValidStatusTransition(v[0], v[1]) {
			t.Errorf("%s -> %s deveria ser inválido", v[0], v[1])
		}
	}
}

func TestCanChangeStatusUsesProfile(t *testing.T) {
	specific := &Employee{
		Role:    EmployeeRoleTechnician,
		Profile: &Profile{IsActive: true, Permissions: []string{"service_orders.status.delivered"}},
	}
	if !specific.CanChangeStatus(StatusDelivered) {
		t.Error("permissão do perfil deveria permitir delivered")
	}
	if specific.CanChangeStatus(StatusInRepair) {
		t.Error("role não deve mais liberar status sem permissão no perfil")
	}

	withUpdate := &Employee{
		Role:    EmployeeRoleAttendant,
		Profile: &Profile{IsActive: true, Permissions: []string{"service_orders.update"}},
	}
	if !withUpdate.CanChangeStatus(StatusInRepair) {
		t.Error("service_orders.update deveria liberar qualquer status")
	}

	noProfile := &Employee{Role: EmployeeRoleAdmin}
	if noProfile.CanChangeStatus(StatusPending) {
		t.Error("sem perfil ativo não deve mudar status")
	}
}
