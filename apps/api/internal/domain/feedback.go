package domain

import "time"

type Feedback struct {
	ID          string    `json:"id"`
	EmergencyID string    `json:"emergency_id"`
	UnitName    string    `json:"unit_name"`
	UnitHelpful bool      `json:"unit_helpful"`
	AppHelpful  *bool     `json:"app_helpful"`
	CallType    string    `json:"call_type"` // "whatsapp" | "phone"
	Comment     string    `json:"comment"`
	CreatedAt   time.Time `json:"created_at"`
}

type FeedbackStats struct {
	Total           int     `json:"total"`
	UnitHelpfulRate float64 `json:"unit_helpful_rate"`
	AppHelpfulRate  float64 `json:"app_helpful_rate"`
}

// FeedbackGroup is per-unit aggregated feedback for the dashboard.
type FeedbackGroup struct {
	EmergencyUUID    string    `json:"emergency_uuid"`
	UnitName         string    `json:"unit_name"`
	Total            int       `json:"total"`
	UnitHelpfulCount int       `json:"unit_helpful_count"`
	UnitHelpfulRate  float64   `json:"unit_helpful_rate"`
	AppHelpfulRate   float64   `json:"app_helpful_rate"`
	RecentComments   []string  `json:"recent_comments"`
	LastFeedbackAt   time.Time `json:"last_feedback_at"`
}
