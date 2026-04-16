import { useEffect, useMemo, useState } from 'react'
import { Login, Dashboard, Pengguna, Aktivitas, Transaksi, Laporan, LaporanPage, Keanggotaan, Pengaturan, Profile, VerifikasiPinjaman } from '@/pages'
import DashboardLayout from '@/layouts/DashboardLayout'
import { AuthProvider, useAuth } from '@/context/AuthContext'

const SIDEBAR_PAGE_ORDER = ['beranda', 'transaksi', 'laporan', 'keanggotaan', 'pengguna', 'aktivitas', 'pengaturan']

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase()
}

function canAccessPage(pageId, permissions = []) {
  const rules = {
    beranda: ['dashboard.read'],
    transaksi: ['transaksi.read', 'transaksi.process', 'simpanan.setor', 'simpanan.tarik', 'pinjaman.ajukan', 'pinjaman.angsuran', 'pinjaman.cairkan'],
    'verifikasi-pinjaman': ['pinjaman.verify'],
    laporan: ['laporan.read', 'laporan.generate', 'laporan.finalize'],
    'laporan-page': ['laporan.read', 'laporan.generate', 'laporan.finalize'],
    keanggotaan: ['nasabah.read', 'nasabah.create', 'nasabah.update', 'nasabah.verify'],
    pengguna: ['pegawai.read', 'user.read'],
    aktivitas: ['audit.read'],
    pengaturan: ['settings.read', 'settings.update'],
  }

  if (pageId === 'profile') return true

  const permissionSet = new Set((Array.isArray(permissions) ? permissions : []).map(normalizeToken))
  const pageRules = rules[pageId] || []

  if (permissionSet.size === 0) return false
  return pageRules.some((item) => permissionSet.has(normalizeToken(item)))
}

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
  const { isAuthenticated, logout, dataVersion, permissions } = useAuth()
  const [currentPage, setCurrentPage] = useState('beranda')
  const initialPeriod = getJakartaPeriod()
  const [selectedBulan, setSelectedBulan] = useState(initialPeriod.bulan)
  const [selectedTahun, setSelectedTahun] = useState(initialPeriod.tahun)

  const handlePeriodChange = (bulan, tahun) => {
    setSelectedBulan(bulan)
    setSelectedTahun(tahun)
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

  const allowedKeys = useMemo(
    () => new Set(pages.map((page) => page.key).filter((key) => canAccessPage(key, permissions))),
    [pages, permissions]
  )

  const firstAllowedSidebarPage = useMemo(
    () => SIDEBAR_PAGE_ORDER.find((key) => allowedKeys.has(key)) || 'profile',
    [allowedKeys]
  )

  const resolvedCurrentPage = allowedKeys.has(currentPage)
    ? currentPage
    : firstAllowedSidebarPage

  const sidebarActivePage =
    resolvedCurrentPage === 'laporan-page' ? 'laporan'
      : resolvedCurrentPage === 'verifikasi-pinjaman' ? 'transaksi'
        : resolvedCurrentPage

  const visiblePages = pages.filter((page) => allowedKeys.has(page.key))
  const activePageEntry = visiblePages.find((page) => page.key === resolvedCurrentPage)

  useEffect(() => {
    if (!isAuthenticated) return
    if (currentPage !== resolvedCurrentPage) {
      setCurrentPage(resolvedCurrentPage)
    }
  }, [isAuthenticated, currentPage, resolvedCurrentPage])

  // Auth pages
  if (!isAuthenticated) {
    return (
      <Login
        onLoginSuccess={() => setCurrentPage('beranda')}
      />
    )
  }

  return (
    <DashboardLayout
      activePage={sidebarActivePage}
      onNavigate={(page) => setCurrentPage(page)}
      onLogout={() => {
        setCurrentPage('beranda')
        logout()
      }}
    >
      {activePageEntry ? (
        <div key={`${activePageEntry.key}-${dataVersion}`}>
          {activePageEntry.component}
        </div>
      ) : null}
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
