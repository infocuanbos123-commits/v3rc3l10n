# MetroMovies — Asian Drama, Anime & Movie Streaming Platform

> **Engineered with ❤️ by dbarya**

**MetroMovies** adalah platform web streaming modern full-stack untuk menonton Drama Asia (K-Drama, C-Drama, J-Drama), Anime, dan Movies dengan resolusi HD dan subtitle multi-bahasa lengkap. Project ini mengusung visual elegan, pemutar video HLS canggih, dan sistem akun/backup lokal yang mandiri.

---

## 🌟 Fitur Utama

1. **Bespoke MetroMovies Brand & Identity**:
   - Custom SVG emblem monogram 'M' bernuansa cinema/metro transit dengan aksen oranye dan neon cyan.
   - Dynamic favicon dan app icon SVG responsif.
   - Desain dark mode elegan khas platform streaming premium (`#1e1e1e`, `#242424`, `#f77e0b`).
   - Atribusi wajib **"by dbarya"** di seluruh layout.

2. **Full-Featured Modern HLS Video Player**:
   - Pemutar video berbasis **HLS.js** dengan fallback native (Safari/iOS).
   - Kontrol kustom lengkap: Play/Pause, Seekbar responsif dengan indikator buffer, Volume slider & mute toggle, Pengatur kecepatan (0.5x - 2x).
   - Subtitle switcher dropdown (English, Arabic, Indonesian, Spanish, dll.) dengan auto-converter SRT ke WebVTT via `/api/sub-vtt`.
   - Keyboard shortcuts: `Space` (Play/Pause), Panah Kiri/Kanan (Mundur/Maju 10s), `F` (Fullscreen), `M` (Mute).
   - Auto-play next episode saat durasi habis.
   - Simpan riwayat tontonan otomatis di `localStorage` (`metromovies_history`).

3. **User Authentication & Local Backup System**:
   - Modal Login & Register dengan sesi lokal persisten (`metromovies_auth_user`).
   - **Akun Default Admin**: `admin` / `admin123` (tersedia tombol *Quick Fill Admin*).
   - **Halaman Profil & Backup** (`/profile`):
     - **Export Complete Backup (.json)**: Backup seluruh Watchlist, Bookmarks, Riwayat Tontonan, dan Akun ke dalam satu file `.json` (`metromovies-backup-xxxx.json`).
     - **Import & Restore Backup**: Pulihkan data tontonan kapan saja saat memindahkan aplikasi ke perangkat lain.

4. **Kategori & Navigasi Lengkap**:
   - `/`: Beranda utama dengan Hero Banner trending dan feed update terbaru (*Latest Updates*, *Top K-Drama*, *Top C-Drama*, *Top Rating*, *Anime Series*, *Upcoming*).
   - `/drama/[id]`: Halaman pemutar video, episode grid selector (lengkap dengan filter pencarian episode untuk series 50-100+ eps), sinopsis, tahun, negara, status, tombol share, dan bookmark.
   - `/explore`: Filter komprehensif berdasarkan Negara (Korea, China, Japan, Taiwan, Thailand), Status (Ongoing, Completed), Tipe (Drama, Movie, Anime), dan Sorting (Latest, Most Viewed, Top Rated) + Pagination.
   - `/search`: Halaman hasil pencarian keyword dengan live debounced autocomplete.
   - `/watchlist`: Bookmark tersimpan & Riwayat tontonan dengan indikator persentase nonton.
   - `/profile`: Akun pengguna dan manajemen backup lokal.

---

## 🚀 Cara Menjalankan

### Cara Praktis (Tinggal Dobel Klik):
1. **Double-click `start.bat`** untuk mode Development. Browser otomatis terbuka ke `http://localhost:3000`.
2. **Double-click `start-prod.bat`** untuk mode Production dengan performa maksimal.

### Jalankan via Terminal / CMD:
```bash
npm run dev
```

---

## 🔐 Info Login Default
- **Username**: `admin`
- **Password**: `admin123`

---

## 🛠️ Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS v4 & PostCSS
- **Icons**: Lucide React + Bespoke MetroMovies SVG Identity
- **Video Engine**: HLS.js
- **Backend & Stream Extractor**: Native Node.js Crypto Engine & REST Proxy

---

