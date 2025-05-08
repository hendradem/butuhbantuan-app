package database

import (
	"butuhbantuan/internal/model/entity"
	"fmt"
	"log"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

var DB *gorm.DB

var emergencySeed = []entity.Emergency{
	{
		Name:             "Ambulance Bali",
		OrganizationName: "Bali Emergency Health Services",
		OrganizationType: "Private",
		Description:      "24/7 ambulance services across Bali.",
		IsVerified:       false,
		OrganizationLogo: "https://example.com/logo2.png",
		Latitude:         -7.7063,
		Longitude:        110.345,
		Email:            "ambulance@balihealth.com",
		Phone:            "036123456",
		Whatsapp:         "6289876543210",
		District:         "Denpasar",
		Regency:          "Denpasar",
		Province:         "Bali",
		FullAddress:      "Jl. Sunset Road No.88, Denpasar",
		TypeOfService:    "Medical Emergency",
	},
	{
		Name:             "PMI Sleman",
		OrganizationName: "Bali Emergency Health Services",
		OrganizationType: "Private",
		Description:      "24/7 ambulance services across Bali.",
		IsVerified:       false,
		OrganizationLogo: "https://example.com/logo2.png",
		Latitude:         -7.7186,
		Longitude:        110.3539,
		Email:            "sleman@pmi.com",
		Phone:            "036123459",
		Whatsapp:         "6289876543211",
		District:         "Denpasar",
		Regency:          "Sleman",
		Province:         "DIY",
		FullAddress:      "Jl. Sunset Road No.88, Denpasar",
		TypeOfService:    "Medical Emergency",
	},
}

func InitDB() *gorm.DB {

	var err error

	dsn := "root:@tcp(127.0.0.1:3306)/butuhbantuan?charset=utf8mb4&parseTime=True&loc=Local"
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
	err := DB.AutoMigrate(&entity.Emergency{}, &entity.EmergencyType{})

	if err != nil {
		log.Fatal("failed to migrate database", err)
	}

	RunSeeder()
	fmt.Println("database migrated")
}

func RunSeeder() {
	for _, e := range emergencySeed {
		emergency := e
		migrate := DB.FirstOrCreate(&emergency, entity.Emergency{Name: e.Name})

		if migrate.Error != nil {
			log.Fatal("failed to migrate database", migrate.Error)
		}

		fmt.Println("data seeded:", emergency.Name)
	}
}
