package handler

import (
	"butuhbantuan/internal/model/entity"
	"butuhbantuan/pkg/database"

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
