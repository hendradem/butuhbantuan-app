# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Layout

```
apps/
  api/          Go/Fiber REST API
  web-app/      Nuxt 3 PWA (citizen-facing, port 3000)
  dashboard/    Nuxt 3 admin + unit dashboard (port 3001)
packages/
  ui/           Shared Vue components (auto-registered globally with Ui* prefix)
  types/        Shared TypeScript types
  api-client/   Typed API client (src/client.ts, emergency.ts, sos.ts)
  config/       Shared ESLint/Tailwind config
  utils/        Shared utilities
  design-tokens/
```

Package manager: **pnpm 9** with workspaces. Build orchestration: **Turborepo**.

## Common Commands

### All apps (from repo root)
```bash
pnpm dev        # dev all apps concurrently
pnpm build      # build all (respects Turborepo dependency order)
pnpm lint       # lint all
pnpm typecheck  # typecheck all
pnpm test       # run all tests
```

### Go API (`apps/api/`)
```bash
make dev                         # go run ./cmd/main.go
make build                       # go build -o bin/api
make seed                        # seed MySQL from data/*.json (requires STORAGE=mysql)
go test ./...                    # run all Go tests
go test ./internal/domain/...    # run domain-layer tests only
```

### Frontend apps
```bash
# web-app
cd apps/web-app && pnpm dev      # port 3000

# dashboard
cd apps/dashboard && pnpm dev    # port 3001 (set in nuxt.config.ts)
```

## API Architecture (Go)

The API follows a strict layered architecture: **domain → repository → service → handler → router**.

- **`internal/domain/`** — pure Go structs and business logic (no dependencies on infra). Domain tests live here.
- **`internal/repository/repository.go`** — repository interfaces (`EmergencyRepository`, `OrderRepository`, etc.) and sentinel errors (`ErrNotFound`, `ErrConflict`, etc.).
- **`internal/repository/mysql/`** — GORM MySQL implementations. `entity.go` holds GORM entity structs. `migrate.go` runs `AutoMigrate` on startup.
- **`internal/repository/json/`** — JSON file-backed implementations for local dev (no MySQL needed).
- **`internal/service/interfaces.go`** — service use-case interfaces (`EmergencyUseCase`, `OrderUseCase`, `DispatchUseCase`, etc.). Every service also has a noop implementation so the API degrades gracefully when MySQL is absent (e.g. `NoopOrderService`).
- **`internal/handler/`** — Fiber HTTP handlers. Handlers depend on service interfaces only.
- **`internal/router/router.go`** — wires all handlers to routes. Auth middleware: `X-Admin-Key` header (or `?key=` for SSE) for admin; `X-Unit-Token` for units.
- **`pkg/hub/`** — in-process SSE fan-out. Channels are per-unit UUID, per-regency (`__regency__:<id>`), per-province (`__province__:<id>`), and `__admin__`. Services call `hub.PublishScoped()` to broadcast typed events.
- **`pkg/config/`** — loads `.env` into a `Config` struct.

### Storage modes
Set `STORAGE=json` (default, reads `data/*.json`) or `STORAGE=mysql` in `.env`. The `main.go` switch initialises the appropriate repository implementations and skips features (e.g. dispatch, push) whose repos are nil.

### Dispatch flow
SOS/call → `DispatchService.AssignIncident` ranks nearby units by distance/availability → creates `OrderTicket` + `DispatchAttempt` → notifies assignee via SSE + Web Push → `EscalationWorker` (15 s tick) auto-escalates overdue pending tickets via `EscalateOverdue()`.

## Frontend Architecture (Nuxt 3)

Both `web-app` and `dashboard` share the same conventions:

- **Shared UI components** from `packages/ui` are auto-registered globally with the `Ui` prefix (e.g. `<UiButton>`, `<UiBadge>`, `<UiModal>`). Never import them manually.
- **Icons**: `@iconify/vue` with lucide icons — `<Icon name="lucide:ambulance" />`.
- **Styling**: Tailwind CSS. CSS utility classes `page-subheader` and `soft-skel` (skeleton loader) are project conventions used across both apps.

### web-app (citizen PWA, port 3000)
- Pinia stores in `stores/`
- Leaflet maps + Turf.js for geo
- Key pages: `/dispatch/[token]` (SOS dispatch flow), `/track/[token]` (live GPS tracking), `/unit/[id]` (unit profile), `/ticket/[number]` (ticket status)
- Runtime config: `NUXT_PUBLIC_API_BASE_URL`, `NUXT_PUBLIC_GEOAPIFY_API_KEY`, `NUXT_PUBLIC_UI_THEME`, `NUXT_PUBLIC_COLOR_MODE`

### dashboard (admin + unit, port 3001)
- Two layouts: `default.vue` (admin) and `unit.vue` (unit users)
- Auth via `auth.global.ts` middleware reading cookies `dashboard-token` (admin) and `unit-token` (units). Routes under `/unit/*` require `unit-token`; all others require `dashboard-token`.
- Admin routes cover: emergencies, orders, analytics, assessment templates, compliance, hospitals, SOS, feedback, regions, settings.
- Unit routes under `/unit/*`: orders, ops map, stats, feedback, reports, hospitals, settings.
- Runtime config: `NUXT_PUBLIC_API_BASE_URL`, `NUXT_PUBLIC_ADMIN_API_KEY`, `NUXT_PUBLIC_WEB_APP_URL`

## Environment Setup

Copy `apps/api/.env.example` to `apps/api/.env`. Key variables:

| Variable | Purpose |
|---|---|
| `STORAGE` | `json` (default) or `mysql` |
| `DB` | MySQL DSN (only when `STORAGE=mysql`) |
| `ADMIN_API_KEY` | Shared secret for `X-Admin-Key` header |
| `MAPBOX_API_KEY` | Routing/directions |
| `GEOAPIFY_API_KEY` | Geocoding |
| `VAPID_PRIVATE_KEY` / `VAPID_PUBLIC_KEY` | Web Push (optional) |
| `SATUSEHAT_CLIENT_ID` / `SATUSEHAT_CLIENT_SECRET` | Hospital master data; omit to use local stub JSON |
| `DISPATCH_SLA_SECS` | SLA window before auto-escalation (default 120) |
