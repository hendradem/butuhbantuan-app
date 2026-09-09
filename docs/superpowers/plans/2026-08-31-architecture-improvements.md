# Architecture Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 6 structural issues identified in the architecture review: broken hospital abstraction, missing unit token expiry, missing startup SLA recovery, missing DB indexes, weak frontend type safety, and seed data in the wrong package.

**Architecture:** All changes are additive or confined to single files — no cross-cutting rewrites. Backend tasks target `apps/api`; frontend tasks target `packages/` and `apps/dashboard`. Each task is independently committable and testable.

**Tech Stack:** Go 1.23, Fiber v2, GORM + MySQL, Nuxt 3, TypeScript, pnpm workspaces, Turborepo.

---

## File Map

| Task | Files touched |
|---|---|
| 1 – Hospital interface | `domain/hospital.go`, `repository/repository.go`, `repository/mysql/hospital.go`, `service/hospital.go` |
| 2 – Unit token expiry | `repository/mysql/entity.go`, `repository/mysql/migrate.go`, `repository/mysql/order.go` (UnitCred section), `service/order.go` (login) |
| 3 – Startup SLA recovery | `service/escalation_worker.go`, `cmd/main.go` |
| 4 – DB indexes | `repository/mysql/migrate.go` |
| 5 – Frontend types | `packages/types/src/`, `packages/api-client/src/`, `apps/dashboard/composables/useApi.ts` |
| 6 – Seed housekeeping | `internal/domain/ambulance_compliance_seed*.go` → `cmd/seed/` |

---

## Task 1 — HospitalMasterRepository interface

**Goal:** Remove the only place in the codebase where a service holds a concrete repository struct (`*mysqlrepo.HospitalMasterRepo`). After this task, `hospitalService` depends only on interfaces.

**Why it matters:** Every other service is testable without a DB. Hospital is not. This fixes that inconsistency.

**Files:**
- Modify: `apps/api/internal/domain/hospital.go`
- Modify: `apps/api/internal/repository/repository.go`
- Modify: `apps/api/internal/repository/mysql/hospital.go`
- Modify: `apps/api/internal/service/hospital.go`

---

- [ ] **1.1 — Add `InternalID` to `domain.HospitalMaster`**

The `Import()` method needs the uint PK to call `MarkImported` and `LinkEmergencyHospitalMaster`. We carry it in the domain struct but never serialise it.

In `apps/api/internal/domain/hospital.go`, add one field to `HospitalMaster`:

```go
type HospitalMaster struct {
	InternalID          uint      `json:"-"` // DB auto-increment PK; never serialised
	ID                  string    `json:"id"`
	// ... rest unchanged
}
```

- [ ] **1.2 — Define `HospitalMasterRepository` interface**

In `apps/api/internal/repository/repository.go`, append after `AssessmentRepository`:

```go
type HospitalMasterRepository interface {
	ListByRegency(regencyID string) ([]domain.HospitalMaster, error)
	FindByUUIDs(ids []string) ([]domain.HospitalMaster, error)
	UpsertMany(items []domain.HospitalMaster) (int, error)
	MarkImported(masterInternalID uint, emergencyUUID string) error
	LinkEmergencyHospitalMaster(emergencyUUID string, masterInternalID uint) error
}
```

- [ ] **1.3 — Update `mapHospitalMaster` and `FindByUUIDs` in the MySQL repo**

In `apps/api/internal/repository/mysql/hospital.go`:

1. Update `mapHospitalMaster` to set `InternalID`:
```go
func mapHospitalMaster(row HospitalMasterEntity) domain.HospitalMaster {
	return domain.HospitalMaster{
		InternalID:          row.ID,   // ← add this line
		ID:                  row.UUID.String(),
		Source:              row.Source,
		SourceCode:          row.SourceCode,
		Name:                row.Name,
		Address:             row.Address,
		Phone:               row.Phone,
		Class:               row.Class,
		Ownership:           row.Ownership,
		Latitude:            row.Latitude,
		Longitude:           row.Longitude,
		ProvinceID:          row.ProvinceID,
		RegencyID:           row.RegencyID,
		ProvinceName:        row.ProvinceName,
		RegencyName:         row.RegencyName,
		SyncedAt:            row.SyncedAt,
		ImportedEmergencyID: row.ImportedEmergencyUUID,
		AlreadyImported:     row.ImportedEmergencyUUID != "",
	}
}
```

