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

func GetAllEmergency(ctx *fiber.Ctx) error {
	var emergencies []entity.Emergency

	result := database.DB.
		Preload("EmergencyType").
		Preload("Province").
		Preload("Regency").
		Find(&emergencies)

	if result.Error != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to get emergency data",
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
		"message": "success to get emergency data",
		"data":    response,
	})
}

func GetEmergencyDispatcher(ctx *fiber.Ctx) error {
	var emergencies []entity.Emergency
	regencyID := ctx.Params("regencyID")
	provinceID := ctx.Params("provinceID")

	result := database.DB.Preload("EmergencyType").
		Preload("Province").
		Preload("Regency").
		Preload("District").
		Where("is_dispatcher = ?", true).
		Where("regency_id = ? OR (province_id = ? AND is_province_dispatcher = ?)", regencyID, provinceID, true).
		Find(&emergencies)

	if result.Error != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "failed to get dispatcher emergencies",
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
		"message": "success to get emergency dispatcher data",
		"data":    response,
	})
}

func GetAllEmergencyByProvince(ctx *fiber.Ctx) error {
	var emergencies []entity.Emergency

	provinceID := ctx.Params("provinceID")

	result := database.DB.
		Preload("Province").
		Preload("EmergencyType").
		Preload("Regency").
		Preload("District").
		Where("province_id = ?", provinceID).Find(&emergencies)

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

func GetEmergencyByRegion(ctx *fiber.Ctx) error {
	regencyID := ctx.Params("regencyID")
	var emergencies []entity.Emergency

	result := database.DB.
		Preload("Province").
		Preload("EmergencyType").
		Preload("Regency").
		Preload("District").
		Where("regency_id = ? OR is_province_dispatcher = ?", regencyID, true).Find(&emergencies)

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
		EmergencyTypeID:  emergency.EmergencyTypeID,
		Description:      emergency.Description,
		IsVerified:       emergency.IsVerified,
		OrganizationLogo: emergency.OrganizationLogo,
		Latitude:         emergency.Latitude,
		Longitude:        emergency.Longitude,
		Email:            emergency.Email,
		Phone:            emergency.Phone,
		Whatsapp:         emergency.Whatsapp,
		DistrictID:       emergency.DistrictID,
		RegencyID:        emergency.RegencyID,
		ProvinceID:       emergency.ProvinceID,
		FullAddress:      emergency.FullAddress,
		TypeOfService:    emergency.TypeOfService,
		IsDispatcher:     emergency.IsDispatcher,
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
		Name:        emergencyType.Name,
		Description: emergencyType.Description,
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
