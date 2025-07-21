package mapper

import (
	"butuhbantuan/internal/dto"
	"butuhbantuan/internal/model/entity"
)

func MapEmergencyServiceToResponse(e entity.Emergency) dto.EmergencyServiceResponse {
	res := dto.EmergencyServiceResponse{
		ID:               e.UUID.String(),
		Name:             e.Name,
		OrganizationName: e.OrganizationName,
		OrganizationType: e.OrganizationType,
		Logo:             e.OrganizationLogo,
		Description:      e.Description,
		Coordinates:      [2]string{e.Longitude, e.Latitude},
		TypeOfService:    e.TypeOfService,
		IsDispatcher:     e.IsDispatcher,
	}

	res.EmergencyType.ID = e.EmergencyType.ID
	res.EmergencyType.EmergencyTypeName = e.EmergencyType.Name
	res.EmergencyType.Icon = e.EmergencyType.Icon

	res.Address.DistrictID = e.District.ID
	res.Address.District = e.District.Name
	res.Address.RegencyID = e.Regency.ID
	res.Address.Regency = e.Regency.Name
	res.Address.ProvinceID = e.Province.ID
	res.Address.Province = e.Province.Name
	res.Address.FullAddress = e.FullAddress

	res.Contact.Email = e.Email
	res.Contact.Phone = e.Phone
	res.Contact.Whatsapp = e.Whatsapp

	return res
}
