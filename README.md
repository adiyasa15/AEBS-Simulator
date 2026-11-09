# AEBS Simulator — Dump Truck

Simulasi **Advanced Emergency Braking System** versi 2D top-down untuk dump truck tambang.
Tanpa build step: HTML + ES modules, cukup disajikan lewat HTTP statis.

```
python3 -m http.server 4317
# buka http://127.0.0.1:4317/
```

Cara deploy (Docker, nginx, LAN site, hosting statis, offline tablet): lihat
[DEPLOY.md](DEPLOY.md).

Di dalam aplikasi, tombol **📐 Metode perhitungan** membuka 13 bagian dokumentasi
perhitungan — termasuk diagram gaya (free-body) dan diagram alur keputusan dalam SVG.

## Cara kerja model

1D memanjang. `sEgo` = bemper depan, `sLead` = buritan objek.
`gap = sLead − sEgo`, `closing = vEgo − vLead`, `TTC = gap / closing`.

Rantai perlambatan:

```
a_tersedia = min(μ·g, aCap(massa))
perintah AEB ──latency──▶ rem bangun (build-up) ──▶ a_aktual
```

- **aCap** interpolasi linear `aCapEmpty → aCapLoaded` sesuai status muatan.
- **μ** dari pemilihan permukaan (0.65 kering aspal … 0.28 berlumpur).
- **Latency** = `sensorDelay + processDelay`, lalu tekanan rem naik selama `brakeBuild`.
  Rem angin truk jauh lebih lambat dari EV — ini yang bikin hasilnya beda.
- **Regen** hanya untuk EV, menambah perlambatan tanpa menunggu build-up.
- Ada **model pengemudi**: jaga kecepatan awal, dan throttle mati total
  begitu AEB mengintervensi (jadi setelah diselamatkan, dia tidak mengejar lagi).

### Keputusan AEB

| Kondisi | Aksi |
|---|---|
| `TTC ≤ warnTTC` (2.6 s) | peringatan |
| `TTC ≤ partialTTC` (1.8 s) atau `a_req ≥ 0.5·a_tersedia` | rem sebagian (55 %) |
| `TTC ≤ fullTTC` (0.9 s) atau `a_req ≥ 0.9·a_tersedia`, atau `gap < 4 m` | rem penuh |

`a_req = closing² / (2·gap)` = perlambatan minimum supaya tidak menabrak.

Tiga mode logic bisa dibandingkan langsung:

- **`TTC relatif`** — meniru logic yang terpasang sekarang. Pemicu hanya TTC/`a_req`.
- **`TTC relatif + jarak aman 4 s`** — ditambah governor headway (THW = gap / v_ego),
  dibatasi 1,2 m/s² supaya tidak jadi pengereman mendadak.
- **`Prediktif`** — feed-forward perlambatan truk depan. Radar memberi range-rate;
  turunannya = `a_lead`. Lalu `a_req_ff = v²/(2·(gap + v_lead²/2a_lead − v·latency − margin))`.
  Rem mulai 0,24 s setelah truk depan mengerem (vs 3–9 s pada TTC relatif).

Bedanya besar pada kasus **konvoi kecepatan hampir sama**: `TTC relatif` menghasilkan
TTC puluhan detik walau jarak cuma 1.3 s, jadi tidak ada peringatan sampai truk depan
sudah mengerem dan closing speed baru terbentuk.

## Yang ditampilkan

- Garis merah putus-putus = **titik henti** kalau rem penuh dipasang sekarang (termasuk latency).
- Kerucut biru = jangkauan sensor 120 m.
- HUD: kecepatan, TTC, gap, deselerasi, % rem, jarak henti, status.
- Telemetri: kecepatan + level rem 12 detik terakhir.
- Event log bertimestamp.

## Spek kendaraan

Panel **Spek teknis (bisa diubah)** — semua angka yang dipakai simulasi bisa diedit langsung.

Preset bawaan:

Cakupan sekarang: **DT (rigid)**. Spek akan diisi per tipe unit — DT, SDT, DDT.

| Tipe | Preset | Kosong | +batubara | Catatan |
|---|---|---|---|---|
| DT | FAW JH6 (diesel) | 26 t | 40.5 t | dari Wahyu; aCap & latency masih asumsi |
| DT | EV rigid | 30 t | 44.5 t | **asumsi**; regen 1.4 m/s², rem lebih responsif |
| SDT | Scania + single trailer | 22 t | 56 t | **spek menyusul** |
| DDT | Scania + double trailer | 28 t | 78 t | **spek menyusul** |
| DDT | EV + double trailer | 34 t | 82 t | **spek menyusul** |

> Sistem pengereman trailer (EBS) tidak dimodelkan — penambahan sistem pada unit trailer
> butuh approval principal.

Field yang bisa diubah: massa kosong/bermuatan, perlambatan rem maksimum kosong/bermuatan,
waktu bangun tekanan rem, latency sensor, panjang kendaraan.

> `aCap` **tidak** otomatis ikut massa. Kalau massa dinaikkan, sesuaikan `Rem maks muat`
> dengan hasil test brake unit yang sebenarnya.

## Skenario cepat

- **Truk berhenti** — 45 km/h, gap 60 m, objek diam.
- **Truk pelan 20** — closing 20 km/h; menunjukkan AEB bukan ACC (kecepatan turun, bukan mengikuti).
- **Truk mendadak** — 55 km/h, gap 45 m, turunan 2 %.
- **Jalan berlumpur** — μ 0.28, 35 km/h.

## Batasan

- 1D — tidak ada manuver mengelak, sudut, atau tikungan.
- Objek tunggal di depan; belum multi-target / cut-in.
- Tidak memodelkan load transfer, ABS, atau retarder/exhaust brake.
- Angka Scania & EV di atas masih asumsi, bukan data pabrikan.
