package entity

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Emergency struct {
	ID               uint          `gorm:"primaryKey" json:"-"`
	UUID             uuid.UUID     `json:"uuid" gorm:"type:char(36);uniqueIndex;not null"`
	Name             string        `json:"name" gorm:"type:varchar(255);not null"`
	OrganizationName string        `json:"organization_name" gorm:"type:varchar(255);not null"`
	OrganizationType string        `json:"organization_type" gorm:"type:varchar(255)"`
	EmergencyTypeID  uint          `json:"emergency_type_id" gorm:"not null"`
	EmergencyType    EmergencyType `gorm:"foreignKey:EmergencyTypeID" json:"emergency_type"`

	Description      string `json:"description" gorm:"type:text"`
	IsVerified       bool   `json:"is_verified" gorm:"type:tinyint(1);default:0"`
	OrganizationLogo string `json:"organization_logo" gorm:"type:varchar(255)"`

	Latitude  string `json:"latitude" gorm:"type:varchar(50)"`
	Longitude string `json:"longitude" gorm:"type:varchar(50)"`

	Email    string `json:"email" gorm:"type:varchar(255)"`
	Phone    string `json:"phone" gorm:"type:varchar(50)"`
	Whatsapp string `json:"whatsapp" gorm:"type:varchar(50)"`

	DistrictID string   `gorm:"type:varchar(191);not null" json:"district_id"`
	District   District `gorm:"foreignKey:DistrictID;references:ID" json:"district"`

	RegencyID string  `gorm:"type:varchar(191);not null" json:"regency_id"`
	Regency   Regency `gorm:"foreignKey:RegencyID;references:ID" json:"regency"`

	ProvinceID string   `gorm:"type:varchar(191);not null" json:"province_id"`
	Province   Province `gorm:"foreignKey:ProvinceID;references:ID" json:"province"`

	FullAddress          string `json:"full_address" gorm:"type:text"`
	TypeOfService        string `json:"type_of_service" gorm:"type:longtext"`
	IsDispatcher         bool   `json:"is_dispatcher" gorm:"type:tinyint(1);default:0"`
	IsProvinceDispatcher bool   `json:"is_province_dispatcher" gorm:"type:tinyint(1);default:0"`

	CreatedAt time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (e *Emergency) BeforeCreate(tx *gorm.DB) (err error) {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return
}

type EmergencyType struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UUID        uuid.UUID `json:"-" gorm:"type:char(36);uniqueIndex;not null"`
	Name        string    `json:"name" gorm:"type:varchar(255);not null"`
	Description string    `json:"description" gorm:"type:varchar(255)"`
	Icon        string    `json:"icon" gorm:"type:varchar(255)"`

	Emergencies []Emergency `gorm:"foreignKey:EmergencyTypeID" json:"-"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (e *EmergencyType) BeforeCreate(tx *gorm.DB) (err error) {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return
}