2. Change `FindByUUIDs` signature from `[]HospitalMasterEntity` to `[]domain.HospitalMaster`:
```go
func (r *HospitalMasterRepo) FindByUUIDs(ids []string) ([]domain.HospitalMaster, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var rows []HospitalMasterEntity
	if err := r.db.Where("uuid IN ?", ids).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.HospitalMaster, len(rows))
	for i, row := range rows {
		out[i] = mapHospitalMaster(row)
	}
	return out, nil
}
```

3. Add compile-time check at the bottom of the file:
```go
var _ repository.HospitalMasterRepository = (*HospitalMasterRepo)(nil)
```

- [ ] **1.4 — Update `hospitalService` to use the interface**

Replace the entire `hospitalService` struct and constructor in `apps/api/internal/service/hospital.go`:

```go
type hospitalService struct {
	master   repository.HospitalMasterRepository  // ← was *mysqlrepo.HospitalMasterRepo
	region   repository.RegionRepository
	emerg    repository.EmergencyRepository
	types    repository.EmergencyTypeRepository
	provider domain.HospitalProvider
}

func NewHospitalService(
	master repository.HospitalMasterRepository,  // ← interface, not concrete
	region repository.RegionRepository,
	emerg repository.EmergencyRepository,
	types repository.EmergencyTypeRepository,
	provider domain.HospitalProvider,
) HospitalUseCase {
	return &hospitalService{
		master:   master,
		region:   region,
		emerg:    emerg,
		types:    types,
		provider: provider,
	}
}
```

Update `Import()` — replace the `mysqlrepo.HospitalMasterEntity` map with `domain.HospitalMaster`:

```go
func (s *hospitalService) Import(req domain.HospitalImportRequest) (*domain.HospitalImportResult, error) {
	if len(req.MasterIDs) == 0 {
		return nil, fmt.Errorf("master_ids wajib")
	}
	rows, err := s.master.FindByUUIDs(req.MasterIDs)
	if err != nil {
		return nil, err
	}
	byUUID := map[string]domain.HospitalMaster{}
	for _, row := range rows {
		byUUID[row.ID] = row
	}

	rsType, err := s.resolveRumahSakitType()
	if err != nil {
		return nil, err
	}

	tier := strings.TrimSpace(req.PartnerTier)
	if tier == "" {
		tier = domain.PartnerTierCommunity
	}
	active := false
	if req.IsActive != nil {
		active = *req.IsActive
	}

	result := &domain.HospitalImportResult{IDs: []string{}, Errors: []string{}}
	for _, id := range req.MasterIDs {
		row, ok := byUUID[id]
		if !ok {
			result.Failed++
			result.Errors = append(result.Errors, "master tidak ditemukan: "+id)
			continue
		}
		if row.ImportedEmergencyID != "" {
			result.Skipped++
			result.IDs = append(result.IDs, row.ImportedEmergencyID)
			continue
		}
		lat := formatCoord(row.Latitude)
		lng := formatCoord(row.Longitude)
		e := domain.Emergency{
			Name:             row.Name,
			OrganizationName: row.Name,
			OrganizationType: "rumah_sakit",
			Description:      strings.TrimSpace(strings.Join(filterEmpty(row.Class, row.Ownership), " · ")),
			Coordinates:      [2]string{lng, lat},
			TypeOfService:    "Rumah Sakit",
			TipeEmergency:    []string{"Rumah Sakit"},
			PartnerTier:      tier,
			EmergencyType:    *rsType,
			Address: domain.Address{
				RegencyID:   row.RegencyID,
				Regency:     row.RegencyName,
				ProvinceID:  row.ProvinceID,
				Province:    row.ProvinceName,
				FullAddress: row.Address,
				DistrictID:  "",
			},
			Contact: domain.Contact{
				Phone:    row.Phone,
				Whatsapp: row.Phone,
			},
			Operational: domain.OperationalStatus{
				IsActive:  active,
				Is24Hours: true,
				OpenTime:  "00:00",
				CloseTime: "23:59",
			},
			Fleet:           domain.FleetStatus{Total: 0, Available: 0},
			DashboardAccess: true,
		}
		created, err := s.emerg.Create(e)
		if err != nil {
			result.Failed++
			result.Errors = append(result.Errors, row.Name+": "+err.Error())
			continue
		}
		_ = s.master.MarkImported(row.InternalID, created.ID)
		_ = s.master.LinkEmergencyHospitalMaster(created.ID, row.InternalID)
		result.Imported++
		result.IDs = append(result.IDs, created.ID)
	}
	return result, nil
}
```

