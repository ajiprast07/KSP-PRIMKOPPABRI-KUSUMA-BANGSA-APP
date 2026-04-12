# KSP PRIMKOPPABRI Kusuma Bangsa - Web Application

Web aplikasi untuk KSP PRIMKOPPABRI Kusuma Bangsa menggunakan React, Vite, Tailwind CSS, dan shadcn-ui.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm atau yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Aplikasi akan berjalan di `http://localhost:5173`

## 🏗️ Tech Stack

- **React 19** - UI Library
- **Vite 7** - Build tool & Dev server
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn-ui** - Re-usable component library
- **Lucide React** - Icon library
- **Poppins Font** - Typography

## 📁 Project Structure

```
src/
├── components/
│   └── ui/              # shadcn-ui components (button, input, label)
├── pages/               # Application pages
│   ├── Login/
│   │   └── Login.jsx
│   └── index.js        # Centralized exports
├── lib/                 # Utility functions
│   └── utils.js
├── App.jsx              # Main component
├── main.jsx             # Entry point
└── index.css            # Global styles

Configuration Files:
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── postcss.config.js    # PostCSS configuration
├── jsconfig.json        # Path aliases
└── components.json      # shadcn-ui configuration
```

**Lihat `src/STRUCTURE.md` untuk dokumentasi lengkap struktur folder.**

## 🎨 Features

- ✅ Responsive login page
- ✅ Modern UI dengan Tailwind CSS
- ✅ Poppins font untuk semua text
- ✅ Organized folder structure untuk scalability
- ✅ Path aliases (`@/`) untuk clean imports

## 📝 Menambahkan Page Baru

1. Buat folder baru di `src/pages/NamaPage/`
2. Buat file component `NamaPage.jsx`
3. Export di `src/pages/index.js`:
   ```js
   export { default as NamaPage } from './NamaPage/NamaPage'
   ```
4. Import di file lain:
   ```jsx
   import { NamaPage } from '@/pages'
   ```

Lihat `src/pages/README.md` untuk detail lengkap.

## 🔧 Path Aliases

Project menggunakan path alias untuk import yang lebih clean:

```jsx
// ✅ Good - dengan alias
import { Button } from '@/components/ui/button'
import { Login } from '@/pages'
import { cn } from '@/lib/utils'

// ❌ Avoid - relative paths
import { Button } from '../../../components/ui/button'
```

## 📚 Documentation

- `src/STRUCTURE.md` - Dokumentasi struktur project lengkap
- `src/pages/README.md` - Panduan menambahkan pages baru
- [Tailwind CSS Docs](https://tailwindcss.com)
- [shadcn-ui Docs](https://ui.shadcn.com)

## 🎯 Current Pages

- **Login** - Halaman login dengan responsive design
- **SignUp** - Halaman pendaftaran akun pegawai dengan form lengkap

_Untuk testing: Ganti `<Login />` dengan `<SignUp />` di App.jsx untuk melihat halaman yang berbeda_

## 👥 Development

### Naming Conventions
- Folders: PascalCase (contoh: `Login`, `Dashboard`)
- Component files: PascalCase.jsx (contoh: `Login.jsx`)
- Utility files: camelCase.js (contoh: `utils.js`)

### Code Style
- Use functional components dengan hooks
- Use Tailwind utility classes untuk styling
- Gunakan shadcn-ui components untuk UI elements
- Ikuti struktur folder yang sudah ditentukan

---

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh
