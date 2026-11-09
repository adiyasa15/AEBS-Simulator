# Analisis Risiko Logic AEBS — DT FAW JH6, Haul Road 30 km

**Revisi 4** — cakupan: **DT (rigid) saja**. SDT/DDT menyusul, spek diinput per tipe unit.
Deteksi **radar 77 GHz mono**, RCS sudah dikonfigurasi, sudut deteksi selebar badan truk.
**Sistem pengereman trailer (EBS) tidak dibahas** — penambahan sistem pada unit trailer
butuh approval principal.

Basis: **FAW JH6 DT — 26 t kosong; vessel berisi 40,5 t batubara → total 66,5 t**.
Rem angin, build-up 0,85 s, latency 0,18 s.
aCap 3,0 m/s² bermuatan / 4,6 m/s² kosong — **masih asumsi**, ganti dengan hasil brake test.
Ambang TTC (2,6 / 1,8 / 0,9 s) juga asumsi; kalau angka vendor berbeda, temuan kualitatifnya
tetap, angkanya bergeser.

Permukaan: **chipseal**. μ yang dipakai di analisis ini 0,60 (kering bersih) — lihat bagian 2.4
untuk rentang lengkap dan kapan μ benar-benar membatasi.

---

## 1. Ringkasan

1. **Aturan 4 detiknya sudah benar; pemicunya belum memenuhi.** Dengan logic terpasang,
   pada jarak 4 detik sistem masih **tabrakan mulai 50 km/h**, dan di **turunan 6 %
   tabrakan di semua kecepatan**. Di 30–45 km/h hasilnya "selamat" dengan sisa **0,4 m**.
2. **Ini masalah pemicu, bukan sensor.** Temuan ini tidak bergantung pada radar apa pun —
   radar 77 GHz dengan RCS yang sudah dikonfigurasi tetap memberi range-rate yang benar.
   Yang salah adalah cara range-rate itu dipakai.
3. **Beam selebar truk mengubah sumber rem palsu, bukan menghilangkannya.**
   Dengan FoV sempit, tanggul tidak lagi masuk dari samping pada jalan lurus. Yang tersisa
   justru tiga hal yang lebih sulit: **tikungan**, **perubahan heading saat mulai menyalip**,
   dan **tidak adanya elevasi**.
4. **Konsekuensi terbesar dari beam sempit: jarak deteksi di tikungan runtuh.**
   Pada tikungan R = 150 m, deteksi efektif hanya ~39 m — sementara jarak henti muat pada
   50 km/h sudah 39,6 m. Artinya di tikungan, AEBS **secara fisik tidak bisa** menyelamatkan
   pada kecepatan itu, berapa pun bagusnya logic.

---

## 2. Bukti: 4 detik dengan logic terpasang (DT)

Catatan penting soal massa: pada model `a = μ·g`, **massa tidak masuk rumus**. Massa masuk
lewat **kapasitas rem** (`a = F_rem / m`). Jadi 66,5 t tidak memperburuk perlambatan kalau
sistem rem memang mampu; yang berubah adalah *apakah* sistem rem mampu. Ini dibahas di 2.4.

### 2.1 Datar — konvoi Δv 2 km/h, truk depan mengerem 3 m/s² pada t = 1 s

| Kecepatan | Gap 4 s | Hasil | Rem pertama |
|---|---|---|---|
| 30 km/h | 33 m | aman sisa **0,5 m** | t = 3,77 s |
| 35 km/h | 39 m | **TABRAKAN 2,9 km/h** | t = 3,99 s |
| 40 km/h | 44 m | aman sisa **0,4 m** | t = 4,20 s |
| 45 km/h | 50 m | aman sisa **0,4 m** | t = 4,39 s |
| 50 km/h | 56 m | **TABRAKAN 13,4 km/h** | t = 4,58 s |
| 55 km/h | 61 m | **TABRAKAN 20,4 km/h** | t = 4,75 s |
| 60 km/h | 67 m | **TABRAKAN 26,1 km/h** | t = 4,92 s |

Pola "aman-tabrakan-aman-tabrakan" itu bukan acak — marginnya mendekati nol, jadi hasilnya
ditentukan pecahan detik. Sisa 0,4 m pada 40,5 t bukan jarak aman, itu kontak.

### 2.2 Turunan 6 %

