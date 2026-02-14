package seeder

import (
	"butuhbantuan/internal/model/entity"
	"butuhbantuan/pkg/database"
	"encoding/json"
	"fmt"
	"net/http"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func syncProvinces(db *gorm.DB) error {
	url := "https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json"

	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to fetch provinces: %w", err)
	}
	defer resp.Body.Close()

	var provinces []entity.Province
	if err := json.NewDecoder(resp.Body).Decode(&provinces); err != nil {
		return fmt.Errorf("failed to decode provinces: %w", err)
	}

	for _, province := range provinces {
		if err := db.Clauses(clause.OnConflict{UpdateAll: true}).Create(&province).Error; err != nil {
			return fmt.Errorf("failed to insert province %s: %w", province.ID, err)
		}
	}

	fmt.Println("✅ Provinces synced")
	return nil
}

func syncRegencies(db *gorm.DB) error {
	var provinces []entity.Province
	if err := db.Find(&provinces).Error; err != nil {
		return fmt.Errorf("failed to fetch provinces: %w", err)
	}

	for _, p := range provinces {
		url := fmt.Sprintf("https://www.emsifa.com/api-wilayah-indonesia/api/regencies/%s.json", p.ID)
		resp, err := http.Get(url)
		if err != nil {
			return fmt.Errorf("error fetching regencies for province %s: %w", p.ID, err)
		}
		defer resp.Body.Close()

		var regencies []entity.Regency
		if err := json.NewDecoder(resp.Body).Decode(&regencies); err != nil {
			return fmt.Errorf("failed to decode regencies for province %s: %w", p.ID, err)
		}

		for _, r := range regencies {
			if err := db.Clauses(clause.OnConflict{UpdateAll: true}).Create(&r).Error; err != nil {
				return fmt.Errorf("failed to insert regency %s: %w", r.ID, err)
			}
		}
	}

	fmt.Println("✅ Regencies synced")
	return nil
}

func syncDistricts(db *gorm.DB) error {
	var regencies []entity.Regency
	if err := db.Find(&regencies).Error; err != nil {
		return fmt.Errorf("failed to fetch regencies: %w", err)
	}

	for _, r := range regencies {
		url := fmt.Sprintf("https://www.emsifa.com/api-wilayah-indonesia/api/districts/%s.json", r.ID)
		resp, err := http.Get(url)
		if err != nil {
			return fmt.Errorf("error fetching districts for regency %s: %w", r.ID, err)
		}
		defer resp.Body.Close()

		var districts []entity.District
		if err := json.NewDecoder(resp.Body).Decode(&districts); err != nil {
			return fmt.Errorf("failed to decode districts for regency %s: %w", r.ID, err)
		}

		for _, d := range districts {
			if err := db.Clauses(clause.OnConflict{UpdateAll: true}).Create(&d).Error; err != nil {
				return fmt.Errorf("failed to insert district %s: %w", d.ID, err)
			}
		}
	}

	fmt.Println("✅ Districts synced")
	return nil
}

func SeedRegion() error {
	db := database.InitDB()
	if err := syncProvinces(db); err != nil {
		return err
	}
	if err := syncRegencies(db); err != nil {
		return err
	}
	if err := syncDistricts(db); err != nil {
		return err
	}

	fmt.Println("✅ All Regions Seeded")
	return nil
}
