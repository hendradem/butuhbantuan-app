package domain

import "testing"

func TestResolveJenisPelayanan(t *testing.T) {
	unit := Emergency{TipeEmergency: []string{"emergency", "transport", "jenazah"}}

	got, err := ResolveJenisPelayanan("transport", unit)
	if err != nil || got != "transport" {
		t.Fatalf("transport: got %q err %v", got, err)
	}

	got, err = ResolveJenisPelayanan("", Emergency{TipeEmergency: []string{"jenazah"}})
	if err != nil || got != "jenazah" {
		t.Fatalf("auto-pick: got %q err %v", got, err)
	}

	_, err = ResolveJenisPelayanan("", unit)
	if err != ErrJenisPelayananRequired {
		t.Fatalf("expected required err, got %v", err)
	}

	_, err = ResolveJenisPelayanan("pemadam", unit)
	if err == nil {
		t.Fatal("expected not offered error")
	}
}
