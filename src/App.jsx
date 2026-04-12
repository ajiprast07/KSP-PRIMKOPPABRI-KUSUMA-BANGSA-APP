import { useState } from 'react'
import { Login, Dashboard, Pengguna, Aktivitas, Transaksi, Laporan, LaporanPage, Keanggotaan, Pengaturan, Profile, VerifikasiPinjaman } from '@/pages'
import DashboardLayout from '@/layouts/DashboardLayout'
import { AuthProvider, useAuth } from '@/context/AuthContext'

function getJakartaPeriod() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)

  const monthPart = parts.find((p) => p.type === 'month')?.value
  const yearPart = parts.find((p) => p.type === 'year')?.value

  const bulan = Number(monthPart)
  const tahun = Number(yearPart)

  return {
    bulan: Number.isInteger(bulan) && bulan >= 1 && bulan <= 12 ? bulan : now.getMonth() + 1,
    tahun: Number.isInteger(tahun) && tahun >= 2000 ? tahun : now.getFullYear(),
  }
}

function AppContent() {
  const { isAuthenticated, logout, dataVersion } = useAuth()
  const [currentPage, setCurrentPage] = useState('beranda')
  const initialPeriod = getJakartaPeriod()
  const [selectedBulan, setSelectedBulan] = useState(initialPeriod.bulan)
  const [selectedTahun, setSelectedTahun] = useState(initialPeriod.tahun)

  const handlePeriodChange = (bulan, tahun) => {
    setSelectedBulan(bulan)
    setSelectedTahun(tahun)
  }

  // Auth pages
  if (!isAuthenticated) {
    return (
      <Login
        onLoginSuccess={() => setCurrentPage('beranda')}
      />
    )
  }

  // Render semua halaman sekaligus, sembunyikan yang tidak aktif
  // agar komponen tidak unmount saat navigasi (mencegah re-fetch data)
  const pages = [
    { key: 'beranda',     component: <Dashboard /> },
    { key: 'pengguna',    component: <Pengguna /> },
    { key: 'aktivitas',   component: <Aktivitas /> },
    { key: 'transaksi',   component: <Transaksi onNavigate={setCurrentPage} /> },
    { key: 'verifikasi-pinjaman', component: <VerifikasiPinjaman onNavigate={setCurrentPage} /> },
    {
      key: 'laporan',
      component: (
        <Laporan
          onNavigate={setCurrentPage}
          selectedBulan={selectedBulan}
          selectedTahun={selectedTahun}
          onPeriodChange={handlePeriodChange}
        />
      ),
    },
    {
      key: 'laporan-page',
      component: (
        <LaporanPage
          onNavigate={setCurrentPage}
          selectedBulan={selectedBulan}
          selectedTahun={selectedTahun}
        />
      ),
    },
    { key: 'keanggotaan', component: <Keanggotaan /> },
    { key: 'pengaturan',  component: <Pengaturan /> },
    { key: 'profile',     component: <Profile /> },
  ]

  const sidebarActivePage =
    currentPage === 'laporan-page' ? 'laporan'
      : currentPage === 'verifikasi-pinjaman' ? 'transaksi'
        : currentPage

  return (
    <DashboardLayout
      activePage={sidebarActivePage}
      onNavigate={(page) => setCurrentPage(page)}
      onLogout={logout}
    >
      {pages.map(({ key, component }) => (
        <div
          key={currentPage === key ? key : `${key}-${dataVersion}`}
          className={currentPage !== key ? 'hidden' : ''}
        >
          {component}
        </div>
      ))}
    </DashboardLayout>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
