package handler

import (
	"butuhbantuan/internal/dto"
	"butuhbantuan/internal/model/entity"
	"butuhbantuan/internal/model/mapper"
	"butuhbantuan/pkg/database"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
)

func ReverseGeocoding(ctx *fiber.Ctx) error {

	latitude := ctx.Query("latitude")
	longitude := ctx.Query("longitude")

	if latitude == "" || longitude == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Missing latitude or longitude query parameter",
		})
	}

	urlRequest := fmt.Sprintf("%s/reverse?format=json&lat=%s&lon=%s&zoom=18&addressdetails=1",
		os.Getenv("NOMINATIM_URL"),
		latitude,
		longitude,
	)

	resp, err := http.Get(urlRequest)
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
			"data":    err,
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "success to get geocoding data",
		"data":    response,
	})
}

func GetEmergenciesByIDs(ids []string) ([]entity.Emergency, error) {

	var emergencies []entity.Emergency

	result := database.DB.
		Preload("EmergencyType").
		Preload("Province").
		Preload("Regency").
		Where("uuid IN (?)", ids).
		Find(&emergencies)

	if result.Error != nil {
		return nil, result.Error
	}

	// 	✅ Map to DTO
	var response []dto.EmergencyServiceResponse
	for _, e := range emergencies {
		response = append(response, mapper.MapEmergencyServiceToResponse(e))
	}

	return emergencies, nil
}

func GetEmergencyWithTripEstimates(c *fiber.Ctx) error {
	var req dto.EmergencyTripRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid request body")
	}

	// 1. Fetch emergency data from DB
	emergencies, err := GetEmergenciesByIDs(req.EmergencyIDs)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Failed to fetch emergency data")
	}

	// 2. Prepare result
	var result []dto.EmergencyWithTrip

	for _, em := range emergencies {
		coords := fmt.Sprintf("%f,%f;%s,%s", req.UserCoordinates[0], req.UserCoordinates[1], em.Longitude, em.Latitude)
		osrmURL := fmt.Sprintf("http://router.project-osrm.org/route/v1/driving/%s?overview=false", coords)

		resp, err := http.Get(osrmURL)
		if err != nil {
			continue // optionally log error
		}
		defer resp.Body.Close()

		var osrmData struct {
			Routes []struct {
				Duration float64 `json:"duration"`
				Distance float64 `json:"distance"`
			} `json:"routes"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&osrmData); err != nil || len(osrmData.Routes) == 0 {
			continue
		}

		mappedEmergency := mapper.MapEmergencyServiceToResponse(em)

		result = append(result, dto.EmergencyWithTrip{
			EmergencyData: mappedEmergency,
			Trip: dto.TripResult{
				Duration: osrmData.Routes[0].Duration,
				Distance: osrmData.Routes[0].Distance,
			},
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "Trip distances retrieved",
		"data":    result,
	})
}
