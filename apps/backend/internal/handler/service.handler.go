package handler

import (
	"butuhbantuan/internal/model/entity"
	"butuhbantuan/internal/model/request"
	"butuhbantuan/pkg/database"
	"net/url"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

func GetAvailabelRegion(ctx *fiber.Ctx) error {
	var availableServiceCity []entity.AvailableServiceCity
	result := database.DB.
		Preload("Regency").
		Preload("Regency.Province").
		Find(&availableServiceCity)

	if result.Error != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to get available service",
			"data":    result.Error,
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "success to get available service city data",
		"data":    availableServiceCity,
	})

}

// normalizeIndonesianRegionName removes common prefixes and normalizes the string
func normalizeIndonesianRegionName(name string) string {
	normalized := strings.ToLower(name)

	// Remove common Indonesian administrative prefixes
	prefixes := []string{
		"kabupaten", "kab", "kab.",
		"kota", "provinsi", "prov", "prov.",
		"daerah istimewa", "di",
	}

	for _, prefix := range prefixes {
		normalized = strings.TrimPrefix(normalized, prefix)
		normalized = strings.TrimSpace(normalized)
	}

	// Remove extra spaces and special characters
	re := regexp.MustCompile(`\s+`)
	normalized = re.ReplaceAllString(normalized, " ")
	normalized = strings.TrimSpace(normalized)

	// Remove spaces for exact matching
	return strings.ReplaceAll(normalized, " ", "")
}

func GetAvailableServicesByRegion(ctx *fiber.Ctx) error {
	regionName := ctx.Params("regionName")

	// Handle URL decoding with error checking
	decodedName, err := url.QueryUnescape(regionName)
	if err != nil {
		return ctx.Status(400).JSON(fiber.Map{
			"error": "Invalid region name format",
		})
	}

	if strings.TrimSpace(decodedName) == "" {
		return ctx.Status(400).JSON(fiber.Map{
			"error": "Region name cannot be empty",
		})
	}

	var availableServiceCity []entity.AvailableServiceCity

	// Normalize the search term
	normalizedSearch := normalizeIndonesianRegionName(decodedName)

	query := database.DB.
		Preload("Regency").
		Preload("Regency.Province")

	result := query.Where(`
		LOWER(name) = ? OR 
		REPLACE(REPLACE(REPLACE(LOWER(name), 'kabupaten ', ''), 'kota ', ''), ' ', '') = ? OR
		LOWER(name) LIKE ? OR
		REPLACE(REPLACE(REPLACE(LOWER(name), 'kabupaten ', ''), 'kota ', ''), ' ', '') LIKE ?
	`,
		strings.ToLower(decodedName),
		normalizedSearch,
		"%"+strings.ToLower(decodedName)+"%",
		"%"+normalizedSearch+"%",
	).Find(&availableServiceCity)

	if result.Error != nil {
		return ctx.Status(500).JSON(fiber.Map{
			"error": "Database query failed",
		})
	}

	return ctx.JSON(fiber.Map{
		"data":  availableServiceCity,
		"count": len(availableServiceCity),
	})
}

func AddAvailableRegion(ctx *fiber.Ctx) error {
	availableCity := new(request.AvailableServiceCityCreate)

	if err := ctx.BodyParser(availableCity); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to parse request body",
			"data":    err,
		})
	}

	validate := validator.New()
	errValidator := validate.Struct(availableCity)

	if errValidator != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to validate request body",
			"data":    errValidator.Error(),
		})
	}

	newAvailableCity := entity.AvailableServiceCity{
		Name:      availableCity.City,
		RegencyID: availableCity.RegencyID, // e.g. "3501"
		Latitude:  availableCity.Latitude,
		Longitude: availableCity.Longitude,
	}

	result := database.DB.Create(&newAvailableCity)

	if result.Error != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to create city data",
			"data":    result.Error,
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "success to create city data",
		"data":    newAvailableCity,
	})

}
