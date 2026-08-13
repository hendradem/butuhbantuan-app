# Wilayah Indonesia (master)

Sumber: [emsifa/api-wilayah-indonesia](https://emsifa.github.io/api-wilayah-indonesia/) (BPS-style IDs).

- `provinces.json` — 34 provinsi
- `regencies.json` — 514 kabupaten/kota

Dipakai sebagai **master FK** untuk form wilayah & layanan.  
**Cakupan produk** tetap di `../available_regions.json` / menu Wilayah Tercakup (opt-in per kab/kota).

Seed hanya master:

```bash
cd apps/api && STORAGE=mysql go run ./cmd/main.go --seed-wilayah
```

Full seed (master + coverage DIY + emergencies):

```bash
cd apps/api && STORAGE=mysql go run ./cmd/main.go --seed
```
