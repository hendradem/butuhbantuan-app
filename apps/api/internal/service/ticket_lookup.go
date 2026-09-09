package service

import (
	"crypto/rand"
	"errors"
	"log"
	"strings"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/pkg/cache"
	"github.com/google/uuid"
)

// OtpSender delivers a one-time password to a phone number. Implementations
// may use SMS, WhatsApp Business API, Fonnte, Twilio, etc. In development a
// LogOtpSender writes the code to stdout so devs can copy/paste.
type OtpSender interface {
	SendOTP(phone, code string) error
}

// LogOtpSender is the zero-config dev sender: it logs the OTP to stdout.
type LogOtpSender struct{}

func (LogOtpSender) SendOTP(phone, code string) error {
	log.Printf("otp-dev: send code=%s to phone=%s", code, phone)
	return nil
}

// TicketLookupService powers the citizen "check my tickets" flow. Users
// request an OTP against their phone, verify it to obtain a short-lived
// session token, then use that token to list their tickets.
type TicketLookupService struct {
	orderRepo    repository.OrderRepository
	sender       OtpSender
	otps         *cache.TTL[string, otpRecord]
	sessions     *cache.TTL[string, string]
	requestCount *cache.TTL[string, int]
	// Config knobs (constants for now; make configurable if needed).
	otpTTL         time.Duration
	sessionTTL     time.Duration
	rateWindow     time.Duration
	rateMax        int
	maxAttempts    int
	lookbackWindow time.Duration
}

type otpRecord struct {
	Code     string
	Attempts int
	IssuedAt time.Time
}

// NewTicketLookupService wires the phone-lookup flow. Passing a nil sender
// falls back to LogOtpSender (dev mode).
func NewTicketLookupService(orderRepo repository.OrderRepository, sender OtpSender) *TicketLookupService {
	if sender == nil {
		sender = LogOtpSender{}
	}
	return &TicketLookupService{
		orderRepo:      orderRepo,
		sender:         sender,
		otps:           cache.NewTTL[string, otpRecord](),
		sessions:       cache.NewTTL[string, string](),
		requestCount:   cache.NewTTL[string, int](),
		otpTTL:         5 * time.Minute,
		sessionTTL:     30 * time.Minute,
		rateWindow:     time.Hour,
		rateMax:        3,
		maxAttempts:    5,
		lookbackWindow: 90 * 24 * time.Hour,
	}
}

// Errors surfaced by the lookup flow. Handlers map these to HTTP statuses.
var (
	ErrLookupRateLimited = errors.New("terlalu banyak permintaan, coba lagi nanti")
	ErrLookupInvalidCode = errors.New("kode salah atau sudah kedaluwarsa")
	ErrLookupBadSession  = errors.New("sesi tidak valid")
	ErrLookupBadPhone    = errors.New("nomor telepon tidak valid")
)

// RequestOTP generates a fresh 6-digit code, stores it (5-min TTL), and hands
// it to the sender. Returns the normalized phone (canonical variant) plus the
// remaining wait until the code expires so the client can show a countdown.
func (s *TicketLookupService) RequestOTP(phone string) (canonical string, expiresIn time.Duration, err error) {
	canonical = strings.TrimSpace(phone)
	if canonical == "" || len(domain.PhoneVariants(canonical)) == 0 {
		return "", 0, ErrLookupBadPhone
	}
	variants := domain.PhoneVariants(canonical)
	// Rate-limit on the canonical variant so 08... and 62... share a bucket.
	key := variants[0]
	count, _ := s.requestCount.Get(key)
	if count >= s.rateMax {
		return "", 0, ErrLookupRateLimited
	}
	s.requestCount.Set(key, count+1, s.rateWindow)

	code, err := generateNumericCode(6)
	if err != nil {
		return "", 0, err
	}
	s.otps.Set(key, otpRecord{Code: code, IssuedAt: time.Now()}, s.otpTTL)
	if err := s.sender.SendOTP(canonical, code); err != nil {
		log.Printf("ticket-lookup: send otp: %v", err)
		// Still return success — dev flow relies on server log; prod
		// deliverability failure surfaces via retry.
	}
	return canonical, s.otpTTL, nil
}

// VerifyOTP checks the code and, if valid, mints a session token. The token
// is what subsequent calls to ListTickets present.
func (s *TicketLookupService) VerifyOTP(phone, code string) (sessionToken string, expiresIn time.Duration, err error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return "", 0, ErrLookupInvalidCode
	}
	variants := domain.PhoneVariants(strings.TrimSpace(phone))
	if len(variants) == 0 {
		return "", 0, ErrLookupBadPhone
	}
	key := variants[0]
	rec, ok := s.otps.Get(key)
	if !ok {
		return "", 0, ErrLookupInvalidCode
	}
	rec.Attempts++
	if rec.Attempts > s.maxAttempts {
		s.otps.Delete(key)
		return "", 0, ErrLookupInvalidCode
	}
	if rec.Code != code {
		// Keep the record so we can count attempts; TTL will clean up.
		s.otps.Set(key, rec, s.otpTTL-time.Since(rec.IssuedAt))
		return "", 0, ErrLookupInvalidCode
	}
	// Success: burn the OTP, mint a session bound to the phone.
	s.otps.Delete(key)
	sessionToken = uuid.New().String()
	s.sessions.Set(sessionToken, key, s.sessionTTL)
	return sessionToken, s.sessionTTL, nil
}

// ListTickets returns tickets for the phone bound to the session token, from
// the last 90 days. Only sanitized fields are exposed.
func (s *TicketLookupService) ListTickets(sessionToken string) ([]domain.OrderTicket, error) {
	phone, ok := s.sessions.Get(strings.TrimSpace(sessionToken))
	if !ok {
		return nil, ErrLookupBadSession
	}
	tickets, err := s.orderRepo.FindByPhoneSince(phone, time.Now().Add(-s.lookbackWindow))
	if err != nil {
		return nil, err
	}
	return tickets, nil
}

// EndSession revokes a session token (used when the citizen taps "Keluar").
func (s *TicketLookupService) EndSession(sessionToken string) {
	s.sessions.Delete(strings.TrimSpace(sessionToken))
}

func generateNumericCode(digits int) (string, error) {
	if digits <= 0 {
		digits = 6
	}
	buf := make([]byte, digits)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	out := make([]byte, digits)
	for i, b := range buf {
		out[i] = '0' + b%10
	}
	return string(out), nil
}
