package service

import (
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/butuhbantuan/api/internal/domain"
)

// RankCandidates scores emergency units within a single cascade tier.
// Lower score is better. excludeIDs skips units already offered.
// When typeID > 0 or requestedTypeName is set, only compatible types are ranked
// (ambulance never escalates to damkar, etc.).
//
// Capacity policy (strict=true, default path):
//   - skip units that are closed / inactive (PSC partners always count as open)
//   - skip units with known fleet Total>0 and Available==0
// Unknown fleet (Total==0) stays eligible.
func RankCandidates(
	candidates []domain.Emergency,
	lat, lng float64,
	typeID uint,
	requestedTypeName string,
	excludeIDs map[string]struct{},
) []domain.RankedCandidate {
	return rankCandidates(candidates, lat, lng, typeID, requestedTypeName, excludeIDs, true)
}

// rankCandidates is the shared scorer. When strictCapacity is false, closed /
// zero-fleet units are soft-penalized instead of skipped (fallback if the
// whole cascade pool would otherwise be empty).
func rankCandidates(
	candidates []domain.Emergency,
	lat, lng float64,
	typeID uint,
	requestedTypeName string,
	excludeIDs map[string]struct{},
	strictCapacity bool,
) []domain.RankedCandidate {
	reqFamily := typeFamily(requestedTypeName)
	ranked := make([]domain.RankedCandidate, 0, len(candidates))
	for _, e := range candidates {
		if _, skip := excludeIDs[e.ID]; skip {
			continue
		}
		if !matchesRequestedType(e, typeID, reqFamily) {
			continue
		}

		unitLat, unitLng := parseCoords(e.Coordinates)
		dist := haversineKm(lat, lng, unitLat, unitLng)
		fleetKnownEmpty := e.Fleet.Total > 0 && e.Fleet.Available == 0
		fleetOK := !fleetKnownEmpty
		psc := isPSCPartner(e)
		openNow := isOpenNow(e.Operational) || psc

		if strictCapacity {
			if !openNow || fleetKnownEmpty {
				continue
			}
		}

		score := dist
		// Soft nudges only — must never outweigh ~1 km of road distance.
		// (Old fleet −5 + readiness −10 let MPD ~7km beat PSC SES ~2.5km.)
		soft := partnerTierScoreDelta(e)
		if fleetOK && e.Fleet.Available > 0 {
			soft -= 0.25
		}
		if soft < -0.75 {
			soft = -0.75
		}
		if soft > 20 {
			soft = 20
		}
		score += soft
		if !openNow {
			score += 80
		}
		if fleetKnownEmpty {
			score += 15
		}

		ranked = append(ranked, domain.RankedCandidate{
			Emergency:  e,
			Score:      score,
			DistanceKm: dist,
			TypeMatch:  true,
			FleetOK:    fleetOK,
			OpenNow:    openNow,
			IsProvince: e.IsProvinceDispatcher,
			Tier:       domain.DispatchTierOf(e),
		})
	}

	sort.SliceStable(ranked, func(i, j int) bool {
		if ranked[i].Score == ranked[j].Score {
			return ranked[i].DistanceKm < ranked[j].DistanceKm
		}
		return ranked[i].Score < ranked[j].Score
	})
	return ranked
}

// typeFamily groups emergency labels into routing buckets so ID drift in DB
// cannot route ambulance SOS to damkar (or vice versa).
func typeFamily(name string) string {
	n := strings.ToLower(strings.TrimSpace(name))
	if n == "" {
		return ""
	}
	switch {
	case containsAny(n, "ambul", "psc", "119", "spgdt", "medis", "kesehatan", "medical", "ems"):
		return "medical"
	case containsAny(n, "damkar", "fire", "pemadam", "kebakaran"):
		return "fire"
	case containsAny(n, "sar", "basarnas", "rescue"):
		return "sar"
	default:
		return n
	}
}

func candidateFamily(e domain.Emergency) string {
	if fam := typeFamily(e.EmergencyType.Name); fam != "" {
		return fam
	}
	blob := strings.Join([]string{
		e.Name,
		e.OrganizationName,
		e.OrganizationType,
		e.TypeOfService,
		strings.Join(e.TipeEmergency, " "),
	}, " ")
	return typeFamily(blob)
}

func matchesRequestedType(e domain.Emergency, typeID uint, reqFamily string) bool {
	candFamily := candidateFamily(e)

	// Family match is authoritative when both sides resolve
	// (Ambulance/medical ≠ Damkar/fire ≠ SAR).
	if reqFamily != "" {
		if candFamily != "" {
			return reqFamily == candFamily
		}
		// Candidate type name unknown — fall back to hard ID match only.
		return typeID > 0 && uint(e.EmergencyType.ID) == typeID
	}
	if typeID > 0 {
		return uint(e.EmergencyType.ID) == typeID
	}
	// No type context: never mix lanes in cascade routing.
	return false
}

