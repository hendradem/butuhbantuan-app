package database

import (
	"log"
	"time"

	mysqlrepo "github.com/butuhbantuan/api/internal/repository/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		NamingStrategy: mysqlrepo.NamingStrategy(),
		Logger:         logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	log.Println("connected to mysql")

	if err := mysqlrepo.Migrate(db); err != nil {
		return nil, err
	}

	log.Println("database migrated")
	return db, nil
}
