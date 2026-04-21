# Project Structure

Dokumentasi struktur folder aplikasi KSP PRIMKOPPABRI Kusuma Bangsa KCP GUMELAR.

## Struktur Saat Ini

```text
src/
  App.jsx
  main.jsx
  index.css
  STRUCTURE.md

  assets/

  components/
    common/
      Footer.jsx
      Sidebar.jsx
    ui/
      button.jsx
      input.jsx
      label.jsx

  context/
    AuthContext.jsx

  hooks/

  layouts/
    DashboardLayout.jsx

  lib/
    api.js
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
    README.md
```

## Penjelasan Folder

### `components/`
- `ui/`: komponen dasar UI (button, input, label).
- `common/`: komponen lintas halaman seperti sidebar dan footer.

### `context/`
- `AuthContext.jsx`: state autentikasi, data user, dan helper request `authFetch`.

### `layouts/`
- `DashboardLayout.jsx`: layout utama aplikasi setelah login.

### `lib/`
- `utils.js`: helper umum (misalnya className utility).
- `api.js`: helper API yang dipakai lintas modul.

### `pages/`
- Berisi halaman-halaman utama aplikasi.
- Export terpusat ada di `pages/index.js`.
- Detail tambahan ada di `pages/README.md`.

## Path Alias

Alias import:
- `@/` mengarah ke `src/`

Contoh:

```jsx
import { Button } from '@/components/ui/button'
import { Transaksi } from '@/pages'
import { cn } from '@/lib/utils'
```

## Konvensi Penamaan

- Folder halaman: PascalCase, contoh `Transaksi`, `VerifikasiPinjaman`.
- File komponen halaman: PascalCase.jsx.
- Utility/helper: camelCase.js.

## Menambahkan Halaman Baru

1. Buat folder baru di `src/pages/NamaHalaman/`.
2. Tambahkan file `NamaHalaman.jsx`.
3. Export di `src/pages/index.js`.
4. Daftarkan di `src/App.jsx` bila perlu muncul di navigasi.
