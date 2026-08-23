package handler

import (
	"strings"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/gofiber/fiber/v2"
)

type HospitalHandler struct {
	svc      service.HospitalUseCase
	emergSvc service.EmergencyUseCase
}

func NewHospitalHandler(svc service.HospitalUseCase, emergSvc service.EmergencyUseCase) *HospitalHandler {
	return &HospitalHandler{svc: svc, emergSvc: emergSvc}
}

func (h *HospitalHandler) Provider(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"data": fiber.Map{"provider": h.svc.ProviderName()},
	})
}

func (h *HospitalHandler) ListMaster(c *fiber.Ctx) error {
	regencyID := strings.TrimSpace(c.Query("regency_id"))
	if err := h.ensureUnitRegency(c, regencyID); err != nil {
		return err
	}
	items, err := h.svc.ListMaster(regencyID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(fiber.Map{"data": items})
}

func (h *HospitalHandler) Sync(c *fiber.Ctx) error {
	var body struct {
		RegencyID string `json:"regency_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	if err := h.ensureUnitRegency(c, body.RegencyID); err != nil {
		return err
	}
	res, err := h.svc.Sync(body.RegencyID)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(fiber.Map{"data": res})
}

func (h *HospitalHandler) Import(c *fiber.Ctx) error {
	var req domain.HospitalImportRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	// Unit: only allow import of masters already cached for their kabupaten.
	if role, _ := c.Locals("auth_role").(string); role == "unit" || c.Locals("emergency_uuid") != nil {
		allowed, err := h.unitRegencyID(c)
		if err != nil {
			return err
		}
		if allowed == "" {
			return fiber.NewError(fiber.StatusForbidden, "unit belum punya kabupaten")
		}
		cached, err := h.svc.ListMaster(allowed)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, err.Error())
		}
		ok := map[string]struct{}{}
		for _, m := range cached {
			ok[m.ID] = struct{}{}
		}
		for _, id := range req.MasterIDs {
			if _, hit := ok[id]; !hit {
				return fiber.NewError(fiber.StatusForbidden, "master di luar wilayah unit: "+id)
			}
		}
	}
	res, err := h.svc.Import(req)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	return c.JSON(fiber.Map{"data": res})
}

func (h *HospitalHandler) ensureUnitRegency(c *fiber.Ctx, regencyID string) error {
	regencyID = strings.TrimSpace(regencyID)
	if regencyID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "regency_id wajib")
	}
	eu, _ := c.Locals("emergency_uuid").(string)
	if eu == "" {
		return nil // admin
	}
	allowed, err := h.unitRegencyID(c)
	if err != nil {
		return err
	}
	if allowed == "" {
		return fiber.NewError(fiber.StatusForbidden, "unit belum punya kabupaten")
	}
	if allowed != regencyID {
		return fiber.NewError(fiber.StatusForbidden, "unit hanya boleh sync/import kabupaten sendiri")
	}
	return nil
}

func (h *HospitalHandler) unitRegencyID(c *fiber.Ctx) (string, error) {
	eu, _ := c.Locals("emergency_uuid").(string)
	if eu == "" || h.emergSvc == nil {
		return "", nil
	}
	list, err := h.emergSvc.GetByIDs([]string{eu})
	if err != nil || len(list) == 0 {
		return "", fiber.NewError(fiber.StatusForbidden, "profil unit tidak ditemukan")
	}
	return strings.TrimSpace(list[0].Address.RegencyID), nil
}
