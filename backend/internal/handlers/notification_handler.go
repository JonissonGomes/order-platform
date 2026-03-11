package handlers

import (
	"net/http"
	"strconv"

	"order-platform/backend/internal/middleware"
	"order-platform/backend/internal/repository"
	"order-platform/backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type NotificationHandler struct {
	notificationRepo *repository.NotificationRepository
}

func NewNotificationHandler(notificationRepo *repository.NotificationRepository) *NotificationHandler {
	return &NotificationHandler{
		notificationRepo: notificationRepo,
	}
}

// ListNotifications handles GET /api/notifications
func (h *NotificationHandler) ListNotifications(c *gin.Context) {
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	unreadOnly := c.Query("unread") == "true"

	ctx := c.Request.Context()
	userID := currentEmployee.ID

	filter := make(map[string]interface{})
	if unreadOnly {
		filter["status"] = map[string]interface{}{
			"$in": []string{"pending", "sent"},
		}
	}

	skip := int64((page - 1) * limit)
	notifications, err := h.notificationRepo.ListNotifications(ctx, userID, skip, int64(limit), filter)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	total, _ := h.notificationRepo.CountUnreadNotifications(ctx, userID)

	c.JSON(http.StatusOK, gin.H{
		"notifications": notifications,
		"unreadCount":   total,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
		},
	})
}

// GetUnreadCount handles GET /api/notifications/unread-count
func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	ctx := c.Request.Context()
	count, err := h.notificationRepo.CountUnreadNotifications(ctx, currentEmployee.ID)
	if err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

// MarkAsRead handles POST /api/notifications/:id/read
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	id := c.Param("id")
	notificationID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		utils.RespondWithBadRequest(c, utils.ErrInvalidID)
		return
	}

	ctx := c.Request.Context()

	if err := h.notificationRepo.MarkAsRead(ctx, notificationID); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notificação marcada como lida"})
}

// MarkAllAsRead handles POST /api/notifications/read-all
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	currentEmployee := middleware.GetEmployeeFromContext(c)
	if currentEmployee == nil {
		utils.RespondWithUnauthorized(c, utils.ErrUnauthorized)
		return
	}

	ctx := c.Request.Context()

	if err := h.notificationRepo.MarkAllAsRead(ctx, currentEmployee.ID); err != nil {
		utils.RespondWithInternalError(c)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Todas as notificações foram marcadas como lidas"})
}
