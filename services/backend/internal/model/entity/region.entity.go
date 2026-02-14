package entity

type Province struct {
	ID   string `json:"id" gorm:"primaryKey;size:191"`
	Name string `json:"name"`
}

type Regency struct {
	ID         string   `json:"id" gorm:"primaryKey;size:191"`
	ProvinceID string   `json:"province_id" gorm:"size:191;index"`
	Name       string   `json:"name"`
	Province   Province `gorm:"foreignKey:ProvinceID;references:ID"`
}

type District struct {
	ID        string  `json:"id" gorm:"primaryKey;size:191"`
	RegencyID string  `json:"regency_id" gorm:"size:191;index"`
	Name      string  `json:"name"`
	Regency   Regency `gorm:"foreignKey:RegencyID;references:ID"`
}
