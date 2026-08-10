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
	Is24Hours            bool                `gorm:"type:tinyint(1);default:0"`
	OpenTime             string              `gorm:"type:varchar(5);default:'08:00'"`
	CloseTime            string              `gorm:"type:varchar(5);default:'17:00'"`
	TotalUnits           int                 `gorm:"default:0"`
	AvailableUnits       int                 `gorm:"default:0"`
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
	TipeEmergency        string              `gorm:"type:varchar(255)"`
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

type FeedbackEntity struct {
	ID            uint      `gorm:"primaryKey"`
	UUID          uuid.UUID `gorm:"type:char(36);uniqueIndex;not null"`
	EmergencyUUID string    `gorm:"type:char(36);index"` // references EmergencyEntity.UUID (no FK)
	UnitName      string    `gorm:"type:varchar(255)"`
	UnitHelpful   bool      `gorm:"type:tinyint(1);default:0"`
	AppHelpful    *bool     `gorm:"type:tinyint(1)"`
	CallType      string    `gorm:"type:varchar(20)"` // whatsapp | phone
	Comment       string    `gorm:"type:text"`
	CreatedAt     time.Time `gorm:"autoCreateTime"`
}

func (e *FeedbackEntity) BeforeCreate(_ *gorm.DB) error {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return nil
}

type OrderTicketEntity struct {
	ID             uint       `gorm:"primaryKey"`
	UUID           uuid.UUID  `gorm:"type:char(36);uniqueIndex;not null"`
	TicketNumber   string     `gorm:"type:varchar(30);uniqueIndex;not null"`
	EmergencyUUID  string     `gorm:"type:char(36);index"`
	UnitName       string     `gorm:"type:varchar(255)"`
	RequesterName  string     `gorm:"type:varchar(255)"`
	RequesterPhone string     `gorm:"type:varchar(50)"`
	Location       string     `gorm:"type:text"`
	Condition      string     `gorm:"type:text"`
	PhotoURL       string     `gorm:"type:varchar(500)"`
	RequesterLat   float64    `gorm:"type:double;default:0"`
	RequesterLng   float64    `gorm:"type:double;default:0"`
	Status         string     `gorm:"type:varchar(20);default:'pending';index"`
	Source         string     `gorm:"type:varchar(20);default:'call';index"` // "call" | "sos"
	HandlerName    string     `gorm:"type:varchar(255)"`
	HandlingNotes  string     `gorm:"type:text"`
	AcceptedAt     *time.Time `gorm:"index"`
	CompletedAt    *time.Time `gorm:"index"`
	CancelledAt    *time.Time
	CreatedAt      time.Time  `gorm:"autoCreateTime"`
	UpdatedAt      time.Time  `gorm:"autoUpdateTime"`
}

type SOSAlertEntity struct {
	ID           uint      `gorm:"primaryKey"`
	UUID         uuid.UUID `gorm:"type:char(36);uniqueIndex;not null"`
	Name         string    `gorm:"type:varchar(255)"`
	Phone        string    `gorm:"type:varchar(50)"`
	Lat          float64   `gorm:"type:double;default:0"`
	Lng          float64   `gorm:"type:double;default:0"`
	Address      string    `gorm:"type:text"`
	Description  string    `gorm:"type:text"`
	PhotoURL     string    `gorm:"type:varchar(500)"`
	TypeID       uint      `gorm:"default:0"`
	RegencyID    string    `gorm:"type:varchar(10)"`
	ProvinceID   string    `gorm:"type:varchar(10)"`
	TicketNumber string    `gorm:"type:varchar(30)"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
}

func (e *SOSAlertEntity) BeforeCreate(_ *gorm.DB) error {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return nil
}

type PushSubscriptionEntity struct {
	ID           uint   `gorm:"primaryKey"`
	TicketNumber string `gorm:"type:varchar(30);not null;index"`
	Endpoint     string `gorm:"type:text;not null"`
	P256DH       string `gorm:"type:varchar(255);not null"`
	Auth         string `gorm:"type:varchar(100);not null"`
}

func (e *OrderTicketEntity) BeforeCreate(_ *gorm.DB) error {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return nil
}

type UnitCredentialEntity struct {
	ID            uint      `gorm:"primaryKey"`
	EmergencyUUID string    `gorm:"type:char(36);uniqueIndex;not null"`
	UnitName      string    `gorm:"type:varchar(255)"`
	Username      string    `gorm:"type:varchar(100);uniqueIndex;not null"`
	PasswordHash  string    `gorm:"type:varchar(255);not null"`
	AccessToken   string    `gorm:"type:char(36);index;not null"`
	CreatedAt     time.Time `gorm:"autoCreateTime"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime"`
}
