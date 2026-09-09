package handler

import (
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

func Health(c *fiber.Ctx) error {
	return response.OK(c, "ok", fiber.Map{"service": "butuhbantuan-api"})
}
