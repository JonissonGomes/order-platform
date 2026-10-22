package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"net/http"
	"time"

	"order-platform/backend/internal/models"
	"order-platform/backend/internal/repository"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type NotificationService struct {
	notificationRepo *repository.NotificationRepository
	emailService     *EmailService
	smsService       *SMSService
}

type EmailService struct {
	smtpHost     string
	smtpPort     int
	smtpUser     string
	smtpPassword string
	fromEmail    string
	fromName     string
}

type SMSService struct {
	apiURL   string
	apiToken string
}

func NewNotificationService(
	notificationRepo *repository.NotificationRepository,
	emailService *EmailService,
	smsService *SMSService,
) *NotificationService {
	return &NotificationService{
		notificationRepo: notificationRepo,
		emailService:     emailService,
		smsService:       smsService,
	}
}

func NewEmailService(smtpHost string, smtpPort int, smtpUser, smtpPassword, fromEmail, fromName string) *EmailService {
	return &EmailService{
		smtpHost:     smtpHost,
		smtpPort:     smtpPort,
		smtpUser:     smtpUser,
		smtpPassword: smtpPassword,
		fromEmail:    fromEmail,
		fromName:     fromName,
	}
}

func NewSMSService(apiURL, apiToken string) *SMSService {
	return &SMSService{
		apiURL:   apiURL,
		apiToken: apiToken,
	}
}

// SendNotification sends a notification through the specified channel
func (s *NotificationService) SendNotification(ctx context.Context, notification *models.Notification) error {
	// Create notification record
	if err := s.notificationRepo.CreateNotification(ctx, notification); err != nil {
		return err
	}

	// Send based on channel
	switch notification.Channel {
	case models.NotificationChannelInApp:
		// In-app notifications are already created in the database
		notification.Status = models.NotificationStatusSent
		now := time.Now()
		notification.SentAt = &now
		return s.notificationRepo.UpdateNotificationStatus(ctx, notification.ID, models.NotificationStatusSent)

	case models.NotificationChannelEmail:
		return s.sendEmailNotification(ctx, notification)

	case models.NotificationChannelSMS:
		return s.sendSMSNotification(ctx, notification)

	case models.NotificationChannelPush:
		// TODO: Implement push notifications
		return fmt.Errorf("push notifications not yet implemented")

	default:
		return fmt.Errorf("unknown notification channel: %s", notification.Channel)
	}
}

// sendEmailNotification sends an email notification
func (s *NotificationService) sendEmailNotification(ctx context.Context, notification *models.Notification) error {
	if s.emailService == nil || s.emailService.smtpHost == "" {
		return fmt.Errorf("email service not configured")
	}

	// TODO: Implement actual SMTP email sending
	// For now, just mark as sent
	notification.Status = models.NotificationStatusSent
	now := time.Now()
	notification.SentAt = &now
	return s.notificationRepo.UpdateNotificationStatus(ctx, notification.ID, models.NotificationStatusSent)
}

// sendSMSNotification sends an SMS notification
func (s *NotificationService) sendSMSNotification(ctx context.Context, notification *models.Notification) error {
	if s.smsService == nil || s.smsService.apiURL == "" {
		return fmt.Errorf("SMS service not configured")
	}

	// Get user phone from metadata or user record
	phone, ok := notification.Metadata["phone"].(string)
	if !ok || phone == "" {
		return fmt.Errorf("phone number not provided")
	}

	url := fmt.Sprintf("%s/send", s.smsService.apiURL)
	payload := map[string]interface{}{
		"to":      phone,
		"message": notification.Message,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.smsService.apiToken))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		notification.Status = models.NotificationStatusFailed
		s.notificationRepo.UpdateNotificationStatus(ctx, notification.ID, models.NotificationStatusFailed)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		notification.Status = models.NotificationStatusFailed
		s.notificationRepo.UpdateNotificationStatus(ctx, notification.ID, models.NotificationStatusFailed)
		return fmt.Errorf("SMS API error: %s", string(body))
	}

	notification.Status = models.NotificationStatusSent
	now := time.Now()
	notification.SentAt = &now
	return s.notificationRepo.UpdateNotificationStatus(ctx, notification.ID, models.NotificationStatusSent)
}

// SendServiceOrderStatusNotification sends a notification when service order status changes
func (s *NotificationService) SendServiceOrderStatusNotification(
	ctx context.Context,
	userID primitive.ObjectID,
	orderNumber string,
	status string,
	customerName string,
) error {
	statusLabels := map[string]string{
		"pending":      "Aguardando Avaliação",
		"evaluating":   "Em Avaliação",
		"approved":     "Aprovado",
		"waiting_parts": "Aguardando Peças",
		"in_repair":    "Em Reparo",
		"testing":      "Em Teste",
		"ready":        "Pronto para Retirada",
		"delivered":    "Entregue",
		"cancelled":    "Cancelado",
	}

	statusLabel := statusLabels[status]
	if statusLabel == "" {
		statusLabel = status
	}

	notification := &models.Notification{
		ID:      primitive.NewObjectID(),
		UserID:  userID,
		Type:    models.NotificationTypeInfo,
		Channel: models.NotificationChannelInApp,
		Title:   "Atualização de Ordem de Serviço",
		Message: fmt.Sprintf("A ordem de serviço %s mudou para: %s", orderNumber, statusLabel),
		Status:  models.NotificationStatusPending,
		EntityType: "service_order",
		Metadata: map[string]interface{}{
			"orderNumber":  orderNumber,
			"status":       status,
			"customerName": customerName,
		},
	}

	return s.SendNotification(ctx, notification)
}

// RenderTemplate renders a notification template with variables
func (s *NotificationService) RenderTemplate(templateBody string, variables map[string]interface{}) (string, error) {
	tmpl, err := template.New("notification").Parse(templateBody)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, variables); err != nil {
		return "", err
	}

	return buf.String(), nil
}
