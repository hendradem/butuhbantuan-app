package handler

import (
	"butuhbantuan/internal/model/entity"
	"butuhbantuan/internal/model/request"
	"butuhbantuan/pkg/database"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

func GetAvailableServiceCity(ctx *fiber.Ctx) error {
	var availableServiceCity []entity.AvailableServiceCity
	result := database.DB.Find(&availableServiceCity)

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

func AddAvailableServiceCity(ctx *fiber.Ctx) error {

	availableCity := new(request.AvailableServiceCityCreate)

	if err := ctx.BodyParser(availableCity); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to parse request body",
			"data":    err,
		})
	}

	// input validation
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
		CityName:             availableCity.CityName,
		Province:             availableCity.Province,
		ContactCenter:        availableCity.ContactCenter,
		VolunteerCoordinator: availableCity.VolunteerCoordinator,
		IsActive:             availableCity.IsActive,
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