Remove the now-unused import of `mysqlrepo` at the top of `service/hospital.go`.

- [ ] **1.5 — Remove unused import in `service/hospital.go`**

Delete the line:
```go
mysqlrepo "github.com/butuhbantuan/api/internal/repository/mysql"
```

- [ ] **1.6 — Update `main.go` call site**

In `apps/api/cmd/main.go`, `NewHospitalService` is called with `*mysqlrepo.HospitalMasterRepo`. The concrete type still satisfies the interface — the call site does not need to change. Just verify it compiles:

```bash
cd apps/api && go build ./...
```

Expected: no errors.

- [ ] **1.7 — Commit**

```bash
git add apps/api/internal/domain/hospital.go \
        apps/api/internal/repository/repository.go \
        apps/api/internal/repository/mysql/hospital.go \
        apps/api/internal/service/hospital.go
git commit -m "refactor: extract HospitalMasterRepository interface

Hospital service now depends on the repository interface like every
other service. Added InternalID (json:\"-\") to domain.HospitalMaster
to carry the uint PK needed by MarkImported/LinkEmergencyHospitalMaster."
```

---

## Task 2 — Unit token expiry (30-day rolling TTL)

**Goal:** Unit access tokens expire after 30 days of inactivity. The TTL resets on each successful auth so active units never get logged out unexpectedly.

**Why it matters:** Currently tokens never expire. A stolen token or a unit that left the organization retains access forever.

**Files:**
- Modify: `apps/api/internal/repository/mysql/entity.go`
- Modify: `apps/api/internal/repository/mysql/migrate.go`
- Modify: `apps/api/internal/repository/mysql/order.go` (UnitCredential section — same file, search for `UnitCredentialRepo`)

---

- [ ] **2.1 — Add `ExpiresAt` to `UnitCredentialEntity`**

In `apps/api/internal/repository/mysql/entity.go`, update `UnitCredentialEntity`:

```go
type UnitCredentialEntity struct {
	ID            uint      `gorm:"primaryKey"`
	EmergencyUUID string    `gorm:"type:char(36);uniqueIndex;not null"`
	UnitName      string    `gorm:"type:varchar(255)"`
	Username      string    `gorm:"type:varchar(100);uniqueIndex;not null"`
	PasswordHash  string    `gorm:"type:varchar(255);not null"`
	AccessToken   string    `gorm:"type:char(36);index;not null"`
	ExpiresAt     time.Time `gorm:"not null;index"`   // ← new
	CreatedAt     time.Time `gorm:"autoCreateTime"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime"`
}
```

- [ ] **2.2 — Add compound index to migrate.go**

`AutoMigrate` adds the `expires_at` column and `index` from the tag automatically. But add the compound index for the hot `FindByToken` path in `apps/api/internal/repository/mysql/migrate.go`, after the `AutoMigrate` call:

```go
func Migrate(db *gorm.DB) error {
	dropEmergencyDistrictFK(db)

	if err := db.AutoMigrate(
		// ... existing list unchanged ...
	); err != nil {
		return err
	}
	backfillOrderPublicTokens(db)
	backfillUnitTokenExpiry(db)      // ← add
	addCompoundIndexes(db)           // ← add
	return nil
}

// backfillUnitTokenExpiry sets expires_at = NOW() + 30 days for any
// existing tokens that have the zero-time default after the column is added.
func backfillUnitTokenExpiry(db *gorm.DB) {
	_ = db.Exec(
		`UPDATE unit_credential_entity SET expires_at = DATE_ADD(updated_at, INTERVAL 30 DAY)
		 WHERE expires_at = '0001-01-01 00:00:00' OR expires_at IS NULL`,
	).Error
}

