package mysqlrepo

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Province struct {
	ID   string `gorm:"primaryKey;size:10"`
	Name string `gorm:"type:varchar(255);not null"`
}

type Regency struct {
	ID         string   `gorm:"primaryKey;size:10"`
	ProvinceID string   `gorm:"size:10;not null;index"`
	Name       string   `gorm:"type:varchar(255);not null"`
	Province   Province `gorm:"foreignKey:ProvinceID;references:ID"`
}

type District struct {
	ID        string  `gorm:"primaryKey;size:10"`
	RegencyID string  `gorm:"size:10;not null;index"`
	Name      string  `gorm:"type:varchar(255);not null"`
	Regency   Regency `gorm:"foreignKey:RegencyID;references:ID"`
}

type EmergencyTypeEntity struct {
	ID          uint      `gorm:"primaryKey"`
	UUID        uuid.UUID `gorm:"type:char(36);uniqueIndex;not null"`
	Name        string    `gorm:"type:varchar(255);not null;uniqueIndex"`
	Description string    `gorm:"type:varchar(255)"`
	Icon        string    `gorm:"type:varchar(255)"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func (e *EmergencyTypeEntity) BeforeCreate(_ *gorm.DB) error {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return nil
}

type EmergencyEntity struct {
	ID                   uint                `gorm:"primaryKey"`
	UUID                 uuid.UUID           `gorm:"type:char(36);uniqueIndex;not null"`
	Name                 string              `gorm:"type:varchar(255);not null;index"`
	OrganizationName     string              `gorm:"type:varchar(255);not null"`
	OrganizationType     string              `gorm:"type:varchar(100)"`
	EmergencyTypeID      uint                `gorm:"not null;index"`
	EmergencyType        EmergencyTypeEntity `gorm:"foreignKey:EmergencyTypeID"`
	Description          string              `gorm:"type:text"`
	IsVerified           bool                `gorm:"type:tinyint(1);default:0"`
	IsActive             bool                `gorm:"type:tinyint(1);default:1;index"`
	OrganizationLogo     string              `gorm:"type:varchar(500)"`
	Latitude             float64             `gorm:"type:double;not null;default:0"` // was varchar — now DOUBLE for spatial queries
	Longitude            float64             `gorm:"type:double;not null;default:0"`
	DistrictID           string              `gorm:"type:varchar(10);not null"`
	District             District            `gorm:"foreignKey:DistrictID;references:ID"`
	RegencyID            string              `gorm:"type:varchar(10);not null;index"`
	Regency              Regency             `gorm:"foreignKey:RegencyID;references:ID"`
	ProvinceID           string              `gorm:"type:varchar(10);not null;index"`
	Province             Province            `gorm:"foreignKey:ProvinceID;references:ID"`
	FullAddress          string              `gorm:"type:text"`
	TypeOfService        string              `gorm:"type:varchar(500)"`
	Email                string              `gorm:"type:varchar(255)"`
	Phone                string              `gorm:"type:varchar(50)"`
	Whatsapp             string              `gorm:"type:varchar(50)"`
	IsDispatcher         bool                `gorm:"type:tinyint(1);default:0;index"`
	IsProvinceDispatcher bool                `gorm:"type:tinyint(1);default:0"`
	CreatedAt            time.Time           `gorm:"autoCreateTime"`
	UpdatedAt            time.Time           `gorm:"autoUpdateTime"`
	DeletedAt            gorm.DeletedAt      `gorm:"index"`
}

func (e *EmergencyEntity) BeforeCreate(_ *gorm.DB) error {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return nil
}

type AvailableServiceCityEntity struct {
	ID        uint      `gorm:"primaryKey"`
	UUID      uuid.UUID `gorm:"type:char(36);uniqueIndex;not null"`
	Name      string    `gorm:"type:varchar(255);not null"`
	RegencyID string    `gorm:"type:varchar(10);not null;uniqueIndex"` // one coverage entry per regency
	Regency   Regency   `gorm:"foreignKey:RegencyID;references:ID"`
	Latitude  float64   `gorm:"type:double"`
	Longitude float64   `gorm:"type:double"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (e *AvailableServiceCityEntity) BeforeCreate(_ *gorm.DB) error {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return nil
}