| Kecepatan | Gap 4 s | Hasil |
|---|---|---|
| 30 km/h | 33 m | TABRAKAN 14,3 km/h |
| 40 km/h | 44 m | TABRAKAN 24,0 km/h |
| 50 km/h | 56 m | TABRAKAN 33,3 km/h |

AEB baru bereaksi **9 detik** setelah truk depan mengerem; selama itu ego masih naik ke
43 km/h karena retarder tidak menahan laju penuh.

### 2.3 Gap yang sebenarnya dibutuhkan logic terpasang

| Kondisi | Gap minimum | Setara | Aturan |
|---|---|---|---|
| Datar 40 km/h | 57 m | 5,13 s | 4 s = 44 m |
| Datar 55 km/h | 107 m | 7,00 s | 4 s = 61 m |
| Turunan 6 % 40 km/h | 221 m | 19,9 s | 4 s = 44 m |

**Aturan 4 detik tidak cukup menyerap kelemahan pemicu.** Kalau 4 detik ditegakkan
konsisten tapi pemicunya tidak diperbaiki, eksposur tetap ada di > 45 km/h dan di semua
turunan.

### 2.4 Koefisien gesek chipseal dan mana yang membatasi

μ chipseal yang lazim dipakai untuk analisis kendaraan berat:

| Kondisi chipseal | μ | μ·g | Catatan |
|---|---|---|---|
| Kering, agregat masih tajam | 0,60–0,65 | 5,9–6,4 | kondisi acuan |
| Kering, sudah polished | 0,55 | 5,4 | setelah lama dipakai |
| Kering tapi binder bleed (cuaca panas) | 0,40–0,50 | 3,9–4,9 | lapisan bitumen di permukaan |
| Basah | 0,40–0,45 | 3,9–4,4 | chipseal punya makrotekstur bagus |
| Basah + debu batubara | 0,30–0,35 | 2,9–3,4 | kondisi nyata haul road |
| Berlumpur / slurry | 0,22–0,28 | 2,2–2,7 | |

**Kunci: μ hanya menjadi pembatas kalau μ·g < aCap.**

| aCap truk | μ minimum agar gesekan tidak membatasi |
|---|---|
| 1,8 m/s² (66,5 t, rem = kapasitas kosong) | 0,18 |
| 3,0 m/s² (66,5 t, rem sanggup) | 0,31 |
| 4,6 m/s² (26 t kosong) | **0,47** |

Artinya:
- **Bermuatan 66,5 t**: pada chipseal kering maupun basah, **rem yang membatasi, bukan
  gesekan**. μ baru relevan di bawah 0,31 — yaitu chipseal berdebu atau berlumpur.
- **Kosong 26 t**: sebaliknya. Butuh μ > 0,47 agar rem bisa bekerja penuh. Di chipseal
  basah (0,45) sudah mulai dibatasi gesekan; di chipseal berdebu (0,32) truk kosong
  berhenti jauh lebih buruk dari kemampuan remnya.

**Ini berlawanan dengan intuisi:** truk kosong justru lebih rentan kehilangan daya rem
akibat permukaan licin, bukan truk bermuatan.

### 2.5 Sensitivitas kapasitas rem (66,5 t)

Kalau kapasitas rem tidak berubah dari kondisi kosong (gaya rem sama), maka
`aCap = 4,6 × 26 / 66,5 ≈ 1,80 m/s²`. Perbandingan jarak henti:

| Kecepatan | aCap 3,0 (rem sanggup) | aCap 1,80 (gaya rem sama) | Jarak 4 s |
|---|---|---|---|
| 30 km/h | 16,2 m | 23,6 m | 33 m |
| 40 km/h | 26,7 m | 39,7 m | 44 m |
| 45 km/h | 32,8 m | 49,3 m | 50 m |
| 50 km/h | 39,6 m | 59,9 m | 56 m |
| 55 km/h | 47,0 m | 71,4 m | 61 m |
| 60 km/h | 55,0 m | 84,0 m | 67 m |

Pada aCap 1,80, **aturan 4 detik sudah tidak cukup mulai 50 km/h** hanya dari sisi fisika —
sebelum bicara logic AEB sama sekali.

Hasil simulasi konvoi pada jarak 4 detik, aCap 1,80:

