import { useState } from 'react'
import {
  LayoutDashboard,
  DollarSign,
  BarChart2,
  Users,
  User,
  Activity,
  Settings,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const menuItems = [
  { id: 'beranda', label: 'Beranda', icon: LayoutDashboard },
  { id: 'transaksi', label: 'Transaksi', icon: DollarSign },
  { id: 'laporan', label: 'Laporan', icon: BarChart2 },
  { id: 'keanggotaan', label: 'Keanggotaan', icon: Users },
  { id: 'pengguna', label: 'Pegawai', icon: User },
  { id: 'aktivitas', label: 'Aktivitas', icon: Activity },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
]

export default function Sidebar({ activePage = 'beranda', onNavigate, isOpen = false, onClose, onLogout }) {
  const { user } = useAuth()
  const displayName = user?.username ?? 'Pegawai'
  const displayRole = user?.roles?.[0] ?? '-'
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleNavigate = (id) => {
    onNavigate?.(id)
    onClose?.() // close drawer on mobile after selecting
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'w-56 min-h-screen bg-white flex flex-col shadow-sm border-r border-gray-100 fixed top-0 left-0 z-30 transition-transform duration-300',
          // Mobile: slide in/out
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo + close button (mobile) */}
        <div className="px-5 py-6 flex items-start justify-between">
          <h1 className="text-[#0066FF] font-bold text-lg leading-tight">
            KSP PRIMKOPPABRI
            <br />
            KUSUMA BANGSA
          </h1>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-gray-600 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-5 px-3 space-y-4">
          {menuItems.map(({ id, label, icon }) => {
            const MenuIcon = icon
            return (
              <button
                key={id}
                onClick={() => handleNavigate(id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                  activePage === id
                    ? 'bg-[#0066FF] text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <MenuIcon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => handleNavigate('profile')}
            className={cn(
              'w-full flex items-center gap-2 rounded-lg p-1.5 text-left transition-colors',
              activePage === 'profile' ? 'bg-blue-50' : 'hover:bg-gray-50'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{displayName}</p>
              <p className="text-xs text-gray-400 truncate">{displayRole}</p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setShowLogoutModal(true)
              }}
              className="text-gray-400 hover:text-red-500 shrink-0 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowLogoutModal(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-xl w-[320px] p-6 flex flex-col items-center gap-4">
            {/* Icon */}
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <LogOut className="w-7 h-7 text-red-500" />
            </div>

            {/* Text */}
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-gray-900">Konfirmasi Logout</h3>
              <p className="text-sm text-gray-500">Apakah Anda yakin ingin keluar dari akun ini?</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 w-full mt-1">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => { setShowLogoutModal(false); onLogout?.() }}
                className="flex-1 h-10 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                Ya, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
