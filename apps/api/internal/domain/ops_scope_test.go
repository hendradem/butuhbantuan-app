package domain

import "testing"

func TestTicketInScope_regency(t *testing.T) {
	scope := OpsScope{RegencyID: "3404"}
	if !TicketInScope(OrderTicket{RegencyID: "3404"}, scope) {
		t.Fatal("expected in scope")
	}
	if TicketInScope(OrderTicket{RegencyID: "3401"}, scope) {
		t.Fatal("expected out of scope")
	}
	if TicketInScope(OrderTicket{}, scope) {
		t.Fatal("empty regency must fail closed")
	}
}

func TestTicketInScope_province(t *testing.T) {
	scope := OpsScope{ProvinceID: "34", ProvinceWide: true}
	if !TicketInScope(OrderTicket{ProvinceID: "34", RegencyID: "3404"}, scope) {
		t.Fatal("expected in scope")
	}
	if TicketInScope(OrderTicket{ProvinceID: "31"}, scope) {
		t.Fatal("expected out of scope")
	}
}

func TestOpsScopeFromEmergency(t *testing.T) {
	kab := Emergency{
		ID: "u1", Name: "Disp Kab",
		IsDispatcher: true,
		Address:      Address{RegencyID: "3404", ProvinceID: "34"},
	}
	s, ok := OpsScopeFromEmergency(kab)
	if !ok || s.ProvinceWide || s.RegencyID != "3404" {
		t.Fatalf("kab scope: %+v ok=%v", s, ok)
	}

	prov := Emergency{
		ID: "u2", Name: "Disp Prov",
		IsDispatcher: true, IsProvinceDispatcher: true,
		Address: Address{RegencyID: "3404", ProvinceID: "34"},
	}
	s, ok = OpsScopeFromEmergency(prov)
	if !ok || !s.ProvinceWide || s.ProvinceID != "34" {
		t.Fatalf("prov scope: %+v ok=%v", s, ok)
	}

	plain := Emergency{ID: "u3", Address: Address{RegencyID: "3404"}}
	if _, ok := OpsScopeFromEmergency(plain); ok {
		t.Fatal("non-dispatcher must not get scope")
	}
}
