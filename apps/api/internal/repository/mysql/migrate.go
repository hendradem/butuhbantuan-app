package mysqlrepo

import (
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

func Migrate(db *gorm.DB) error {
	// Drop any FK constraints on emergency.district_id so empty district is allowed.
	dropEmergencyDistrictFK(db)

	return db.AutoMigrate(
		&Province{},
		&Regency{},
		&District{},
		&EmergencyTypeEntity{},
		&EmergencyEntity{},
		&AvailableServiceCityEntity{},
		&FeedbackEntity{},
		&OrderTicketEntity{},
		&UnitCredentialEntity{},
		&SOSAlertEntity{},
		&PushSubscriptionEntity{},
	)
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

func NamingStrategy() schema.NamingStrategy {
	return schema.NamingStrategy{SingularTable: true}
}
