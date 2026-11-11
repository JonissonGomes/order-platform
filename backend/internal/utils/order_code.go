package utils

import (
	"crypto/rand"
	"fmt"
)

// Alfabeto sem I/O/0/1 para reduzir ambiguidade ao digitar/ler.
const orderCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

// RandomOrderCode gera um código alfanumérico de n caracteres (sem prefixo).
func RandomOrderCode(n int) (string, error) {
	if n < 4 {
		return "", fmt.Errorf("order code length must be >= 4")
	}
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	out := make([]byte, n)
	for i := 0; i < n; i++ {
		out[i] = orderCodeAlphabet[int(buf[i])%len(orderCodeAlphabet)]
	}
	return string(out), nil
}
