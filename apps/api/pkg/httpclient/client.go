package httpclient

import (
	"net/http"
	"time"
)

// Default is a shared HTTP client with a 10-second timeout.
// Use instead of http.DefaultClient to prevent goroutine leaks on hanging upstreams.
var Default = &http.Client{Timeout: 10 * time.Second}
