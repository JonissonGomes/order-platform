package jobs

import (
	"context"
	"log"
	"time"

	"order-platform/backend/internal/services"
)

type AlertJob struct {
	alertService *services.AlertService
	interval     time.Duration
	stopChan     chan bool
}

func NewAlertJob(alertService *services.AlertService, interval time.Duration) *AlertJob {
	return &AlertJob{
		alertService: alertService,
		interval:     interval,
		stopChan:     make(chan bool),
	}
}

// Start starts the alert job in a goroutine
func (j *AlertJob) Start(ctx context.Context) {
	go j.run(ctx)
}

// Stop stops the alert job
func (j *AlertJob) Stop() {
	j.stopChan <- true
}

// run runs the alert check periodically
func (j *AlertJob) run(ctx context.Context) {
	ticker := time.NewTicker(j.interval)
	defer ticker.Stop()

	// Run immediately on start
	j.checkAlerts(ctx)

	for {
		select {
		case <-ticker.C:
			j.checkAlerts(ctx)
		case <-j.stopChan:
			log.Println("Alert job stopped")
			return
		case <-ctx.Done():
			log.Println("Alert job context cancelled")
			return
		}
	}
}

func (j *AlertJob) checkAlerts(ctx context.Context) {
	log.Println("Running alert checks...")
	if err := j.alertService.CheckAlerts(ctx); err != nil {
		log.Printf("Error running alert checks: %v", err)
	} else {
		log.Println("Alert checks completed successfully")
	}
}
