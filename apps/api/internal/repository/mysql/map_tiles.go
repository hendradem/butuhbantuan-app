package mysqlrepo

import (
	"errors"
	"time"

	"github.com/butuhbantuan/api/internal/repository"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// MapTileUsageEntity stores monthly Mapbox Static Tiles request counts.
type MapTileUsageEntity struct {
	ID        uint      `gorm:"primaryKey"`
	MonthKey  string    `gorm:"type:varchar(7);uniqueIndex;not null"` // YYYY-MM
	TileCount int64     `gorm:"not null;default:0"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

type MapTileUsageRepo struct{ db *gorm.DB }

func NewMapTileUsageRepo(db *gorm.DB) *MapTileUsageRepo {
	return &MapTileUsageRepo{db: db}
}

func (r *MapTileUsageRepo) GetMonth(monthKey string) (int64, error) {
	var row MapTileUsageEntity
	err := r.db.Where("month_key = ?", monthKey).First(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, nil
		}
		return 0, err
	}
	return row.TileCount, nil
}

func (r *MapTileUsageRepo) Increment(monthKey string, delta int64) (int64, error) {
	if delta <= 0 {
		return r.GetMonth(monthKey)
	}
	row := MapTileUsageEntity{MonthKey: monthKey, TileCount: delta}
	err := r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "month_key"}},
		DoUpdates: clause.Assignments(map[string]any{"tile_count": gorm.Expr("tile_count + ?", delta)}),
	}).Create(&row).Error
	if err != nil {
		return 0, err
	}
	return r.GetMonth(monthKey)
}

var _ repository.MapTileUsageRepository = (*MapTileUsageRepo)(nil)
