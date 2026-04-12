import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/common/Sidebar'
import Footer from '@/components/common/Footer'

export default function DashboardLayout({ children, activePage, onNavigate, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-56">

        {/* Mobile topbar */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 lg:hidden shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[#0066FF] font-bold text-sm">KSP PRIMKOPPABRI KUSUMA BANGSA</span>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  )
}
