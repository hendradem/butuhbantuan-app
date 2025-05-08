package route

import (
	"butuhbantuan/internal/handler"

	"github.com/gofiber/fiber/v2"
)

func UserRouteSetup(apiVersion string, app *fiber.App) {
	emergencyGroup := app.Group(apiVersion + "/user")

	emergencyGroup.Get("/", handler.GetAllUsers)
}