| Kecepatan | TTC relatif | Prediktif |
|---|---|---|
| 30 km/h | aman sisa 0,1 m | aman 5,2 m |
| 40 km/h | **TABRAKAN 14,3 km/h** | aman 5,3 m |
| 45 km/h | **TABRAKAN 20,4 km/h** | aman 5,4 m |
| 50 km/h | **TABRAKAN 25,7 km/h** | aman 5,4 m |
| 55 km/h | **TABRAKAN 30,7 km/h** | aman 5,4 m |

Ini sebabnya angka brake test unit bermuatan bukan formalitas — seluruh tabel di dokumen
ini bergeser bersama angka itu.

### 2.6 Sistem pengereman dan hubungannya dengan TTC

**TTC sendiri tidak dipengaruhi sistem pengereman.** TTC = `gap / closing` — kuantitas
kinematika murni. Dua truk dengan gap dan closing speed sama punya TTC sama, apa pun
remnya.

**Yang dipengaruhi: TTC minimum yang layak dijadikan ambang.** Untuk objek diam
(closing = v):

```
τ_min = t_latency_total + v / (2·a)
```

`t_lat_total` = waktu sensor + keputusan (≈0,15 s) + waktu rem mencapai deselerasi penuh
(≈0,85 s) = **≈1,0 s**. Hasilnya:

| a (m/s²) | 20 km/h | 30 km/h | 40 km/h | 50 km/h | 60 km/h |
|---|---|---|---|---|---|
| 4,6 (26 t kosong) | 1,9 s | 2,4 s | 2,9 s | 3,3 s | 3,8 s |
| 3,0 (66,5 t, rem sanggup) | 1,9 s | 2,4 s | 2,9 s | 3,3 s | 3,8 s |
| 1,8 (66,5 t, gaya rem = kosong) | 2,5 s | 3,3 s | 4,1 s | 4,9 s | 5,6 s |

> Baris 4,6 dan 3,0 kebetulan mirip karena τ_min didominasi `t_lat` pada kecepatan rendah;
> bedanya muncul di kecepatan tinggi.

**Implikasi langsung untuk ambang yang terpasang:** ambang rem penuh **0,9 s** lebih kecil
daripada total latency sistem (≈1,0 s). Artinya pada saat ambang itu tercapai, kendaraan
sudah melewati titik di mana berhenti masih mungkin — berapa pun besarnya deselerasi.
Ambang TTC harus **fungsi dari kecepatan dan a**, bukan angka tetap.

### 2.7 Komponen pengereman JH6 dan mana yang bisa dipakai AEB

| Sistem | Fungsi | Perkiraan perlambatan (66,5 t) | Bisa diperintah AEB? |
|---|---|---|---|
| **Service brake** (drum, angin, 2 sirkuit + ABS) | rem utama | 2,5–3,5 m/s² (tergantung brake test) | **Ya** — lewat EBS/ABS modulator |
| **Retarder** (Faster hidrolik, 4.000 Nm per materi FAW) | menahan laju di turunan | **0,43–0,56 m/s²** | Tidak (kontrol terpisah) |
| **Engine brake** (exhaust/Jake, mesin CA6D / WP10-WP12) | membantu menahan laju | 0,2–0,5 m/s², tergantung rpm & gigi | Tidak |
| Kombinasi engine brake + retarder | kontrol turunan | ≈0,8–1,2 m/s² | Tidak |

Perhitungan retarder: 4.000 Nm × final drive (3,7–4,88) ÷ jari-jari roda 0,52 m
= 28,5–37,5 kN → **0,43–0,56 m/s²** pada 66,5 t. Setara kemampuan menahan turunan
**4,8–5,8 %**.

Kesimpulan penting:
- Retarder + engine brake **hanya untuk mengatur kecepatan di turunan**, bukan rem darurat.
  Kapasitasnya sekitar **1/6** rem servis.
- Retarder hidrolik bersifat fungsi kecepatan (torsi ∝ n²), jadi kontribusinya hilang
  justru di kecepatan rendah — tepat di fase akhir pengereman.
- Karena itu AEB hanya boleh mengandalkan **service brake**. Retarder boleh dipakai
  sebagai pra-pengereman untuk menghemat rem servis (menunda fade), bukan sebagai
  kontribusi yang diperhitungkan dalam `a_tersedia`.

### 2.8 Standar delay pengereman

