package service

import (
	"github.com/butuhbantuan/api/internal/domain"
	"github.com/butuhbantuan/api/internal/repository"
)

// WilayahResolver derives regency/province for tickets from trusted signals
// (GPS → covered regions, then assigned unit HQ). Client-supplied IDs are fallback only.
type WilayahResolver struct {
	regionRepo    repository.RegionRepository
	emergencyRepo repository.EmergencyRepository
}

func NewWilayahResolver(regionRepo repository.RegionRepository, emergencyRepo repository.EmergencyRepository) *WilayahResolver {
	return &WilayahResolver{regionRepo: regionRepo, emergencyRepo: emergencyRepo}
}

// Resolve fills empty (or optionally overrides weak) wilayah IDs.
// Priority:
//  1. Nearest covered kab by GPS (scored via nearest unit HQ in that kab, else centroid)
//  2. Assigned emergency unit address
//  3. Keep existing client values if still empty
//
// Client IDs in the same province are kept when they score within stickyKm of the
// GPS winner — avoids flipping Sleman→Yogya when HQ centroids are misleading.
func (r *WilayahResolver) Resolve(lat, lng float64, emergencyUUID, regencyID, provinceID string) (string, string) {
	outReg := regencyID
	outProv := provinceID

	if r != nil && r.regionRepo != nil && (lat != 0 || lng != 0) {
		if reg, ok := r.nearestAvailable(lat, lng); ok {
			const stickyKm = 8.0
			clientOK := false
			if regencyID != "" && regencyID == reg.RegencyID {
				clientOK = true
			} else if regencyID != "" {
				// Keep client kab when it's covered and nearly as close as the GPS pick.
				if clientScore, okClient := r.scoreRegency(lat, lng, regencyID); okClient {
					if winnerScore, okWin := r.scoreRegency(lat, lng, reg.RegencyID); okWin {
						if clientScore <= winnerScore+stickyKm {
							clientOK = true
							outReg = regencyID
							if provinceID != "" {
								outProv = provinceID
							} else if len(regencyID) >= 2 {
								outProv = regencyID[:2]
							}
						}
					}
				}
			}
			if !clientOK {
				if reg.RegencyID != "" {
					outReg = reg.RegencyID
				}
				if reg.ProvinceID != "" {
					outProv = reg.ProvinceID
				}
			} else if outProv == "" && reg.ProvinceID != "" {
				outProv = reg.ProvinceID
			}
		}
	}

	needUnit := (outReg == "" || outProv == "") && emergencyUUID != "" && r != nil && r.emergencyRepo != nil
	if needUnit {
		if units, err := r.emergencyRepo.FindByIDs([]string{emergencyUUID}); err == nil && len(units) > 0 {
			u := units[0]
			if outReg == "" {
				outReg = u.Address.RegencyID
			}
			if outProv == "" {
				outProv = u.Address.ProvinceID
			}
		}
	}

	return outReg, outProv
}

func (r *WilayahResolver) nearestAvailable(lat, lng float64) (domain.AvailableRegion, bool) {
	regions, err := r.regionRepo.FindAllAvailableRegions()
	if err != nil || len(regions) == 0 {
		return domain.AvailableRegion{}, false
	}

	unitsByRegency := r.unitsByRegency(regions)

	bestIdx := -1
	bestKm := 1e18
	const maxKm = 80.0
	for i := range regions {
		reg := regions[i]
		km, ok := scoreRegion(lat, lng, reg, unitsByRegency[reg.RegencyID])
		if !ok {
			continue
		}
		if km < bestKm {
			bestKm = km
			bestIdx = i
		}
	}
	if bestIdx < 0 || bestKm > maxKm {
		return domain.AvailableRegion{}, false
	}
	return regions[bestIdx], true
}

func (r *WilayahResolver) scoreRegency(lat, lng float64, regencyID string) (float64, bool) {
	if regencyID == "" {
		return 0, false
	}
	regions, err := r.regionRepo.FindAllAvailableRegions()
	if err != nil {
		return 0, false
	}
	var match *domain.AvailableRegion
	for i := range regions {
		if regions[i].RegencyID == regencyID {
			match = &regions[i]
			break
		}
	}
	if match == nil {
		return 0, false
	}
	unitsByRegency := r.unitsByRegency([]domain.AvailableRegion{*match})
	return scoreRegion(lat, lng, *match, unitsByRegency[regencyID])
}

func (r *WilayahResolver) unitsByRegency(regions []domain.AvailableRegion) map[string][]domain.Emergency {
	out := map[string][]domain.Emergency{}
	if r == nil || r.emergencyRepo == nil || len(regions) == 0 {
		return out
	}
	seenProv := map[string]struct{}{}
	for _, reg := range regions {
		prov := reg.ProvinceID
		if prov == "" && len(reg.RegencyID) >= 2 {
			prov = reg.RegencyID[:2]
		}
		if prov == "" {
			continue
		}
		if _, ok := seenProv[prov]; ok {
			continue
		}
		seenProv[prov] = struct{}{}
		units, err := r.emergencyRepo.FindByProvince(prov)
		if err != nil {
			continue
		}
		for _, u := range units {
			rid := u.Address.RegencyID
			if rid == "" {
				continue
			}
			out[rid] = append(out[rid], u)
		}
	}
	return out
}

// scoreRegion: distance to nearest unit in kab (preferred), else HQ centroid.
func scoreRegion(lat, lng float64, reg domain.AvailableRegion, units []domain.Emergency) (float64, bool) {
	best := 1e18
	ok := false
	for _, u := range units {
		uLat, uLng := parseCoords(u.Coordinates)
		if uLat == 0 && uLng == 0 {
			continue
		}
		km := domain.DistanceKm(lat, lng, uLat, uLng)
		if km < best {
			best = km
			ok = true
		}
	}
	if ok {
		return best, true
	}
	if reg.Latitude == 0 && reg.Longitude == 0 {
		return 0, false
	}
	return domain.DistanceKm(lat, lng, reg.Latitude, reg.Longitude), true
}