// addCompoundIndexes adds composite indexes that GORM AutoMigrate cannot express
// via struct tags alone.
func addCompoundIndexes(db *gorm.DB) {
	type idx struct{ table, name, cols string }
	indexes := []idx{
		{"order_ticket_entity", "idx_unit_status", "(emergency_uuid, status)"},
		{"dispatch_attempt_entity", "idx_order_status", "(order_id, status)"},
		{"order_event_entity", "idx_order_time", "(order_id, created_at)"},
	}
	for _, ix := range indexes {
		_ = db.Exec(
			`CREATE INDEX IF NOT EXISTS `+ix.name+` ON `+ix.table+` `+ix.cols,
		).Error
	}
	// Push subscription: one endpoint per ticket (dedup).
	_ = db.Exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS ux_push_endpoint ON push_subscription_entity (endpoint(500))`,
	).Error
	// Assessment indicator: (template_id, code) must be unique.
	_ = db.Exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS ux_indicator_tpl_code ON assessment_indicator_entity (template_id, code)`,
	).Error
}
```

> Note: MySQL does not support `IF NOT EXISTS` for `CREATE INDEX` before 8.0.16. If you are on an older version, wrap each Exec in a check:
> ```go
> db.Exec(`SELECT 1 FROM information_schema.statistics WHERE table_name='order_ticket_entity' AND index_name='idx_unit_status'`).RowsAffected == 0
> ```
> But for 8.0.16+ (most modern setups) `IF NOT EXISTS` works.

- [ ] **2.3 — Find the UnitCredential repository file**

```bash
grep -n "FindByToken\|UnitCredentialRepo\|func.*Login" \
  apps/api/internal/repository/mysql/order.go | head -20
```

The `UnitCredentialRepo` lives in `apps/api/internal/repository/mysql/order.go` (same file as OrderRepo). Find the `FindByToken` method.

- [ ] **2.4 — Update `FindByToken` to filter expired tokens**

Locate `func (r *UnitCredentialRepo) FindByToken` in the mysql repo and add the expiry guard:

```go
func (r *UnitCredentialRepo) FindByToken(token string) (*domain.UnitCredential, error) {
	var row UnitCredentialEntity
	err := r.db.
		Where("access_token = ? AND expires_at > ?", token, time.Now()).
		First(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, repository.ErrNotFound
		}
		return nil, err
	}
	// Extend TTL on each use (rolling 30-day window).
	_ = r.db.Model(&row).Update("expires_at", time.Now().Add(30*24*time.Hour))
	return mapUnitCredential(row), nil
}
```

- [ ] **2.5 — Set `ExpiresAt` on credential creation / update**

Locate `func (r *UnitCredentialRepo) Set` and add the expiry:

```go
func (r *UnitCredentialRepo) Set(cred domain.UnitCredential) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(cred.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	row := UnitCredentialEntity{
		EmergencyUUID: cred.EmergencyUUID,
		UnitName:      cred.UnitName,
		Username:      cred.Username,
		PasswordHash:  string(hash),
		AccessToken:   uuid.New().String(),
		ExpiresAt:     time.Now().Add(30 * 24 * time.Hour),  // ← add
	}
	return r.db.
		Where(UnitCredentialEntity{EmergencyUUID: cred.EmergencyUUID}).
		Assign(row).
		FirstOrCreate(&row).Error
}
```

- [ ] **2.6 — Verify it compiles**

```bash
cd apps/api && go build ./...
```

Expected: no errors.

- [ ] **2.7 — Commit**

```bash
git add apps/api/internal/repository/mysql/entity.go \
        apps/api/internal/repository/mysql/migrate.go \
        apps/api/internal/repository/mysql/order.go
git commit -m "feat: add 30-day rolling TTL to unit access tokens

Tokens now expire after 30 days of inactivity and are automatically
extended on each successful auth. Existing tokens are backfilled to
updated_at + 30 days on the next startup migration."
```

---

## Task 3 — Startup SLA recovery

**Goal:** When the API restarts, any ticket whose `sla_deadline` is already in the past gets escalated immediately — before the 15-second ticker has a chance to fire.

**Why it matters:** A restart during peak hours could leave pending SOS tickets unescalated for up to 15 seconds (or until the next tick). The fix is one extra call at startup.

**Files:**
- Modify: `apps/api/internal/service/escalation_worker.go`
- Modify: `apps/api/cmd/main.go`

---

- [ ] **3.1 — Add `RecoverOverdue` to `EscalationWorker`**

In `apps/api/internal/service/escalation_worker.go`, add a startup recovery method:

```go
package service

