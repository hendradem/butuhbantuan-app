package handler

import (
	"butuhbantuan/internal/model/entity"
	"butuhbantuan/internal/model/request"
	"butuhbantuan/pkg/database"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

func GetEmergency(ctx *fiber.Ctx) error {
	var emergencies []entity.Emergency
	result := database.DB.Find(&emergencies)

	if result.Error != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to get emergencies",
			"data":    result.Error,
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "success to get emergencies data",
		"data":    emergencies,
	})
}

func AddEmergency(ctx *fiber.Ctx) error {
	emergency := new(request.EmergencyCreate)

	if err := ctx.BodyParser(emergency); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to parse request body",
			"data":    err,
		})
	}

	// input validation
	validate := validator.New()
	errValidator := validate.Struct(emergency)

	if errValidator != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to validate request body",
			"data":    errValidator.Error(),
		})
	}

	newEmergency := entity.Emergency{
		Name:             emergency.Name,
		OrganizationName: emergency.OrganizationName,
		OrganizationType: emergency.OrganizationType,
		Description:      emergency.Description,
		IsVerified:       emergency.IsVerified,
		OrganizationLogo: emergency.OrganizationLogo,
		Latitude:         emergency.Latitude,
		Longitude:        emergency.Longitude,
		Email:            emergency.Email,
		Phone:            emergency.Phone,
		Whatsapp:         emergency.Whatsapp,
		District:         emergency.District,
		Regency:          emergency.Regency,
		Province:         emergency.Province,
		FullAddress:      emergency.FullAddress,
		TypeOfService:    emergency.TypeOfService,
	}

	result := database.DB.Create(&newEmergency)

	if result.Error != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to create emergency data",
			"data":    result.Error,
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "success to create emergency data",
		"data":    newEmergency,
	})

}
