package handler

import (
	"butuhbantuan/internal/dto"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
)

func GetDirectionsRoute(ctx *fiber.Ctx) error {
	// Parse query parameters
	originStr := ctx.Query("origin")           // e.g., "106.8,-6.2"
	destinationStr := ctx.Query("destination") // e.g., "106.9,-6.3"

	fmt.Println("origin:", originStr, "destination:", destinationStr)

	if originStr == "" || destinationStr == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Missing origin or destination query parameter",
		})
	}

	// Format for Mapbox URL
	coordinates := fmt.Sprintf("%s;%s", originStr, destinationStr)
	url := fmt.Sprintf(
		"%s/directions/v5/mapbox/driving/%s?geometries=geojson&access_token=%s",
		os.Getenv("MAPBOX_URL"),
		coordinates,
		os.Getenv("MAPBOX_API_KEY"),
	)

	resp, err := http.Get(url)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to fetch directions",
			"data":    err,
		})
	}

	defer resp.Body.Close()

	// Restructure response with DTO
	var raw struct {
		Routes []dto.DirectionsDTO `json:"routes"`
	}

	// Decode response
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to decode directions",
			"data":    err.Error(),
		})
	}

	// Check if routes are empty
	if len(raw.Routes) == 0 {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"status":  "error",
			"message": "No directions found",
		})
	}

	// Return response data
	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "Directions fetched successfully",
		"data":    raw.Routes[0].Geometry.Coordinates,
	})
}

func GetDistanceMatrixRoute(ctx *fiber.Ctx) error {

	// Parse query parameters
	coordinates := ctx.Query("coordinates")

	if coordinates == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Missing coordinates query parameter",
		})
	}

	mapboxMatrixUrlRequest := fmt.Sprintf("%s/directions-matrix/v1/mapbox/driving/%s?access_token=%s&annotations=distance,duration",
		os.Getenv("MAPBOX_URL"),
		coordinates,
		os.Getenv("MAPBOX_API_KEY"),
	)

	resp, err := http.Get(mapboxMatrixUrlRequest)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to fetch directions",
			"data":    err,
		})
	}
	defer resp.Body.Close()

	response := make(map[string]interface{})

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to decode directions",
			"data":    err.Error(),
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "Matrix directions fetched successfully",
		"data":    response,
	})
}

func GetGeocodingApi(ctx *fiber.Ctx) error {
	// Parse query parameters
	longitude := ctx.Query("longitude")
	latitude := ctx.Query("latitude")

	if longitude == "" || latitude == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Missing longitude or latitude query parameter",
		})
	}

	mapboxGeocodingUrlRequest := fmt.Sprintf("%s/geocoding/v5/mapbox.places/%s,%s.json?access_token=%s",
		os.Getenv("MAPBOX_URL"),
		longitude,
		latitude,
		os.Getenv("MAPBOX_API_KEY"),
	)

	resp, err := http.Get(mapboxGeocodingUrlRequest)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to fetch geocoding data",
			"data":    err,
		})
	}
	defer resp.Body.Close()

	response := make(map[string]interface{})

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to decode geocoding data",
			"data":    err.Error(),
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "Geocoding data fetched successfully",
		"data":    response,
	})
}
