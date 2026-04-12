# Project Structure

Struktur folder aplikasi KSP PRIMKOPPABRI Kusuma Bangsa.

```
src/
├── components/
│   ├── ui/                    # shadcn-ui components
│   │   ├── button.jsx
│   │   ├── input.jsx
│   │   └── label.jsx
│   └── [common]/              # Custom reusable components (akan ditambahkan)
│
├── pages/                     # Halaman-halaman aplikasi
│   ├── Login/
│   │   └── Login.jsx
│   ├── index.js              # Centralized exports
│   └── README.md
│
├── lib/                       # Utility functions & helpers
│   └── utils.js
│
├── assets/                    # Images, icons, fonts (akan ditambahkan)
│
├── App.jsx                    # Main app component
├── App.css                    # App-level styles
├── main.jsx                   # Entry point
└── index.css                  # Global styles & Tailwind

Root files:
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── jsconfig.json
└── components.json            # shadcn-ui config
```

## Folder Descriptions

### `components/`
- **`ui/`**: Komponen dari shadcn-ui (button, input, label, dll)
- **`common/`**: Komponen reusable custom (akan ditambahkan sesuai kebutuhan)

### `pages/`
Semua halaman aplikasi. Setiap page punya folder sendiri.
- Import pages dari: `import { Login } from '@/pages'`
- Lihat `pages/README.md` untuk detail

### `lib/`
Fungsi utility dan helpers.
- `utils.js`: Helper functions seperti `cn()` untuk className merging

### `assets/`
Untuk menyimpan images, icons, fonts, dll (akan dibuat saat diperlukan)

## Path Aliases

Configured di `jsconfig.json` dan `vite.config.js`:
- `@/` → `src/`

Contoh usage:
```jsx
import { Button } from '@/components/ui/button'
import { Login } from '@/pages'
import { cn } from '@/lib/utils'
```

## Naming Conventions

- **Folders**: PascalCase untuk pages/components (`Login`, `SignUp`)
- **Files**: 
  - Components: PascalCase.jsx (`Login.jsx`, `Button.jsx`)
  - Utils: camelCase.js (`utils.js`)
- **Component names**: Sama dengan nama file

## Menambahkan Page Baru

1. Buat folder di `src/pages/NamaPage/`
2. Buat file `NamaPage.jsx`
3. Export di `src/pages/index.js`
4. Import dengan `import { NamaPage } from '@/pages'`

Lihat `src/pages/README.md` untuk detail lebih lanjut.