| Standar | Persyaratan | Catatan |
|---|---|---|
| **UN R13, Annex 6 §2.4** | dari mulai aktuasi sampai tekanan di silinder rem mencapai **75 % nilai asimtotik ≤ 0,6 s** | kendaraan bermotor, rem angin, aktuasi 0,2 s |
| **UN R13, Annex 6 §3.5** | trailer: ≤ **0,4 s** | dari sinyal simulator >65 kPa |
| **FMVSS 121 §5.3.3.1(a)** | tiap brake chamber mencapai **60 psi ≤ 0,45 s** (truk & bus) | dari gerakan pertama kontrol rem |
| FMVSS 121 definisi *full-treadle* | katup treadle mencapai 85 psi dalam 0,2 s | aktuasi pengemudi |
| **UN R131** | regulasi AEBS untuk kategori **M2, M3, N2, N3** | acuan untuk sistem AEB truk berat |

Angka 0,6 s itu **batas maksimum**, diukur statis di kendaraan diam dengan aktuasi
0,2 s pada silinder rem yang paling tidak menguntungkan. Di lapangan, respons total
bertambah oleh: waktu pengemudi (atau keputusan AEB), panjang jalur pneumatik, dan
waktu tekanan naik dari 75 % ke 100 %.

Karena itu `brakeBuild` 0,85 s di model ini konsisten dengan R13 (mencapai 75 % pada
≈0,6 s, penuh pada ≈0,85–0,9 s). Kalau hasil ukur unit ternyata lebih lambat, semua
tabel di dokumen ini bergeser ke arah yang lebih buruk.

---

## 3. Perbaikan pemicu — feed-forward, tanpa sensor tambahan

Radar 77 GHz mono sudah memberi **range-rate (Doppler)** tiap track. Diturunkan terhadap
waktu, itu langsung menjadi `a_lead` — perlambatan truk depan. Bahan ini sudah ada di
sistem, hanya belum dipakai sebagai prediksi.

```
leadDist  = a_lead > 0,1 ? v_lead²/(2·a_lead) : (v_lead < 0,3 ? 0 : ∞)
budget    = gap + leadDist − v_ego·latency − margin
a_req_ff  = v_ego² / (2·budget)          # ≤ 0 → rem penuh sekarang
```

### Hasil dengan jarak 4 detik (pemicu prediktif)

| Kondisi | Gap 4 s | Hasil |
|---|---|---|
| Datar 30 km/h | 33 m | aman, sisa 5,1 m |
| Datar 40 km/h | 44 m | aman, sisa 5,4 m |
| Datar 50 km/h | 56 m | aman, sisa 5,0 m |
| Datar 55 km/h | 61 m | aman, sisa 5,1 m |
| Datar 60 km/h | 67 m | aman, sisa 5,2 m |
| Turunan 6 % 40 km/h | 44 m | aman, sisa 5,3 m |
| Turunan 6 % 50 km/h | 56 m | aman, sisa 5,4 m |

Rem mulai **0,24 detik** setelah truk depan mengerem (vs 3,2–9 detik pada TTC relatif).

Dua jebakan implementasi yang harus dihindari:
- **Jangan hilangkan `margin`** (~5 m). Tanpa itu sistem hanya "berhenti tepat di buritan" —
  teknis tidak tabrakan, tapi nol ruang untuk ketidakpastian sensor dan fade.
- **`leadDist` harus 0 ketika truk depan sudah berhenti**, bukan tak terhingga. Kalau
  formula dibuat `∞` saat `v_lead = 0`, sistem justru **melepas rem** tepat saat
  berhadapan dengan objek diam. Ini kesalahan yang sempat muncul saat pengembangan model.

---

## 4. Beam selebar truk — apa yang berubah

Dengan FoV selebar badan truk + RCS terkonfigurasi, radar tidak lagi "melihat" tanggul
dari samping pada jalan lurus. Tapi FoV itu **sudut**, jadi lebarnya bertambah dengan jarak.
"Selebar truk" hanya benar pada satu jarak tertentu.

| Jarak | Lebar berkas (jika 2,55 m di 10 m) |
|---|---|
| 20 m | 5,1 m |
| 40 m | 10,2 m |
| 80 m | 20,4 m |
| 120 m | 30,6 m |

Karena itu, yang perlu diwaspadai bukan lebar berkas, tapi **arah berkas**.

### 4.1 Tikungan — ini yang paling serius

