package cache

import (
	"sync"
	"time"
)

type entry[V any] struct {
	value     V
	expiresAt time.Time
}

// TTL is a generic in-memory cache with per-entry expiration.
// Safe for concurrent use.
type TTL[K comparable, V any] struct {
	mu      sync.RWMutex
	entries map[K]entry[V]
}

func NewTTL[K comparable, V any]() *TTL[K, V] {
	c := &TTL[K, V]{entries: make(map[K]entry[V])}
	go c.sweep()
	return c
}

func (c *TTL[K, V]) sweep() {
	for range time.Tick(5 * time.Minute) {
		c.mu.Lock()
		now := time.Now()
		for k, e := range c.entries {
			if now.After(e.expiresAt) {
				delete(c.entries, k)
			}
		}
		c.mu.Unlock()
	}
}

func (c *TTL[K, V]) Get(key K) (V, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	e, ok := c.entries[key]
	if !ok || time.Now().After(e.expiresAt) {
		var zero V
		return zero, false
	}
	return e.value, true
}

func (c *TTL[K, V]) Set(key K, value V, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[key] = entry[V]{value: value, expiresAt: time.Now().Add(ttl)}
}
