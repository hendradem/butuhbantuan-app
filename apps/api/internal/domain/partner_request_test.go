package domain

import (
	"errors"
	"testing"
)

func validPartnerRequest() PartnerRequest {
	return PartnerRequest{
		Payload: Emergency{
			Name:        "Ambulans Relawan Sleman",
			Coordinates: [2]string{"110.3626", "-7.7971"}, // [lng, lat]
			EmergencyType: EmergencyType{
				ID: 3,
			},
			Contact: Contact{Phone: "081234567890"},
		},
	}
}

func TestValidatePartnerRequest(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(*PartnerRequest)
		wantErr error
	}{
		{"valid", func(*PartnerRequest) {}, nil},
		{"only whatsapp is enough", func(p *PartnerRequest) {
			p.Payload.Contact = Contact{Whatsapp: "081234567890"}
		}, nil},
		{"missing name", func(p *PartnerRequest) {
			p.Payload.Name = "   "
		}, ErrPartnerRequestNameRequired},
		{"missing type", func(p *PartnerRequest) {
			p.Payload.EmergencyType.ID = 0
		}, ErrPartnerRequestTypeRequired},
		{"missing contact", func(p *PartnerRequest) {
			p.Payload.Contact = Contact{}
		}, ErrPartnerRequestContactRequired},
		{"missing coordinates", func(p *PartnerRequest) {
			p.Payload.Coordinates = [2]string{"", ""}
		}, ErrPartnerRequestLocationRequired},
		{"zero coordinates", func(p *PartnerRequest) {
			p.Payload.Coordinates = [2]string{"0", "0"}
		}, ErrPartnerRequestLocationRequired},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := validPartnerRequest()
			tt.mutate(&req)
			err := ValidatePartnerRequest(req)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("got %v, want %v", err, tt.wantErr)
			}
		})
	}
}

func TestCanTransitionPartnerRequest(t *testing.T) {
	tests := []struct {
		from, to string
		want     bool
	}{
		{PartnerRequestPending, PartnerRequestContacted, true},
		{PartnerRequestPending, PartnerRequestApproved, true},
		{PartnerRequestPending, PartnerRequestRejected, true},
		{PartnerRequestContacted, PartnerRequestApproved, true},
		{PartnerRequestContacted, PartnerRequestRejected, true},
		// Terminal states stay put.
		{PartnerRequestApproved, PartnerRequestRejected, false},
		{PartnerRequestApproved, PartnerRequestContacted, false},
		{PartnerRequestRejected, PartnerRequestApproved, false},
		{PartnerRequestRejected, PartnerRequestContacted, false},
		{PartnerRequestContacted, PartnerRequestPending, false},
		// Unknown statuses are rejected, and unknown targets never match.
		{"", PartnerRequestContacted, false},
		{PartnerRequestPending, "whatever", false},
	}

	for _, tt := range tests {
		t.Run(tt.from+"->"+tt.to, func(t *testing.T) {
			if got := CanTransitionPartnerRequest(tt.from, tt.to); got != tt.want {
				t.Fatalf("CanTransition(%q, %q) = %v, want %v", tt.from, tt.to, got, tt.want)
			}
		})
	}
}

func TestNormalizePartnerRequestStatus(t *testing.T) {
	tests := map[string]string{
		"":                     PartnerRequestPending,
		"  ":                   PartnerRequestPending,
		"APPROVED":             PartnerRequestApproved,
		" Contacted ":          PartnerRequestContacted,
		"nonsense":             PartnerRequestPending,
		PartnerRequestRejected: PartnerRequestRejected,
	}
	for in, want := range tests {
		if got := NormalizePartnerRequestStatus(in); got != want {
			t.Fatalf("Normalize(%q) = %q, want %q", in, got, want)
		}
	}
}