Berkas radar lurus ke depan, sedangkan lajur membelok. Simpangan lateral berkas terhadap
sumbu lajur pada tikungan radius R:

| Jarak | R = 80 | R = 100 | R = 150 | R = 200 | R = 300 |
|---|---|---|---|---|---|
| 20 m | 2,5 m | 2,0 m | 1,3 m | 1,0 m | 0,7 m |
| 40 m | 10,0 m | 8,0 m | 5,3 m | 4,0 m | 2,7 m |
| 60 m | 22,5 m | 18,0 m | 12,0 m | 9,0 m | 6,0 m |
| 80 m | 40,0 m | 32,0 m | 21,3 m | 16,0 m | 10,7 m |

Berkas keluar dari lajur (offset > 5 m) mulai jarak:

| Radius | Berkas keluar lajur | Kecepatan maks agar bisa berhenti dalam jarak itu (muat 40,5 t) |
|---|---|---|
| R = 60 m | 24 m | **38 km/h** |
| R = 80 m | 28 m | **41 km/h** |
| R = 100 m | 32 m | **44 km/h** |
| R = 120 m | 35 m | **46 km/h** |
| R = 150 m | 39 m | **49 km/h** |
| R = 200 m | 45 m | **53 km/h** |
| R = 300 m | 55 m | **59 km/h** |
| R = 500 m | 71 m | **68 km/h** |

Jarak henti muat 40,5 t sebagai pembanding: 40 km/h = 26,7 m · 50 km/h = 39,6 m ·
60 km/h = 55,0 m.

**Implikasi operasional:** di tikungan, ada dua pilihan buruk. Kalau objek yang terdeteksi
di luar lajur diterima → rem palsu ke tanggul. Kalau ditolak (RCS/geometri) → **buta**
di luar radius itu. Tidak ada konfigurasi radar yang bisa mengalahkan geometri.

Yang bisa dilakukan adalah **menurunkan batas kecepatan per radius tikungan**. Tabel di atas
adalah dasar angkanya, bukan angka final — perlu dikoreksi dengan brake test nyata.

### 4.2 Perubahan heading saat mulai menyalip

Saat pengemudi mulai menyetir ke kanan untuk menyalip, badan truk berputar dan berkas
ikut berputar:

| Sudut heading | @20 m | @40 m | @60 m |
|---|---|---|---|
| 2° | 0,7 m | 1,4 m | 2,1 m |
| 3° | 1,0 m | 2,1 m | 3,1 m |
| 5° | 1,7 m | 3,5 m | 5,2 m |
| 8° | 2,8 m | 5,6 m | 8,4 m |

Menyetir 5° saja sudah menggeser sumbu berkas 5,2 m pada 60 m — keluar dari lajur.
Ditambah truk yang disalip keluar dari FoV, sistem mencari target baru dan yang ada di
depan adalah tanggul/berm.

Jadi rem mendadak saat menyalip = **rotasi heading + kehilangan track target**,
bukan salah klasifikasi objek.

### 4.3 Tanpa elevasi

Radar mono 77 GHz tanpa elevasi tidak bisa membedakan tanggul setinggi 1,5 m dari truk
setinggi 3,5 m. Di crest/dip, berkas juga menyimpang vertikal terhadap permukaan jalan
(Rv = 500 m → 10 m simpangan pada 100 m). RCS yang sudah dikonfigurasi membantu, tapi RCS
adalah fungsi luas dan material, bukan tinggi —dinding tanah basah bisa setara dengan bak
truk bermuatan.

---

## 5. Risiko mematikan AEBS saat menyalip

### 5.1 Perbaikan yang sebanding dengan masalahnya

Kalau penyebabnya rotasi heading + kehilangan track, mematikan seluruh AEBS terlalu besar.
Alternatifnya:

- saat sein menyala **dan** heading berubah **dan** track utama hilang → tahan akuisisi
  **target statis baru** selama 5–8 detik (target bergerak tetap diproses)
- kompensasi sudut: hitung arah berkas dalam koordinat lajur dari yaw-rate + steering,
  lalu tolak target di luar koridor prediksi
- objek statis tetap dipantau; hanya tidak langsung memicu rem penuh

Keuntungannya: proteksi terhadap **target bergerak** tetap hidup saat menyalip — itu justru
bahaya utamanya (LV atau truk lain masuk jalur).

