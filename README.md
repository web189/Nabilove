# FUN FITNESS — prototype (statis, GitHub Pages)
Struktur **datar**: semua file di root repo (HTML, CSS, JS, gambar). Semua path relatif.
## Menjalankan
Buka `index.html` di browser, atau unggah semua isi folder ke repo GitHub → Settings → Pages → Deploy from branch (root).
## Akun demo (hanya pengujian lokal)
admin / admin123 · budi / member123 (sari, andi juga member123). Bukan keamanan produksi.
## Gambar yang perlu diunggah (taruh di root)
`hero-gym.jpg`, `gym-interior.jpg` (foto asli gym), folder `promo/` (poster promo). `logo.png` dan `favicon.png` sudah dibuat dari logo yang Anda kirim.
## Keterbatasan
- localStorage hanya ada di browser/perangkat itu; admin TIDAK melihat pendaftaran dari HP lain.
- Login/role di JavaScript bukan keamanan nyata; hash password di sini hanya untuk demo.
- Audit log dapat diubah pengguna.
- Harga/paket diubah di Admin → Paket & Promo (tanpa edit kode). Kontak/alamat di Admin → Pengaturan.
## Browser
Kode ES5 (kecuali sedikit ES6 di admin/member untuk Chrome/Firefox yang masih berjalan di Windows 7). Tanpa library eksternal.
## Checklist uji
Daftar member → login → ajukan paket → admin setujui (masa aktif bertambah, klik ganda tidak memproses ulang) → check-in → laporan & CSV → ganti tema → reset data.

## Redesign 2026
Foto yang perlu diunggah ke root: `hero-gym.jpg`, `gym-interior.jpg`, `gym-treadmill.jpg`, `gym-dumbbell.jpg`, `gym-mesin.jpg` (jika belum ada, galeri menampilkan placeholder bertuliskan nama file). `logo.png` dipakai juga untuk pratinjau WhatsApp (Open Graph); disarankan membuat `og.jpg` 1200x630.
Catatan penting: data paket/promo diedit admin tersimpan di localStorage browser admin saja. Pengunjung lain tetap melihat data awal sampai sistem dipindah ke Firebase.

## Final polish (v3)
- Modal untuk perpanjang, hapus, setujui/tolak pembayaran, edit member, dan reset (tanpa `prompt()`).
- Tabel menjadi kartu di layar ≤600px. Dashboard admin: pengingat membership akan berakhir (tautan WhatsApp) dan ringkasan pembayaran.
- Galeri hanya menampilkan foto yang ada; jika belum ada foto sama sekali, tampil pesan "segera hadir".
- Foto yang perlu diunggah ke root: `hero-gym.jpg`, `gym-interior.jpg`, `gym-treadmill.jpg`, `gym-dumbbell.jpg`, `gym-mesin.jpg`. Gunakan JPEG/WebP ≤200 KB (hero ≤300 KB, lebar 1600px).
- Kompatibilitas: butuh browser setara Chrome 80+/Firefox 78+ (fallback ukuran font untuk `clamp()` sudah ada). Belum diuji di Windows 7 sungguhan.
- Jika di HP tampil seperti desktop, matikan "Situs desktop" di menu browser.

## v4 — Tampilan canggih + loading screen
- `loader.js`: loading screen 3 detik (logo + progress bar), tampil sekali per sesi browser/tab. Untuk menonton lagi, buka tab baru. Tema gelap/terang kini diterapkan sebelum halaman tampil (tanpa kedip).
- Hero baru (glow merah, watermark logo, huruf miring), strip info berjalan, bar CTA bawah di HP (Daftar + WhatsApp).
- Kartu member digital dengan bar sisa masa aktif; statistik 2 kolom di HP; tombol aksi tabel di HP tersusun rapi.

## v5
- Tombol "Kembali ke beranda" di login dan register.
- Beranda: section "Sedang di gym" = member yang di-check-in admin dalam 3 jam terakhir (nama depan, foto, level). Hanya tampil jika member mengizinkan (kotak centang di dashboard member, default aktif). Data berasal dari localStorage browser yang sama.
- Dashboard member: foto profil dengan crop bulat (geser + zoom), otomatis WebP 256x256 (fallback JPEG), level (Lv1 Pemula 0–4 kunjungan, Lv2 Rutin 5–14, Lv3 Konsisten 15–29, Lv4 Atlet 30–59, Lv5 Elite 60+), peringkat, dan Top 5.
- Admin: drawer HP punya latar redup dan menutup saat disentuh di luar; angka statistik menghitung naik.

## v6
- Logo baru (emblem sayap) di semua tempat: `logo.png`, `favicon.png`, ikon PWA (`icon-192/512/maskable`, `icon-180`), `og.png` (pratinjau WhatsApp). Nama "FUN FITNESS" tampil di navbar, login, sidebar admin, dashboard member, footer, dan loading screen.
- Admin → Laporan: **Unduh PDF** (A4, header merah, kartu ringkasan, tabel penjualan/transaksi/member yang perlu ditindaklanjuti) dan **Unduh Excel** (.xlsx asli, 4 sheet: Ringkasan, Transaksi, Member, Kunjungan). Dibuat di browser, tanpa library. Data sesuai filter periode.
- **PWA**: `manifest.webmanifest`, `sw.js` (cache offline), `pwa.js` (tombol "Pasang Aplikasi"). Syarat: dibuka lewat HTTPS (GitHub Pages sudah HTTPS), bukan file://.
  - Android Chrome: tombol "Pasang Aplikasi" atau menu ⋮ → Instal aplikasi.
  - Windows 7: gunakan Chrome versi terakhir yang masih mendukung Windows 7 (109) atau Edge setara → menu ⋮ → Instal FUN FITNESS. Firefox desktop tidak mendukung pasang PWA.
  - iPhone: Safari → Bagikan → Tambah ke Layar Utama.
  - Setelah mengubah file, naikkan `V` di `sw.js` (mis. `ff-v7`) agar pengguna mendapat versi terbaru.
- Dashboard member: dua kolom di PC; avatar daftar Top 5 tidak lagi lonjong.
