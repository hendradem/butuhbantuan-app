package mysqlrepo

import (
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

func Migrate(db *gorm.DB) error {
	// Drop any FK constraints on emergency.district_id so empty district is allowed.
	dropEmergencyDistrictFK(db)

	if err := db.AutoMigrate(
		&Province{},
		&Regency{},
		&District{},
		&EmergencyTypeEntity{},
		&EmergencyEntity{},
		&HospitalMasterEntity{},
		&AvailableServiceCityEntity{},
		&FeedbackEntity{},
		&OrderTicketEntity{},
		&UnitCredentialEntity{},
		&SOSAlertEntity{},
		&PushSubscriptionEntity{},
		&DispatchAttemptEntity{},
		&OrderEventEntity{},
		&MapTileUsageEntity{},
		&AssessmentTemplateEntity{},
		&AssessmentIndicatorEntity{},
		&AssessmentTemplateBindingEntity{},
		&AssessmentJenisBindingEntity{},
	); err != nil {
		return err
	}
	backfillOrderPublicTokens(db)
	backfillUnitTokenExpiry(db)
	addCompoundIndexes(db)
	return nil
}

func backfillOrderPublicTokens(db *gorm.DB) {
	_ = db.Exec(
		`UPDATE order_ticket_entity SET public_token = UUID() WHERE public_token IS NULL OR public_token = ''`,
	).Error
}

// backfillUnitTokenExpiry sets expires_at = updated_at + 30 days for any
// existing rows that have the zero-time default after the column is added.
func backfillUnitTokenExpiry(db *gorm.DB) {
	_ = db.Exec(
		`UPDATE unit_credential_entity SET expires_at = DATE_ADD(updated_at, INTERVAL 30 DAY)
		 WHERE expires_at <= '1000-01-01 00:00:00' OR expires_at IS NULL`,
	).Error
}

// addCompoundIndexes adds composite indexes and uniqueness constraints that
// GORM AutoMigrate cannot express via struct tags alone.
func addCompoundIndexes(db *gorm.DB) {
	type idx struct{ table, name, cols string }
	indexes := []idx{
		{"order_ticket_entity", "idx_unit_status", "(emergency_uuid, status)"},
		{"dispatch_attempt_entity", "idx_order_status", "(order_id, status)"},
		{"order_event_entity", "idx_order_time", "(order_id, created_at)"},
	}
	for _, ix := range indexes {
		_ = db.Exec(
			`CREATE INDEX IF NOT EXISTS ` + ix.name + ` ON ` + ix.table + ` ` + ix.cols,
		).Error
	}
	_ = db.Exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS ux_push_endpoint ON push_subscription_entity (endpoint(500))`,
	).Error
	_ = db.Exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS ux_indicator_tpl_code ON assessment_indicator_entity (template_id, code)`,
	).Error
}

// dropEmergencyDistrictFK looks up and drops any FK constraint on the
// emergency table's district_id column so rows without a district can be
// inserted without a constraint violation.
func dropEmergencyDistrictFK(db *gorm.DB) {
	type row struct {
		ConstraintName string `gorm:"column:CONSTRAINT_NAME"`
	}
	var fks []row
	db.Raw(`
		SELECT CONSTRAINT_NAME
		FROM information_schema.KEY_COLUMN_USAGE
		WHERE TABLE_SCHEMA = DATABASE()
		  AND TABLE_NAME   = 'emergency_entity'
		  AND COLUMN_NAME  = 'district_id'
		  AND REFERENCED_TABLE_NAME IS NOT NULL
	`).Scan(&fks)
	for _, fk := range fks {
		db.Exec("ALTER TABLE `emergency_entity` DROP FOREIGN KEY `" + fk.ConstraintName + "`")
	}
}

// BackfillUnitNames populates unit_name in credentials and orders where it is
// still empty. This is idempotent and runs once on every server start so that
// records created before unit_name was introduced are healed automatically.
func BackfillUnitNames(db *gorm.DB) {
	// Credentials: resolve name from emergency entity by UUID
	db.Exec(`
		UPDATE unit_credential_entity uc
		JOIN emergency_entity e ON e.uuid = uc.emergency_uuid AND e.deleted_at IS NULL
		SET uc.unit_name = e.name
		WHERE uc.unit_name = '' OR uc.unit_name IS NULL
	`)

	// Orders: resolve name from emergency entity by UUID
	db.Exec(`
		UPDATE order_ticket_entity ot
		JOIN emergency_entity e ON e.uuid = ot.emergency_uuid AND e.deleted_at IS NULL
		SET ot.unit_name = e.name
		WHERE ot.unit_name = '' OR ot.unit_name IS NULL
	`)
}

// BackfillWaOnlyDashboardFlag aligns dashboard_access with units that have no login.
// Idempotent — only flips rows still marked dashboard when no credential exists.
func BackfillWaOnlyDashboardFlag(db *gorm.DB) {
	db.Exec(`
		UPDATE emergency_entity e
		LEFT JOIN unit_credential_entity uc ON uc.emergency_uuid = e.uuid
		SET e.dashboard_access = 0
		WHERE e.deleted_at IS NULL
		  AND e.dashboard_access = 1
		  AND uc.id IS NULL
		  AND LOWER(COALESCE(e.organization_type, '')) NOT IN ('rumah_sakit', 'rs')
		  AND LOWER(COALESCE(e.organization_type, '')) NOT LIKE '%hospital%'
	`)
}

func NamingStrategy() schema.NamingStrategy {
	return schema.NamingStrategy{SingularTable: true}
}
