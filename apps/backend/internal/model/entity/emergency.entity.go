package entity

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Emergency struct {
	ID               uint           `json:"id" gorm:"primaryKey"`
	UUID             uuid.UUID      `json:"uuid" gorm:"type:char(36); uniqueIndex; not null"`
	Name             string         `json:"name" gorm:"type:varchar(255); not null"`
	OrganizationName string         `json:"organization_name" gorm:"type:varchar(255); not null"`
	OrganizationType string         `json:"organization_type"`
	Description      string         `json:"description" gorm:"type:varchar(255)"`
	IsVerified       bool           `json:"is_verified"`
	OrganizationLogo string         `json:"organization_logo" gorm:"type:varchar(255); not null"`
	Latitude         float64        `json:"latitude"`
	Longitude        float64        `json:"longitude"`
	Email            string         `json:"email" gorm:"type:varchar(255); not null; unique"`
	Phone            string         `json:"phone" gorm:"unique; not null"`
	Whatsapp         string         `json:"whatsapp" gorm:"unique" `
	District         string         `json:"district"`
	Regency          string         `json:"regency"`
	Province         string         `json:"province"`
	FullAddress      string         `json:"full_address"`
	TypeOfService    string         `json:"type_of_service"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"deleted_at"`
}

func (e *Emergency) BeforeCreate(tx *gorm.DB) (err error) {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return
}

type EmergencyType struct {
	ID   uint      `json:"id" gorm:"primaryKey"`
	UUID uuid.UUID `json:"uuid" gorm:"type:char(36); uniqueIndex; not null"`
	Name string    `json:"name"`
}
