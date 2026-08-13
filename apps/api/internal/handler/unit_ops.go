package handler

import (
	"errors"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

// resolveOpsScope loads the authenticated unit and returns wilayah scope when it is a dispatcher.
// Fail closed: missing flags / wilayah ids → 403.
func (h *UnitHandler) resolveOpsScope(c *fiber.Ctx) (domain.OpsScope, error) {
	emergencyUUID, _ := c.Locals("emergency_uuid").(string)
	if emergencyUUID == "" {
		return domain.OpsScope{}, fiber.NewError(fiber.StatusUnauthorized, "unauthorized")
	}
	units, err := h.emergencySvc.GetByIDs([]string{emergencyUUID})
	if err != nil || len(units) == 0 {
		return domain.OpsScope{}, fiber.NewError(fiber.StatusForbidden, "dispatcher access required")
	}
	scope, ok := domain.OpsScopeFromEmergency(units[0])
	if !ok {
		return domain.OpsScope{}, fiber.NewError(fiber.StatusForbidden, "dispatcher access required")
	}
	return scope, nil
}

func (h *UnitHandler) writeOpsScopeErr(c *fiber.Ctx, err error) error {
	var fe *fiber.Error
	if errors.As(err, &fe) {
		return response.Error(c, fe.Code, fe.Message)
	}
	return response.Error(c, fiber.StatusForbidden, "dispatcher access required")
}

// GetOpsOrders returns tickets in the caller's dispatcher wilayah only.
func (h *UnitHandler) GetOpsOrders(c *fiber.Ctx) error {
	scope, err := h.resolveOpsScope(c)
	if err != nil {
		return h.writeOpsScopeErr(c, err)
	}
	orders, err := h.orderSvc.GetByWilayahScope(scope.RegencyID, scope.ProvinceID, scope.ProvinceWide)
	if err != nil {
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to get orders")
	}
	return response.OK(c, "success", orders)
}

// GetOpsUnits returns emergency units HQ inside the dispatcher wilayah.
func (h *UnitHandler) GetOpsUnits(c *fiber.Ctx) error {
	scope, err := h.resolveOpsScope(c)
	if err != nil {
		return h.writeOpsScopeErr(c, err)
	}
	var units []domain.Emergency
	if scope.ProvinceWide {
		units, err = h.emergencySvc.GetByProvince(scope.ProvinceID)
	} else {
		units, err = h.emergencySvc.GetByRegency(scope.RegencyID)
	}
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get units")
	}
	// Fail closed: never return units outside authenticated wilayah scope.
	scoped := make([]domain.Emergency, 0, len(units))
	for _, u := range units {
		if domain.EmergencyInScope(u, scope) {
			scoped = append(scoped, u)
		}
	}
	return response.OK(c, "success", scoped)
}

// GetOpsStats returns lightweight wilayah ops counters derived from scoped orders + units.
func (h *UnitHandler) GetOpsStats(c *fiber.Ctx) error {
	scope, err := h.resolveOpsScope(c)
	if err != nil {
		return h.writeOpsScopeErr(c, err)
	}
	orders, err := h.orderSvc.GetByWilayahScope(scope.RegencyID, scope.ProvinceID, scope.ProvinceWide)
	if err != nil {
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		return response.Error(c, fiber.StatusInternalServerError, "failed to get orders")
	}

	now := time.Now()
	var pending, accepted, inProgress, exhausted, slaFocus int
	for _, o := range orders {
		switch o.Status {
		case "pending":
			pending++
			if o.DispatchStatus == "exhausted" || o.DispatchStatus == "escalated" {
				exhausted++
				slaFocus++
			} else if o.SlaDeadline != nil {
				rem := o.SlaDeadline.Sub(now)
				if rem <= 60*time.Second {
					slaFocus++
				}
			}
		case "accepted":
			accepted++
		case "in_progress":
			inProgress++
		}
	}

	unitCount := 0
	activeUnits := 0
	var list []domain.Emergency
	var listErr error
	if scope.ProvinceWide {
		list, listErr = h.emergencySvc.GetByProvince(scope.ProvinceID)
	} else {
		list, listErr = h.emergencySvc.GetByRegency(scope.RegencyID)
	}
	if listErr == nil {
		for _, u := range list {
			if !domain.EmergencyInScope(u, scope) {
				continue
			}
			unitCount++
			if u.Operational.IsActive {
				activeUnits++
			}
		}
	}

	return response.OK(c, "success", fiber.Map{
		"scope": fiber.Map{
			"regency_id":    scope.RegencyID,
			"province_id":   scope.ProvinceID,
			"province_wide": scope.ProvinceWide,
			"unit_name":     scope.UnitName,
		},
		"pending":       pending,
		"accepted":      accepted,
		"in_progress":   inProgress,
		"exhausted":     exhausted,
		"sla_focus":     slaFocus,
		"units_total":   unitCount,
		"units_active":  activeUnits,
		"orders_total":  len(orders),
	})
}

// EscalateOrder lets the assigned unit or wilayah dispatcher escalate to PSC.
func (h *UnitHandler) EscalateOrder(c *fiber.Ctx) error {
	if h.dispatchSvc == nil {
		return response.NotImplemented(c)
	}
	actorUUID := c.Locals("emergency_uuid").(string)
	id := c.Params("id")
	result, err := h.dispatchSvc.EscalateToPSC(id, actorUUID, false)
	return h.mapDispatchErr(c, result, err, "order escalated to PSC")
}

// unitMayAccessOrder allows assigned unit or wilayah dispatcher (not admin).
func (h *UnitHandler) unitMayAccessOrder(orderID, actorUUID string) bool {
	if h.dispatchSvc == nil {
		return false
	}
	return h.dispatchSvc.AuthorizeOrder(orderID, actorUUID, false) == nil
}
