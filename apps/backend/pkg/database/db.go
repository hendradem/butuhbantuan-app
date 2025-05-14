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
		Name:             "PMI Kab. Sleman",
		OrganizationName: "Palang Merah Indonesia",
		OrganizationType: "Ambulance",
		Description:      "24/7",
		IsVerified:       true,
		OrganizationLogo: "https://res.cloudinary.com/djzrlqubf/image/upload/v1705744061/butuhbantuan/xteksibif5uschl27nbe.png",
		Latitude:         "-7.7063",
		Longitude:        "110.345",
		Email:            "sleman@pmi.com",
		Phone:            "02748689000",
		Whatsapp:         "085161131368",
		District:         "Tridadi",
		Regency:          "Sleman",
		Province:         "DIY",
		FullAddress:      "Jl. Dr. Radjiman, Sleman",
		TypeOfService:    "Emergency, Transport",
	},
	{
		Name:             "Ambulance MPD Peduli",
		OrganizationName: "MPD Peduli",
		OrganizationType: "Ambulance",
		Description:      "24/7",
		IsVerified:       true,
		OrganizationLogo: "https://res.cloudinary.com/djzrlqubf/image/upload/v1705744433/butuhbantuan/iicqfihmm4uocius8cbe.png",
		Latitude:         "-7.7607825",
		Longitude:        "110.3741967",
		Email:            "peduli@mpd.com",
		Phone:            "02748689030",
		Whatsapp:         "085161131348",
		District:         "Mlati",
		Regency:          "Sleman",
		Province:         "DIY",
		FullAddress:      "Jl. Pogung Raya, Mlati",
		TypeOfService:    "Emergency, Transport",
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
