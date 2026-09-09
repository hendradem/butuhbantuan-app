package hospitalprovider

import (
	"encoding/json"
	"os"
	"testing"
)

func TestParseLiveSlemanSnapshot(t *testing.T) {
	raw, err := os.ReadFile("/tmp/msi_sleman.json")
	if err != nil {
		t.Skip("no snapshot:", err)
	}
	var parsed struct {
		Data      []msiRow `json:"data"`
		TotalPage int      `json:"total_page"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(parsed.Data) == 0 {
		t.Fatal("empty data")
	}
	kept := 0
	for _, row := range parsed.Data {
		if !isHospital(row) {
			t.Fatalf("not hospital: %+v", row.JenisSarana)
		}
		kab := row.wilayahKab()
		if !regencyMatch("3404", "Kabupaten Sleman", firstNonEmpty(kab.KodeBPS, kab.Kode), kab.Nama) {
			t.Fatalf("regency mismatch: %+v", kab)
		}
		code := firstNonEmpty(stringify(row.KodeSatuSehat), row.KodeSarana, row.ID)
		name := firstNonEmpty(row.Nama, row.Name)
		if code == "" || name == "" {
			t.Fatalf("missing code/name row=%+v", row)
		}
		kept++
	}
	t.Logf("kept=%d total_page=%d", kept, parsed.TotalPage)
	if kept < 10 {
		t.Fatalf("expected many hospitals, got %d", kept)
	}
}

func TestLiveListByRegencySleman(t *testing.T) {
	cid := os.Getenv("SATUSEHAT_CLIENT_ID")
	csec := os.Getenv("SATUSEHAT_CLIENT_SECRET")
	if cid == "" || csec == "" {
		t.Skip("no credentials")
	}
	p := NewSatuSehatProvider(os.Getenv("SATUSEHAT_BASE_URL"), cid, csec)
	items, err := p.ListByRegency("3404", "Kabupaten Sleman", "34", "DI Yogyakarta")
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("fetched=%d first=%s", len(items), items[0].Name)
	if len(items) == 0 {
		t.Fatal("empty")
	}
}
