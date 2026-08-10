package service

import (
	"encoding/json"
	"log"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

// PushService sends Web Push notifications to subscribed ticket watchers.
type PushService struct {
	repo       repository.PushRepository
	privateKey string
	publicKey  string
	subject    string // mailto: or https: required by VAPID spec
}

func NewPushService(repo repository.PushRepository, privateKey, publicKey, subject string) *PushService {
	return &PushService{repo: repo, privateKey: privateKey, publicKey: publicKey, subject: subject}
}

var _ PushUseCase = (*PushService)(nil)

func (s *PushService) VAPIDPublicKey() string { return s.publicKey }

func (s *PushService) Subscribe(sub domain.PushSubscription) error {
	return s.repo.Save(sub)
}

func (s *PushService) Unsubscribe(endpoint string) error {
	return s.repo.DeleteByEndpoint(endpoint)
}

// Notify sends a push to all subscriptions for the given ticket (best-effort, async).
func (s *PushService) Notify(ticketNumber, title, body string) {
	go func() {
		subs, err := s.repo.FindByTicket(ticketNumber)
		if err != nil || len(subs) == 0 {
			return
		}
		payload, _ := json.Marshal(map[string]string{"title": title, "body": body})
		for _, sub := range subs {
			s.send(sub, payload)
		}
	}()
}

func (s *PushService) send(sub domain.PushSubscription, payload []byte) {
	resp, err := webpush.SendNotification(payload, &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.P256DH,
			Auth:   sub.Auth,
		},
	}, &webpush.Options{
		VAPIDPrivateKey: s.privateKey,
		VAPIDPublicKey:  s.publicKey,
		Subscriber:      s.subject,
		TTL:             3600,
	})
	if err != nil {
		log.Printf("push send error (ticket=%s): %v", sub.TicketNumber, err)
		return
	}
	defer resp.Body.Close()
	// 410 Gone = subscription expired; clean up.
	if resp.StatusCode == 410 {
		_ = s.repo.DeleteByEndpoint(sub.Endpoint)
	}
}

// NoopPushService is used when VAPID keys are not configured.
type NoopPushService struct{ publicKey string }

func NewNoopPushService() *NoopPushService                                         { return &NoopPushService{} }
func (s *NoopPushService) VAPIDPublicKey() string                                  { return s.publicKey }
func (s *NoopPushService) Subscribe(_ domain.PushSubscription) error               { return nil }
func (s *NoopPushService) Unsubscribe(_ string) error                              { return nil }
func (s *NoopPushService) Notify(_, _, _ string)                                   {}
