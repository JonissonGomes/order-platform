package notifications

import "context"

// NotificationChannel envia notificações de mudança de status ao cliente
// (ex.: WhatsApp, SMS). Novas implementações devem satisfazer esta interface.
type NotificationChannel interface {
	NotifyStatus(ctx context.Context, orderNumber, phone, message string) error
}

// NoopChannel é a implementação padrão que não envia nada.
type NoopChannel struct{}

// NotifyStatus não faz nada e nunca retorna erro.
func (NoopChannel) NotifyStatus(ctx context.Context, orderNumber, phone, message string) error {
	return nil
}
