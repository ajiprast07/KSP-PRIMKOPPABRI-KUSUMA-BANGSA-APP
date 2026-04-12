import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2, Lock, ShieldCheck, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'

function useToast() {
  const [toasts, setToasts] = useState([])

  const add = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, 3500)
  }, [])

  const success = useCallback((message) => add(message, 'success'), [add])
  const error = useCallback((message) => add(message, 'error'), [add])
  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  return { toasts, success, error, remove }
}

function Toast({ toasts, remove }) {
  if (!toasts.length) return null

  return createPortal(
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-5 z-[99999] flex flex-col gap-2 w-[calc(100vw-2.5rem)] sm:w-auto sm:max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-white border-green-200 text-green-800'
              : 'bg-white border-red-200 text-red-700'
          }`}
        >
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          }
          <span className="flex-1">{toast.message}</span>
          <button type="button" onClick={() => remove(toast.id)} className="text-gray-300 hover:text-gray-500">
            x
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date) + ' WIB'
}

function normalizeMessage(value, fallback) {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'string' && value.trim()) return value
  return fallback
}

function PasswordField({ label, name, value, onChange }) {
  const [show, setShow] = useState(false)

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          className="h-10 pl-9 pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label={show ? 'Sembunyikan password' : 'Lihat password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

export default function Profile() {
  const { authFetch, logout } = useAuth()
  const { toasts, success, error: showError, remove } = useToast()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState('')
  const [submittingPassword, setSubmittingPassword] = useState(false)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setProfileError('')
    try {
      const res = await authFetch('/api/profile')
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(normalizeMessage(json?.message, 'Gagal mengambil profile'))
      }
      setProfile(json?.data ?? json ?? null)
    } catch (err) {
      setProfileError(err?.message || 'Gagal mengambil profile')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const roles = useMemo(() => {
    if (!Array.isArray(profile?.roles)) return []
    return profile.roles.map((role) => String(role))
  }, [profile])

  const handlePasswordChange = (event) => {
    const { name, value } = event.target
    setPasswordForm((prev) => ({ ...prev, [name]: value }))
    setPasswordError('')
  }

  const submitChangePassword = async (event) => {
    event.preventDefault()

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Semua field password wajib diisi.')
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password baru minimal 8 karakter.')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Konfirmasi password tidak sama.')
      return
    }

    setSubmittingPassword(true)
    setPasswordError('')

    try {
      // Backend utama memakai oldPassword/newPassword/confirmPassword.
      let res = await authFetch('/api/change-password', {
        method: 'POST',
        body: JSON.stringify({
          oldPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      })
      let json = await res.json().catch(() => null)

      // Fallback untuk backend yang memakai currentPassword.
      if (!res.ok && (res.status === 400 || res.status === 422)) {
        res = await authFetch('/api/change-password', {
          method: 'POST',
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
            confirmPassword: passwordForm.confirmPassword,
          }),
        })
        json = await res.json().catch(() => null)
      }

      if (!res.ok) {
        throw new Error(normalizeMessage(json?.message, 'Gagal mengubah password'))
      }

      success(`${normalizeMessage(json?.message, 'Password berhasil diubah')}. Anda akan terlogout otomatis.`)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })

      // Gunakan flow logout bawaan agar endpoint /api/logout dipanggil seperti tombol logout.
      setTimeout(() => {
        logout()
      }, 3000)
    } catch (err) {
      const message = err?.message || 'Gagal mengubah password'
      setPasswordError(message)
      showError(message)
    } finally {
      setSubmittingPassword(false)
    }
  }

  return (
    <div className="space-y-5">
      <Toast toasts={toasts} remove={remove} />

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profile</h1>
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 flex items-center justify-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Memuat profile...</span>
        </div>
      )}

      {!loading && profileError && (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6">
          <p className="text-sm text-red-600">{profileError}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={fetchProfile}>Coba Lagi</Button>
        </div>
      )}

      {!loading && !profileError && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <section className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                <UserCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">{profile?.nama || profile?.username || '-'}</p>
                <p className="text-sm text-gray-500">{profile?.jabatan || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs text-gray-400 mb-1">ID Pegawai</p>
                <p className="text-sm font-medium text-gray-700">{profile?.pegawaiId ?? '-'}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs text-gray-400 mb-1">Username</p>
                <p className="text-sm font-medium text-gray-700">{profile?.username || '-'}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs text-gray-400 mb-1">Email</p>
                <p className="text-sm font-medium text-gray-700 break-all">{profile?.email || '-'}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs text-gray-400 mb-1">No. HP</p>
                <p className="text-sm font-medium text-gray-700">{profile?.noHp || '-'}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3">
                <p className="text-xs text-gray-400 mb-1">Status Akun</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${profile?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {profile?.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div className="rounded-lg border border-gray-100 p-3 sm:col-span-2">
                <p className="text-xs text-gray-400 mb-1">Alamat</p>
                <p className="text-sm font-medium text-gray-700">{profile?.alamat || '-'}</p>
              </div>
              <div className="rounded-lg border border-gray-100 p-3 sm:col-span-2">
                <p className="text-xs text-gray-400 mb-1">Last Login</p>
                <p className="text-sm font-medium text-gray-700">{formatDateTime(profile?.lastLoginAt)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Roles
              </div>
              <div className="flex flex-wrap gap-2">
                {roles.length === 0
                  ? <span className="text-sm text-gray-400">Tidak ada role</span>
                  : roles.map((role) => (
                    <span key={role} className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2.5 py-1 text-xs font-semibold">
                      {role}
                    </span>
                  ))
                }
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Ubah Password</h2>
            <p className="text-xs text-gray-500 mb-4">Gunakan password baru yang kuat dan mudah diingat.</p>

            <form onSubmit={submitChangePassword} className="space-y-3">
              <PasswordField
                label="Password Saat Ini"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
              />

              <PasswordField
                label="Password Baru"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
              />

              <PasswordField
                label="Konfirmasi Password Baru"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
              />

              {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}

              <Button
                type="submit"
                disabled={submittingPassword}
                className="w-full h-10 bg-[#0A2472] hover:bg-[#081d5e] text-white"
              >
                {submittingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {submittingPassword ? 'Menyimpan...' : 'Simpan Password Baru'}
              </Button>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
