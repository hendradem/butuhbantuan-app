package service

import (
	"context"
	"log"
	"time"
)

// EscalationWorker periodically reassigns SOS tickets that missed their SLA.
type EscalationWorker struct {
	dispatch DispatchUseCase
	interval time.Duration
}

func NewEscalationWorker(dispatch DispatchUseCase, interval time.Duration) *EscalationWorker {
	if interval <= 0 {
		interval = 15 * time.Second
	}
	return &EscalationWorker{dispatch: dispatch, interval: interval}
}

// Start runs until ctx is cancelled. Safe to call in a goroutine.
func (w *EscalationWorker) Start(ctx context.Context) {
	if w.dispatch == nil {
		return
	}
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()
	log.Printf("dispatch escalation worker started (interval=%s)", w.interval)

	for {
		select {
		case <-ctx.Done():
			log.Println("dispatch escalation worker stopped")
			return
		case <-ticker.C:
			n, err := w.dispatch.EscalateOverdue()
			if err != nil {
				log.Printf("dispatch escalation error: %v", err)
				continue
			}
			if n > 0 {
				log.Printf("dispatch escalation: reassigned %d ticket(s)", n)
			}
		}
	}
}
