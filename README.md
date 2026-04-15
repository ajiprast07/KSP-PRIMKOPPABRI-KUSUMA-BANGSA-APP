# KSP PRIMKOPPABRI Kusuma Bangsa Web App

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
      Aktivitas/
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
- Aktivitas
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