## 📜 Attribution & Credit
Dibuat dan dikembangkan oleh **dbarya**.

## Akses sumber langsung

Untuk deployment Vercel yang sumbernya menolak request langsung, paket backend
Render gratis dan langkah pemeriksaan nyata tersedia di [DEPLOY-RENDER.md](DEPLOY-RENDER.md).
Keberhasilan akses sumber dari Render harus dibuktikan setelah deploy.

ScraperAPI sudah tidak digunakan. Salin konfigurasi di .env.example ke .env.local bila perlu mengganti origin sumber, lalu restart server. KISSKH_BASE_URL harus menunjuk sumber API yang kompatibel dan dapat diakses oleh server.

Player mencoba Video dan Video_tmp, memeriksa format HLS/MP4, dan tidak memakai embed pihak ketiga sebagai fallback otomatis. Ini menghindari script iklan embed, tetapi tidak menghapus iklan yang menyatu dalam file video.

Cloudflare challenge tidak diselesaikan otomatis. Jika sumber meminta verifikasi atau menolak koneksi, API mengembalikan error yang jelas. GET /api/health memeriksa akses katalog dan mengembalikan status gagal saat sumber tidak tersedia. Tidak ada API key berbayar yang diperlukan; keberhasilan playback tetap bergantung pada akses media dari sumber.

`SOURCE_DNS_SERVERS` opsional: daftar resolver DNS dipisahkan koma. Konfigurasi ini hanya berlaku pada request server aplikasi, tidak mengubah DNS Windows dan tidak menyelesaikan challenge Cloudflare. Pada mode DNS khusus, cache metadata memakai memori proses, sehingga restart/cold start membutuhkan pengambilan ulang.

## Preferensi katalog

Panel admin global tersedia di `/secret-settings`. Cara konfigurasi deployment
dan penyimpanan bersama ada di [ADMIN-SETTINGS.md](ADMIN-SETTINGS.md).

Beranda, kategori, dan rak Lanjut Nonton memakai `src/lib/browse-policy.ts` untuk menyembunyikan tema BL yang teridentifikasi. GL tetap ditampilkan. Search judul tetap mengembalikan seluruh hasil dan akses judul langsung tetap tersedia. Tidak ada tombol kategori/filter BL. Riwayat tersimpan tidak dihapus.

Sumber tidak menyediakan genre lengkap. Selain label eksplisit dan daftar terverifikasi, `src/lib/browse-ai.ts` membaca sinopsis menggunakan model NLI lokal `Xenova/nli-deberta-v3-xsmall` lewat Transformers.js. Model diunduh sekali ke `.cache/models`, analisis berjalan pada CPU tanpa API key berbayar, dan keputusan disimpan tujuh hari di `.cache/browse-ai.json`. GL memakai label terpisah dan tetap tersedia. Model dapat salah menafsirkan sinopsis ambigu; daftar terverifikasi melengkapi model. Judul tanpa sinopsis yang bisa diperiksa ditahan sementara dari browsing, tetapi tetap tersedia lewat search. Pembukaan kategori baru bisa lebih lambat saat cache belum terisi.

Permintaan metadata diberi jeda, dideduplikasi, dan dihentikan sementara ketika sumber merespons 429/challenge. Kategori menyaring sebelum pagination dan mengisi 30 judul bila tersedia; ketika sumber sedang membatasi metadata, halaman dapat sementara berisi lebih sedikit judul. Tambahkan ID/judul terverifikasi ke `verifiedBrowseThemes` untuk koreksi yang pasti tanpa biaya API.

## Subtitle

Tombol subtitle tersedia di semua player HLS/MP4. Subtitle API sumber dinormalisasi dan dideduplikasi: English ditaruh pertama dan menjadi default, lalu Bahasa Indonesia. Track bawaan HLS juga dideteksi. SRT dikonversi ke WebVTT, sedangkan WebVTT asli dipertahankan.

Jika sumber tidak menyediakan bahasa tersebut, menu menjelaskan ketersediaannya. Pengguna dapat membuka file SRT/VTT lokal (maksimal 5 MB) tanpa upload ke layanan lain. Aplikasi tidak mengklaim menyediakan terjemahan yang tidak ada, dan tidak memakai akun/API subtitle berbayar.
