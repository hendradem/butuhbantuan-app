package middleware

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

// RateLimit returns middleware that limits requests per client IP.
func RateLimit(maxHits int, window time.Duration) fiber.Handler {
	lim := newIPLimiter(maxHits, window)
	return func(c *fiber.Ctx) error {
		if !lim.allow(c.IP()) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"status":  "error",
				"message": "too many requests, try again later",
			})
		}
		return c.Next()
	}
}

type ipLimiter struct {
	mu      sync.Mutex
	hits    map[string][]time.Time
	window  time.Duration
	maxHits int
}

func newIPLimiter(maxHits int, window time.Duration) *ipLimiter {
	if maxHits <= 0 {
		maxHits = 60
	}
	if window <= 0 {
		window = time.Minute
	}
	return &ipLimiter{
		hits:    map[string][]time.Time{},
		window:  window,
		maxHits: maxHits,
	}
}

func (l *ipLimiter) allow(ip string) bool {
	if ip == "" {
		ip = "unknown"
	}
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()
	cutoff := now.Add(-l.window)
	arr := l.hits[ip]
	kept := arr[:0]
	for _, t := range arr {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= l.maxHits {
		l.hits[ip] = kept
		return false
	}
	l.hits[ip] = append(kept, now)
	// Opportunistic cleanup when map grows large.
	if len(l.hits) > 10_000 {
		for k, v := range l.hits {
			alive := v[:0]
			for _, t := range v {
				if t.After(cutoff) {
					alive = append(alive, t)
				}
			}
			if len(alive) == 0 {
				delete(l.hits, k)
			} else {
				l.hits[k] = alive
			}
		}
	}
	return true
}
