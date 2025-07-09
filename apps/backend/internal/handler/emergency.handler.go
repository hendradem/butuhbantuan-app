package handler

import (
	"butuhbantuan/internal/dto"
	"butuhbantuan/internal/model/entity"
	"butuhbantuan/internal/model/mapper"
	"butuhbantuan/internal/model/request"
	"butuhbantuan/pkg/database"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

func GetEmergency(ctx *fiber.Ctx) error {
	var emergencies []entity.Emergency
	result := database.DB.Preload("EmergencyTypes").Table("emergency").Select("emergency.*, emergency_type.*").Joins("JOIN emergency_type ON emergency.emergency_type_id = emergency_type.id").Find(&emergencies)

	if result.Error != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to get emergency type",
			"data":    result.Error,
		})
	}

	// 	✅ Map to DTO
	var response []dto.EmergencyServiceResponse
	for _, e := range emergencies {
		response = append(response, mapper.MapEmergencyServiceToResponse(e))
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "success to get emergency type data",
		"data":    response,
	})
}

func GetEmergencyByType(ctx *fiber.Ctx) error {
	emergencyTypeID := ctx.Params("emergencyTypeID")
	var emergencies []entity.Emergency

	result := database.DB.Where("emergency_type_id = ?", emergencyTypeID).Find(&emergencies)

	if result.Error != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to get emergencies",
			"data":    result.Error.Error(),
		})
	}

	// ✅ Map to DTO
	var response []dto.EmergencyServiceResponse
	for _, e := range emergencies {
		response = append(response, mapper.MapEmergencyServiceToResponse(e))
	}

	// ✅ Return DTO-based JSON
	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "success to get emergencies data",
		"data":    response,
	})
}

func GetEmergencyType(ctx *fiber.Ctx) error {
	var emergencyType []entity.EmergencyType
	result := database.DB.Find(&emergencyType)

	if result.Error != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to get emergency type",
			"data":    result.Error,
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "success to get emergency type data",
		"data":    emergencyType,
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

func AddEmergencyType(ctx *fiber.Ctx) error {
	emergencyType := new(request.EmergencyTypeCreate)

	if err := ctx.BodyParser(emergencyType); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to parse request body",
			"data":    err,
		})
	}

	// input validation
	validate := validator.New()
	errValidator := validate.Struct(emergencyType)

	if errValidator != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to validate request body",
			"data":    errValidator.Error(),
		})
	}

	newEmergencyType := entity.EmergencyType{
		EmergencyTypeName: emergencyType.Name,
		Description:       emergencyType.Description,
	}

	result := database.DB.Create(&newEmergencyType)

	if result.Error != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to create emergency type data",
			"data":    result.Error,
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "success to create emergency type data",
		"data":    newEmergencyType,
	})
}

func DeleteEmergencyType(ctx *fiber.Ctx) error {
	id := ctx.Params("id")

	if err := database.DB.First(&entity.EmergencyType{}, id); err.Error != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"status":  "error",
			"message": "data not found",
			"data":    err.Error,
		})
	}

	result := database.DB.Delete(&entity.EmergencyType{}, id)
	if result.Error != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to delete emergency data",
			"data":    result.Error,
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":  "success",
		"message": "success to delete emergency type data",
		"data":    result,
	})
}
