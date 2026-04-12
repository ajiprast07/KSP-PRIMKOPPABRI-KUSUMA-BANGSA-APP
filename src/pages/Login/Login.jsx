import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginUser } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

export default function Login({ onLoginSuccess }) {
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await loginUser({ usernameOrEmail, password })
      login(data)
      onLoginSuccess?.()
    } catch (err) {
      setError(err.message || 'Login gagal. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Blue Background with Branding */}
      <div className="relative bg-gradient-to-br from-[#0066FF] to-[#0052CC] lg:w-1/2 flex items-center justify-center p-8 lg:p-16 min-h-[200px] lg:min-h-screen">
        {/* Decorative Wave Elements */}
        <div className="absolute bottom-0 left-0 w-full opacity-20">
          <svg viewBox="0 0 1200 300" className="w-full h-auto">
            <path
              d="M0,160 Q300,100 600,160 T1200,160 L1200,300 L0,300 Z"
              fill="rgba(255,255,255,0.1)"
            />
            <path
              d="M0,200 Q300,150 600,200 T1200,200 L1200,300 L0,300 Z"
              fill="rgba(255,255,255,0.15)"
            />
          </svg>
        </div>
        
        {/* Branding Text */}
        <div className="relative z-10 text-white">
          <h1 className="text-3xl lg:text-5xl font-bold leading-tight">
            KSP PRIMKOPPABRI
            <br />
            KUSUMA BANGSA
          </h1>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-gray-50">
        <div className="w-full max-w-lg space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 text-center">Login</h2>
            <p className="text-gray-600 text-center">
              <span className="font-semibold">Hallo!</span> Selamat datang di KSP PRIMKOPPABRI Kusuma Bangsa
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username or Email Field */}
            <div className="space-y-2">
              <Label htmlFor="usernameOrEmail" className="sr-only">
                Username atau Email
              </Label>
              <Input
                id="usernameOrEmail"
                type="text"
                placeholder="Masukkan username atau email anda"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="h-12 px-4 border-gray-300"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-4">
              <Label htmlFor="password" className="sr-only">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 px-4 pr-12 border-gray-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-500 text-center -mt-2">{error}</p>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#0066FF] hover:bg-[#0052CC] text-white text-base font-semibold disabled:opacity-70"
            >
              {loading ? 'Memproses...' : 'Login'}
            </Button>

          </form>
        </div>
      </div>
    </div>
  )
}