func isPSCPartner(e domain.Emergency) bool {
	return isMedicalPSCPartner(e)
}

// isMedicalPSCPartner is the medical command-center signal (PSC / 119 / SPGDT).
// Fire (Damkar) and SAR must never count as medical PSC — that caused wrong
// "Escalate to PSC" assignments.
func isMedicalPSCPartner(e domain.Emergency) bool {
	fam := candidateFamily(e)
	if fam == "fire" || fam == "sar" {
		return false
	}
	if strings.EqualFold(strings.TrimSpace(e.PartnerTier), domain.PartnerTierPSC) {
		return true
	}
	return isMedicalPSCNameHeuristic(e)
}

func partnerTierScoreDelta(e domain.Emergency) float64 {
	// Tiny trust nudge only — never outweigh ~1 km of distance.
	switch strings.ToLower(strings.TrimSpace(e.PartnerTier)) {
	case domain.PartnerTierPSC:
		if candidateFamily(e) == "fire" || candidateFamily(e) == "sar" {
			return 0
		}
		return -0.5
	case domain.PartnerTierVerified:
		return -0.25
	case domain.PartnerTierCommunity:
		return 0
	default:
		if isMedicalPSCNameHeuristic(e) {
			return -0.5
		}
		return 0
	}
}

// readinessScoreDelta is kept for analytics / future UI — not applied to
// dispatch distance ranking (equipment flags were drowning proximity).
func readinessScoreDelta(r domain.Readiness) float64 {
	delta := 0.0
	if r.TrainedDriver {
		delta -= 0.1
	}
	if r.HasOxygen {
		delta -= 0.1
	}
	if r.HasStretcher {
		delta -= 0.1
	}
	return delta
}

func isMedicalPSCNameHeuristic(e domain.Emergency) bool {
	blob := strings.ToLower(strings.Join([]string{
		e.Name,
		e.OrganizationName,
		e.OrganizationType,
		e.TypeOfService,
		e.Description,
	}, " "))
	// Medical PSC / SPGDT / 119 only — never Damkar / Basarnas.
	return containsAny(blob, "psc", "119", "spgdt", "dinas kesehatan", "dinkes")
}

// isFireCommandHeuristic detects damkar command centers (for fire-lane escalation).
func isFireCommandHeuristic(e domain.Emergency) bool {
	blob := strings.ToLower(strings.Join([]string{
		e.Name,
		e.OrganizationName,
		e.OrganizationType,
		e.TypeOfService,
		e.Description,
	}, " "))
	return containsAny(blob, "damkar", "pemadam", "kebakaran", "fire")
}

func containsAny(s string, needles ...string) bool {
	for _, n := range needles {
		if strings.Contains(s, n) {
			return true
		}
	}
	return false
}

func parseCoords(coords [2]string) (lat, lng float64) {
	lng, _ = strconv.ParseFloat(coords[0], 64)
	lat, _ = strconv.ParseFloat(coords[1], 64)
	return lat, lng
}

func haversineKm(lat1, lng1, lat2, lng2 float64) float64 {
	if lat1 == 0 && lng1 == 0 {
		return 9999
	}
	if lat2 == 0 && lng2 == 0 {
		return 9999
	}
	const earthRadiusKm = 6371.0
	toRad := func(d float64) float64 { return d * math.Pi / 180 }
	dLat := toRad(lat2 - lat1)
	dLng := toRad(lng2 - lng1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * earthRadiusKm * math.Asin(math.Min(1, math.Sqrt(a)))
}

func isOpenNow(op domain.OperationalStatus) bool {
	if !op.IsActive {
		return false
	}
	if op.Is24Hours {
		return true
	}
	if op.OpenTime == "" || op.CloseTime == "" {
		return true
	}
	now := time.Now()
	openMin, okOpen := parseHHMM(op.OpenTime)
	closeMin, okClose := parseHHMM(op.CloseTime)
	if !okOpen || !okClose {
		return true
	}
	cur := now.Hour()*60 + now.Minute()
	if openMin == closeMin {
		return true
	}
	if openMin < closeMin {
		return cur >= openMin && cur < closeMin
	}
	return cur >= openMin || cur < closeMin
}

func parseHHMM(s string) (int, bool) {
	if len(s) < 4 {
		return 0, false
	}
	h, err1 := strconv.Atoi(s[0:2])
	m, err2 := strconv.Atoi(s[3:5])
	if err1 != nil || err2 != nil || h < 0 || h > 23 || m < 0 || m > 59 {
		return 0, false
	}
	return h*60 + m, true
}

func toExcludeSet(ids []string) map[string]struct{} {
	m := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		if id != "" {
			m[id] = struct{}{}
		}
	}
	return m
}
