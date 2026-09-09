# Community Relay / Claim Dispatch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a WA-only emergency unit to forward a pending order to their community WhatsApp group via a public claim link; any community volunteer can claim (accept) the ticket within the configured time window before the SLA escalation resumes.

**Architecture:** `POST /track/:token/relay` creates a `claim_token` on the ticket and returns a shareable `/claim/:token` URL. `GET /claim/:token` returns non-PII ticket info; `POST /claim/:token` atomically accepts the order. `FindPendingPastSLA` skips tickets with an active (non-expired) claim window so the normal SLA escalator doesn't fire while the community window is open.

**Tech Stack:** Go 1.23 / Fiber v2 backend; GORM MySQL + `domain/repository/service/handler` layers; Nuxt 3 / Vue 3 web-app frontend.

---

## File Map

| File | Change |
|------|--------|
| `apps/api/internal/domain/order.go` | Add `ClaimToken`, `ClaimExpiresAt` fields |
| `apps/api/internal/domain/citizen_phase.go` | Add `koordinasi` phase constant + update `ResolveCitizenPhase` |
| `apps/api/internal/repository/mysql/entity.go` | Add `ClaimToken`, `ClaimExpiresAt` to `OrderTicketEntity` |
| `apps/api/internal/repository/repository.go` | Add `SetClaimToken`, `FindByClaimToken`, `ClaimOrder` to `OrderRepository` |
| `apps/api/internal/repository/mysql/order.go` | Implement new repo methods; update `mapOrder`; update `FindPendingPastSLA` |
| `apps/api/pkg/config/config.go` | Add `CommunityClaimWindowSecs int` |
| `apps/api/cmd/main.go` | Pass new config field to service |
| `apps/api/internal/service/interfaces.go` | Add `RelayToCommunity`, `GetClaim`, `ClaimOrder` to `OrderUseCase` |
| `apps/api/internal/service/order.go` | Implement the three new use-case methods + noop stubs |
| `apps/api/internal/handler/order.go` | Add `RelayCommunity`, `GetClaimPage`, `SubmitClaim` handlers |
| `apps/api/internal/router/router.go` | Register new routes |
| `apps/web-app/utils/citizenPhase.ts` | Add `koordinasi` to labels/hints |
| `apps/web-app/pages/dispatch/[token].vue` | Add "Relay ke Komunitas" button + share UI |
| `apps/web-app/pages/claim/[token].vue` | New public volunteer claim page |
| `apps/web-app/components/ticket/ETicketCard.vue` | Handle `koordinasi` phase |

---

### Task 1: Domain — ClaimToken fields + koordinasi phase

**Files:**
- Modify: `apps/api/internal/domain/order.go`
- Modify: `apps/api/internal/domain/citizen_phase.go`
- Test: `apps/api/internal/domain/citizen_phase_test.go`

- [ ] **Step 1: Add ClaimToken and ClaimExpiresAt to OrderTicket**

In `apps/api/internal/domain/order.go`, after the `TrackExpiresAt` line (line 41):

```go
// Community relay claim — WA unit may share this link to a volunteer group.
// ClaimToken is cleared once a volunteer claims or the window expires.
ClaimToken     string     `json:"claim_token,omitempty"`
ClaimExpiresAt *time.Time `json:"claim_expires_at,omitempty"`
```

- [ ] **Step 2: Add CitizenPhaseKoordinasi constant**

In `apps/api/internal/domain/citizen_phase.go`, add to the const block after `CitizenPhaseCancelled`:

```go
CitizenPhaseKoordinasi = "koordinasi" // relayed to community group, waiting for volunteer
```

- [ ] **Step 3: Update ResolveCitizenPhase to emit koordinasi**

In `apps/api/internal/domain/citizen_phase.go`, modify `ResolveCitizenPhase` to add this check before the `switch o.DispatchStatus` block (after the `"accepted", "in_progress"` case):

```go
// Pending + active community claim window → koordinasi
if o.Status == "pending" && o.ClaimToken != "" &&
    o.ClaimExpiresAt != nil && time.Now().Before(*o.ClaimExpiresAt) {
    return CitizenPhaseKoordinasi
}
```