import (
	"context"
	"log"
	"time"
)

// EscalationWorker periodically reassigns SOS tickets that missed their SLA.
type EscalationWorker struct {
	dispatch DispatchUseCase
	interval time.Duration
}

func NewEscalationWorker(dispatch DispatchUseCase, interval time.Duration) *EscalationWorker {
	if interval <= 0 {
		interval = 15 * time.Second
	}
	return &EscalationWorker{dispatch: dispatch, interval: interval}
}

// RecoverOverdue escalates any tickets already past SLA at startup.
// Call this once before Start.
func (w *EscalationWorker) RecoverOverdue() {
	if w.dispatch == nil {
		return
	}
	n, err := w.dispatch.EscalateOverdue()
	if err != nil {
		log.Printf("dispatch escalation recovery error: %v", err)
		return
	}
	if n > 0 {
		log.Printf("dispatch escalation recovery: escalated %d overdue ticket(s) at startup", n)
	}
}

// Start runs until ctx is cancelled. Safe to call in a goroutine.
func (w *EscalationWorker) Start(ctx context.Context) {
	if w.dispatch == nil {
		return
	}
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()
	log.Printf("dispatch escalation worker started (interval=%s)", w.interval)

	for {
		select {
		case <-ctx.Done():
			log.Println("dispatch escalation worker stopped")
			return
		case <-ticker.C:
			n, err := w.dispatch.EscalateOverdue()
			if err != nil {
				log.Printf("dispatch escalation error: %v", err)
				continue
			}
			if n > 0 {
				log.Printf("dispatch escalation: reassigned %d ticket(s)", n)
			}
		}
	}
}
```

- [ ] **3.2 — Call `RecoverOverdue` before starting the goroutine**

In `apps/api/cmd/main.go`, find the escalation worker start block (currently around line 191):

```go
// Before:
go service.NewEscalationWorker(dispatchSvc, 15*time.Second).Start(workerCtx)

// After:
escalationWorker := service.NewEscalationWorker(dispatchSvc, 15*time.Second)
escalationWorker.RecoverOverdue()
go escalationWorker.Start(workerCtx)
```

- [ ] **3.3 — Verify it compiles**

```bash
cd apps/api && go build ./...
```

Expected: no errors.

- [ ] **3.4 — Commit**

```bash
git add apps/api/internal/service/escalation_worker.go \
        apps/api/cmd/main.go
git commit -m "feat: escalate overdue SOS tickets on startup

On restart, any ticket whose sla_deadline is already past is escalated
immediately before the 15s ticker starts, closing the deploy-window
blind spot."
```

---

## Task 4 — DB indexes and push/assessment dedup

**Goal:** Add the compound indexes and uniqueness constraints identified in the DB review.

This task is already handled as part of Task 2 (`addCompoundIndexes` in `migrate.go`). If Task 2 was completed, this task is done.

- [ ] **4.1 — Verify indexes were added**

After starting the API once against a real MySQL instance:

```sql
SHOW INDEX FROM order_ticket_entity      WHERE Key_name = 'idx_unit_status';
SHOW INDEX FROM dispatch_attempt_entity  WHERE Key_name = 'idx_order_status';
SHOW INDEX FROM order_event_entity       WHERE Key_name = 'idx_order_time';
SHOW INDEX FROM push_subscription_entity WHERE Key_name = 'ux_push_endpoint';
SHOW INDEX FROM assessment_indicator_entity WHERE Key_name = 'ux_indicator_tpl_code';
```

Expected: each query returns one row.

---

## Task 5 — Frontend type safety

**Goal:** Kill `any[]` in Pinia stores and `$fetch` calls. Extend `packages/types` and `packages/api-client` to cover the main domain shapes. The dashboard uses the shared types.

**Note:** This is a large surface area. The goal is not 100% coverage on day one — it's to eliminate the `any` on the types that are read most often (orders, emergencies, unit credentials). Do it incrementally.

**Files:**
- Modify: `packages/types/src/index.ts` (or create if not exists)
- Modify: `packages/api-client/src/index.ts`
- Modify: `apps/web-app/stores/emergency.ts`
- Modify: `apps/dashboard/composables/useApi.ts`

---

- [ ] **5.1 — Check current packages/types content**

```bash
ls packages/types/src/
cat packages/types/src/index.ts
```

Note what types already exist and what is missing.

- [ ] **5.2 — Add core domain types to `packages/types`**

In `packages/types/src/index.ts`, add (or extend) these types that match the Go domain structs:

```typescript
export interface EmergencyType {
  id: number
  name: string
  icon: string
  description?: string
}

