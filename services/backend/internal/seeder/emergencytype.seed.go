package seeder

import (
	"butuhbantuan/internal/model/entity"
	"butuhbantuan/pkg/database"
	"fmt"
	"time"

	"github.com/google/uuid"
)

var types = []entity.EmergencyType{
	{
		UUID:        uuid.New(),
		Name:        "Ambulance",
		Description: "Layanan ambulance gawat darurat",
		Icon:        "mynaui:ambulance-solid",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	},
	{
		UUID:        uuid.New(),
		Name:        "Damkar",
		Description: "Layanan pemadam kebakaran",
		Icon:        "mdi:fire-truck",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	},
	{
		UUID:        uuid.New(),
		Name:        "SAR",
		Description: "Search and Rescue (pencarian dan penyelamatan)",
		Icon:        "fa-solid:car-crash",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	},
}

func SeedEmergencyTypes() error {

	db := database.DB

	for _, t := range types {
		if err := db.FirstOrCreate(&t, entity.EmergencyType{Name: t.Name}).Error; err != nil {
			return fmt.Errorf("failed to seed emergency type '%s': %w", t.Name, err)
		}
		fmt.Println("✅ Seeded emergency type:", t.Name)
	}

	fmt.Println("✅ Emergency Types Seeded")
	return nil
}
