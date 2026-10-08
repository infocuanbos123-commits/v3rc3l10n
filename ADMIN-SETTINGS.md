# Secret Settings

Buka `/secret-settings`. Halaman tidak ditautkan dari navigasi dan memakai
`noindex`. Masuk dengan kode akses yang disimpan pada konfigurasi server.

Cari judul, pilih **Hide**, atau masukkan ID/judul secara manual saat pencarian
sumber tidak tersedia. Perubahan berlaku untuk semua pengunjung pada dashboard,
kategori, watchlist, dan lanjut menonton. Pilih **Tampilkan lagi** untuk menghapus
hide manual. Filter tema/AI yang sudah aktif tetap berlaku.

Search, autocomplete pencarian judul, halaman detail, dan player tidak disaring
oleh daftar manual. Film tidak dihapus dari sumber atau data pengguna. Halaman
yang sudah terbuka perlu dimuat ulang; cache daftar bersama berlaku lima detik.

## Konfigurasi Vercel

Set empat variabel server berikut untuk Production dan Preview yang digunakan:

```dotenv
ADMIN_ACCESS_CODE=<kode akses yang diminta>
ADMIN_SESSION_SECRET=<nilai acak panjang>
UPSTASH_REDIS_REST_URL=<URL database bersama>
UPSTASH_REDIS_REST_TOKEN=<token server database>
```

Nilai sudah dipasang di `.env.local` komputer ini. Salin dari file lokal ke
Environment Variables Vercel lalu redeploy kode terbaru. Jangan commit file itu
atau memakai prefix `NEXT_PUBLIC_`. Token database dan kode akses tidak dikirim
ke frontend. Login memakai cookie HttpOnly, SameSite Strict, Secure di production,
sesi delapan jam, pemeriksaan origin, dan batas percobaan login bersama.

Database gratis awal dibuat untuk pengujian. **Klaim sebelum 11 Oktober 2026**
agar tidak otomatis dihapus. Gunakan link klaim yang diberikan di chat ini.
Informasi provisioning juga disimpan privat pada `.cache/admin-redis-bootstrap.md`.
Jangan unggah file provisioning atau link klaim ke repo publik.

Pilih Free saat mengklaim; jangan pindah paket berbayar. Setelah klaim, periksa
kembali REST URL/token di console. Kalau berubah, perbarui `.env.local` dan
Environment Variables Vercel. Database menyimpan ID/judul yang di-hide dan
counter percobaan login; tidak menyimpan kode akses, cookie sesi, atau password.

Daftar manual memakai Redis HSET/HDEL per ID sehingga perubahan beberapa admin
tidak menimpa seluruh daftar. Jika penyimpanan yang sudah dikonfigurasi gagal,
perubahan admin ditolak dan katalog ditahan sementara dengan pesan error,
agar judul yang seharusnya di-hide tidak mendadak tampil. Search tetap tersedia.

## Verifikasi

`npm test` mencakup kode salah, sesi palsu/kedaluwarsa, akses tanpa login,
request lintas origin, hide global, undo, dan kegagalan penyimpanan. Alur browser
juga diuji dengan judul contoh Against The Current: hide global aktif untuk
request anonim, tetap tersedia di search dan stream, kemudian di-undo.

Perubahan ini belum diterapkan pada deployment Vercel sampai kode/env terbaru
diunggah. Masalah Cloudflare sumber ditangani terpisah melalui backend Render;
lihat `DEPLOY-RENDER.md`.
