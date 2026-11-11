package models

import "strings"

// MatchPermission verifica se uma permissão concedida cobre a permissão requerida.
// Suporta "*" (tudo) e curingas de recurso, como "service_orders.*"
// (cobre "service_orders.read", "service_orders.status.ready", etc.).
func MatchPermission(granted, required string) bool {
	if granted == "" || required == "" {
		return false
	}
	if granted == "*" || granted == required {
		return true
	}
	if strings.HasSuffix(granted, ".*") {
		prefix := strings.TrimSuffix(granted, "*") // mantém o ponto final
		return strings.HasPrefix(required, prefix)
	}
	return false
}

// HasPermission verifica se alguma das permissões concede a permissão requerida.
func HasPermission(perms []string, required string) bool {
	for _, p := range perms {
		if MatchPermission(p, required) {
			return true
		}
	}
	return false
}
