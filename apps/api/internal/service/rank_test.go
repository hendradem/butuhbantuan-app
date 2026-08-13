package service

import (
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

func TestRankCandidates_PrefersPSCWithinTier(t *testing.T) {
	candidates := []domain.Emergency{
		{
			ID:            "ambulance-unit",
			Name:          "Ambulance MPD",
			Coordinates:   [2]string{"110.02", "-7.02"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			IsDispatcher:  false,
			PartnerTier:   domain.PartnerTierCommunity,
		},
		{
			ID:            "psc-local",
			Name:          "PSC 119 SES",
			Coordinates:   [2]string{"110.08", "-7.08"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: false, OpenTime: "08:00", CloseTime: "16:00"},
			IsDispatcher:  true,
			PartnerTier:   domain.PartnerTierPSC,
		},
	}
	ranked := RankCandidates(candidates, -7.0, 110.0, 1, "Ambulance", nil)
	if len(ranked) == 0 || ranked[0].Emergency.ID != "psc-local" {
		t.Fatalf("expected PSC preferred within tier, got %+v", rankedIDs(ranked))
	}
}

func TestRankCandidates_PartnerTierBeatsDistance(t *testing.T) {
	candidates := []domain.Emergency{
		{
			ID:            "near-community",
			Name:          "Near Community",
			Coordinates:   [2]string{"110.01", "-7.01"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			PartnerTier:   domain.PartnerTierCommunity,
			Fleet:         domain.FleetStatus{Total: 1, Available: 1},
		},
		{
			ID:            "far-verified",
			Name:          "Far Verified",
			Coordinates:   [2]string{"110.06", "-7.06"},
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
			PartnerTier:   domain.PartnerTierVerified,
			Fleet:         domain.FleetStatus{Total: 1, Available: 1},
		},
	}
	ranked := RankCandidates(candidates, -7.0, 110.0, 1, "Ambulance", nil)
	if len(ranked) < 2 || ranked[0].Emergency.ID != "far-verified" {
		t.Fatalf("expected verified over nearer community, got %+v", rankedIDs(ranked))
	}
}

func TestRankCandidates_ReadinessBoost(t *testing.T) {
	base := domain.Emergency{
		Coordinates:   [2]string{"110.05", "-7.05"},
		EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
		Operational:   domain.OperationalStatus{IsActive: true, Is24Hours: true},
		PartnerTier:   domain.PartnerTierCommunity,
		Fleet:         domain.FleetStatus{Total: 1, Available: 1},
	}
	ready := base
	ready.ID = "ready"
	ready.Name = "Ready Unit"
	ready.Readiness = domain.Readiness{TrainedDriver: true, HasOxygen: true, HasStretcher: true}

	bare := base
	bare.ID = "bare"
	bare.Name = "Bare Unit"

	ranked := RankCandidates([]domain.Emergency{bare, ready}, -7.0, 110.0, 1, "Ambulance", nil)
	if len(ranked) < 2 || ranked[0].Emergency.ID != "ready" {
		t.Fatalf("expected readiness boost to win, got %+v", rankedIDs(ranked))
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

func TestSplitCascadeTiers(t *testing.T) {
	list := []domain.Emergency{
		{
			ID: "local-unit", Name: "Ambulance MPD",
			EmergencyType: domain.EmergencyType{ID: 1, Name: "Ambulance"},
			Address:       domain.Address{RegencyID: "3404", ProvinceID: "34"},
			IsDispatcher:  false,
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
	if len(tiers.regencyDispatchers) != 1 || tiers.regencyDispatchers[0].ID != "kab-disp" {
		t.Fatalf("regency dispatchers: %+v", idsOf(tiers.regencyDispatchers))
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
