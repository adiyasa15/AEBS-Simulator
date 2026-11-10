# Definisi dan Cara Mengukur Parameter Spek

Dokumen ini menjelaskan **13 kolom** pada panel *Spek teknis* dan **2 saklar** di bawahnya.
Semua nilai dimasukkan dalam satuan yang tertulis di label.

Ringkasnya, parameter dibagi tiga kelompok:

| Kelompok | Parameter | Sifat |
|---|---|---|
| Massa | massa kosong, massa + muatan | diukur langsung (timbangan) |
| Kemampuan pengereman | rem maks kosong, rem maks muat | **wajib brake test** |
| Waktu | latency, relay+solenoid, bangun tekanan | diukur dengan pencatatan waktu |
| Pendukung | retarder, panjang, titik berat, wheelbase | diukur atau dari spesifikasi pabrik |

---

## 1. Massa kosong (t)

**Definisi:** berat unit tanpa muatan dan tanpa pengemudi, termasuk bahan bakar penuh dan
perlengkapan tetap.

**Cara mengukur:** timbang di jembatan timbang (weighbridge), per axle bila tersedia.
Untuk FAW JH6 nilainya 26 t.

**Bila tidak ada timbangan:** gunakan angka STNK/registrasi, tetapi catat bahwa angka itu
sering mencantumkan berat kosong tanpa bahan bakar.

---

## 2. Massa + muatan (t)

**Definisi:** massa total saat vessel terisi penuh batubara.

**Cara mengukur:** timbang unit bermuatan. Nilainya = massa kosong + berat batubara.
Untuk FAW JH6: 26 + 40,5 = 66,5 t.

**Bila hanya diketahui payload:** jumlahkan sendiri, dan pastikan payload yang dimaksud
adalah berat batubara, bukan kapasitas vessel.

---

## 3. Rem maks kosong (m/s²)

**Definisi:** perlambatan **mantap** (plateau) yang dapat dicapai rem servis pada unit kosong,
di permukaan kering, tanpa bantuan retarder.

**Cara mengukur — cara yang benar (dengan pencatat percepatan):**

1. Permukaan kering dan rata, unit kosong, rem dan ban dalam kondisi normal.
2. Pasang pencatat percepatan (akselerometer atau aplikasi GPS/IMU yang tervalidasi).
3. Jalankan 40 km/jam, lalu rem penuh sampai berhenti.
4. Lihat kurva perlambatan: ambil nilai **datar tertinggi** setelah fase kenaikan.
5. Ulangi tiga kali, ambil nilai terendah dari ketiganya (konservatif).

**Cara kasar (hanya jarak):** ukur jarak berhenti `d` dari kecepatan `v`.

```
a_rata-rata = v² / (2 · d)          v dalam m/s, d dalam meter
```

Angka ini **lebih rendah** dari nilai mantap, karena sudah termasuk waktu rem mulai bekerja.
Kalau hanya punya angka ini, catat sebagai batas bawah, bukan nilai sesungguhnya.

**Contoh:** berhenti dari 40 km/h (11,1 m/s) dalam 34 m → `11,1² / (2 × 34) = 1,81 m/s²`.

---

## 4. Rem maks muat (m/s²)

**Definisi:** sama seperti nomor 3, tetapi unit bermuatan penuh.

**Cara mengukur:** protokol sama, kondisi vessel terisi.

**Mengapa penting:** inilah angka yang menentukan seluruh hasil simulasi. Selisih 3,0 vs 1,8
m/s² mengubah jarak henti 40 km/h dari 27,8 m menjadi 39,7 m.

**Bila belum diukur:** biarkan saklar *"Hitung a_cap dari gaya rem konstan"* menyala. Simulator
akan menurunkan nilai ini dari massa dan nilai kosong — cara yang konservatif, tetapi tetap
asumsi.

---

## 5. Bangun tekanan rem (s)

**Definisi:** waktu yang dibutuhkan tekanan rem untuk naik dari nol sampai penuh setelah
perintah diterima.

**Cara mengukur:** rekam tekanan dari sensor pneumatik terhadap waktu saat pengereman penuh.
Ukur dari saat tekanan mulai naik sampai mencapai nilai tertinggi yang stabil.

**Bila hanya punya waktu ke 75 %** (batas UN R13: 0,6 s), konversi:

```
bangun_tekanan = waktu_ke_75% / 0,75
```

Contoh: 75 % tercapai pada 0,60 s → nilai yang dimasukkan 0,80 s.

---

## 6. Engine brake + retarder (m/s²)

**Definisi:** perlambatan tambahan dari rem mesin dan retarder saja, tanpa rem servis.

**Cara mengukur:** pada kecepatan tetap di atas ambang retarder, lepas pedal gas dan aktifkan
retarder maksimum. Catat perlambatan dengan akselerometer. Nilai tipikal 0,5–1,5 m/s².

**Bila tidak ada retarder:** isi 0,2–0,3 (rem mesin saja). **Jangan** memasukkan nilai rem servis
ke kolom ini — kolom ini hanya untuk perlambatan non-servis.

---

## 7. Relay + solenoid valve (s)

**Definisi:** jeda dari perintah listrik keluar sampai katup benar-benar terbuka dan tekanan
mulai naik.

**Cara mengukur:** rekam dua sinyal bersamaan — pin perintah relai (GPIO) dan kanal tekanan.
Ukur selisih waktu dari tepi sinyal perintah sampai tekanan mulai naik.

**Bila tidak diukur:** 0,05 s adalah nilai tipikal untuk relai otomotif dan solenoida kecil.

---

## 8. Retarder aktif di atas (km/h)