### 5.2 Kalau tetap dimatikan total

| Kondisi | Hasil |
|---|---|
| AEBS aktif, objek berhenti 44 m, 40 km/h | berhenti, sisa 1,6 m |
| **AEBS dimatikan**, kondisi sama | **TABRAKAN 39,6 km/h** |
| AEBS dimatikan, LV pelan 15 km/h di jalur | TABRAKAN 24,6 km/h |

### 5.3 Lama AEBS mati per kejadian menyalip

Jarak relatif untuk menyalip ≈ 50 m (masuk + panjang truk depan + panjang sendiri + kembali).

| Selisih kecepatan | Durasi | Jarak tanpa AEBS @40 km/h |
|---|---|---|
| 5 km/h | ~36 s | ~400 m |
| 10 km/h | ~18 s | ~200 m |
| 20 km/h | ~9 s | ~100 m |

### 5.4 Risiko mekanisme sein sebagai saklar

| Risiko | Mekanisme | Dampak |
|---|---|---|
| AEBS mati permanen | Sein lupa dimatikan, relay lengket, bohlam putus | Proteksi hilang sepanjang trip, tanpa indikator |
| Risk compensation | Rem palsu → pengemudi belajar "sein = alarm berhenti" | AEBS dimatikan rutin, termasuk saat tidak menyalip |
| Tidak ada re-arm | Tidak ada konfirmasi aktivasi ulang | Pengemudi mengira aktif |
| Tanpa jejak audit | Tidak tercatat waktu, lokasi, unit | Investigasi & liability tidak terbukti |
| Menyalip dari kanan | Kanan = tanggul, margin lateral minimum | Run-off / sideswipe |

---

## 6. Muat vs kosong (DT)

**Bermuatan 40,5 t**
- Jarak henti 40 km/h = 26,7 m; 50 km/h = 39,6 m; 60 km/h = 55,0 m.
- **Brake fade**: aCap 3,0 m/s² adalah kondisi rem dingin. Di haul road 30 km dengan turunan
  panjang, setelah fade bisa turun ke 1,5–2,0 → seluruh tabel di atas batal. AEBS yang
  "yakin" bisa berhenti padahal tidak.
- Massa 40,5 t memperpanjang jarak henti 35–50 % dibanding kosong. Threshold sebaiknya
  berbeda per status muatan — THW lebih besar saat bermuatan.

**Kosong 26 t**
- Perlambatan nominal lebih baik (4,6 m/s²) **tapi kecepatannya lebih tinggi**.
  55 km/h butuh 33,9 m; di jalan basah μ 0,38 jadi 39,7 m (μ yang membatasi, bukan rem).
- Kosong lebih mudah lock-up saat pengereman keras.
- Frekuensi menyalip di jalur kosong lebih tinggi → eksposur "AEBS off" lebih besar
  justru di segmen ini.

---

## 7. Rekomendasi

**P1 — perbaiki pemicu, bukan aturannya.**
Tambahkan `a_req_ff` (bagian 3) sebagai pemicu utama; TTC relatif tetap sebagai lapisan
sekunder. Satu perubahan ini menutup kasus datar ≥ 50 km/h dan seluruh kasus turunan.

**P2 — batas kecepatan per radius tikungan** (tabel 4.1). Ini bukan pilihan rekayasa,
ini konsekuensi geometri: di R = 150 m, jarak deteksi 39 m sedangkan jarak henti 50 km/h
sudah 39,6 m.

**P3 — jangan matikan AEBS lewat sein.**
Ganti dengan penahanan akuisisi target statis + kompensasi sudut (bagian 5.1) selama
5–8 detik. Kalau tetap butuh mode manual: tombol khusus, maks 20–30 detik, auto re-arm,
indikator "AEB OFF" menyala, semua aktivasi tercatat (waktu/GPS/unit).

**P4 — kompensasi heading/curvature di software.** Yaw-rate + steering + kecepatan roda
(CAN, tanpa sensor baru) sudah cukup untuk menghitung arah berkas dalam koordinat lajur.

**P5 — konfirmasi filter objek statis radar.**
Filter harus berbasis **kecepatan absolut** (`v_ego + Doppler`), bukan `|Doppler| < ambang`.
Kalau berbasis besaran Doppler, truk yang kecepatannya sama dengan kita punya Doppler ≈ 0
dan akan dibuang sebagai clutter — persis kondisi normal di haul road.

