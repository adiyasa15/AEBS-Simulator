# Deploy AEBS Simulator

Aplikasi ini **situs statis murni**: tidak ada backend, tidak ada build step, tidak ada
kredensial di dalam repo. Tiga file HTML/CSS dan empat modul ES sudah cukup untuk berjalan.

```
index.html  style.css  js/{app,sim,render,presets}.js
```

Konsekuensinya: deployment hanya soal menyajikan file itu lewat HTTP. Hampir semua opsi
di bawah setara secara fungsional — pilih berdasarkan di mana orang akan membukanya.

> **Penting:** harus lewat HTTP/HTTPS, **bukan** `file://`. Membuka `index.html` langsung
> dari file manager akan gagal karena modul ES diblokir oleh aturan CORS browser.

---

## 1. Lokal (paling cepat, untuk uji)

```bash
cd AEBS-Simulator
python3 -m http.server 4317
# buka http://127.0.0.1:4317
```

Alternatif:

```bash
npx serve -l 4317 .          # Node
php -S 127.0.0.1:4317        # PHP
```

---

## 2. Docker (disarankan untuk on-site)

Image hanya menyalin file statis ke nginx alpine — tidak ada runtime interpreter,
tidak ada proses aplikasi.

```bash
docker build -t aebs-simulator:1.0 .
docker run -d --name aebs-sim --restart unless-stopped -p 8080:80 aebs-simulator:1.0
# buka http://<ip-host>:8080
```

Build sudah diverifikasi: `index.html` 200, `.js` dilayani `application/javascript`,
CSS benar, fallback SPA 200, healthcheck `healthy`.

Lebih rapi dengan compose:

```yaml
# docker-compose.yml
services:
  aebs:
    build: .
    image: aebs-simulator:1.0
    restart: unless-stopped
    ports:
      - "8080:80"
```

```bash
docker compose up -d
```

Update ke versi baru:

```bash
git pull
docker build -t aebs-simulator:1.1 .
docker rm -f aebs-sim && docker run -d --name aebs-sim --restart unless-stopped \
  -p 8080:80 aebs-simulator:1.1
```

---

## 3. nginx + systemd (tanpa Docker, satu mini PC di site)

```bash
sudo mkdir -p /opt/aebs-sim
sudo cp -r index.html style.css js /opt/aebs-sim/
sudo chown -R www-data:www-data /opt/aebs-sim

sudo cp deploy/nginx-aebs.conf /etc/nginx/conf.d/aebs.conf
# sesuaikan root bila tidak memakai /var/www
sudo nginx -t && sudo systemctl reload nginx
```

Bila tidak ingin memasang nginx, pakai `python3 -m http.server` sebagai service:

```bash
sudo cp deploy/aebs-sim.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now aebs-sim
# http://<ip-host>:4317
```

`aebs-sim.service` sudah memakai `ProtectSystem=strict`, `ProtectHome=yes`,
`NoNewPrivileges=yes`, dan berjalan sebagai `www-data`.

---

## 4. LAN haul road / jaringan site

Supaya bisa dibuka dari tablet atau laptop lain di jaringan yang sama:

```bash
python3 -m http.server 4317 --bind 0.0.0.0
```

Lalu buka `http://<ip-mini-pc>:4317` dari perangkat lain.

Yang perlu diperhatikan:

- **Firewall** — izinkan port hanya di subnet site, misalnya
  `sudo ufw allow from 10.20.0.0/16 to any port 4317 proto tcp`.
- **IP statis / DHCP reservation** untuk mini PC, supaya alamatnya tidak berubah.
- Tidak ada autentikasi bawaan. Kalau jaringan site bisa diakses banyak pihak,
  pasang basic auth di nginx (lihat bagian 7).

---

## 5. Hosting statis (GitHub Pages / Cloudflare Pages / Netlify)

Cocok untuk demo ke pihak luar. Tidak perlu konfigurasi build — root direktori repo
sudah berisi `index.html`.

GitHub Pages (repo public):

```bash
gh api -X POST repos/adiyasa15/AEBS-Simulator/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
# https://adiyasa15.github.io/AEBS-Simulator/
```

> ⚠️ **Ini mempublikasikan aplikasi ke internet.** Repo berisi `ANALISIS-RISIKO.md`
> dengan aturan operasional internal dan temuan celah keselamatan. Untuk Pages,
> pertimbangkan memindahkan dokumen analisis ke repo terpisah, atau gunakan hosting
> ber-autentikasi.

---

## 6. Offline / tablet di kabin

Tidak ada service worker, jadi aplikasi tidak otomatis tersedia offline. Tiga cara:

1. **Mini PC di site** (opsi 2 atau 3) — perangkat klien hanya butuh browser.
2. **Hotspot lokal** — mini PC + akses point, tanpa internet.
3. **Tablet Android + Termux** — jalankan `python3 -m http.server` di tablet, buka
   `http://127.0.0.1:4317` dari browser tablet yang sama.

Kalau nanti butuh benar-benar offline-first, tinggal tambahkan service worker —
aplikasinya sudah tanpa dependensi eksternal, jadi cache-nya kecil.

---

## 7. Membatasi akses

Basic auth di nginx (buat file password sekali):

```bash
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.aebs.htpasswd operator
```

Tambahkan di dalam blok `server` pada `deploy/nginx-aebs.conf`:

```nginx
auth_basic           "AEBS Simulator";
auth_basic_user_file /etc/nginx/.aebs.htpasswd;
```

Untuk akses dari luar site, lebih baik lewat VPN/Tailscale daripada membuka port —
tidak perlu menambah lapisan autentikasi sendiri.

---

## 8. Update

```bash
git pull
```

Untuk nginx/Termux: tidak ada langkah tambahan, browser cukup di-refresh
(`index.html` dikirim dengan `Cache-Control: no-cache`).

Untuk Docker: build ulang image (lihat bagian 2).

Kalau tampilan lama masih muncul, hard refresh: **Ctrl+Shift+R**.

---

## 9. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| Halaman putih, console: `CORS policy` / `module` | dibuka via `file://` | jalankan lewat HTTP (opsi 1) |
| Halaman putih, console: `Failed to load module script ... MIME type` | server mengirim `.js` sebagai `text/plain` | pakai nginx conf di repo, atau `python3 -m http.server` |
| Perubahan tidak muncul | cache browser | Ctrl+Shift+R |
| Tidak bisa diakses dari perangkat lain | bind `127.0.0.1` atau firewall | `--bind 0.0.0.0` + buka port |
| `Address already in use` | port dipakai | ganti port: `--bind 127.0.0.1` lalu `4319` |

---

## 10. Checklist sebelum dipakai di site

- [ ] Diuji di browser yang akan dipakai (Chrome/Edge versi apa)
- [ ] Ukuran layar: 1366×768 laptop dan tablet 10" masih terbaca
- [ ] Mini PC punya IP statis dan tercakup UPS bila perlu
- [ ] Akses dibatasi (LAN saja, atau basic auth)
- [ ] Dokumen `ANALISIS-RISIKO.md` **tidak** ikut dipublikasikan bila hosting publik
- [ ] Nilai spek unit sudah diisi dari brake test, bukan angka bawaan
