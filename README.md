# KSP PRIMKOPPABRI Kusuma Bangsa KCP GUMELAR Web App

Aplikasi web internal koperasi untuk pengelolaan dashboard, anggota, transaksi, verifikasi pinjaman, dan laporan.

## Ringkasan

- Frontend: React + Vite + Tailwind CSS
- UI Components: shadcn-ui (customized) + Lucide Icons
- Arsitektur: single-page dashboard dengan state navigasi per halaman
- Auth: berbasis AuthContext dengan wrapper authFetch

## Menjalankan Project

Prasyarat:
- Node.js 18 atau lebih baru
- npm

Langkah:

```bash
npm install
npm run dev
```

Build produksi:

```bash
npm run build
npm run preview
```

Lint:

```bash
npm run lint
```

Default dev server berjalan di http://localhost:5173.

## Konfigurasi Environment

Salin `.env.example` menjadi `.env` untuk local development:

```bash
# macOS/Linux/Git Bash
cp .env.example .env

# PowerShell
Copy-Item .env.example .env
```

Variabel yang digunakan:

- `VITE_API_BASE_URL`: base URL API di browser. Default `/api`.
- `VITE_API_PROXY_TARGET`: target API backend untuk proxy Vite saat `npm run dev`.

## Tech Stack

- React 19
- Vite 7
- Tailwind CSS 4
- Lucide React
- Recharts
- jsPDF

## Struktur Folder Utama

```text
src/
   App.jsx
   main.jsx
   index.css
   assets/
   components/
      common/
      ui/
   context/
      AuthContext.jsx
   hooks/
   layouts/
      DashboardLayout.jsx
   lib/
      utils.js
   pages/
      Audit/
      Dashboard/
      Keanggotaan/
      Laporan/
      LaporanPage/
      Login/
      Pengaturan/
      Pengguna/
      Profile/
      Transaksi/
      VerifikasiPinjaman/
      index.js
```

Dokumentasi struktur tambahan tersedia di src/STRUCTURE.md.

## Halaman Yang Tersedia

- Login
- Dashboard
- Pengguna
- Audit
- Transaksi
- Verifikasi Pinjaman
- Laporan
- Laporan Detail
- Keanggotaan
- Pengaturan
- Profile

Semua export halaman dipusatkan di src/pages/index.js.

## Fitur Utama

- Tabel data dengan filter, pencarian, dan pagination berbasis backend
- Modal aksi untuk detail, tambah data, verifikasi, dan hapus
- Toast notification konsisten antar halaman
- Tampilan desktop dan mobile responsif untuk modul utama
- Integrasi transaksi, simpanan, penarikan, angsuran, dan verifikasi pinjaman

## Konvensi Pengembangan

- Folder halaman dan komponen: PascalCase
- File komponen: PascalCase.jsx
- Utility/helper: camelCase.js
- Import antar folder menggunakan alias @/

Contoh:

```jsx
import { Button } from '@/components/ui/button'
import { Transaksi } from '@/pages'
import { cn } from '@/lib/utils'
```

## Menambahkan Halaman Baru

1. Buat folder baru di src/pages/NamaHalaman
2. Buat file komponen NamaHalaman.jsx
3. Tambahkan export di src/pages/index.js
4. Daftarkan halaman di src/App.jsx jika perlu muncul di navigasi dashboard

## Referensi

- src/pages/README.md
- src/STRUCTURE.md
- https://tailwindcss.com
- https://ui.shadcn.com

## Deploy Ke Vercel

Project ini sudah disiapkan untuk Vercel dengan file `vercel.json`:

- Rewrite `/api/*` ke `https://kspprimkoppabri.app/api/*` (menggantikan proxy Vite saat production).
- Rewrite semua route lain ke `index.html` untuk mendukung SPA fallback.

Langkah deploy:

1. Push project ke repository Git (GitHub/GitLab/Bitbucket).
2. Import repository ke Vercel.
3. Pastikan setting build terdeteksi otomatis (Framework: Vite, Build Command: `npm run build`, Output: `dist`).
4. (Opsional) Atur Environment Variable `VITE_API_BASE_URL` jika ingin override default `/api`.
5. Deploy.
