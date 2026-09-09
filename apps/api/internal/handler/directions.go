package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/url"
	"strings"

	"github.com/butuhbantuan/api/pkg/config"
	"github.com/butuhbantuan/api/pkg/httpclient"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type DirectionsHandler struct {
	cfg *config.Config
}

func NewDirectionsHandler(cfg *config.Config) *DirectionsHandler {
	return &DirectionsHandler{cfg: cfg}
}

type routePayload struct {
	Coordinates [][]float64 `json:"coordinates"`
	DistanceM   float64     `json:"distance_m"`
	DurationS   float64     `json:"duration_s"`
	Provider    string      `json:"provider"`
}

func (h *DirectionsHandler) GetDirections(c *fiber.Ctx) error {
	origin := strings.TrimSpace(c.Query("origin"))
	destination := strings.TrimSpace(c.Query("destination"))
	if origin == "" || destination == "" {
		return response.Error(c, fiber.StatusBadRequest, "missing origin or destination")
	}

	if payload, err := h.fetchMapboxRoute(origin, destination); err == nil && len(payload.Coordinates) > 1 {
		return response.OK(c, "success", payload)
	} else if err != nil {
		log.Printf("directions: mapbox failed: %v", err)
	}

	if payload, err := fetchOSRMRoute(origin, destination); err == nil && len(payload.Coordinates) > 1 {
		return response.OK(c, "success", payload)
	} else if err != nil {
		log.Printf("directions: osrm failed: %v", err)
	}

	return response.Error(c, fiber.StatusNotFound, "no directions found")
}

func (h *DirectionsHandler) fetchMapboxRoute(origin, destination string) (*routePayload, error) {
	if strings.TrimSpace(h.cfg.MapboxAPIKey) == "" {
		return nil, fmt.Errorf("mapbox api key empty")
	}
	reqURL := fmt.Sprintf(
		"%s/directions/v5/mapbox/driving/%s;%s?geometries=geojson&overview=full&access_token=%s",
		h.cfg.MapboxURL, origin, destination, h.cfg.MapboxAPIKey,
	)
	resp, err := httpclient.Default.Get(reqURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("mapbox http %d: %s", resp.StatusCode, truncate(string(body), 180))
	}

	var raw struct {
		Code   string `json:"code"`
		Routes []struct {
			Distance float64 `json:"distance"`
			Duration float64 `json:"duration"`
			Geometry struct {
				Coordinates [][]float64 `json:"coordinates"`
			} `json:"geometry"`
		} `json:"routes"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	if len(raw.Routes) == 0 || len(raw.Routes[0].Geometry.Coordinates) < 2 {
		return nil, fmt.Errorf("mapbox empty routes (code=%s)", raw.Code)
	}
	r0 := raw.Routes[0]
	return &routePayload{
		Coordinates: r0.Geometry.Coordinates,
		DistanceM:   r0.Distance,
		DurationS:   r0.Duration,
		Provider:    "mapbox",
	}, nil
}

func fetchOSRMRoute(origin, destination string) (*routePayload, error) {
	// origin/destination are "lng,lat"
	reqURL := fmt.Sprintf(
		"https://router.project-osrm.org/route/v1/driving/%s;%s?overview=full&geometries=geojson",
		origin, destination,
	)
	resp, err := httpclient.Default.Get(reqURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("osrm http %d", resp.StatusCode)
	}

	var raw struct {
		Code   string `json:"code"`
		Routes []struct {
			Distance float64 `json:"distance"`
			Duration float64 `json:"duration"`
			Geometry struct {
				Coordinates [][]float64 `json:"coordinates"`
			} `json:"geometry"`
		} `json:"routes"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}
	if !strings.EqualFold(raw.Code, "Ok") || len(raw.Routes) == 0 || len(raw.Routes[0].Geometry.Coordinates) < 2 {
		return nil, fmt.Errorf("osrm empty routes (code=%s)", raw.Code)
	}
	r0 := raw.Routes[0]
	return &routePayload{
		Coordinates: r0.Geometry.Coordinates,
		DistanceM:   r0.Distance,
		DurationS:   r0.Duration,
		Provider:    "osrm",
	}, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

func (h *DirectionsHandler) GetDistanceMatrix(c *fiber.Ctx) error {
	coordinates := c.Query("coordinates")
	if coordinates == "" {
		return response.Error(c, fiber.StatusBadRequest, "missing coordinates")
	}

	reqURL := fmt.Sprintf("%s/directions-matrix/v1/mapbox/driving/%s?access_token=%s&annotations=distance,duration",
		h.cfg.MapboxURL, coordinates, h.cfg.MapboxAPIKey)

	resp, err := httpclient.Default.Get(reqURL)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to fetch distance matrix")
	}
	defer resp.Body.Close()

	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to decode matrix response")
	}
	return response.OK(c, "success", result)
}

func (h *DirectionsHandler) GetGeocoding(c *fiber.Ctx) error {
	lng := c.Query("longitude")
	lat := c.Query("latitude")
	if lng == "" || lat == "" {
		return response.Error(c, fiber.StatusBadRequest, "missing longitude or latitude")
	}

	reqURL := fmt.Sprintf("%s/geocoding/v5/mapbox.places/%s,%s.json?access_token=%s",
		h.cfg.MapboxURL, lng, lat, h.cfg.MapboxAPIKey)

	resp, err := httpclient.Default.Get(reqURL)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to fetch geocoding data")
	}
	defer resp.Body.Close()

	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to decode geocoding response")
	}
	return response.OK(c, "success", result)
}

func (h *DirectionsHandler) GetGeolocation(c *fiber.Ctx) error {
	searchQuery := c.Query("searchQuery")
	if searchQuery == "" {
		return response.Error(c, fiber.StatusBadRequest, "missing searchQuery")
	}

	reqURL := fmt.Sprintf("%s/autocomplete?text=%s&apiKey=%s",
		h.cfg.GeoapifyURL, url.QueryEscape(searchQuery), h.cfg.GeoapifyKey)

	resp, err := httpclient.Default.Get(reqURL)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to fetch geolocation data")
	}
	defer resp.Body.Close()

	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to decode geolocation response")
	}
	return response.OK(c, "success", result)
}
