package domain

import "testing"

func TestUsesWaDispatch(t *testing.T) {
	tests := []struct {
		name             string
		e                Emergency
		hasUnitLogin     bool
		wantWaDispatch   bool
	}{
		{
			name:           "explicit no dashboard",
			e:              Emergency{DashboardAccess: false, OrganizationType: "Ambulance"},
			hasUnitLogin:   true,
			wantWaDispatch: true,
		},
		{
			name:           "dashboard flag but no login",
			e:              Emergency{DashboardAccess: true, OrganizationType: "Ambulance"},
			hasUnitLogin:   false,
			wantWaDispatch: true,
		},
		{
			name:           "dashboard with login",
			e:              Emergency{DashboardAccess: true, OrganizationType: "Ambulance"},
			hasUnitLogin:   true,
			wantWaDispatch: false,
		},
		{
			name:           "hospital never wa dispatch",
			e:              Emergency{DashboardAccess: false, OrganizationType: "rumah_sakit"},
			hasUnitLogin:   false,
			wantWaDispatch: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := tc.e.UsesWaDispatch(tc.hasUnitLogin)
			if got != tc.wantWaDispatch {
				t.Fatalf("UsesWaDispatch(%v) = %v, want %v", tc.hasUnitLogin, got, tc.wantWaDispatch)
			}
		})
	}
}
