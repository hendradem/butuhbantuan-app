package service

import (
	"strings"
	"testing"

	"github.com/butuhbantuan/api/internal/domain"
)

func TestRankCandidates_HardFiltersByType(t *testing.T) {
	candidates := []domain.Emergency{
		{
			ID:            "far-match",
			Name:          "Far Match",
			Coordinates:   [2]string{"110.5", "-7.8"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			Fleet:         domain.FleetStatus{Total: 2, Available: 1},
			IsDispatcher:  true,
		},
		{
			ID:            "near-wrong",
			Name:          "Damkar Near",
			Coordinates:   [2]string{"110.01", "-7.01"},
			EmergencyType: domain.EmergencyType{ID: 2, Name: "Damkar"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			Fleet:         domain.FleetStatus{Total: 2, Available: 1},
			IsDispatcher:  true,
		},
		{
			ID:            "near-match",
			Name:          "Near Match",
			Coordinates:   [2]string{"110.02", "-7.02"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			Fleet:         domain.FleetStatus{Total: 2, Available: 1},
			IsDispatcher:  true,
		},
	}

	ranked := RankCandidates(candidates, -7.0, 110.0, 1, "Ambulance", nil)
	if len(ranked) != 2 {
		t.Fatalf("expected 2 same-type candidates, got %d", len(ranked))
	}
	if ranked[0].Emergency.ID != "near-match" {
		t.Fatalf("expected near-match first, got %s (score=%.2f)", ranked[0].Emergency.ID, ranked[0].Score)
	}
	for _, c := range ranked {
		if c.Emergency.ID == "near-wrong" {
			t.Fatal("wrong emergency type must never be ranked")
		}
	}
}

func TestRankCandidates_FamilyBlocksIDMismatch(t *testing.T) {
	candidates := []domain.Emergency{
		{
			ID:            "mis-tagged-damkar",
			Name:          "Damkar Sleman",
			Coordinates:   [2]string{"110.01", "-7.01"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Damkar"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			IsDispatcher:  true,
		},
		{
			ID:            "psc",
			Name:          "PSC 119 SES",
			Coordinates:   [2]string{"110.05", "-7.05"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			IsDispatcher:  true,
		},
	}
	ranked := RankCandidates(candidates, -7.0, 110.0, 1, "Ambulance", nil)
	if len(ranked) != 1 || ranked[0].Emergency.ID != "psc" {
		t.Fatalf("expected only PSC, got %+v", rankedIDs(ranked))
	}
}

func TestRankCandidates_PrefersCloserOverFarPSC(t *testing.T) {
	// Within the same tier, a nearer field ambulance must beat a farther PSC.
	// (PSC lives in kab-dispatcher tier in the cascade; this guards scoring.)
	candidates := []domain.Emergency{
		{
			ID:            "ambulance-near",
			Name:          "Ambulance MPD",
			Coordinates:   [2]string{"110.02", "-7.02"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			IsDispatcher:  false,
			PartnerTier:   domain.PartnerTierCommunity,
			Fleet:         domain.FleetStatus{Total: 1, Available: 1},
		},
		{
			ID:            "psc-far",
			Name:          "PSC 119 SES",
			Coordinates:   [2]string{"110.12", "-7.12"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			IsDispatcher:  true,
			PartnerTier:   domain.PartnerTierPSC,
			Fleet:         domain.FleetStatus{Total: 1, Available: 1},
		},
	}
	ranked := RankCandidates(candidates, -7.0, 110.0, 1, "Ambulance", nil)
	if len(ranked) == 0 || ranked[0].Emergency.ID != "ambulance-near" {
		t.Fatalf("expected nearer ambulance over far PSC, got %+v", rankedIDs(ranked))
	}
}

func TestRankCandidates_VerifiedTieBreakWhenClose(t *testing.T) {
	// Verified nudge only wins when distances are essentially equal.
	candidates := []domain.Emergency{
		{
			ID:            "community",
			Name:          "Community Near",
			Coordinates:   [2]string{"110.02", "-7.02"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			PartnerTier:   domain.PartnerTierCommunity,
			Fleet:         domain.FleetStatus{Total: 1, Available: 1},
		},
		{
			ID:            "verified",
			Name:          "Verified Near",
			Coordinates:   [2]string{"110.02", "-7.02"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			PartnerTier:   domain.PartnerTierVerified,
			Fleet:         domain.FleetStatus{Total: 1, Available: 1},
		},
	}
	ranked := RankCandidates(candidates, -7.0, 110.0, 1, "Ambulance", nil)
	if len(ranked) < 2 || ranked[0].Emergency.ID != "verified" {
		t.Fatalf("expected verified tie-break when equal distance, got %+v", rankedIDs(ranked))
	}
}

func TestRankCandidates_ReadinessDoesNotBeatDistance(t *testing.T) {
	// Equipment flags must not reorder proximity ranking.
	closerBare := domain.Emergency{
		ID:            "bare",
		Name:          "Bare Closer",
		Coordinates:   [2]string{"110.02", "-7.02"},
		EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
		Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
		PartnerTier:   domain.PartnerTierCommunity,
		Fleet:         domain.FleetStatus{},
	}
	farReady := domain.Emergency{
		ID:            "ready",
		Name:          "Ready Far",
		Coordinates:   [2]string{"110.08", "-7.08"},
		EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
		Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
		PartnerTier:   domain.PartnerTierCommunity,
		Fleet:         domain.FleetStatus{Total: 5, Available: 5},
		Readiness:     domain.Readiness{TrainedDriver: true, HasOxygen: true, HasStretcher: true},
	}

	ranked := RankCandidates([]domain.Emergency{farReady, closerBare}, -7.0, 110.0, 1, "Ambulance", nil)
	if len(ranked) < 2 || ranked[0].Emergency.ID != "bare" {
		t.Fatalf("closer bare unit must beat far equipped unit, got %+v", rankedIDs(ranked))
	}
}

func TestRankCandidates_ExcludesTriedUnits(t *testing.T) {
	candidates := []domain.Emergency{
		{
			ID:            "a",
			Coordinates:   [2]string{"110.0", "-7.0"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			IsDispatcher:  true,
		},
		{
			ID:            "b",
			Coordinates:   [2]string{"110.1", "-7.1"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			IsDispatcher:  true,
		},
	}
	exclude := map[string]struct{}{"a": {}}
	ranked := RankCandidates(candidates, -7.0, 110.0, 1, "Ambulance", exclude)
	if len(ranked) != 1 || ranked[0].Emergency.ID != "b" {
		t.Fatalf("expected only b, got %+v", ranked)
	}
}

func TestRankCandidates_HardSkipsZeroFleetAndClosed(t *testing.T) {
	candidates := []domain.Emergency{
		{
			ID:            "empty-fleet",
			Name:          "Empty Fleet",
			Coordinates:   [2]string{"110.01", "-7.01"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			Fleet:         domain.FleetStatus{Total: 2, Available: 0},
		},
		{
			ID:            "closed",
			Name:          "Closed Unit",
			Coordinates:   [2]string{"110.02", "-7.02"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: false, Is24Hours: true},
			Fleet:         domain.FleetStatus{Total: 1, Available: 1},
		},
		{
			ID:            "ready",
			Name:          "Ready Unit",
			Coordinates:   [2]string{"110.10", "-7.10"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			Fleet:         domain.FleetStatus{Total: 1, Available: 1},
		},
	}
	ranked := RankCandidates(candidates, -7.0, 110.0, 1, "Ambulance", nil)
	if len(ranked) != 1 || ranked[0].Emergency.ID != "ready" {
		t.Fatalf("expected only ready unit, got %+v", rankedIDs(ranked))
	}
}

func TestRankCandidates_UnknownFleetStillEligible(t *testing.T) {
	candidates := []domain.Emergency{
		{
			ID:            "unknown-fleet",
			Name:          "Legacy Unit",
			Coordinates:   [2]string{"110.02", "-7.02"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			Fleet:         domain.FleetStatus{Total: 0, Available: 0},
		},
	}
	ranked := RankCandidates(candidates, -7.0, 110.0, 1, "Ambulance", nil)
	if len(ranked) != 1 {
		t.Fatalf("unknown fleet must remain eligible, got %+v", rankedIDs(ranked))
	}
}

func TestRankCandidates_SoftFallbackWhenPoolEmpty(t *testing.T) {
	// Only zero-fleet units — strict pass empty, soft pass still ranks them.
	candidates := []domain.Emergency{
		{
			ID:            "only-empty",
			Name:          "Only Empty",
			Coordinates:   [2]string{"110.02", "-7.02"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			Fleet:         domain.FleetStatus{Total: 1, Available: 0},
		},
	}
	strict := rankCandidates(candidates, -7.0, 110.0, 1, "Ambulance", nil, true)
	if len(strict) != 0 {
		t.Fatalf("strict must skip empty fleet, got %+v", rankedIDs(strict))
	}
	soft := rankCandidates(candidates, -7.0, 110.0, 1, "Ambulance", nil, false)
	if len(soft) != 1 || soft[0].Emergency.ID != "only-empty" {
		t.Fatalf("soft fallback must keep empty-fleet unit, got %+v", rankedIDs(soft))
	}
}

func TestFilterNearbyTrusted(t *testing.T) {
	// Incident in Sleman (~ -7.72, 110.36). Bantul PSC ~15km south; far Kulon Progo out of range.
	pool := []domain.Emergency{
		{
			ID: "local-sleman", Name: "Ambulance Sleman",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3404", ProvinceID: "34"},
			Coordinates:   [2]string{"110.36", "-7.72"},
			PartnerTier:   domain.PartnerTierVerified,
		},
		{
			ID: "bantul-psc", Name: "PSC 119 Bantul",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3402", ProvinceID: "34"},
			Coordinates:   [2]string{"110.33", "-7.89"},
			PartnerTier:   domain.PartnerTierPSC,
			IsDispatcher:  true,
		},
		{
			ID: "bantul-community", Name: "Komunitas Bantul",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3402", ProvinceID: "34"},
			Coordinates:   [2]string{"110.34", "-7.88"},
			PartnerTier:   domain.PartnerTierCommunity,
		},
		{
			ID: "kulonprogo-far", Name: "PSC 119 Kulon Progo",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3401", ProvinceID: "34"},
			Coordinates:   [2]string{"109.90", "-7.85"},
			PartnerTier:   domain.PartnerTierPSC,
		},
		{
			ID: "prov-disp", Name: "PMI DIY Prov",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3404", ProvinceID: "34"},
			Coordinates:   [2]string{"110.37", "-7.80"},
			PartnerTier:   domain.PartnerTierPSC,
			IsProvinceDispatcher: true,
		},
		{
			ID: "gunungkidul-verified", Name: "Ambulan GK Verified",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3403", ProvinceID: "34"},
			Coordinates:   [2]string{"110.45", "-7.95"},
			PartnerTier:   domain.PartnerTierVerified,
		},
	}

	got := filterNearbyTrusted(
		pool, "3404", 1, "Ambulance",
		-7.72, 110.36, domain.NearbyDispatchRadiusKm, nil,
	)
	ids := idsOf(got)
	want := map[string]bool{"bantul-psc": true, "gunungkidul-verified": true}
	for _, id := range ids {
		if !want[id] {
			t.Fatalf("unexpected nearby id %s in %+v", id, ids)
		}
	}
	for id := range want {
		found := false
		for _, g := range ids {
			if g == id {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("missing nearby id %s in %+v", id, ids)
		}
	}
	for _, id := range []string{"local-sleman", "bantul-community", "kulonprogo-far", "prov-disp"} {
		for _, g := range ids {
			if g == id {
				t.Fatalf("%s must not be in nearby tier", id)
			}
		}
	}
}

func TestFilterNearbyTrusted_SkipsLocalIDs(t *testing.T) {
	pool := []domain.Emergency{
		{
			ID: "bantul-psc", Name: "PSC 119 Bantul",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3402", ProvinceID: "34"},
			Coordinates:   [2]string{"110.33", "-7.89"},
			PartnerTier:   domain.PartnerTierPSC,
		},
	}
	skip := map[string]struct{}{"bantul-psc": {}}
	got := filterNearbyTrusted(pool, "3404", 1, "Ambulance", -7.72, 110.36, 40, skip)
	if len(got) != 0 {
		t.Fatalf("expected empty after skip, got %+v", idsOf(got))
	}
}

func TestSplitCascadeTiers(t *testing.T) {
	list := []domain.Emergency{
		{
			ID: "local-unit", Name: "Ambulance MPD",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3404", ProvinceID: "34"},
			IsDispatcher:  false,
		},
		{
			ID: "psc-no-flag", Name: "PSC 119 Sleman",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3404", ProvinceID: "34"},
			PartnerTier:   domain.PartnerTierPSC,
			IsDispatcher:  false, // unset in DB — still kab command
		},
		{
			ID: "kab-disp", Name: "PSC 119 SES",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3404", ProvinceID: "34"},
			IsDispatcher:  true,
		},
		{
			ID: "prov-disp", Name: "PMI DIY",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3404", ProvinceID: "34"},
			IsDispatcher:  true, IsProvinceDispatcher: true,
		},
		{
			ID: "other-kab", Name: "PSC 119 Bantul",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3402", ProvinceID: "34"},
			IsDispatcher:  true,
		},
		{
			ID: "damkar-disp", Name: "Damkar Sleman",
			EmergencyType: domain.EmergencyType{ID: 2, Name: "Damkar"},
			Address:       domain.Address{RegencyID: "3404", ProvinceID: "34"},
			IsDispatcher:  true,
		},
		{
			ID: "sar-unit", Name: "Basarnas Pos",
			EmergencyType: domain.EmergencyType{ID: 3, Name: "SAR"},
			Address:       domain.Address{RegencyID: "3404", ProvinceID: "34"},
			IsDispatcher:  false,
		},
	}
	tiers := splitRegencyCascade(list, "3404", 1, "Ambulance")
	if len(tiers.localUnits) != 1 || tiers.localUnits[0].ID != "local-unit" {
		t.Fatalf("local units: %+v", idsOf(tiers.localUnits))
	}
	dispIDs := map[string]bool{}
	for _, e := range tiers.regencyDispatchers {
		dispIDs[e.ID] = true
	}
	if !dispIDs["kab-disp"] || !dispIDs["psc-no-flag"] {
		t.Fatalf("regency dispatchers must include kab-disp + psc-no-flag, got %+v", idsOf(tiers.regencyDispatchers))
	}
	if dispIDs["local-unit"] {
		t.Fatal("field unit must not be in dispatcher tier")
	}
	for _, e := range append(tiers.localUnits, tiers.regencyDispatchers...) {
		if e.ID == "damkar-disp" || e.ID == "sar-unit" {
			t.Fatalf("cross-type unit leaked into ambulance cascade: %s", e.ID)
		}
		if e.IsProvinceDispatcher {
			t.Fatal("province dispatcher must not be in kab tier")
		}
	}
}

func TestFilterNearbyField_IncludesCommunityBorder(t *testing.T) {
	pool := []domain.Emergency{
		{
			ID: "bantul-community", Name: "Komunitas Bantul",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3402", ProvinceID: "34"},
			Coordinates:   [2]string{"110.34", "-7.88"},
			PartnerTier:   domain.PartnerTierCommunity,
		},
		{
			ID: "bantul-psc", Name: "PSC 119 Bantul",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3402", ProvinceID: "34"},
			Coordinates:   [2]string{"110.33", "-7.89"},
			PartnerTier:   domain.PartnerTierPSC,
			IsDispatcher:  true,
		},
		{
			ID: "pmi-bantul", Name: "PMI Bantul",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3402", ProvinceID: "34"},
			Coordinates:   [2]string{"110.33", "-7.87"},
			PartnerTier:   domain.PartnerTierVerified,
		},
		{
			ID: "prov-disp", Name: "PMI DIY Prov",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3404", ProvinceID: "34"},
			Coordinates:   [2]string{"110.37", "-7.80"},
			IsProvinceDispatcher: true,
		},
	}
	field := filterNearbyField(pool, "3404", 1, "Ambulance", -7.86, 110.34, 40, nil)
	ids := map[string]bool{}
	for _, e := range field {
		ids[e.ID] = true
	}
	if !ids["bantul-community"] || !ids["pmi-bantul"] {
		t.Fatalf("border field must include community + verified, got %+v", idsOf(field))
	}
	if ids["bantul-psc"] || ids["prov-disp"] {
		t.Fatalf("command/province must not be in nearby field, got %+v", idsOf(field))
	}
	cmd := filterNearbyCommand(pool, "3404", 1, "Ambulance", -7.86, 110.34, 40, nil)
	if len(cmd) != 1 || cmd[0].ID != "bantul-psc" {
		t.Fatalf("nearby command want bantul-psc, got %+v", idsOf(cmd))
	}
}

func TestWalkCascade_BorderCloserOtherKabFirst(t *testing.T) {
	// Sleman south border: Bantul PMI ~3km, Sleman PMI ~18km → offer Bantul first.
	op := domain.OperationalStatus{IsActive: true, Is24Hours: true}
	fleet := domain.FleetStatus{Total: 2, Available: 1}
	amb := domain.EmergencyType{ID: 1, Name: "Ambulance"}

	tiers := cascadeTiers{
		homeRegencyID: "3404",
		radiusPool: []domain.Emergency{
			{
				ID: "pmi-sleman-far", Name: "PMI Sleman", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3404", ProvinceID: "34"},
				Coordinates: [2]string{"110.36", "-7.70"},
				Operational: op, Fleet: fleet, PartnerTier: domain.PartnerTierVerified,
				IsDispatcher: true,
			},
			{
				ID: "pmi-bantul-near", Name: "PMI Bantul", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3402", ProvinceID: "34"},
				Coordinates: [2]string{"110.34", "-7.875"},
				Operational: op, Fleet: fleet, PartnerTier: domain.PartnerTierVerified,
				IsDispatcher: true,
			},
			{
				ID: "psc-sleman", Name: "PSC 119 Sleman", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3404", ProvinceID: "34"},
				Coordinates: [2]string{"110.35", "-7.72"},
				Operational: op, Fleet: fleet, PartnerTier: domain.PartnerTierPSC,
				IsDispatcher: true,
			},
			{
				ID: "psc-bantul", Name: "PSC 119 Bantul", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3402", ProvinceID: "34"},
				Coordinates: [2]string{"110.33", "-7.90"},
				Operational: op, Fleet: fleet, PartnerTier: domain.PartnerTierPSC,
				IsDispatcher: true,
			},
		},
	}

	svc := &DispatchService{}
	borderLat, borderLng := -7.86, 110.34
	ranked := svc.walkCascadeTiers(tiers, borderLat, borderLng, 1, "Ambulance", nil, true)
	ids := rankedIDs(ranked)
	if len(ids) == 0 || ids[0] != "pmi-bantul-near" {
		t.Fatalf("closer Bantul must be first, got %+v", ids)
	}
	pos := func(id string) int {
		for i, v := range ids {
			if v == id {
				return i
			}
		}
		return -1
	}
	if !(pos("pmi-bantul-near") < pos("pmi-sleman-far")) {
		t.Fatalf("Bantul nearer must precede Sleman farther: %+v", ids)
	}
}

func TestWalkCascade_DistanceFirst_SameKabStillWinsWhenCloser(t *testing.T) {
	op := domain.OperationalStatus{IsActive: true, Is24Hours: true}
	fleet := domain.FleetStatus{Total: 2, Available: 1}
	amb := domain.EmergencyType{ID: 1, Name: "Ambulance"}
	tiers := cascadeTiers{
		homeRegencyID: "3404",
		radiusPool: []domain.Emergency{
			{
				ID: "mpd-near", Name: "MPD Pogung", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3404", ProvinceID: "34"},
				Coordinates: [2]string{"110.375", "-7.755"},
				Operational: op, Fleet: fleet,
			},
			{
				ID: "pmi-bantul-far", Name: "PMI Bantul", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3402", ProvinceID: "34"},
				Coordinates: [2]string{"110.33", "-7.89"},
				Operational: op, Fleet: fleet, PartnerTier: domain.PartnerTierVerified,
				IsDispatcher: true,
			},
		},
	}
	svc := &DispatchService{}
	ranked := svc.walkCascadeTiers(tiers, -7.76, 110.38, 1, "Ambulance", nil, true)
	if len(ranked) < 2 || ranked[0].Emergency.ID != "mpd-near" {
		t.Fatalf("closer Sleman must win over far Bantul, got %+v", rankedIDs(ranked))
	}
}

func TestWalkCascade_TuriPrefersCloserDispatcherPMI(t *testing.T) {
	// Jalan Turi / Tridadi: PMI Sleman & PSC SES (~2km) must beat MPD Peduli (~7km)
	// even though PMI/PSC are is_dispatcher=true.
	op := domain.OperationalStatus{IsActive: true, Is24Hours: true}
	fleet := domain.FleetStatus{Total: 2, Available: 1}
	amb := domain.EmergencyType{ID: 1, Name: "Ambulance"}
	tiers := cascadeTiers{
		homeRegencyID: "3404",
		radiusPool: []domain.Emergency{
			{
				ID: "mpd-peduli", Name: "Ambulance MPD Peduli", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3404", ProvinceID: "34"},
				Coordinates: [2]string{"110.3728971", "-7.7597992"},
				Operational: op, Fleet: fleet, PartnerTier: domain.PartnerTierVerified,
			},
			{
				ID: "pmi-sleman", Name: "PMI Kab. Sleman", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3404", ProvinceID: "34"},
				Coordinates: [2]string{"110.3475165", "-7.7062870"},
				Operational: op, Fleet: fleet, PartnerTier: domain.PartnerTierVerified,
				IsDispatcher: true,
			},
			{
				ID: "psc-ses", Name: "PSC 119 SES", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3404", ProvinceID: "34"},
				Coordinates: [2]string{"110.3564900", "-7.7186470"},
				Operational: op, Fleet: fleet, PartnerTier: domain.PartnerTierPSC,
				IsDispatcher: true,
			},
		},
	}
	svc := &DispatchService{}
	ranked := svc.walkCascadeTiers(tiers, -7.696535388181718, 110.35303115844727, 1, "Ambulance", nil, true)
	ids := rankedIDs(ranked)
	if len(ids) < 3 {
		t.Fatalf("expected 3 candidates, got %+v", ids)
	}
	if ids[0] != "pmi-sleman" {
		t.Fatalf("PMI Sleman must be first on Jalan Turi, got %+v", ids)
	}
	if ids[1] != "psc-ses" {
		t.Fatalf("PSC SES must be second, got %+v", ids)
	}
	if ids[2] != "mpd-peduli" {
		t.Fatalf("MPD Peduli must be third, got %+v", ids)
	}
}

func TestRankCandidates_DistanceBeatsFleetAndReadiness(t *testing.T) {
	// After PMI rejects: bare PSC SES ~2.5km must beat fully-equipped MPD ~7km.
	op := domain.OperationalStatus{IsActive: true, Is24Hours: true}
	amb := domain.EmergencyType{ID: 1, Name: "Ambulance"}
	candidates := []domain.Emergency{
		{
			ID: "mpd-peduli", Name: "Ambulance MPD Peduli", EmergencyType: amb,
			Coordinates: [2]string{"110.3728971", "-7.7597992"},
			Operational: op,
			Fleet:       domain.FleetStatus{Total: 5, Available: 5},
			PartnerTier: domain.PartnerTierVerified,
			Readiness:   domain.Readiness{TrainedDriver: true, HasOxygen: true, HasStretcher: true},
		},
		{
			ID: "psc-ses", Name: "PSC 119 SES", EmergencyType: amb,
			Coordinates: [2]string{"110.3564900", "-7.7186470"},
			Operational: op,
			Fleet:       domain.FleetStatus{},
			PartnerTier: domain.PartnerTierPSC,
			IsDispatcher: true,
		},
	}
	lat, lng := -7.696535388181718, 110.35303115844727
	ranked := RankCandidates(candidates, lat, lng, 1, "Ambulance", map[string]struct{}{"pmi-sleman": {}})
	if len(ranked) < 2 || ranked[0].Emergency.ID != "psc-ses" {
		t.Fatalf("PSC SES must win after PMI reject, got %+v scores=%v",
			rankedIDs(ranked),
			func() []float64 {
				out := make([]float64, len(ranked))
				for i := range ranked {
					out[i] = ranked[i].Score
				}
				return out
			}())
	}
}

func TestWalkCascade_AfterExcludePMI_PrefersSESOverMPD(t *testing.T) {
	op := domain.OperationalStatus{IsActive: true, Is24Hours: true}
	amb := domain.EmergencyType{ID: 1, Name: "Ambulance"}
	tiers := cascadeTiers{
		homeRegencyID: "3404",
		radiusPool: []domain.Emergency{
			{
				ID: "mpd-peduli", Name: "Ambulance MPD Peduli", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3404", ProvinceID: "34"},
				Coordinates: [2]string{"110.3728971", "-7.7597992"},
				Operational: op,
				Fleet:       domain.FleetStatus{Total: 5, Available: 5},
				PartnerTier: domain.PartnerTierVerified,
				Readiness:   domain.Readiness{TrainedDriver: true, HasOxygen: true, HasStretcher: true},
			},
			{
				ID: "psc-ses", Name: "PSC 119 SES", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3404", ProvinceID: "34"},
				Coordinates: [2]string{"110.3564900", "-7.7186470"},
				Operational: op, Fleet: domain.FleetStatus{},
				PartnerTier: domain.PartnerTierPSC, IsDispatcher: true,
			},
		},
	}
	svc := &DispatchService{}
	exclude := map[string]struct{}{"pmi-sleman": {}}
	ranked := svc.walkCascadeTiers(tiers, -7.696535388181718, 110.35303115844727, 1, "Ambulance", exclude, true)
	if len(ranked) == 0 || ranked[0].Emergency.ID != "psc-ses" {
		t.Fatalf("after PMI reject, SES must be next (not MPD), got %+v", rankedIDs(ranked))
	}
}

func TestWalkCascade_ProvinceBeforeNearbyCommand_Pogung(t *testing.T) {
	op := domain.OperationalStatus{IsActive: true, Is24Hours: true}
	fleet := domain.FleetStatus{Total: 2, Available: 1}
	amb := domain.EmergencyType{ID: 1, Name: "Ambulance"}

	tiers := cascadeTiers{
		homeRegencyID: "3404",
		radiusPool: []domain.Emergency{
			{
				ID: "mpd-sleman", Name: "MPD Sleman", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3404", ProvinceID: "34"},
				Coordinates: [2]string{"110.375", "-7.755"},
				Operational: op, Fleet: fleet, PartnerTier: domain.PartnerTierCommunity,
			},
			{
				ID: "pmi-sleman", Name: "PMI Sleman", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3404", ProvinceID: "34"},
				Coordinates: [2]string{"110.36", "-7.72"},
				Operational: op, Fleet: fleet, PartnerTier: domain.PartnerTierVerified,
				IsDispatcher: true,
			},
			{
				ID: "pmi-bantul", Name: "PMI Bantul", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3402", ProvinceID: "34"},
				Coordinates: [2]string{"110.33", "-7.89"},
				Operational: op, Fleet: fleet, PartnerTier: domain.PartnerTierVerified,
				IsDispatcher: true,
			},
			{
				ID: "psc-sleman", Name: "PSC 119 Sleman", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3404", ProvinceID: "34"},
				Coordinates: [2]string{"110.35", "-7.72"},
				Operational: op, Fleet: fleet, PartnerTier: domain.PartnerTierPSC,
				IsDispatcher: true,
			},
			{
				ID: "pmi-diy", Name: "PMI DIY", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3404", ProvinceID: "34"},
				Coordinates: [2]string{"110.37", "-7.80"},
				Operational: op, Fleet: fleet, PartnerTier: domain.PartnerTierVerified,
				IsProvinceDispatcher: true,
			},
			{
				ID: "psc-bantul", Name: "PSC 119 Bantul", EmergencyType: amb,
				Address:     domain.Address{RegencyID: "3402", ProvinceID: "34"},
				Coordinates: [2]string{"110.33", "-7.90"},
				Operational: op, Fleet: fleet, PartnerTier: domain.PartnerTierPSC,
				IsDispatcher: true,
			},
		},
	}

	svc := &DispatchService{}
	ranked := svc.walkCascadeTiers(tiers, -7.76, 110.38, 1, "Ambulance", nil, true)
	ids := rankedIDs(ranked)
	pos := func(id string) int {
		for i, v := range ids {
			if v == id {
				return i
			}
		}
		return -1
	}
	if !(pos("mpd-sleman") < pos("pmi-bantul") && pos("pmi-sleman") < pos("pmi-bantul")) {
		t.Fatalf("closer Sleman must precede far Bantul: %+v", ids)
	}
	if ids[0] != "mpd-sleman" {
		t.Fatalf("nearest MPD first at Pogung, got %+v", ids)
	}
}

func TestCascadeLanesStaySeparate(t *testing.T) {
	cases := []struct {
		typeID   uint
		typeName string
		wantID   string
		forbid   []string
	}{
		{1, "Ambulance", "amb-disp", []string{"damkar-disp", "sar-disp"}},
		{2, "Damkar", "damkar-disp", []string{"amb-disp", "sar-disp"}},
		{3, "SAR", "sar-disp", []string{"amb-disp", "damkar-disp"}},
	}
	pool := []domain.Emergency{
		{ID: "amb-disp", Name: "PSC 119", EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"}, Address: domain.Address{RegencyID: "3404"}, IsDispatcher: true},
		{ID: "damkar-disp", Name: "Damkar Kab", EmergencyType: domain.EmergencyType{ID: 2, Name: "Damkar"}, Address: domain.Address{RegencyID: "3404"}, IsDispatcher: true},
		{ID: "sar-disp", Name: "Basarnas Dispatcher", EmergencyType: domain.EmergencyType{ID: 3, Name: "SAR"}, Address: domain.Address{RegencyID: "3404"}, IsDispatcher: true},
	}
	for _, tc := range cases {
		tiers := splitRegencyCascade(pool, "3404", tc.typeID, tc.typeName)
		if len(tiers.regencyDispatchers) != 1 || tiers.regencyDispatchers[0].ID != tc.wantID {
			t.Fatalf("%s: got %+v want %s", tc.typeName, idsOf(tiers.regencyDispatchers), tc.wantID)
		}
		for _, id := range tc.forbid {
			for _, e := range tiers.regencyDispatchers {
				if e.ID == id {
					t.Fatalf("%s cascade must not include %s", tc.typeName, id)
				}
			}
		}
	}
}

func rankedIDs(ranked []domain.RankedCandidate) []string {
	ids := make([]string, len(ranked))
	for i, c := range ranked {
		ids[i] = c.Emergency.ID
	}
	return ids
}

func idsOf(list []domain.Emergency) []string {
	ids := make([]string, len(list))
	for i, e := range list {
		ids[i] = e.ID
	}
	return ids
}

func TestMedicalPSCPartner_ExcludesDamkar(t *testing.T) {
	damkar := domain.Emergency{
		ID: "damkar-yogya", Name: "Damkar Kota Yogyakarta",
		EmergencyType: domain.EmergencyType{ID: 2, Name: "Damkar"},
		PartnerTier:   domain.PartnerTierPSC,
		IsDispatcher:  true,
		Address:       domain.Address{RegencyID: "3471", ProvinceID: "34"},
	}
	if isMedicalPSCPartner(damkar) {
		t.Fatal("Damkar must never count as medical PSC partner")
	}
	if isPSCPartner(damkar) {
		t.Fatal("isPSCPartner must not treat Damkar as PSC")
	}

	psc := domain.Emergency{
		ID: "psc-yogya", Name: "PSC 119 Kota Yogyakarta",
		EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
		PartnerTier:   domain.PartnerTierPSC,
		IsDispatcher:  true,
		Address:       domain.Address{RegencyID: "3471", ProvinceID: "34"},
	}
	if !isMedicalPSCPartner(psc) {
		t.Fatal("PSC 119 must count as medical PSC partner")
	}
}

func TestPickEscalationTarget_PrefersMedicalPSCOverDamkar(t *testing.T) {
	pool := []domain.Emergency{
		{
			ID: "damkar-yogya", Name: "Damkar Kota Yogyakarta",
			EmergencyType: domain.EmergencyType{ID: 2, Name: "Damkar"},
			IsDispatcher:  true,
			Address:       domain.Address{RegencyID: "3471", ProvinceID: "34"},
			Contact:       domain.Contact{Phone: "0274123"},
		},
		{
			ID: "psc-yogya", Name: "PSC 119 Kota Yogyakarta",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			PartnerTier:   domain.PartnerTierPSC,
			IsDispatcher:  true,
			Address:       domain.Address{RegencyID: "3471", ProvinceID: "34"},
			Contact:       domain.Contact{Phone: "119"},
		},
		{
			ID: "psc-diy", Name: "PSC DIY / SPGDT",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			PartnerTier:   domain.PartnerTierPSC,
			IsProvinceDispatcher: true,
			Address:             domain.Address{RegencyID: "3404", ProvinceID: "34"},
			Contact:             domain.Contact{Phone: "027456789"},
		},
	}

	rt := routingCtx{typeID: 1, typeName: "Ambulance", regencyID: "3471", provinceID: "34"}
	best := pickEscalationTargetFrom(pool, rt, "medical")
	if best == nil || best.ID != "psc-yogya" {
		got := "nil"
		if best != nil {
			got = best.ID
		}
		t.Fatalf("want psc-yogya, got %s", got)
	}

	poolNoCity := []domain.Emergency{pool[0], pool[2]}
	best = pickEscalationTargetFrom(poolNoCity, rt, "medical")
	if best == nil || best.ID != "psc-diy" {
		got := "nil"
		if best != nil {
			got = best.ID
		}
		t.Fatalf("want psc-diy fallback, got %s", got)
	}
}

func pickEscalationTargetFrom(all []domain.Emergency, rt routingCtx, reqFam string) *domain.Emergency {
	var best *domain.Emergency
	bestScore := 1e9
	for i := range all {
		e := &all[i]
		fam := candidateFamily(*e)
		switch reqFam {
		case "medical":
			if fam == "fire" || fam == "sar" {
				continue
			}
			medicalPSC := isMedicalPSCPartner(*e)
			medicalProvCmd := e.IsProvinceDispatcher && (fam == "medical" || medicalPSC)
			medicalKabPSC := e.IsDispatcher && medicalPSC
			if !medicalPSC && !medicalProvCmd && !medicalKabPSC {
				continue
			}
		default:
			continue
		}
		if rt.provinceID != "" && e.Address.ProvinceID != "" && e.Address.ProvinceID != rt.provinceID {
			continue
		}
		score := 50.0
		if isMedicalPSCPartner(*e) {
			score -= 25
		}
		if strings.EqualFold(strings.TrimSpace(e.PartnerTier), domain.PartnerTierPSC) {
			score -= 10
		}
		if rt.regencyID != "" && e.Address.RegencyID == rt.regencyID {
			score -= 20
		}
		if e.IsProvinceDispatcher {
			score -= 12
		} else if e.IsDispatcher && isMedicalPSCPartner(*e) {
			score -= 8
		}
		if score < bestScore {
			bestScore = score
			best = e
		}
	}
	return best
}

func TestChoosePreferredOrBest_OverridesFarListPick(t *testing.T) {
	// Jalan Turi pattern: PMI ~1.2km, PSC ~2.5km, MPD Peduli ~7km.
	ranked := []domain.RankedCandidate{
		{Emergency: domain.Emergency{ID: "pmi-sleman", Name: "PMI Sleman"}, DistanceKm: 1.2},
		{Emergency: domain.Emergency{ID: "psc-ses", Name: "PSC 119 SES"}, DistanceKm: 2.5},
		{Emergency: domain.Emergency{ID: "mpd-peduli", Name: "MPD Peduli"}, DistanceKm: 7.4},
	}

	got := choosePreferredOrBest(ranked, "mpd-peduli")
	if got == nil || got.Emergency.ID != "pmi-sleman" {
		t.Fatalf("far list pick must yield to closest, got %+v", got)
	}

	got = choosePreferredOrBest(ranked, "psc-ses")
	if got == nil || got.Emergency.ID != "psc-ses" {
		t.Fatalf("near-equivalent pick (≤%.1fkm slack) should be kept, got %+v",
			domain.PreferSelectedSlackKm, got)
	}

	got = choosePreferredOrBest(ranked, "")
	if got == nil || got.Emergency.ID != "pmi-sleman" {
		t.Fatalf("empty prefer must pick closest, got %+v", got)
	}
}