export interface Address {
  district_id: string
  district: string
  regency_id: string
  regency: string
  province_id: string
  province: string
  full_address: string
}

export interface Contact {
  email?: string
  phone?: string
  whatsapp?: string
}

export interface FleetStatus {
  total: number
  available: number
}

export interface OperationalStatus {
  is_active: boolean
  is_24_hours: boolean
  open_time: string
  close_time: string
}

export interface Emergency {
  id: string
  name: string
  organization_name: string
  organization_type: string
  organization_logo?: string
  description?: string
  coordinates: [string, string]
  type_of_service?: string
  tipe_emergency?: string[]
  is_dispatcher: boolean
  is_province_dispatcher: boolean
  partner_tier: string
  dashboard_access: boolean
  wa_dispatch?: boolean
  readiness: {
    trained_driver: boolean
    has_oxygen: boolean
    has_stretcher: boolean
    equipment_notes?: string
  }
  emergency_type: EmergencyType
  address: Address
  contact: Contact
  operational: OperationalStatus
  fleet: FleetStatus
}

export interface OrderAssessment {
  acuity: string
  answers: Record<string, string>
}

export interface OrderTicket {
  id: string
  ticket_number: string
  emergency_uuid: string
  unit_name: string
  requester_name: string
  requester_phone: string
  jenis_pelayanan?: string
  location: string
  condition: string
  assessment?: OrderAssessment
  assessment_acuity?: string
  photo_url?: string
  requester_lat: number
  requester_lng: number
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  source: 'call' | 'sos' | 'manual'
  handler_name?: string
  handling_notes?: string
  type_id?: number
  regency_id?: string
  province_id?: string
  dispatch_round?: number
  sla_deadline?: string
  dispatch_status?: string
  escalation_hotline?: string
  escalation_label?: string
  track_token?: string
  public_token?: string
  track_enabled_at?: string
  track_expires_at?: string
  responder_lat?: number
  responder_lng?: number
  responder_updated_at?: string
  arrived_at?: string
  unit_phone?: string
  unit_whatsapp?: string
  unit_lat?: number
  unit_lng?: number
  eta_minutes?: number
  wa_dispatch?: boolean
  citizen_phase?: string
  accepted_at?: string
  completed_at?: string
  created_at: string
  referral_hospital_id?: string
  referral_hospital_name?: string
  has_incident_report: boolean
  incident_report?: unknown
  incident_report_at?: string
  history?: OrderEvent[]
}

export interface OrderEvent {
  id: string
  order_id: string
  ticket_number: string
  type: string
  message: string
  actor: string
  from_unit?: string
  to_unit?: string
  dispatch_tier?: string
  created_at: string
}

export interface UnitCredential {
  emergency_uuid: string
  unit_name: string
  username: string
  access_token: string
}

export interface ApiError {
  message: string
  status: number
}

export interface AvailableRegion {
  id: string
  name: string
  regency_id: string
  latitude?: number
  longitude?: number
}

export interface Province {
  id: string
  name: string
}

export interface Regency {
  id: string
  province_id: string
  name: string
}
```

- [ ] **5.3 — Update Pinia store to use typed Emergency**

In `apps/web-app/stores/emergency.ts`:

```typescript
import type { Emergency } from "@butuhbantuan/types"

