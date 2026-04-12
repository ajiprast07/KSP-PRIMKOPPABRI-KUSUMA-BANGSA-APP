# Pages Folder

Folder ini berisi semua halaman/pages aplikasi.

## Struktur

Setiap page memiliki folder sendiri untuk mempermudah organisasi:

```
pages/
├── Login/
│   └── Login.jsx
├── SignUp/
│   └── SignUp.jsx
├── Dashboard/          (akan ditambahkan)
│   └── Dashboard.jsx
├── index.js           (centralized exports)
└── README.md
```

## Cara Menambahkan Page Baru

1. Buat folder baru dengan nama page (PascalCase)
2. Buat file `.jsx` dengan nama yang sama di dalam folder
3. Export page tersebut di `index.js`
4. Import dari `@/pages` di file lain

### Contoh:

**1. Membuat page baru** (`src/pages/Dashboard/Dashboard.jsx`):
```jsx
export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
    </div>
  )
}
```

**2. Export di** `src/pages/index.js`:
```js
export { default as Dashboard } from './Dashboard/Dashboard'
```

**3. Import di** `App.jsx`:
```jsx
import { Dashboard } from '@/pages'
```

## Naming Convention

- Folder: PascalCase (contoh: `Login`, `SignUp`, `UserProfile`)
- File: PascalCase.jsx (contoh: `Login.jsx`, `SignUp.jsx`)
- Component name: sama dengan nama file