Import `"time"` is already present in the file (it's used by `time.Time` in the struct). If not, add it.

- [ ] **Step 4: Add tests for koordinasi phase**

In `apps/api/internal/domain/citizen_phase_test.go`, add test cases to the existing table-driven test:

```go
{
    name: "koordinasi when pending with active claim window",
    order: OrderTicket{
        Status:         "pending",
        DispatchStatus: "searching",
        ClaimToken:     "some-token",
        ClaimExpiresAt: func() *time.Time { t := time.Now().Add(5 * time.Minute); return &t }(),
    },
    want: CitizenPhaseKoordinasi,
},
{
    name: "waiting_unit when claim token present but expired",
    order: OrderTicket{
        Status:         "pending",
        DispatchStatus: "assigned",
        UnitName:       "PMI Sleman",
        ClaimToken:     "expired-token",
        ClaimExpiresAt: func() *time.Time { t := time.Now().Add(-1 * time.Minute); return &t }(),
    },
    want: CitizenPhaseWaitingUnit,
},
```

- [ ] **Step 5: Run domain tests and verify they pass**

```bash
cd apps/api && go test ./internal/domain/... -v -run TestResolveCitizenPhase
```

Expected: PASS (tests for koordinasi and expired claim pass)

- [ ] **Step 6: Commit**

```bash
cd apps/api && git add internal/domain/order.go internal/domain/citizen_phase.go internal/domain/citizen_phase_test.go
git commit -m "feat: add ClaimToken fields and koordinasi citizen phase to domain"
```

---

### Task 2: Repository — entity, interface, MySQL implementation

**Files:**
- Modify: `apps/api/internal/repository/mysql/entity.go`
- Modify: `apps/api/internal/repository/repository.go`
- Modify: `apps/api/internal/repository/mysql/order.go`

- [ ] **Step 1: Add ClaimToken and ClaimExpiresAt to OrderTicketEntity**

In `apps/api/internal/repository/mysql/entity.go`, after `TrackExpiresAt *time.Time` (around line 205):

```go
// Community relay claim window.
ClaimToken     string     `gorm:"type:char(36);index"`
ClaimExpiresAt *time.Time `gorm:"index"`
```

GORM AutoMigrate will add these columns on next startup (no manual migration needed).

- [ ] **Step 2: Extend OrderRepository interface**

In `apps/api/internal/repository/repository.go`, add these methods to `OrderRepository` interface after `SetReferralHospital`:

```go
// SetClaimToken mints a community relay claim window on a pending ticket.
SetClaimToken(id, token string, expiresAt time.Time) (*domain.OrderTicket, error)
// FindByClaimToken returns the ticket with an active (non-expired) claim token.
FindByClaimToken(token string) (*domain.OrderTicket, error)
// ClaimOrder atomically accepts a ticket by claim token.
// volunteerName and volunteerPhone are stored as handler_name / handling_notes.
ClaimOrder(claimToken, volunteerName, volunteerPhone string) (*domain.OrderTicket, error)
```

- [ ] **Step 3: Update mapOrder to include ClaimToken/ClaimExpiresAt**

In `apps/api/internal/repository/mysql/order.go`, in the `mapOrder` function, add after the `TrackExpiresAt` mapping:

```go
ClaimToken:     row.ClaimToken,
ClaimExpiresAt: row.ClaimExpiresAt,
```

- [ ] **Step 4: Update FindPendingPastSLA to skip active claim windows**

In `apps/api/internal/repository/mysql/order.go`, modify `FindPendingPastSLA` (line 279):

```go
func (r *OrderRepo) FindPendingPastSLA(now time.Time) ([]domain.OrderTicket, error) {
    var rows []OrderTicketEntity
    err := r.db.
        Where(
            "status = ? AND sla_deadline IS NOT NULL AND sla_deadline <= ? AND dispatch_status = ?"+
                " AND (claim_expires_at IS NULL OR claim_expires_at <= ?)",
            "pending", now, "searching", now,
        ).
        Order("sla_deadline ASC").
        Limit(50).
        Find(&rows).Error
    if err != nil {
        return nil, err
    }
    result := make([]domain.OrderTicket, len(rows))
    for i, row := range rows {
        result[i] = *mapOrder(row)
    }
    return result, nil
}
```

- [ ] **Step 5: Implement SetClaimToken**

In `apps/api/internal/repository/mysql/order.go`, add after `SetReferralHospital`:

```go
func (r *OrderRepo) SetClaimToken(id, token string, expiresAt time.Time) (*domain.OrderTicket, error) {
    result := r.db.Model(&OrderTicketEntity{}).
        Where("uuid = ? AND status = ?", id, "pending").
        Updates(map[string]any{
            "claim_token":      token,
            "claim_expires_at": expiresAt,
        })
    if result.Error != nil {
        return nil, result.Error
    }
    if result.RowsAffected == 0 {
        return nil, repository.ErrConflict
    }
    return r.FindByID(id)
}
```

- [ ] **Step 6: Implement FindByClaimToken**

```go
func (r *OrderRepo) FindByClaimToken(token string) (*domain.OrderTicket, error) {
    if token == "" {
        return nil, repository.ErrNotFound
    }
    var row OrderTicketEntity
    err := r.db.
        Where("claim_token = ? AND claim_expires_at > ?", token, time.Now()).
        First(&row).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, repository.ErrNotFound
        }
        return nil, err
    }
    return mapOrder(row), nil
}
```

- [ ] **Step 7: Implement ClaimOrder**

```go
func (r *OrderRepo) ClaimOrder(claimToken, volunteerName, volunteerPhone string) (*domain.OrderTicket, error) {
    now := time.Now()
    result := r.db.Model(&OrderTicketEntity{}).
        Where("claim_token = ? AND claim_expires_at > ? AND status = ?", claimToken, now, "pending").
        Updates(map[string]any{
            "status":           "accepted",
            "handler_name":     volunteerName,
            "handling_notes":   "Diklaim relawan komunitas · " + volunteerPhone,
            "accepted_at":      now,
            "claim_token":      "",
            "claim_expires_at": nil,
        })
    if result.Error != nil {
        return nil, result.Error
    }
    if result.RowsAffected == 0 {
        return nil, repository.ErrConflict
    }
    var row OrderTicketEntity
    if err := r.db.Where("handler_name = ? AND accepted_at = ?", volunteerName, now).
        Order("id DESC").First(&row).Error; err != nil {
        return nil, err
    }
    return mapOrder(row), nil
}
```

Wait — finding by handler_name+accepted_at is fragile. Better to return with a secondary lookup by claim_token is cleared. Actually the cleanest way is to re-find by UUID. But we need to know the UUID. Let me restructure:

```go
func (r *OrderRepo) ClaimOrder(claimToken, volunteerName, volunteerPhone string) (*domain.OrderTicket, error) {
    now := time.Now()
    // First find the ticket to get its UUID for the return query.
    var row OrderTicketEntity
    if err := r.db.Where("claim_token = ? AND claim_expires_at > ? AND status = ?",
        claimToken, now, "pending").First(&row).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, repository.ErrConflict // expired or already claimed
        }
        return nil, err
    }
    ticketUUID := row.UUID.String()

    result := r.db.Model(&OrderTicketEntity{}).
        Where("uuid = ? AND claim_token = ? AND status = ?", ticketUUID, claimToken, "pending").
        Updates(map[string]any{
            "status":           "accepted",
            "handler_name":     volunteerName,
            "handling_notes":   "Diklaim relawan komunitas · " + volunteerPhone,
            "accepted_at":      now,
            "claim_token":      "",
            "claim_expires_at": nil,
        })
    if result.Error != nil {
        return nil, result.Error
    }
    if result.RowsAffected == 0 {
        return nil, repository.ErrConflict
    }
    return r.FindByID(ticketUUID)
}
```

- [ ] **Step 8: Compile check**

```bash
cd apps/api && go build ./...
```

Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add apps/api/internal/repository/
git commit -m "feat: repository — claim token fields, SetClaimToken, FindByClaimToken, ClaimOrder, SLA exclusion"
```

---

### Task 3: Config + Service layer

**Files:**
- Modify: `apps/api/pkg/config/config.go`
- Modify: `apps/api/cmd/main.go`
- Modify: `apps/api/internal/service/interfaces.go`
- Modify: `apps/api/internal/service/order.go`

- [ ] **Step 1: Add CommunityClaimWindowSecs to Config**

In `apps/api/pkg/config/config.go`, add field after `DispatchSLASecs`:

```go
CommunityClaimWindowSecs int
```

In `Load()`, add after the `DispatchSLASecs` line:

```go
CommunityClaimWindowSecs: getEnvInt("COMMUNITY_CLAIM_WINDOW_SECS", 300),
```

- [ ] **Step 2: Add three methods to OrderUseCase interface**

In `apps/api/internal/service/interfaces.go`, add to `OrderUseCase` interface after `SetReferralHospital`:

```go
// RelayToCommunity mints a claim token on a pending WA-dispatch ticket and
// returns the claim URL token. Only the assigned unit's track token is accepted.
RelayToCommunity(trackToken string, windowSecs int) (*domain.OrderTicket, error)
// GetClaim returns sanitized (no-PII) ticket info for the public claim page.
GetClaim(claimToken string) (*domain.OrderTicket, error)
// ClaimOrder allows a community volunteer to accept the ticket by claim token.
ClaimOrder(claimToken, volunteerName, volunteerPhone string) (*domain.OrderTicket, error)
```

- [ ] **Step 3: Implement RelayToCommunity in order.go**

In `apps/api/internal/service/order.go`, add before `NoopOrderService`:

```go
func (s *OrderService) RelayToCommunity(trackToken string, windowSecs int) (*domain.OrderTicket, error) {
    ticket, err := s.repo.FindByTrackToken(strings.TrimSpace(trackToken))
    if err != nil {
        return nil, err
    }
    if ticket.Status != "pending" {
        return nil, repository.ErrConflict
    }
    if windowSecs <= 0 {
        windowSecs = 300
    }
    claimToken := uuid.New().String()
    expiresAt := time.Now().Add(time.Duration(windowSecs) * time.Second)
    updated, err := s.repo.SetClaimToken(ticket.ID, claimToken, expiresAt)
    if err != nil {
        return nil, err
    }
    _ = s.RecordEvent(domain.OrderEvent{
        OrderID:      updated.ID,
        TicketNumber: updated.TicketNumber,
        Type:         "relay_community",
        Message:      "Perintah diteruskan ke grup komunitas, menunggu relawan",
        Actor:        "unit",
    })
    s.pub.PublishScoped(updated.EmergencyUUID, updated.RegencyID, updated.ProvinceID,
        hub.Event{Type: "order_updated", Payload: updated})
    return updated, nil
}
```

- [ ] **Step 4: Implement GetClaim in order.go**

```go
func (s *OrderService) GetClaim(claimToken string) (*domain.OrderTicket, error) {
    ticket, err := s.repo.FindByClaimToken(strings.TrimSpace(claimToken))
    if err != nil {
        return nil, err
    }
    // Strip PII — volunteers only see what's needed to decide.
    ticket.RequesterPhone = ""
    ticket.RequesterName = ""
    ticket.TrackToken = ""
    ticket.ClaimToken = "" // don't expose the token back in the payload
    return ticket, nil
}
```

- [ ] **Step 5: Implement ClaimOrder in order.go**

```go
func (s *OrderService) ClaimOrder(claimToken, volunteerName, volunteerPhone string) (*domain.OrderTicket, error) {
    volunteerName = strings.TrimSpace(volunteerName)
    volunteerPhone = strings.TrimSpace(volunteerPhone)
    if volunteerName == "" {
        return nil, ErrDispatchConflict
    }
    updated, err := s.repo.ClaimOrder(claimToken, volunteerName, volunteerPhone)
    if err != nil {
        return nil, err
    }
    _ = s.RecordEvent(domain.OrderEvent{
        OrderID:      updated.ID,
        TicketNumber: updated.TicketNumber,
        Type:         domain.OrderEventAccepted,
        Message:      "Diklaim oleh relawan komunitas: " + volunteerName,
        Actor:        "community",
    })
    s.pub.PublishScoped(updated.EmergencyUUID, updated.RegencyID, updated.ProvinceID,
        hub.Event{Type: "order_updated", Payload: updated})
    s.pushSvc.Notify(updated.TicketNumber,
        "Relawan komunitas merespons",
        "Pesanan Anda akan ditangani oleh "+volunteerName+".",
    )
    return updated, nil
}
```

Note: `ErrDispatchConflict` is already defined in `service/dispatch.go`. Either use that or add a local sentinel. Since `order.go` and `dispatch.go` are in the same package (`service`), it's accessible.

- [ ] **Step 6: Add noop implementations to NoopOrderService**

In `apps/api/internal/service/order.go`, find `NoopOrderService` and add:

```go
func (s *NoopOrderService) RelayToCommunity(_ string, _ int) (*domain.OrderTicket, error) {
    return nil, repository.ErrNotSupported
}
func (s *NoopOrderService) GetClaim(_ string) (*domain.OrderTicket, error) {
    return nil, repository.ErrNotFound
}
func (s *NoopOrderService) ClaimOrder(_, _, _ string) (*domain.OrderTicket, error) {
    return nil, repository.ErrNotSupported
}
```

- [ ] **Step 7: Update main.go to pass CommunityClaimWindowSecs**

In `apps/api/cmd/main.go`, find where `OrderService` is constructed (look for `service.NewOrderService`). The `claimWindowSecs` doesn't need to be passed there — it's passed at call time in the handler. But we need to thread `cfg.CommunityClaimWindowSecs` through to the handler. 

Find where the `OrderHandler` is initialized in `router/router.go` — it already receives `orderSvc`. The handler will read the window from the config. We need to pass `cfg` to the `OrderHandler`.

Update `handler.NewOrderHandler` call in `router/router.go` to pass `cfg`:

```go
orderH := handler.NewOrderHandler(orderSvc, emergencySvc, cfg).WithDispatch(dispatchSvc)...
```

In `apps/api/internal/handler/order.go`, update the struct and constructor:

```go
type OrderHandler struct {
    svc          service.OrderUseCase
    emergencySvc service.EmergencyUseCase
    dispatch     service.DispatchUseCase
    wilayah      *service.WilayahResolver
    assessment   service.AssessmentUseCase
    waDispatch   *service.WaDispatchResolver
    claimWindow  int // seconds
}

func NewOrderHandler(svc service.OrderUseCase, emergencySvc service.EmergencyUseCase, cfg ...*config.Config) *OrderHandler {
    h := &OrderHandler{svc: svc, emergencySvc: emergencySvc, claimWindow: 300}
    if len(cfg) > 0 && cfg[0] != nil {
        h.claimWindow = cfg[0].CommunityClaimWindowSecs
    }
    return h
}
```

Import `"github.com/butuhbantuan/api/pkg/config"` in handler/order.go.

- [ ] **Step 8: Compile check**

```bash
cd apps/api && go build ./...
```

Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add apps/api/pkg/config/ apps/api/internal/service/ apps/api/internal/handler/order.go
git commit -m "feat: service layer — RelayToCommunity, GetClaim, ClaimOrder use cases"
```

---

### Task 4: Handler + Routes

**Files:**
- Modify: `apps/api/internal/handler/order.go`
- Modify: `apps/api/internal/router/router.go`

- [ ] **Step 1: Add RelayCommunity handler**

In `apps/api/internal/handler/order.go`, add a new handler:

```go
// RelayCommunity mints a community claim link on a WA-only pending dispatch.
// POST /track/:token/relay
func (h *OrderHandler) RelayCommunity(c *fiber.Ctx) error {
    token := strings.TrimSpace(c.Params("token"))
    if token == "" {
        return response.Error(c, fiber.StatusBadRequest, "token required")
    }
    updated, err := h.svc.RelayToCommunity(token, h.claimWindow)
    if errors.Is(err, repository.ErrNotFound) {
        return response.Error(c, fiber.StatusNotFound, "sesi tidak ditemukan atau sudah kedaluwarsa")
    }
    if errors.Is(err, repository.ErrConflict) {
        return response.Error(c, fiber.StatusConflict, "tiket tidak lagi dalam status menunggu")
    }
    if err != nil {
        log.Printf("relay community: %v", err)
        return response.Error(c, fiber.StatusInternalServerError, "gagal membuat link komunitas")
    }
    return response.Success(c, updated)
}
```

Make sure `errors`, `log`, `strings`, `repository`, and `response` are already imported (they are).

- [ ] **Step 2: Add GetClaimPage handler**

```go
// GetClaimPage returns public (no-PII) ticket info for the volunteer claim page.
// GET /claim/:token
func (h *OrderHandler) GetClaimPage(c *fiber.Ctx) error {
    token := strings.TrimSpace(c.Params("token"))
    if token == "" {
        return response.Error(c, fiber.StatusBadRequest, "token required")
    }
    ticket, err := h.svc.GetClaim(token)
    if errors.Is(err, repository.ErrNotFound) {
        return response.Error(c, fiber.StatusNotFound, "link tidak valid atau sudah kedaluwarsa")
    }
    if err != nil {
        return response.Error(c, fiber.StatusInternalServerError, "gagal memuat info kejadian")
    }
    return response.Success(c, ticket)
}
```

- [ ] **Step 3: Add SubmitClaim handler**

```go
// SubmitClaim accepts a ticket for a community volunteer.
// POST /claim/:token
func (h *OrderHandler) SubmitClaim(c *fiber.Ctx) error {
    token := strings.TrimSpace(c.Params("token"))
    if token == "" {
        return response.Error(c, fiber.StatusBadRequest, "token required")
    }
    var body struct {
        Name  string `json:"name"`
        Phone string `json:"phone"`
    }
    if err := c.BodyParser(&body); err != nil {
        return response.Error(c, fiber.StatusBadRequest, "invalid body")
    }
    name := strings.TrimSpace(body.Name)
    if name == "" {
        return response.Error(c, fiber.StatusBadRequest, "name required")
    }
    updated, err := h.svc.ClaimOrder(token, name, strings.TrimSpace(body.Phone))
    if errors.Is(err, repository.ErrConflict) || errors.Is(err, repository.ErrNotFound) {
        return response.Error(c, fiber.StatusConflict, "link sudah digunakan atau kedaluwarsa")
    }
    if err != nil {
        log.Printf("claim order: %v", err)
        return response.Error(c, fiber.StatusInternalServerError, "gagal mengklaim tiket")
    }
    return response.Success(c, updated)
}
```

- [ ] **Step 4: Register routes in router.go**

In `apps/api/internal/router/router.go`, add inside the `track` group (after existing track routes):

```go
track.Post("/:token/relay", orderH.RelayCommunity)
```

Add a new `claim` group after the `track` group:

```go
claim := v1.Group("/claim")
claim.Get("/:token", orderH.GetClaimPage)
claim.Post("/:token", limitOrder, orderH.SubmitClaim)
```

- [ ] **Step 5: Compile + run tests**

```bash
cd apps/api && go build ./... && go test ./...
```

Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add apps/api/internal/handler/order.go apps/api/internal/router/router.go
git commit -m "feat: handler + routes — relay community, get claim, submit claim endpoints"
```

---

### Task 5: Web-app — citizenPhase.ts + dispatch relay button

**Files:**
- Modify: `apps/web-app/utils/citizenPhase.ts`
- Modify: `apps/web-app/pages/dispatch/[token].vue`

- [ ] **Step 1: Add koordinasi to CITIZEN_PHASE_LABEL**

In `apps/web-app/utils/citizenPhase.ts`, add to `CITIZEN_PHASE_LABEL`:

```typescript
koordinasi: "Koordinasi komunitas",
```

Add to `CITIZEN_PHASE_HINT`:

```typescript
koordinasi: "Unit meneruskan permintaan ke grup relawan komunitas. Menunggu relawan mengklaim.",
```

Add `koordinasi` to `CITIZEN_PHASE_HINT` and `CITIZEN_PHASE_LABEL` exports.

- [ ] **Step 2: Add relay button UI to dispatch page**

In `apps/web-app/pages/dispatch/[token].vue`, the file has a `type OfferSession` type. Add `claim_token?: string | null` and `claim_expires_at?: string | null` to it.

Then add a relay section in the `"offer"` step of the template. Find where the reject/accept buttons are shown and add below the accept/reject block (within the `v-if="step === 'offer'"` section):

In the `<script setup>` section, add relay state:

```typescript
const relaying = ref(false);
const relayError = ref("");
const relayDone = ref(false);
const claimUrl = ref("");

async function relayToCommunity() {
  relaying.value = true;
  relayError.value = "";
  try {
    const res = await fetch(`${apiBase}/api/v1/track/${token.value}/relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json?.message || "Gagal membuat link komunitas");
    }
    const json = await res.json();
    const ct = json?.data?.claim_token;
    if (ct) {
      const webAppBase = window.location.origin;
      claimUrl.value = `${webAppBase}/claim/${ct}`;
      relayDone.value = true;
    }
  } catch (e: any) {
    relayError.value = e?.message || "Terjadi kesalahan";
  } finally {
    relaying.value = false;
  }
}

async function copyClaimUrl() {
  if (!claimUrl.value) return;
  try {
    await navigator.clipboard.writeText(claimUrl.value);
    appToast().show("Link disalin!", "success");
  } catch {
    // fallback: select text
  }
}
```

Import `appToast` at top of the file (check if it already imports from `~/utils/appToast`). Add `import { appToast } from "~/utils/appToast";` if not present.

In the template `<template>`, inside the `step === 'offer'` block, add AFTER the reject modal and accept button section:

```html
<!-- Community relay (WA-only units) -->
<div v-if="!relayDone" class="mt-4 border-t border-neutral-100 pt-4">
  <button
    type="button"
    class="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600 hover:bg-neutral-50 transition disabled:opacity-50"
    :disabled="relaying"
    @click="relayToCommunity"
  >
    <Icon icon="lucide:users" class="text-base" />
    {{ relaying ? "Meneruskan..." : "Teruskan ke Grup Komunitas" }}
  </button>
  <p v-if="relayError" class="mt-2 text-xs text-red-500 text-center">{{ relayError }}</p>
</div>

<!-- After relay: show share link -->
<div v-else class="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
  <div class="flex items-center gap-2 text-green-700 text-sm font-medium">
    <Icon icon="lucide:check-circle" class="text-base" />
    Link komunitas berhasil dibuat
  </div>
  <p class="text-xs text-neutral-600">Bagikan link ini ke grup WhatsApp komunitas Anda:</p>
  <div class="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
    <span class="flex-1 text-xs text-neutral-700 truncate">{{ claimUrl }}</span>
    <button type="button" @click="copyClaimUrl" class="text-xs text-blue-600 shrink-0">Salin</button>
  </div>
  <a
    :href="`https://wa.me/?text=${encodeURIComponent('Ada yang butuh bantuan! Klik link ini untuk mengklaim: ' + claimUrl)}`"
    target="_blank"
    rel="noopener"
    class="flex items-center justify-center gap-2 w-full rounded-xl bg-green-600 text-white text-sm px-4 py-3 hover:bg-green-700 transition"
  >
    <Icon icon="logos:whatsapp-icon" class="text-base" />
    Kirim via WhatsApp
  </a>
</div>
```

- [ ] **Step 3: Verify the dispatch page compiles (typecheck)**

```bash
cd apps/web-app && pnpm typecheck 2>&1 | head -30
```

Expected: no new errors in `pages/dispatch/[token].vue`

- [ ] **Step 4: Commit**

```bash
git add apps/web-app/utils/citizenPhase.ts apps/web-app/pages/dispatch/[token].vue
git commit -m "feat: web-app — koordinasi phase label and community relay button on dispatch page"
```

---

### Task 6: Web-app — /claim/[token] page + ETicketCard koordinasi

**Files:**
- Create: `apps/web-app/pages/claim/[token].vue`
- Modify: `apps/web-app/components/ticket/ETicketCard.vue`

- [ ] **Step 1: Create public claim page**

Create `apps/web-app/pages/claim/[token].vue`:

```vue
<script setup lang="ts">
import { Icon } from "@iconify/vue";

definePageMeta({ layout: false });
useHead({ title: "Klaim Bantuan · ButuhBantuan" });

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBaseUrl as string;
const claimToken = computed(() => String(route.params.token || "").trim());

type ClaimInfo = {
  ticket_number: string;
  unit_name: string;
  location: string;
  condition: string;
  emergency_uuid: string;
  claim_expires_at?: string;
  status: string;
};

const info = ref<ClaimInfo | null>(null);
const loading = ref(true);
const loadError = ref("");
const alreadyClaimed = ref(false);

const volunteerName = ref("");
const volunteerPhone = ref("");
const claiming = ref(false);
const claimError = ref("");
const claimed = ref(false);

async function loadClaim() {
  loading.value = true;
  loadError.value = "";
  try {
    const res = await fetch(`${apiBase}/api/v1/claim/${claimToken.value}`, {
      cache: "no-store",
    });
    if (res.status === 404 || res.status === 409) {
      alreadyClaimed.value = true;
      return;
    }
    if (!res.ok) throw new Error("Gagal memuat informasi kejadian");
    const json = await res.json();
    info.value = json?.data ?? null;
  } catch (e: any) {
    loadError.value = e?.message || "Terjadi kesalahan";
  } finally {
    loading.value = false;
  }
}

async function submitClaim() {
  const name = volunteerName.value.trim();
  if (!name) {
    claimError.value = "Nama wajib diisi";
    return;
  }
  claiming.value = true;
  claimError.value = "";
  try {
    const res = await fetch(`${apiBase}/api/v1/claim/${claimToken.value}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone: volunteerPhone.value.trim() }),
    });
    if (res.status === 409) {
      claimError.value = "Link sudah digunakan oleh relawan lain.";
      return;
    }
    if (!res.ok) throw new Error("Gagal mengklaim tiket");
    claimed.value = true;
  } catch (e: any) {
    claimError.value = e?.message || "Terjadi kesalahan";
  } finally {
    claiming.value = false;
  }
}

const expiresIn = ref("");
function updateExpiry() {
  if (!info.value?.claim_expires_at) return;
  const diff = Math.max(0, new Date(info.value.claim_expires_at).getTime() - Date.now());
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  expiresIn.value = diff > 0 ? `${m}:${String(s).padStart(2, "0")}` : "Kedaluwarsa";
}

let expiryInterval: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  loadClaim();
  expiryInterval = setInterval(updateExpiry, 1000);
});
onBeforeUnmount(() => {
  if (expiryInterval) clearInterval(expiryInterval);
});
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex items-start justify-center pt-10 px-4">
    <div class="w-full max-w-md space-y-4">
      <!-- Header -->
      <div class="text-center">
        <p class="text-xs font-semibold tracking-widest text-neutral-400 uppercase">ButuhBantuan</p>
        <h1 class="text-lg font-bold text-neutral-900 mt-1">Klaim Bantuan Komunitas</h1>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="rounded-2xl bg-white border border-neutral-200 p-6 space-y-3">
        <div class="soft-skel h-4 w-40" />
        <div class="soft-skel h-3 w-full" />
        <div class="soft-skel h-3 w-3/4" />
      </div>

      <!-- Already claimed / expired -->
      <div
        v-else-if="alreadyClaimed"
        class="rounded-2xl bg-white border border-neutral-200 p-6 text-center space-y-2"
      >
        <Icon icon="lucide:alert-circle" class="text-3xl text-amber-400 mx-auto" />
        <p class="text-sm font-medium text-neutral-700">Link sudah tidak berlaku</p>
        <p class="text-xs text-neutral-500">Link ini sudah digunakan atau sudah kedaluwarsa.</p>
      </div>

      <!-- Load error -->
      <div
        v-else-if="loadError"
        class="rounded-2xl bg-white border border-red-200 p-6 text-center space-y-2"
      >
        <p class="text-sm text-red-600">{{ loadError }}</p>
      </div>

      <!-- Success claimed -->
      <div
        v-else-if="claimed"
        class="rounded-2xl bg-green-50 border border-green-200 p-6 text-center space-y-3"
      >
        <Icon icon="lucide:check-circle-2" class="text-4xl text-green-500 mx-auto" />
        <p class="text-base font-bold text-green-800">Terima kasih!</p>
        <p class="text-sm text-green-700">
          Anda berhasil mengklaim pesanan ini. Segera menuju lokasi kejadian.
        </p>
        <div v-if="info" class="text-left rounded-xl border border-green-200 bg-white p-3 mt-2 space-y-1">
          <p class="text-xs text-neutral-500">Lokasi kejadian</p>
          <p class="text-sm font-medium text-neutral-800">{{ info.location }}</p>
        </div>
      </div>

      <!-- Claim form -->
      <template v-else-if="info">
        <!-- Incident info card -->
        <div class="rounded-2xl bg-white border border-neutral-200 p-5 space-y-4">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-xs text-neutral-400">Unit</p>
              <p class="text-sm font-medium text-neutral-800">{{ info.unit_name }}</p>
            </div>
            <div v-if="expiresIn" class="text-right shrink-0">
              <p class="text-[10px] text-neutral-400">Berakhir dalam</p>
              <p class="text-sm font-bold tabular-nums" :class="expiresIn === 'Kedaluwarsa' ? 'text-red-500' : 'text-amber-600'">
                {{ expiresIn }}
              </p>
            </div>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-neutral-400">Lokasi</p>
            <p class="text-sm text-neutral-700">{{ info.location }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-neutral-400">Kondisi / keterangan</p>
            <p class="text-sm text-neutral-700">{{ info.condition || "Tidak ada keterangan tambahan" }}</p>
          </div>
        </div>

        <!-- Volunteer form -->
        <div class="rounded-2xl bg-white border border-neutral-200 p-5 space-y-4">
          <p class="text-sm font-semibold text-neutral-800">Isi data Anda untuk mengklaim</p>
          <div class="space-y-3">
            <div class="space-y-1">
              <label class="text-xs text-neutral-500">Nama lengkap <span class="text-red-500">*</span></label>
              <input
                v-model="volunteerName"
                type="text"
                placeholder="Masukkan nama Anda"
                class="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-neutral-500">Nomor HP (opsional)</label>
              <input
                v-model="volunteerPhone"
                type="tel"
                placeholder="08xx xxxx xxxx"
                class="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <p v-if="claimError" class="text-xs text-red-500">{{ claimError }}</p>
          <button
            type="button"
            class="w-full rounded-xl bg-blue-600 text-white text-sm font-semibold px-4 py-3 hover:bg-blue-700 transition disabled:opacity-50"
            :disabled="claiming || !volunteerName.trim()"
            @click="submitClaim"
          >
            {{ claiming ? "Mengklaim..." : "Saya Bisa Bantu →" }}
          </button>
          <p class="text-[11px] text-neutral-400 text-center">
            Dengan mengklaim, Anda setuju untuk segera menuju lokasi kejadian.
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Update ETicketCard.vue for koordinasi phase**

In `apps/web-app/components/ticket/ETicketCard.vue`, find where the citizen phase is displayed (search for `CITIZEN_PHASE_HINT` or status badge section). The `koordinasi` phase will get a label from `CITIZEN_PHASE_LABEL` automatically. But we also want to show the `claim_token` info if applicable.

Find the section showing phase description/hint in the template. Add a special koordinasi card near the phase status display (where `escalated_psc` or similar special states are handled):

Search for the existing phase hint rendering — there will be a `v-if` or `v-for` using `CITIZEN_PHASE_HINT`. Alongside those, add:

```html
<!-- koordinasi: community relay in progress -->
<div
  v-if="ticket && resolveCitizenPhase(ticket) === 'koordinasi'"
  class="rounded-xl border border-blue-100 bg-blue-50 p-3 flex items-start gap-2"
>
  <Icon icon="lucide:users" class="text-blue-500 text-base mt-0.5 shrink-0" />
  <div>
    <p class="text-xs font-medium text-blue-700">Menunggu Relawan Komunitas</p>
    <p class="text-[11px] text-blue-600 mt-0.5">
      Unit meneruskan permintaan Anda ke grup relawan. Tunggu sebentar.
    </p>
  </div>
</div>
```

You need to find the right location in the template — look for where `escalated_psc` info block is rendered (there should be a section showing the PSC hotline). Add the koordinasi block nearby.

- [ ] **Step 3: Typecheck**

```bash
cd apps/web-app && pnpm typecheck 2>&1 | head -30
```

Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git add apps/web-app/pages/claim/ apps/web-app/components/ticket/ETicketCard.vue
git commit -m "feat: web-app — /claim/[token] volunteer page and koordinasi phase in ETicketCard"
```

---

### Task 7: .env.example documentation + final compile check

**Files:**
- Modify: `apps/api/.env.example`

- [ ] **Step 1: Document the new env variable**

In `apps/api/.env.example`, add after `DISPATCH_SLA_SECONDS`:

```
# Community relay claim window in seconds (default: 300 = 5 minutes)
# COMMUNITY_CLAIM_WINDOW_SECS=300
```

- [ ] **Step 2: Full compile + test run**

```bash
cd apps/api && go build ./... && go test ./...
cd apps/web-app && pnpm typecheck
```

Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add apps/api/.env.example
git commit -m "docs: document COMMUNITY_CLAIM_WINDOW_SECS env variable"
```

---

## Self-Review

### Spec coverage check:
- ✅ WA unit can relay pending order to community via dispatch page relay button
- ✅ Claim link is shareable (WA deep link + copy to clipboard)
- ✅ Volunteer sees non-PII incident info on `/claim/:token`
- ✅ Volunteer submits name + phone to claim (accept) the ticket
- ✅ Claim window blocks SLA escalation while active
- ✅ After window expires, EscalationWorker resumes normally
- ✅ `koordinasi` phase shown to citizen on e-ticket while claim window is active
- ✅ Atomic claim (SQL WHERE on claim_token + status = pending)
- ✅ Configurable window via `COMMUNITY_CLAIM_WINDOW_SECS`

### Type consistency check:
- `ClaimToken` / `ClaimExpiresAt` used consistently across domain → entity → mapOrder → service → handler
- `RelayToCommunity(trackToken string, windowSecs int)` called correctly with `h.claimWindow`
- `CitizenPhaseKoordinasi = "koordinasi"` matches frontend `"koordinasi"` key in CITIZEN_PHASE_LABEL

### Placeholder scan:
- All code blocks are complete and concrete
- SQL conditions shown explicitly
- No "handle edge cases" comments without implementation
