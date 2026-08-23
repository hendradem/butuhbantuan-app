package hospitalprovider

import (
	"encoding/json"
	"net/url"
	"strconv"
	"testing"
)

func TestParseMSIRowKabkota(t *testing.T) {
	raw := []byte(`{
		"kode_satusehat": "1000282751",
		"kode_sarana": "3404157",
		"nama": "RS Umum Sakina Idaman",
		"telp": "0274-5018221",
		"alamat": "Jalan Nyi Tjondroloekito No. 60",
		"latitude": -7.76742,
		"longitude": 110.36801,
		"provinsi": {"kode":"34","nama":"Yogyakarta","kode_bps":"34"},
		"kabkota": {"kode":"3404","nama":"Kab. Sleman","kode_bps":"3404"},
		"jenis_sarana": {"kode":"104","nama":"Rumah Sakit"},
		"kelas_sarana": {"kode":"C","nama":"C"}
	}`)
	var row msiRow
	if err := json.Unmarshal(raw, &row); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !isHospital(row) {
		t.Fatal("expected hospital jenis_sarana 104")
	}
	kab := row.wilayahKab()
	if !regencyMatch("3404", "Kabupaten Sleman", kab.KodeBPS, kab.Nama) {
		t.Fatalf("regencyMatch failed for kabkota=%+v", kab)
	}
	if stringify(row.KodeSatuSehat) != "1000282751" {
		t.Fatalf("kode_satusehat=%q", stringify(row.KodeSatuSehat))
	}
	if row.Telp != "0274-5018221" {
		t.Fatalf("telp=%q", row.Telp)
	}
	if row.KelasSarana.Nama != "C" {
		t.Fatalf("kelas=%q", row.KelasSarana.Nama)
	}
}

func TestRegencyMatchKabAbbreviation(t *testing.T) {
	if !regencyMatch("3404", "Kabupaten Sleman", "3404", "Kab. Sleman") {
		t.Fatal("expected Kab. Sleman to match Kabupaten Sleman")
	}
}

func TestParseExpiresInString(t *testing.T) {
	if got := parseExpiresIn(json.RawMessage(`"14399"`)); got != 14399 {
		t.Fatalf("got %d", got)
	}
}

func TestMSIQueryUsesKodeKabkota(t *testing.T) {
	q := url.Values{}
	q.Set("page", strconv.Itoa(1))
	q.Set("limit", strconv.Itoa(100))
	q.Set("jenis_sarana", "104")
	q.Set("kode_kabkota", "3404")
	q.Set("kode_provinsi", "34")
	got := q.Encode()
	if got != "jenis_sarana=104&kode_kabkota=3404&kode_provinsi=34&limit=100&page=1" {
		t.Fatalf("unexpected query encoding: %s", got)
	}
}
