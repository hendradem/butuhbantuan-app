package domain

// OpsScope describes the wilayah a dispatcher unit is allowed to supervise.
// Never trust client-supplied scope — always derive from the authenticated emergency.
type OpsScope struct {
	ActorUUID    string `json:"actor_uuid"`
	UnitName     string `json:"unit_name,omitempty"`
	RegencyID    string `json:"regency_id,omitempty"`
	ProvinceID   string `json:"province_id,omitempty"`
	ProvinceWide bool   `json:"province_wide"`
}

// TicketInScope reports whether a ticket falls inside the dispatcher wilayah.
// Tickets missing the scoped region key are excluded (fail closed).
func TicketInScope(ticket OrderTicket, scope OpsScope) bool {
	if scope.ProvinceWide {
		return scope.ProvinceID != "" && ticket.ProvinceID == scope.ProvinceID
	}
	return scope.RegencyID != "" && ticket.RegencyID == scope.RegencyID
}

// EmergencyInScope reports whether a unit HQ falls inside the dispatcher wilayah.
func EmergencyInScope(e Emergency, scope OpsScope) bool {
	if scope.ProvinceWide {
		return scope.ProvinceID != "" && e.Address.ProvinceID == scope.ProvinceID
	}
	return scope.RegencyID != "" && e.Address.RegencyID == scope.RegencyID
}

// OpsScopeFromEmergency builds scope for a unit that is a kab/province dispatcher.
// Returns ok=false when the unit is not a dispatcher or lacks wilayah ids.
func OpsScopeFromEmergency(e Emergency) (OpsScope, bool) {
	if !e.IsDispatcher && !e.IsProvinceDispatcher {
		return OpsScope{}, false
	}
	scope := OpsScope{
		ActorUUID:  e.ID,
		UnitName:   e.Name,
		RegencyID:  e.Address.RegencyID,
		ProvinceID: e.Address.ProvinceID,
	}
	if e.IsProvinceDispatcher {
		scope.ProvinceWide = true
		if scope.ProvinceID == "" {
			return OpsScope{}, false
		}
		return scope, true
	}
	if scope.RegencyID == "" {
		return OpsScope{}, false
	}
	return scope, true
}
