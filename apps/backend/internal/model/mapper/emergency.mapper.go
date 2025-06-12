package mapper

import (
	"butuhbantuan/internal/dto"
	"butuhbantuan/internal/model/entity"
	"strconv"
)

func MapEmergencyServiceToResponse(e entity.Emergency) dto.EmergencyServiceResponse {
	lat, _ := strconv.ParseFloat(e.Latitude, 64)
	lng, _ := strconv.ParseFloat(e.Longitude, 64)

	res := dto.EmergencyServiceResponse{
		ID:               strconv.FormatUint(uint64(e.ID), 10),
		Name:             e.Name,
		OrganizationName: e.OrganizationName,
		OrganizationType: e.OrganizationType,
		EmergencyTypeID:  e.EmergencyTypeID,
		Logo:             e.OrganizationLogo,
		Description:      e.Description,
		Coordinates:      [2]float64{lng, lat},
		TypeOfService:    e.TypeOfService,
	}

	res.Address.District = e.District
	res.Address.Regency = e.Regency
	res.Address.Province = e.Province
	res.Address.FullAddress = e.FullAddress

	res.Contact.Whatsapp = e.Whatsapp
	res.Contact.Phone = e.Phone

	return res
}
