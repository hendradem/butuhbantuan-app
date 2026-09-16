package handler

import (
	"errors"
	"strings"

	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
	"github.com/butuhbantuan/api/internal/service"
	"github.com/butuhbantuan/api/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type PartnerRequestHandler struct {
	svc service.PartnerRequestUseCase
}

func NewPartnerRequestHandler(svc service.PartnerRequestUseCase) *PartnerRequestHandler {
	return &PartnerRequestHandler{svc: svc}
}

// Create is the public endpoint behind /daftar-unit. There is no auth by
// design, so it is rate-limited at the router and every review-related field
// the body might carry is discarded by the service.
func (h *PartnerRequestHandler) Create(c *fiber.Ctx) error {
	var req domain.PartnerRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	created, err := h.svc.Submit(req)
	if err != nil {
		if errors.Is(err, repository.ErrNotSupported) {
			return response.NotImplemented(c)
		}
		if isPartnerRequestValidationError(err) {
			return response.Error(c, fiber.StatusBadRequest, err.Error())
		}
		return response.Error(c, fiber.StatusInternalServerError, "gagal menyimpan permintaan")
	}
	return response.Created(c, "permintaan terkirim", created)
}

// Index lists submissions for the dashboard "Request" tab.
func (h *PartnerRequestHandler) Index(c *fiber.Ctx) error {
	status := strings.TrimSpace(c.Query("status"))
	if status != "" && !domain.IsPartnerRequestStatus(status) {
		return response.Error(c, fiber.StatusBadRequest, "status tidak dikenal")
	}
	data, err := h.svc.GetAll(status)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "gagal memuat permintaan")
	}
	return response.OK(c, "success", data)
}

func (h *PartnerRequestHandler) Show(c *fiber.Ctx) error {
	data, err := h.svc.GetByID(c.Params("id"))
	if err != nil {
		return partnerRequestError(c, err)
	}
	return response.OK(c, "success", data)
}

func (h *PartnerRequestHandler) MarkContacted(c *fiber.Ctx) error {
	updated, err := h.svc.MarkContacted(c.Params("id"), reviewerFrom(c))
	if err != nil {
		return partnerRequestError(c, err)
	}
	return response.OK(c, "permintaan ditandai sudah dihubungi", updated)
}

// Approve creates the unit from the submission. The unit is left inactive; the
// dashboard then sends the admin to its detail page to set credentials.
func (h *PartnerRequestHandler) Approve(c *fiber.Ctx) error {
	created, err := h.svc.Approve(c.Params("id"), reviewerFrom(c))
	if err != nil {
		return partnerRequestError(c, err)
	}
	return response.OK(c, "permintaan disetujui", created)
}

func (h *PartnerRequestHandler) Reject(c *fiber.Ctx) error {
	var body struct {
		Note string `json:"note"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if strings.TrimSpace(body.Note) == "" {
		return response.Error(c, fiber.StatusBadRequest, "alasan penolakan wajib diisi")
	}
	updated, err := h.svc.Reject(c.Params("id"), reviewerFrom(c), strings.TrimSpace(body.Note))
	if err != nil {
		return partnerRequestError(c, err)
	}
	return response.OK(c, "permintaan ditolak", updated)
}

func reviewerFrom(c *fiber.Ctx) string {
	if role, ok := c.Locals("auth_role").(string); ok && role != "" {
		return role
	}
	return "admin"
}

func partnerRequestError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		return response.Error(c, fiber.StatusNotFound, "permintaan tidak ditemukan")
	case errors.Is(err, repository.ErrNotSupported):
		return response.NotImplemented(c)
	case errors.Is(err, domain.ErrPartnerRequestStatus):
		return response.Error(c, fiber.StatusConflict, err.Error())
	default:
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
}

func isPartnerRequestValidationError(err error) bool {
	for _, target := range []error{
		domain.ErrPartnerRequestNameRequired,
		domain.ErrPartnerRequestTypeRequired,
		domain.ErrPartnerRequestContactRequired,
		domain.ErrPartnerRequestLocationRequired,
	} {
		if errors.Is(err, target) {
			return true
		}
	}
	return false
}
