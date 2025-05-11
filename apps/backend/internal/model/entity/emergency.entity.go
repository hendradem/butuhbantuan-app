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
	OrganizationType string         `json:"organization_type" gorm:"type:varchar(255); not null"`
	Description      string         `json:"description" gorm:"type:varchar(255); not null"`
	IsVerified       bool           `json:"is_verified" gorm:"type:tinyint(1); default:0"`
	OrganizationLogo string         `json:"organization_logo" gorm:"type:varchar(255); not null"`
	Latitude         string         `json:"latitude" gorm:"type:varchar(255); not null"`
	Longitude        string         `json:"longitude" gorm:"type:varchar(255); not null"`
	Email            string         `json:"email" gorm:"type:varchar(255); not null; unique"`
	Phone            string         `json:"phone" gorm:"unique; not null"`
	Whatsapp         string         `json:"whatsapp" gorm:"unique; not null" `
	District         string         `json:"district" gorm:"type:varchar(255); not null"`
	Regency          string         `json:"regency" gorm:"type:varchar(255); not null"`
	Province         string         `json:"province" gorm:"type:varchar(255); not null"`
	FullAddress      string         `json:"full_address" gorm:"type:varchar(255); not null"`
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
	ID          uint           `json:"id" gorm:"primaryKey"`
	UUID        uuid.UUID      `json:"uuid" gorm:"type:char(36); uniqueIndex; not null"`
	Name        string         `json:"name" gorm:"type:varchar(255)"`
	Description string         `json:"description" gorm:"type:varchar(255)"`
	IsActive    bool           `json:"is_active" gorm:"type:tinyint(1); default:0"`
	Icon        string         `json:"icon" gorm:"type:varchar(255)"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at"`
}

func (e *EmergencyType) BeforeCreate(tx *gorm.DB) (err error) {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return
}