export const useEmergencyStore = defineStore("emergency", {
  state: () => ({
    filteredEmergency: [] as Emergency[],
    selectedEmergency: null as Emergency | null,
    isLoading: false,
    isCovered: false,
    coverageChecked: false,
    lastRegionName: "" as string,
  }),
  actions: {
    setFilteredEmergency(data: Emergency[]) { this.filteredEmergency = data; },
    setSelectedEmergency(data: Emergency | null) { this.selectedEmergency = data; },
    setLoading(v: boolean) { this.isLoading = v; },
    setCoverage(v: boolean) {
      this.isCovered = v;
      this.coverageChecked = true;
    },
    setLastRegionName(name: string) { this.lastRegionName = name; },
  },
});
```

- [ ] **5.4 — Update `packages/api-client` to export typed helpers**

In `packages/api-client/src/index.ts`, re-export types and add typed methods for the most common dashboard calls:

```typescript
export * from "./client"
export * from "./emergency"
export * from "./sos"
export type { Emergency, OrderTicket, OrderEvent, UnitCredential, ApiError, AvailableRegion, Province, Regency } from "@butuhbantuan/types"
```

- [ ] **5.5 — Add return types to dashboard `useApi.ts`**

In `apps/dashboard/composables/useApi.ts`, generic type parameters already exist on the method signatures (`get<T>`, `post<T>`). The issue is callers pass `any`. At each call site, replace `any` with the correct imported type. Start with the most common — for example in the orders page:

```typescript
// Before:
const orders = await api.authGet<any>('/admin/orders')

// After:
import type { OrderTicket } from '@butuhbantuan/types'
const orders = await api.authGet<OrderTicket[]>('/admin/orders')
```

Do this incrementally per page — there is no need to fix every call site in this task. The scaffolding is in place.

- [ ] **5.6 — Verify typecheck passes**

```bash
cd apps/web-app && pnpm typecheck
cd apps/dashboard && pnpm typecheck
```

Fix any type errors that surface.

- [ ] **5.7 — Commit**

```bash
git add packages/types/src/ \
        packages/api-client/src/ \
        apps/web-app/stores/emergency.ts \
        apps/dashboard/composables/useApi.ts
git commit -m "feat: add shared domain types and wire into Pinia stores

Adds Emergency, OrderTicket, OrderEvent, UnitCredential types to
packages/types. Removes any[] from useEmergencyStore. Dashboard
useApi.ts retains generic signatures for incremental per-call typing."
```

---

## Task 6 — Move seed data out of domain

**Goal:** `ambulance_compliance_seed.go` and `ambulance_compliance_seed_extra.go` are in `internal/domain/`. They belong in `cmd/seed/` or alongside `main.go` where the rest of the seed logic lives.

**Files:**
- Delete: `apps/api/internal/domain/ambulance_compliance_seed.go`
- Delete: `apps/api/internal/domain/ambulance_compliance_seed_extra.go`
- Create: `apps/api/internal/domain/ambulance_compliance_defaults.go` (keep only the pure domain data the rest of the domain package uses)

---

- [ ] **6.1 — Check what the seed files export**

```bash
grep -n "^func\|^var\|^type" \
  apps/api/internal/domain/ambulance_compliance_seed.go \
  apps/api/internal/domain/ambulance_compliance_seed_extra.go
```

Note which symbols are used by other files inside the `domain` package vs. only by `cmd/main.go` or the service layer.

- [ ] **6.2 — Check usages**

```bash
grep -rn "DefaultComplianceCategories\|DefaultComplianceItems\|SeedAmbulance\|DefaultCompliance" \
  apps/api/ --include="*.go"
```

Identify which callers are outside the `domain` package. Move only the functions needed outside; constants used only within domain stay.

- [ ] **6.3 — Move logic to assessment repo or service**

If `EnsureDefaultTemplates` (which lives in `AssessmentRepo`) calls constants from the seed files, those constants can stay in domain. If functions are called only from `mysqlrepo`, move them there. If called only from `main.go`, inline them in `cmd/main.go`.

Exact move depends on what step 6.1 reveals. The principle: `domain/` should contain no code that references infra or seeding logic — only types, constants, and pure functions.

- [ ] **6.4 — Verify**

```bash
cd apps/api && go build ./...
cd apps/api && go test ./internal/domain/...
```

Expected: no errors.

- [ ] **6.5 — Commit**

```bash
git add apps/api/internal/domain/ apps/api/cmd/
git commit -m "refactor: move ambulance compliance seed data out of domain package"
```

---

## Execution Order

Run tasks in this order — each is independently committable:

```
Task 1 (hospital interface) → Task 2 (token expiry + DB indexes) → Task 3 (startup recovery) → Task 4 (verify indexes) → Task 5 (frontend types) → Task 6 (seed cleanup)
```

Tasks 1–4 are pure backend. Task 5 is pure frontend. Task 6 is housekeeping. They do not depend on each other and can be done in parallel if desired.