**Definisi:** kecepatan minimum agar retarder menghasilkan perlambatan berarti. Retarder
hidrolik dan elektrik butuh putaran minimum.

**Cara mengukur:** aktifkan retarder maksimum pada berbagai kecepatan menurun, catat kecepatan
saat perlambatan mulai terasa hilang.

**Bila tidak diketahui:** 15–25 km/h untuk retarder hidrolik, 5–10 km/h untuk retarder elektrik.

---

## 9. Pita fade retarder (km/h)

**Definisi:** rentang kecepatan tempat perlambatan retarder naik dari nol sampai penuh.
Simulator memakai model linear:

```
ketersediaan = (kecepatan − ambang) / pita fade      dibatasi 0 sampai 1
```

**Cara mengukur:** dari data nomor 8, catat kecepatan saat retarder mencapai kekuatan penuh.
Selisihnya terhadap ambang adalah pita fade.

**Bila tidak diketahui:** isi 10 km/h.

---

## 10. Latency sensor+baca (s)

**Definisi:** jeda dari objek di depan benar-benar berubah sampai mikroprosesor selesai
menghitung. Terdiri dari umur data radar, waktu tunggu siklus program, dan waktu hitung.

**Cara mengukur:**

1. Nyalakan satu pin GPIO tepat **sebelum** membaca data radar.
2. Matikan pin tersebut tepat **setelah** keputusan selesai dihitung.
3. Lebar pulsa = jumlah ketiga komponen di atas.

Bisa dibaca dengan osiloskop, atau direkam ke log dengan timestamp.

**Bila tidak diukur:** 0,18 s untuk radar dengan siklus 50 ms dan loop 20 ms.

---

## 11. Panjang kendaraan (m)

**Definisi:** jarak dari bemper depan sampai ujung belakang kendaraan (termasuk body).

**Cara mengukur:** meteran. FAW JH6 rigid sekitar 10,4 m.

**Dipakai untuk:** gambar kendaraan di layar dan perhitungan posisi bemper.

---

## 12. Tinggi titik berat (m)

**Definisi:** tinggi pusat massa dari permukaan jalan, dalam kondisi bermuatan.

**Cara mengukur — metode beban gandar saat mengerem:**

1. Timbang beban gandar depan saat diam: `N₁`.
2. Saat pengereman terukur dengan perlambatan `a`, catat beban gandar depan: `N₂`.
3. Ukur wheelbase `L`.

```
h = (N₂ − N₁) · L / (m · a)          m dalam kg, N dalam Newton, L dan h dalam meter
```

**Bila tidak dapat diukur:** gunakan 1,9 m untuk dump truck rigid bermuatan; catat sebagai
perkiraan. Nilai ini hanya memengaruhi indikator beban, bukan jarak henti.

---

## 13. Wheelbase efektif (m)

**Definisi:** jarak sumbu roda depan ke titik tengah kelompok roda belakang.

**Cara mengukur:** meteran, dari pusat roda depan ke pusat di antara dua axle belakang.
FAW JH6 6x4 sekitar 4,2 m.

**Dipakai untuk:** indikator beban pindah ke depan, bersama nomor 12.

---

## Saklar 1 — "a_cap sudah diverifikasi brake test"

**Fungsi:** menyatakan bahwa angka *Rem maks kosong* dan *Rem maks muat* berasal dari
pengukuran, bukan asumsi.

**Kapan dinyalakan:** setelah brake test selesai dan hasilnya dimasukkan.

**Efek:** pita peringatan *"Parameter rem belum terverifikasi"* hilang dari area simulasi.

**Catatan:** saklar ini tidak memeriksa apa pun. Ia pernyataan tanggung jawab orang yang
menandainya.

---

## Saklar 2 — "Hitung a_cap dari gaya rem konstan"

**Fungsi:** menurunkan kemampuan rem dari massa, dengan asumsi gaya rem tidak berubah:

```
gaya_rem  = a_cap_kosong × massa_kosong
a_cap(m)  = gaya_rem / m
```

**Kapan dinyalakan:** selama belum ada brake test unit bermuatan. Ini asumsi konservatif.

**Kapan dimatikan:** setelah nilai *Rem maks muat* diisi dari hasil ukur. Kalau dibiarkan
menyala, angka isian Anda akan ditimpa oleh hasil hitungan.

---

## Protokol pengukuran yang disarankan

Cukup dua sesi untuk mengurangi sebagian besar ketidakpastian.

**Sesi 1 — unit kosong 26 t**

1. Permukaan chipseal kering, datar, panjang minimal 200 m.
2. Tiga kali pengereman penuh dari 40 km/h; catat perlambatan mantap dan jarak berhenti.
3. Rekam tekanan rem terhadap waktu untuk satu di antaranya.

**Sesi 2 — unit bermuatan 66,5 t**

1. Lokasi dan prosedur sama.
2. Tiga kali pengereman penuh dari 40 km/h (jangan dari kecepatan lebih tinggi untuk unit
   bermuatan pada uji awal).
3. Rekam tekanan rem terhadap waktu.

**Dari dua sesi itu diperoleh:**

- `Rem maks kosong` dan `Rem maks muat` (nilai mantap)
- `Bangun tekanan rem` (dari kurva tekanan)
- rasio kedua nilai → menunjukkan apakah gaya rem tetap atau naik karena *load sensing*
- verifikasi bahwa jarak henti nyata sesuai dengan prediksi simulator

**Yang tidak boleh dilakukan:** menetapkan batas kecepatan atau jarak aman berdasarkan angka
simulator sebelum protokol ini selesai.
