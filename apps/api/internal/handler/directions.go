package handler

import (
	"encoding/json"
	"fmt"
	"net/url"

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

func (h *DirectionsHandler) GetDirections(c *fiber.Ctx) error {
	origin := c.Query("origin")
	destination := c.Query("destination")
	if origin == "" || destination == "" {
		return response.Error(c, fiber.StatusBadRequest, "missing origin or destination")
	}

	reqURL := fmt.Sprintf("%s/directions/v5/mapbox/driving/%s;%s?geometries=geojson&access_token=%s",
		h.cfg.MapboxURL, origin, destination, h.cfg.MapboxAPIKey)

	resp, err := httpclient.Default.Get(reqURL)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to fetch directions")
	}
	defer resp.Body.Close()

	var raw struct {
		Routes []struct {
			Geometry struct {
				Coordinates [][]float64 `json:"coordinates"`
			} `json:"geometry"`
		} `json:"routes"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil || len(raw.Routes) == 0 {
		return response.Error(c, fiber.StatusNotFound, "no directions found")
	}
	return response.OK(c, "success", raw.Routes[0].Geometry.Coordinates)
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
