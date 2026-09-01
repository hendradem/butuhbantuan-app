package mysqlrepo

import (
	"strings"
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
	PartnerTier          string              `gorm:"type:varchar(20);default:community;index"` // psc | verified | community
	TrainedDriver        bool                `gorm:"type:tinyint(1);default:0"`
	HasOxygen            bool                `gorm:"type:tinyint(1);default:0"`
	HasStretcher         bool                `gorm:"type:tinyint(1);default:0"`
	EquipmentNotes       string              `gorm:"type:varchar(500)"`
	IsActive             bool                `gorm:"type:tinyint(1);default:1;index"`
	Is24Hours            bool                `gorm:"column:is24_hours;type:tinyint(1);default:0"`
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
	// DashboardAccess: false → WA + magic-link ops (no unit login). Default true.
	DashboardAccess  bool           `gorm:"column:dashboard_access;type:tinyint(1);not null;default:1;index"`
	DeclaredCategory string         `gorm:"type:varchar(50);index"`
	ComplianceJSON              string `gorm:"type:longtext"`
	IncidentReportTemplateJSON  string `gorm:"type:longtext"`
	HospitalMasterID            *uint  `gorm:"index"` // link ke master RS bila diimpor
	CreatedAt        time.Time      `gorm:"autoCreateTime"`
	UpdatedAt        time.Time      `gorm:"autoUpdateTime"`
	DeletedAt        gorm.DeletedAt `gorm:"index"`
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

// HospitalMasterEntity caches RS directory rows synced per kabupaten (SATUSEHAT MSI / stub).
type HospitalMasterEntity struct {
	ID                    uint      `gorm:"primaryKey"`
	UUID                  uuid.UUID `gorm:"type:char(36);uniqueIndex;not null"`
	Source                string    `gorm:"type:varchar(32);not null;uniqueIndex:ux_hospital_source_code"`
	SourceCode            string    `gorm:"type:varchar(64);not null;uniqueIndex:ux_hospital_source_code"`
	Name                  string    `gorm:"type:varchar(255);not null;index"`
	Address               string    `gorm:"type:text"`
	Phone                 string    `gorm:"type:varchar(50)"`
	Class                 string    `gorm:"type:varchar(64)"`
	Ownership             string    `gorm:"type:varchar(64)"`
	Latitude              float64   `gorm:"type:double;default:0"`
	Longitude             float64   `gorm:"type:double;default:0"`
	ProvinceID            string    `gorm:"type:varchar(10);not null;index"`
	RegencyID             string    `gorm:"type:varchar(10);not null;index"`
	ProvinceName          string    `gorm:"type:varchar(255)"`
	RegencyName           string    `gorm:"type:varchar(255)"`
	RawJSON               string    `gorm:"type:longtext"`
	SyncedAt              time.Time `gorm:"index"`
	ImportedEmergencyUUID string    `gorm:"type:char(36);index"`
	CreatedAt             time.Time `gorm:"autoCreateTime"`
	UpdatedAt             time.Time `gorm:"autoUpdateTime"`
}

func (e *HospitalMasterEntity) BeforeCreate(_ *gorm.DB) error {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return nil
}

type OrderTicketEntity struct {
	ID                uint       `gorm:"primaryKey"`
	UUID              uuid.UUID  `gorm:"type:char(36);uniqueIndex;not null"`
	TicketNumber      string     `gorm:"type:varchar(30);uniqueIndex;not null"`
	EmergencyUUID     string     `gorm:"type:char(36);index"`
	UnitName          string     `gorm:"type:varchar(255)"`
	RequesterName     string     `gorm:"type:varchar(255)"`
	RequesterPhone    string     `gorm:"type:varchar(50)"`
	JenisPelayanan    string     `gorm:"type:varchar(40);index"`
	Location          string     `gorm:"type:text"`
	Condition         string     `gorm:"type:text"`
	AssessmentJSON    string     `gorm:"type:longtext"`
	AssessmentAcuity  string     `gorm:"type:varchar(20);index"`
	PhotoURL          string     `gorm:"type:varchar(500)"`
	RequesterLat      float64    `gorm:"type:double;default:0"`
	RequesterLng      float64    `gorm:"type:double;default:0"`
	Status            string     `gorm:"type:varchar(20);default:'pending';index"`
	Source            string     `gorm:"type:varchar(20);default:'call';index"` // "call" | "sos"
	HandlerName       string     `gorm:"type:varchar(255)"`
	HandlingNotes     string     `gorm:"type:text"`
	TypeID            uint       `gorm:"default:0;index"`
	RegencyID         string     `gorm:"type:varchar(10);index"`
	ProvinceID        string     `gorm:"type:varchar(10);index"`
	DispatchRound     int        `gorm:"default:0"`
	SlaDeadline       *time.Time `gorm:"index"`
	DispatchStatus    string     `gorm:"type:varchar(20);default:''"` // searching | assigned | exhausted | escalated
	EscalationHotline string     `gorm:"type:varchar(50)"`
	EscalationLabel   string     `gorm:"type:varchar(255)"`
	// Live responder tracking (magic link from posko → HP petugas).
	TrackToken         string `gorm:"type:char(36);index"`
	// PublicToken is the citizen e-ticket share link (/ticket/{token}) — unrelated to track_token.
	PublicToken        string `gorm:"type:char(36);uniqueIndex"`
	TrackEnabledAt     *time.Time
	TrackExpiresAt     *time.Time `gorm:"index"`
	// Community relay claim window.
	ClaimToken     string     `gorm:"type:char(36);index"`
	ClaimExpiresAt *time.Time `gorm:"index"`
	ResponderLat       float64    `gorm:"type:double;default:0"`
	ResponderLng       float64    `gorm:"type:double;default:0"`
	ResponderUpdatedAt *time.Time
	ArrivedAt          *time.Time `gorm:"index"` // on-scene (petugas tekan "Sudah sampai")
	AcceptedAt         *time.Time `gorm:"index"`
	CompletedAt        *time.Time `gorm:"index"`
	CancelledAt        *time.Time
	// Referral hospital (set on complete modal).
	ReferralHospitalID   string `gorm:"type:varchar(36)"`
	ReferralHospitalName string `gorm:"type:varchar(255)"`
	// Incident report drafted by unit/admin (JSON blob shared across dashboards).
	IncidentReport   string `gorm:"type:longtext"`
	IncidentReportAt *time.Time
	CreatedAt        time.Time `gorm:"autoCreateTime"`
	UpdatedAt        time.Time `gorm:"autoUpdateTime"`
}

// DispatchAttemptEntity audits each unit offer during auto-dispatch / escalation.
type DispatchAttemptEntity struct {
	ID            uint      `gorm:"primaryKey"`
	UUID          uuid.UUID `gorm:"type:char(36);uniqueIndex;not null"`
	OrderID       string    `gorm:"type:char(36);index;not null"`
	TicketNumber  string    `gorm:"type:varchar(30);index;not null"`
	EmergencyUUID string    `gorm:"type:char(36);index;not null"`
	UnitName      string    `gorm:"type:varchar(255)"`
	Round         int       `gorm:"not null;default:1"`
	Status        string    `gorm:"type:varchar(20);default:'offered';index"`
	DistanceKm    float64   `gorm:"type:double;default:0"`
	Score         float64   `gorm:"type:double;default:0"`
	RejectReason  string    `gorm:"type:varchar(40)"`
	RejectNote    string    `gorm:"type:varchar(255)"`
	OfferedAt     time.Time `gorm:"autoCreateTime"`
	ResolvedAt    *time.Time
}

func (e *DispatchAttemptEntity) BeforeCreate(_ *gorm.DB) error {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return nil
}

// OrderEventEntity stores the human-readable timeline for a ticket.
type OrderEventEntity struct {
	ID           uint      `gorm:"primaryKey"`
	UUID         uuid.UUID `gorm:"type:char(36);uniqueIndex;not null"`
	OrderID      string    `gorm:"type:char(36);index;not null"`
	TicketNumber string    `gorm:"type:varchar(30);index;not null"`
	Type         string    `gorm:"type:varchar(30);index;not null"`
	Message      string    `gorm:"type:text;not null"`
	Actor        string    `gorm:"type:varchar(30);default:'system'"`
	FromUnit     string    `gorm:"type:varchar(255)"`
	ToUnit       string    `gorm:"type:varchar(255)"`
	Tier         string    `gorm:"column:dispatch_tier;type:varchar(30);index"`
	CreatedAt    time.Time `gorm:"autoCreateTime;index"`
}

func (e *OrderEventEntity) BeforeCreate(_ *gorm.DB) error {
	if e.UUID == uuid.Nil {
		e.UUID = uuid.New()
	}
	return nil
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
	if strings.TrimSpace(e.PublicToken) == "" {
		e.PublicToken = uuid.New().String()
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
	ExpiresAt     time.Time `gorm:"not null;index"`
	CreatedAt     time.Time `gorm:"autoCreateTime"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime"`
}

// AssessmentTemplateEntity — versioned checklist package (master).
type AssessmentTemplateEntity struct {
	ID             uint      `gorm:"primaryKey"`
	Code           string    `gorm:"type:varchar(64);uniqueIndex;not null"`
	Name           string    `gorm:"type:varchar(255);not null"`
	Version        int       `gorm:"not null;default:1"`
	Description    string    `gorm:"type:varchar(500)"`
	Category       string    `gorm:"type:varchar(20);default:'triage';index"`
	IsActive       bool      `gorm:"type:tinyint(1);default:1;index"`
	IsDefault      bool      `gorm:"type:tinyint(1);default:0;index"`
	ReferencesJSON string    `gorm:"type:longtext"`
	CreatedAt      time.Time `gorm:"autoCreateTime"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime"`
}

// AssessmentIndicatorEntity — reusable indicator row bound to a template.
type AssessmentIndicatorEntity struct {
	ID         uint      `gorm:"primaryKey"`
	TemplateID uint      `gorm:"index;not null"`
	Code       string    `gorm:"type:varchar(64);not null;index"`
	Label      string    `gorm:"type:varchar(255);not null"`
	Hint       string    `gorm:"type:varchar(500)"`
	AbcdeGroup string    `gorm:"type:varchar(8)"`
	CriticalIf string    `gorm:"type:varchar(16)"` // yes|no → red
	WarnIf     string    `gorm:"type:varchar(16)"` // yes|no → yellow
	Required   bool      `gorm:"type:tinyint(1);default:1"`
	SortOrder  int       `gorm:"default:0;index"`
	IsActive   bool      `gorm:"type:tinyint(1);default:1"`
	CreatedAt  time.Time `gorm:"autoCreateTime"`
	UpdatedAt  time.Time `gorm:"autoUpdateTime"`
}

// AssessmentTemplateBindingEntity maps emergency_type → template.
// EmergencyTypeID=0 means default fallback for all types.
type AssessmentTemplateBindingEntity struct {
	ID              uint      `gorm:"primaryKey"`
	EmergencyTypeID uint      `gorm:"uniqueIndex;not null"`
	TemplateCode    string    `gorm:"type:varchar(64);not null;index"`
	CreatedAt       time.Time `gorm:"autoCreateTime"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime"`
}

// AssessmentJenisBindingEntity maps citizen jenis pelayanan → template.
type AssessmentJenisBindingEntity struct {
	ID             uint      `gorm:"primaryKey"`
	JenisPelayanan string    `gorm:"type:varchar(40);uniqueIndex;not null"`
	TemplateCode   string    `gorm:"type:varchar(64);not null;index"`
	CreatedAt      time.Time `gorm:"autoCreateTime"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime"`
}
