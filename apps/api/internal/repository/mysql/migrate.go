package mysqlrepo

import (
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&Province{},
		&Regency{},
		&District{},
		&EmergencyTypeEntity{},
		&EmergencyEntity{},
		&AvailableServiceCityEntity{},
	)
}

func NamingStrategy() schema.NamingStrategy {
	return schema.NamingStrategy{SingularTable: true}
}
