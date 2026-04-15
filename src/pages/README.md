# Pages Folder

Folder ini berisi seluruh halaman utama aplikasi.

## Daftar Halaman Saat Ini

```text
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
  README.md
```

## Pola Folder Halaman

Setiap halaman menggunakan pola:

```text
pages/NamaHalaman/
  NamaHalaman.jsx
```

## Cara Menambahkan Halaman Baru

1. Buat folder halaman baru dengan format PascalCase.
2. Tambahkan file komponen utama dengan nama yang sama.
3. Export halaman di pages/index.js.
4. Daftarkan halaman di App.jsx bila perlu tampil di navigasi/layout.

Contoh export:

```js
export { default as NamaHalaman } from './NamaHalaman/NamaHalaman'
```

Contoh import:

```jsx
import { NamaHalaman } from '@/pages'
```

## Konvensi Penamaan

- Folder: PascalCase, contoh Login, VerifikasiPinjaman.
- File halaman: PascalCase.jsx, contoh Transaksi.jsx.
- Nama komponen default export: sama dengan nama file.

## Catatan Integrasi

- Halaman Transaksi dan VerifikasiPinjaman terhubung lewat alur verifikasi pencairan.
- Halaman Keanggotaan menampilkan detail anggota, dokumen, simpanan, dan pinjaman.
- Halaman Laporan dan LaporanPage memakai periode bulan/tahun dari state aplikasi utama.
