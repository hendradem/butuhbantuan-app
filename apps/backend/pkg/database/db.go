package database

import (
	"butuhbantuan/internal/model/entity"
	"butuhbantuan/pkg/config"
	"fmt"
	"log"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

var DB *gorm.DB

func InitDB() *gorm.DB {
	var err error
	config.LoadEnv()
	db := config.GetEnv("DB", "null")
	dsn := db
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: true,
		},
	})

	if err != nil {
		panic("failed to connect database")
	}

	if DB != nil {
		fmt.Println("connected to database")
		RunMigrations()
	}

	return DB
}

func RunMigrations() {
	err := DB.AutoMigrate(
		&entity.Emergency{},
		&entity.EmergencyType{},
		&entity.AvailableServiceCity{},
		&entity.Province{},
		&entity.Regency{},
		&entity.District{},
	)

	if err != nil {
		log.Fatal("failed to migrate database", err)
	}

	fmt.Println("database migrated")
}
