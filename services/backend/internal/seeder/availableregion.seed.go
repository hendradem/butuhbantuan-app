package seeder

import (
	"butuhbantuan/internal/model/entity"
	"butuhbantuan/pkg/database"
	"fmt"

	"github.com/google/uuid"
)

var availableServiceSeed = []entity.AvailableServiceCity{
	{
		UUID:      uuid.New(),
		Name:      "Kabupaten Sleman",
		RegencyID: "3404",
		Latitude:  -7.6893463,
		Longitude: 110.2164617,
	},
	{
		UUID:      uuid.New(),
		Name:      "Kabupaten Bantul",
		RegencyID: "3402",
		Latitude:  -7.8978176,
		Longitude: 110.1979432,
	},
	{
		UUID:      uuid.New(),
		Name:      "Kabupaten Kulon Progo",
		RegencyID: "3401",
		Latitude:  -7.8121219,
		Longitude: 109.9793257,
	},
	{
		UUID:      uuid.New(),
		Name:      "Kabupaten Gunungkidul",
		RegencyID: "3403",
		Latitude:  -7.9920367,
		Longitude: 109.9579521,
	},
	{
		UUID:      uuid.New(),
		Name:      "Kota Yogyakarta",
		RegencyID: "3471",
		Latitude:  -7.8031634,
		Longitude: 110.3336451,
	},
}

func SeedAvailableRegion() error {
	for _, e := range availableServiceSeed {
		availableService := e
		migrate := database.DB.FirstOrCreate(&availableService, entity.AvailableServiceCity{Name: e.Name})

		if migrate.Error != nil {
			return fmt.Errorf("failed to seed available service '%s': %w", e.Name, migrate.Error)
		}

		fmt.Println("✅ Service seeded for:", availableService.Name)
	}

	fmt.Println("✅ All Available Regions Seeded")
	return nil
}
