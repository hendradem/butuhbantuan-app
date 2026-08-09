package handler

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/cache"
	"github.com/butuhbantuan/api/pkg/config"
	"github.com/butuhbantuan/api/pkg/httpclient"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type GeocodingHandler struct {
	cfg        *config.Config
	svc        service.EmergencyUseCase
	geocache   *cache.TTL[string, map[string]any]
}

func NewGeocodingHandler(cfg *config.Config, svc service.EmergencyUseCase) *GeocodingHandler {
	return &GeocodingHandler{
		cfg:      cfg,
		svc:      svc,
		geocache: cache.NewTTL[string, map[string]any](),
	}
}

func roundCoord(v float64) float64 {
	return math.Round(v*1000) / 1000
}

func (h *GeocodingHandler) ReverseGeocoding(c *fiber.Ctx) error {
	latStr := c.Query("latitude")
	lngStr := c.Query("longitude")
	if latStr == "" || lngStr == "" {
		return response.Error(c, fiber.StatusBadRequest, "missing latitude or longitude")
	}

	var lat, lng float64
	fmt.Sscanf(latStr, "%f", &lat)
	fmt.Sscanf(lngStr, "%f", &lng)
	cacheKey := fmt.Sprintf("%.3f,%.3f", roundCoord(lat), roundCoord(lng))

	if cached, ok := h.geocache.Get(cacheKey); ok {
		return response.OK(c, "success", cached)
	}

	reqURL := fmt.Sprintf("%s/reverse?format=json&lat=%s&lon=%s&zoom=18&addressdetails=1",
		h.cfg.NominatimURL, latStr, lngStr)

	req, err := http.NewRequest(http.MethodGet, reqURL, nil)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to build request")
	}
	req.Header.Set("User-Agent", "ButuhBantuan/1.0 (contact: mufindlabs@gmail.com)")

	resp, err := httpclient.Default.Do(req)
	if err != nil {
		return response.Error(c, fiber.StatusBadGateway, "geocoding service unreachable")
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return response.Error(c, fiber.StatusTooManyRequests, "geocoding rate limit reached")
	}
	if resp.StatusCode != http.StatusOK {
		return response.Error(c, fiber.StatusBadGateway, fmt.Sprintf("geocoding service returned %d", resp.StatusCode))
	}

	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to decode geocoding response")
	}

	h.geocache.Set(cacheKey, result, 10*time.Minute)
	return response.OK(c, "success", result)
}

// SearchGeocoding does a forward geocoding search using Nominatim, returning
// up to 5 results matching the query. No API key required.
func (h *GeocodingHandler) SearchGeocoding(c *fiber.Ctx) error {
	q := c.Query("q")
	if q == "" {
		return response.Error(c, fiber.StatusBadRequest, "q is required")
	}

	reqURL := fmt.Sprintf(
		"%s/search?q=%s&format=json&limit=5&addressdetails=1&countrycodes=id",
		h.cfg.NominatimURL, url.QueryEscape(q),
	)

	req, err := http.NewRequest(http.MethodGet, reqURL, nil)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to build request")
	}
	req.Header.Set("User-Agent", "ButuhBantuan/1.0 (contact: mufindlabs@gmail.com)")

	resp, err := httpclient.Default.Do(req)
	if err != nil {
		return response.Error(c, fiber.StatusBadGateway, "geocoding service unreachable")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return response.Error(c, fiber.StatusBadGateway, fmt.Sprintf("geocoding service returned %d", resp.StatusCode))
	}

	var result []map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to decode response")
	}

	return response.OK(c, "success", result)
}

type tripRequest struct {
	UserCoordinates [2]float64 `json:"userCoordinates"`
	EmergencyIDs    []string   `json:"emergencyIDs"`
}

type tripResult struct {
	Duration float64 `json:"duration"`
	Distance float64 `json:"distance"`
}

type emergencyWithTrip struct {
	EmergencyData domain.Emergency `json:"emergencyData"`
	Trip          tripResult       `json:"trip"`
}

type workerResult struct {
	idx  int
	item emergencyWithTrip
	ok   bool
}

func (h *GeocodingHandler) GetEmergencyWithTripEstimates(c *fiber.Ctx) error {
	var req tripRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	emergencies, err := h.svc.GetByIDs(req.EmergencyIDs)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to fetch emergency data")
	}

	ch := make(chan workerResult, len(emergencies))
	var wg sync.WaitGroup

	for i, em := range emergencies {
		wg.Add(1)
		go func(idx int, em domain.Emergency) {
			defer wg.Done()

			osrmURL := fmt.Sprintf(
				"https://router.project-osrm.org/route/v1/driving/%f,%f;%s,%s?overview=false",
				req.UserCoordinates[0], req.UserCoordinates[1],
				em.Coordinates[0], em.Coordinates[1],
			)

			resp, err := httpclient.Default.Get(osrmURL)
			if err != nil {
				ch <- workerResult{idx: idx, ok: false}
				return
			}
			defer resp.Body.Close() // safe: defer is inside the goroutine func, not a loop

			var osrmData struct {
				Routes []struct {
					Duration float64 `json:"duration"`
					Distance float64 `json:"distance"`
				} `json:"routes"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&osrmData); err != nil || len(osrmData.Routes) == 0 {
				ch <- workerResult{idx: idx, ok: false}
				return
			}

			ch <- workerResult{
				idx: idx,
				ok:  true,
				item: emergencyWithTrip{
					EmergencyData: em,
					Trip: tripResult{
						Duration: osrmData.Routes[0].Duration,
						Distance: osrmData.Routes[0].Distance,
					},
				},
			}
		}(i, em)
	}

	wg.Wait()
	close(ch)

	// Collect results preserving original order
	ordered := make([]emergencyWithTrip, len(emergencies))
	included := make([]bool, len(emergencies))
	for res := range ch {
		if res.ok {
			ordered[res.idx] = res.item
			included[res.idx] = true
		}
	}

	var results []emergencyWithTrip
	for i, item := range ordered {
		if included[i] {
			results = append(results, item)
		}
	}

	return response.OK(c, "success", results)
}
