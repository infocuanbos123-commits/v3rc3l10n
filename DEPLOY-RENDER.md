# Vercel + Render source backend

Backend kecil di folder `backend` mengambil katalog, metadata, subtitle, playlist,
dan media. AI dan tampilan tetap berjalan di Vercel. Backend tidak menjalankan
browser atau menyelesaikan challenge Cloudflare. Akses dari Render harus dites;
berhasil dari komputer lokal bukan bukti berhasil dari Render.

## Deploy backend gratis

1. Push perubahan project ini, termasuk `backend`, `render.yaml`, dan perubahan
   `src/lib/source-fetch.ts`/`src/lib/browse-ai.ts`, ke repo GitHub yang digunakan.
2. Buat akun/login di https://dashboard.render.com. Pilih **New > Blueprint**,
   pilih repo tersebut, lalu tinjau service `metromovies-source`, plan **Free**.
   Blueprint tidak membuat database atau service berbayar.
3. Setelah deploy, buka halaman service. Simpan URL HTTPS service. Di bagian
   Environment, salin `SOURCE_BACKEND_TOKEN` yang dibuat Render ke konfigurasi
   server Vercel. Jangan kirim token ke chat, commit ke Git, atau memakai prefix
   `NEXT_PUBLIC_`.
4. Sebelum mengubah production Vercel, isi `.env.local` lokal:

   ```dotenv
   SOURCE_BACKEND_TOKEN=<nilai rahasia dari Render>
   ```

   Jalankan:

   ```bash
   npm run check:live -- https://nama-service.onrender.com --backend
   ```

   Pemeriksaan harus lulus katalog, playlist/byte video episode contoh 223821,
   dan subtitle English/Indonesia. Jika gagal `cf-mitigated: challenge`/HTTP 403,
   akses dari Render belum diterima sumber. Jangan menyatakan deployment beres
   atau membeli paket hanya berdasarkan keberhasilan build. Skrip ini tidak
   membuktikan semua judul dapat diputar.

## Hubungkan Vercel

Setelah pemeriksaan backend lulus, tambahkan Environment Variables Vercel:

```dotenv
SOURCE_BACKEND_URL=https://nama-service.onrender.com
SOURCE_BACKEND_TOKEN=<nilai rahasia yang sama>
```

Redeploy commit terbaru. Tidak ada URL backend/token di kode frontend. Request
sumber server melalui backend Render; player tetap memakai `/api/stream/hls` dan
subtitle `/api/sub-vtt` di domain Vercel. Periksa deployment hasil redeploy:

```bash
npm run check:live -- https://w4tchm3br00.vercel.app
```

Lalu periksa dashboard, kategori, pencarian, dan playback di browser. AI memakai
`/tmp/metromovies-ai` di Vercel. Cache itu sementara dan model dapat diunduh ulang
ketika instance baru berjalan. Filter AI tetap dapat menahan judul sementara
saat metadata/model tidak tersedia.

Paket ini menyertakan 186 keputusan model untuk judul yang sudah dianalisis,
agar instance baru tidak harus mengulang semua analisis. Keputusan tetap punya
masa berlaku tujuh hari. Judul baru/tidak ada dalam seed tetap perlu diperiksa.

## Batasan gratis

Render gratis tidur setelah 15 menit tanpa trafik, dan bisa membutuhkan sekitar
satu menit untuk bangun. Request Vercel ke backend diberi waktu sampai 90 detik
agar bisa menunggu service bangun; request sumber dari backend tetap dibatasi
20 detik. Cache backend berada di memori dan hilang saat restart.
Bandwidth video memakai kuota **kedua** platform karena video melewati Render
dan Vercel. Paket ini untuk menguji jalur live tanpa biaya langganan ScraperAPI,
bukan janji kapasitas streaming tanpa batas atau bebas challenge selamanya.

Media hanya boleh ke host yang tercantum di `SOURCE_MEDIA_HOSTS` (default
`*.cdnvideo11.shop,*.streamingcdn5.site`). Jika sumber memakai CDN lain, periksa URL CDN dari metadata
video lalu tambahkan hostname yang benar di Environment Render; jangan gunakan
wildcard semua host. Redirect keluar dari daftar diblokir. `/ready` hanya
memeriksa proses backend, bukan akses sumber, sehingga status Render **Live**
belum membuktikan playback.

Untuk kembali ke jalur langsung, hapus `SOURCE_BACKEND_URL` dari Vercel dan
redeploy. Tidak perlu menghapus preferensi/riwayat pengguna.
