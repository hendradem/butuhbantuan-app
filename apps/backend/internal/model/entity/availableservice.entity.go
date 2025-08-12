package entity

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AvailableServiceCity struct {
	ID                   uint           `json:"id" gorm:"primaryKey"`
	UUID                 uuid.UUID      `json:"uuid" gorm:"type:char(36); uniqueIndex; not null"`
	CityName             string         `json:"city_name" gorm:"type:varchar(255); not null"`
	Province             string         `json:"province" gorm:"type:varchar(255); not null"`
	ContactCenter        string         `json:"contact_center" gorm:"type:varchar(255); not null"`
	VolunteerCoordinator string         `json:"volunteer_coordinator" gorm:"type:varchar(255); not null"`
	IsActive             bool           `json:"is_active" gorm:"type:tinyint(1); default:0"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
	DeletedAt            gorm.DeletedAt `gorm:"index" json:"deleted_at"`
}

func (e *AvailableServiceCity) BeforeCreate(tx *gorm.DB) (err error) {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return
}
