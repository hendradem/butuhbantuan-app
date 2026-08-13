package domain

// MapTileUsage tracks Static Tiles API consumption for the free-tier guard.
type MapTileUsage struct {
	MonthKey  string  `json:"month_key"` // YYYY-MM (UTC)
	Used      int64   `json:"used"`
	Limit     int64   `json:"limit"`
	Threshold int64   `json:"threshold"` // switch to OSM when used >= threshold
	Remaining int64   `json:"remaining"`
	Percent   float64 `json:"percent"`
	Provider  string  `json:"provider"` // mapbox | osm
	Style     string  `json:"style"`    // mapbox style id or "osm"
	NearLimit bool    `json:"near_limit"`
}