**P6 — verifikasi perlambatan nyata.** Ukur decel via IMU/CAN, bandingkan dengan perintah.
Kalau nyata < 80 % perintah → eskalasi peringatan. Ini menangkap fade dan rem yang tidak
primer.

**P7 — EDR 10 detik pra-pemicu.** Tanpa ini setiap investigasi jadi debat.

**P8 — KPI bulanan.** Distribusi THW nyata, % waktu AEB off, jumlah rem palsu per 1.000 km,
jumlah near-miss (min gap < 5 m), per radius tikungan.

---

## 8. Yang perlu dikonfirmasi

1. Filter objek statis: `kecepatan absolut` atau `|Doppler| < ambang`?
1b. Waktu respons rem terukur (pedal/AEB → 75 % tekanan) di unit FAW JH6, dan apakah
   ada retarder Faster terpasang di semua unit atau sebagian.
2. Ambang TTC aktual dari vendor.
3. Perbandingan kecepatan: bertanda atau absolut?
4. Jarak referensi "sudut selebar truk" — pada berapa meter 2,55 m itu berlaku?
5. RCS minimum yang dipakai untuk menolak target; apakah tanggul lolos?
6. Hasil brake test FAW JH6 kosong & bermuatan 66,5 t, termasuk di turunan.
6b. Kondisi chipseal aktual: ada binder bleed? seberapa tebal debu batubara di permukaan?
7. Radius tikungan minimum di 30 km haul road, dan batas kecepatan yang berlaku sekarang.

---

## Lampiran A — Beban mekanis dan keausan

Dua besaran yang dihitung simulasi untuk menilai konsekuensi mekanis pengereman:

```
energi rem   E = ∫ (m · a_fric) · v · dt          [Joule]
beban depan  ΔW = (m · a / g) · (h / L)          [ton-gaya]
```

| Kejadian (66,5 t) | Energi | Kenaikan suhu drum* |
|---|---|---|
| Rem penuh dari 40 km/h sampai berhenti | 4,10 MJ | ±17 °C |
| Rem sebagian dari 40 ke 20 km/h | 3,08 MJ | ±13 °C |
| Rem penuh dari 30 km/h sampai berhenti | 2,31 MJ | ±10 °C |

\* asumsi 6 drum, massa efektif besi ±480 kg, kalor jenis 490 J/kg·K, tanpa pendinginan.
Drum brake mulai kehilangan performa (fade) di sekitar 300 °C.

Pada 3,0 m/s² dengan h = 1,9 m dan L = 4,2 m, beban pindah ke depan
ΔW ≈ **+9,2 ton** — diterima axle depan, kingpin, tie rod, dan drag link, di luar beban statis.
Angka ini batas atas karena model menganggap perlambatan terbagi rata; truk nyata memakai
katup pengindra beban (load sensing) yang membatasi tekanan rem depan.

Yang paling menentukan keausan bukan pengereman darurat yang sah, melainkan **pemicu palsu**.
Sepuluh pemicu palsu berturut-turut menaikkan suhu drum ±130 °C tanpa kesempatan mendingin.

## Lampiran B — Perangkat aktuator

Rangkaian: radar → mikroprosesor terpisah → relai → solenoid → penyadapan tekanan rem
(+ sensor pneumatik untuk umpan balik); cabang lain: motor DC → kabel → pedal kopling.

Anggaran penundaan: radar 50–100 ms, mikroprosesor 10–30 ms, relai/katup 20–50 ms,
kenaikan tekanan ke 75 % 200–600 ms. Total 0,3–0,8 s. Motor kopling 300–800 ms dan harus
berjalan paralel, tidak serial.

Beban komputasi logic prediktif per siklus (perkiraan): Cortex-M3 72 MHz tanpa FPU
±0,2–0,4 ms; Cortex-M4F 84–168 MHz ±0,02–0,05 ms. Seluruh keluarga STM32 memadai; batas nyata
bukan kecepatan hitung melainkan penanganan data radar tanpa blocking, watchdog, dan ketahanan
kelistrikan.

Umpan balik tekanan bukan umpan balik perlambatan. Tekanan yang sama dapat menghasilkan
perlambatan berbeda sesuai kondisi kampas, suhu, penyetelan, massa, dan gesekan permukaan.
Diperlukan umpan balik deselerasi (IMU) atau pembanding kecepatan roda.

