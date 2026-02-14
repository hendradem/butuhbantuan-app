package entity

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AvailableServiceCity struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UUID      uuid.UUID `json:"uuid" gorm:"type:char(36);uniqueIndex;not null"`
	Name      string    `json:"name" gorm:"type:varchar(255);not null"`
	RegencyID string    `gorm:"type:varchar(191);not null" json:"regency_id"`
	Regency   Regency   `gorm:"foreignKey:RegencyID;references:ID" json:"regency"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (e *AvailableServiceCity) BeforeCreate(tx *gorm.DB) (err error) {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return
}