Fail-safe minimum: katup normally closed, rem pengemudi selalu menang, kebocoran pada titik
penyadapan tidak mengurangi kemampuan rem servis, radar hilang berarti sistem mati dengan
peringatan, dan rekaman 10 detik sebelum pemicu.

## Lampiran C — Jenis kejadian pada kendaraan depan

| Kejadian | Perlambatan | Berhenti dari 40 km/h |
|---|---|---|
| Mogok / lepas tenaga | 0,3 m/s² | ±37 detik, ±410 m |
| Mengerem normal | 2,0 m/s² | 5,5 detik, 86 m |
| Ban pecah | ±3,0 m/s² | 3,7 detik, 76 m |
| Mengerem darurat | 5,0 m/s² | 2,2 detik, 68 m |

Mogok bukan pengereman: kendaraan meluncur dan baru berhenti setelah ±410 m, sehingga menjadi
penghalang bergerak lambat.

Hasil simulasi pada jarak awal 44,4 m (40 km/h):

| Kejadian | TTC relatif | Prediktif |
|---|---|---|
| Mogok (0,3) | berhenti, sisa 3,5 m | berhenti, sisa 3,5 m |
| Ban pecah (3,0) | berhenti, sisa 0,3 m | berhenti, sisa 3,5 m |
| Mengerem normal (2,0) | tabrakan 12,0 km/h | berhenti, sisa 3,4 m |
| Mengerem darurat (5,0) | tabrakan 3,2 km/h | berhenti, sisa 3,7 m |

## Lampiran D — Perambatan pengereman antar truk

Semua truk hauling dilengkapi AEBS, tetapi perilaku truk di belakang bergantung pada logic yang
dipakai, bukan semata pada ada atau tidaknya AEBS. Uji: dua truk 66,5 t berjarak 4 detik,
truk depan mengerem dengan laju tertentu, truk belakang mengikuti dengan logic yang diuji.

| Rem truk depan | Logic pengikut | Mulai mengerem | Gap saat itu | Hasil |
|---|---|---|---|---|
| 0,80 m/s² | TTC relatif | 9,91 s | 13,5 m | **tabrakan 13,7 km/h** |
| 0,80 m/s² | prediktif | 4,04 s | 41,0 m | aman, sisa 3,4 m |
| 1,20 m/s² | TTC relatif | 7,77 s | 17,5 m | **tabrakan 19,3 km/h** |
| 1,20 m/s² | prediktif | 1,79 s | 44,1 m | aman, sisa 3,3 m |
| 1,65 m/s² | TTC relatif | 6,40 s | 20,8 m | **tabrakan 16,4 km/h** |
| 1,65 m/s² | prediktif | 1,48 s | 44,3 m | aman, sisa 3,4 m |
| 2,50 m/s² | TTC relatif | 4,96 s | 25,1 m | aman, sisa 0,3 m |
| 2,50 m/s² | prediktif | 1,38 s | 44,3 m | aman, sisa 3,7 m |

Kesimpulan:

1. Pengikut dengan logic TTC relatif baru bereaksi saat TTC turun ke 1,9–2,4 s, yaitu 4–9 detik
   setelah truk depan mulai mengerem.
2. Pada rentang perlambatan 0,8–1,65 m/s² — rentang pengereman yang paling umum — pengikut TTC
   gagal berhenti. Bukan karena tidak ada AEBS, tetapi karena pemicunya terlambat.
3. Pengikut dengan logic prediktif bereaksi pada 1,4–1,8 s dan berhenti dengan sisa 3,3–3,7 m
   pada seluruh rentang.
4. Karena setiap pengereman satu truk menjadi "truk depan mengerem" bagi truk berikutnya,
   keandalan konvoi ditentukan oleh logic di seluruh armada, bukan oleh satu unit.

Catatan: kendaraan pendukung (LV, kendaraan antar-jemput, pengangkut HD/Loboy) tidak dilengkapi
AEBS. Apabila berada tepat di belakang truk bermuatan pada jarak 4 detik, simulasinya memberi
tabrakan pada 39,6 km/h. Risiko ini terbatas pada posisi tersebut, tetapi tetap perlu
diperhitungkan pada segmen menanjak ketika kendaraan pendukung bergerak lebih lambat.
