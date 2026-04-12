import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, Plus, Pencil, X, User, Mail, Phone, Lock, ChevronDown, Loader2, Eye, EyeOff, MapPin, CheckCircle, AlertCircle, MoreVertical, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'

// --- Toast system ---
function useToast() {
  const [toasts, setToasts] = useState([])
  const add = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((p) => [...p, { id, message, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500)
  }, [])
  const remove = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), [])
  const success = useCallback((msg) => add(msg, 'success'), [add])
  const error = useCallback((msg) => add(msg, 'error'), [add])
  return { toasts, success, error, remove }
}

function Toast({ toasts, remove }) {
  if (!toasts.length) return null
  return createPortal(
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-5 z-[99999] flex flex-col gap-2 w-[calc(100vw-2.5rem)] sm:w-auto sm:max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
            t.type === 'success'
              ? 'bg-white border-green-200 text-green-800'
              : 'bg-white border-red-200 text-red-700'
          }`}
        >
          {t.type === 'success'
            ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          }
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="text-gray-300 hover:text-gray-500 transition-colors ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}

// --- helpers ---
const ROLE_ORDER = ['Pimpinan', 'Admin', 'Kasir', 'Staff']
const ROLE_ID_LABELS = {
  1: 'Admin',
  2: 'Kasir',
  3: 'Staff',
  4: 'Pimpinan',
}

const emptyStep1 = { username: '', email: '', password: '', konfirmasiPassword: '' }
const emptyStep2 = { namaLengkap: '', jabatan: '', noHp: '', alamat: '', role: '' }

function FieldWrapper({ label, children, error }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function IconInput({ icon, type = 'text', placeholder, value, onChange, name, rightSlot }) {
  const IconComponent = icon
  return (
    <div className="relative">
      <IconComponent className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      />
      {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
    </div>
  )
}

function PasswordInput({ name, placeholder, value, onChange }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type={show ? 'text' : 'password'}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

function RoleSelect({ value, onChange, roles, loading }) {
  return (
    <div className="relative">
      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
      <select
        name="role"
        value={value}
        onChange={onChange}
        disabled={loading}
        className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition cursor-pointer disabled:opacity-60"
      >
        <option value="" disabled>{loading ? 'Memuat role...' : 'Pilih Role'}</option>
        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
    </div>
  )
}

// --- 2-Step Tambah Pengguna Modal ---
function TambahPenggunaDrawer({ open, onClose, onAdded }) {
  const { authFetch } = useAuth()
  const [step, setStep] = useState(1)
  const [step1, setStep1] = useState(emptyStep1)
  const [step2, setStep2] = useState(emptyStep2)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [roles, setRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setRolesLoading(true)
    authFetch('/api/roles')
      .then((res) => res.json())
      .then((json) => {
        const sorted = (json.data ?? []).sort((a, b) => {
          const ai = ROLE_ORDER.indexOf(a.name)
          const bi = ROLE_ORDER.indexOf(b.name)
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        })
        setRoles(sorted)
      })
      .catch(() => {})
      .finally(() => setRolesLoading(false))
  }, [open, authFetch])

  const handleClose = () => {
    setStep(1)
    setStep1(emptyStep1)
    setStep2(emptyStep2)
    setErrors({})
    setApiError('')
    onClose()
  }

  const handleChange1 = (e) => {
    const { name, value } = e.target
    setStep1((p) => ({ ...p, [name]: value }))
    setErrors((p) => ({ ...p, [name]: '' }))
  }

  const handleChange2 = (e) => {
    const { name, value } = e.target
    setStep2((p) => ({ ...p, [name]: value }))
    setErrors((p) => ({ ...p, [name]: '' }))
  }

  const handleNext = (e) => {
    e.preventDefault()
    const errs = {}
    if (!step1.username.trim())          errs.username = 'Username wajib diisi'
    if (!step1.email.trim())             errs.email = 'Email wajib diisi'
    if (!step1.password)                 errs.password = 'Password wajib diisi'
    if (step1.password !== step1.konfirmasiPassword)
      errs.konfirmasiPassword = 'Password tidak cocok'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!step2.namaLengkap.trim()) errs.namaLengkap = 'Nama lengkap wajib diisi'
    if (!step2.jabatan.trim())     errs.jabatan = 'Jabatan wajib diisi'
    if (!step2.noHp.trim())        errs.noHp = 'No HP wajib diisi'
    if (!step2.role)               errs.role = 'Role wajib dipilih'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    setApiError('')
    try {
      const regRes = await authFetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          username: step1.username,
          email: step1.email,
          password: step1.password,
        }),
      })
      const regJson = await regRes.json()
      if (!regRes.ok) throw new Error(regJson.message || 'Gagal mendaftarkan akun')
      const userId = regJson.user?.id ?? regJson.data?.id

      const pegRes = await authFetch('/api/pegawai', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          nama: step2.namaLengkap,
          jabatan: step2.jabatan,
          noHp: step2.noHp,
          alamat: step2.alamat,
        }),
      })
      const pegJson = await pegRes.json()
      if (!pegRes.ok) throw new Error(pegJson.message || 'Gagal membuat data pengguna')

      const roleRes = await authFetch(`/api/users/${userId}/roles`, {
        method: 'POST',
        body: JSON.stringify({ roleIds: [Number(step2.role)] }),
      })
      const roleJson = await roleRes.json()
      if (!roleRes.ok) throw new Error(roleJson.message || 'Gagal menetapkan role')

      const newPengguna = pegJson.data ?? {
        id: Date.now(),
        userId,
        nama: step2.namaLengkap,
        jabatan: step2.jabatan,
        noHp: step2.noHp,
        alamat: step2.alamat,
        statusAktif: true,
      }
      onAdded(newPengguna)
      handleClose()
    } catch (err) {
      setApiError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={handleClose}
      >
        <div
          className={`relative z-[9999] w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] transition-all duration-300 ease-out ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Tambah Pegawai</h2>
              <p className="text-xs text-gray-400 mt-0.5">Langkah {step} dari 2</p>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 pt-4 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-[#0A6FFF]" />
            <div className={`flex-1 h-1.5 rounded-full transition-colors ${step === 2 ? 'bg-[#0A6FFF]' : 'bg-gray-200'}`} />
          </div>

          {step === 1 && (
            <form onSubmit={handleNext} className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
              <FieldWrapper label="Username" error={errors.username}>
                <IconInput icon={User} name="username" placeholder="johndoe" value={step1.username} onChange={handleChange1} />
              </FieldWrapper>
              <FieldWrapper label="Email" error={errors.email}>
                <IconInput icon={Mail} type="email" name="email" placeholder="john@gmail.com" value={step1.email} onChange={handleChange1} />
              </FieldWrapper>
              <FieldWrapper label="Password" error={errors.password}>
                <PasswordInput name="password" placeholder="Password" value={step1.password} onChange={handleChange1} />
              </FieldWrapper>
              <FieldWrapper label="Konfirmasi Password" error={errors.konfirmasiPassword}>
                <PasswordInput name="konfirmasiPassword" placeholder="Ulangi password" value={step1.konfirmasiPassword} onChange={handleChange1} />
              </FieldWrapper>
              <div className="pt-1">
                <button type="submit" className="w-full h-12 rounded-xl bg-[#0A6FFF] hover:bg-[#0057d9] text-white font-semibold text-sm transition-colors">
                  Selanjutnya
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
              <FieldWrapper label="Nama Lengkap" error={errors.namaLengkap}>
                <IconInput icon={User} name="namaLengkap" placeholder="Yono Sebastian" value={step2.namaLengkap} onChange={handleChange2} />
              </FieldWrapper>
              <FieldWrapper label="Jabatan" error={errors.jabatan}>
                <IconInput icon={User} name="jabatan" placeholder="Kasir" value={step2.jabatan} onChange={handleChange2} />
              </FieldWrapper>
              <FieldWrapper label="No. HP" error={errors.noHp}>
                <IconInput icon={Phone} type="tel" name="noHp" placeholder="081234567890" value={step2.noHp} onChange={handleChange2} />
              </FieldWrapper>
              <FieldWrapper label="Alamat">
                <IconInput icon={MapPin} name="alamat" placeholder="Jl. Contoh No. 1" value={step2.alamat} onChange={handleChange2} />
              </FieldWrapper>
              <FieldWrapper label="Role" error={errors.role}>
                <RoleSelect value={step2.role} onChange={handleChange2} roles={roles} loading={rolesLoading} />
              </FieldWrapper>
              {apiError && <p className="text-sm text-red-500">{apiError}</p>}
              <div className="pt-1 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(1); setApiError('') }}
                  className="flex-1 h-12 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-12 rounded-xl bg-[#0A6FFF] hover:bg-[#0057d9] disabled:opacity-70 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Menyimpan...' : 'Buat Akun Pegawai'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}

// --- Edit Pengguna Modal ---
function EditPenggunaModal({ user, onClose, onUpdated }) {
  const { authFetch } = useAuth()

  const [form, setForm] = useState({
    nama: user?.nama ?? '',
    jabatan: user?.jabatan ?? '',
    noHp: user?.noHp ?? '',
    alamat: user?.alamat ?? '',
    statusAktif: user?.statusAktif !== false,
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  // Sync form when user changes
  useEffect(() => {
    if (user) {
      setForm({
        nama: user.nama ?? '',
        jabatan: user.jabatan ?? '',
        noHp: user.noHp ?? '',
        alamat: user.alamat ?? '',
        statusAktif: user.statusAktif !== false,
      })
      setErrors({})
      setApiError('')
    }
  }, [user])

  if (!user) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    setErrors((p) => ({ ...p, [name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.nama.trim())    errs.nama = 'Nama lengkap wajib diisi'
    if (!form.jabatan.trim()) errs.jabatan = 'Jabatan wajib diisi'
    if (!form.noHp.trim())    errs.noHp = 'No. HP wajib diisi'

    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    setApiError('')
    try {
      const res = await authFetch(`/api/pegawai/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nama: form.nama,
          jabatan: form.jabatan,
          noHp: form.noHp,
          alamat: form.alamat,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(Array.isArray(json.message) ? json.message.join(', ') : json.message || 'Gagal memperbarui data')

      // Update status if changed
      if (form.statusAktif !== (user.statusAktif !== false)) {
        const statusRes = await authFetch(`/api/pegawai/${user.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ statusAktif: form.statusAktif }),
        })
        const statusJson = await statusRes.json()
        if (!statusRes.ok) throw new Error(Array.isArray(statusJson.message) ? statusJson.message.join(', ') : statusJson.message || 'Gagal memperbarui status')
      }

      onUpdated({ ...user, ...form })
      onClose()
    } catch (err) {
      setApiError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] bg-black/50 flex items-end sm:items-center justify-center sm:p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="relative z-[9999] w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Edit Pegawai</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 sm:px-6 py-5 space-y-4 flex-1">
          {/* Nama + Jabatan — side by side on larger screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldWrapper label="Nama Lengkap" error={errors.nama}>
              <IconInput
                icon={User}
                name="nama"
                placeholder="Nama lengkap"
                value={form.nama}
                onChange={handleChange}
              />
            </FieldWrapper>
            <FieldWrapper label="Jabatan" error={errors.jabatan}>
              <IconInput
                icon={User}
                name="jabatan"
                placeholder="Jabatan"
                value={form.jabatan}
                onChange={handleChange}
              />
            </FieldWrapper>
          </div>

          <FieldWrapper label="No. HP" error={errors.noHp}>
            <IconInput
              icon={Phone}
              type="tel"
              name="noHp"
              placeholder="081234567890"
              value={form.noHp}
              onChange={handleChange}
            />
          </FieldWrapper>

          <FieldWrapper label="Alamat">
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <textarea
                name="alamat"
                rows={3}
                placeholder="Jl. Contoh No. 1, Kota"
                value={form.alamat}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 pt-3 pb-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
              />
            </div>
          </FieldWrapper>

          {/* Status Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Status Pegawai</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {form.statusAktif ? 'Pegawai dapat mengakses sistem' : 'Pegawai tidak dapat mengakses sistem'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, statusAktif: !p.statusAktif }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                form.statusAktif ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  form.statusAktif ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {apiError && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{apiError}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border-gray-300 text-gray-700 font-semibold text-sm"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex-1 h-11 rounded-xl bg-[#0A6FFF] hover:bg-[#0057d9] disabled:opacity-70 text-white font-semibold text-sm gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// --- Detail Pengguna Modal ---
function DetailPenggunaModal({ user, onClose, loadingDetail = false, detailError = '' }) {
  if (!user) return null

  const source = user
  const aktif = source.statusAktif !== false
  const username =
    source.username ??
    source.user?.username ??
    source.userName ??
    source.akun?.username ??
    source.account?.username ??
    '-'
  const roleIdRaw =
    source.roleId ??
    source.role_id ??
    source.user?.roleId ??
    source.user?.role_id ??
    source.role?.id ??
    source.role?.roleId ??
    source.user?.role?.id ??
    source.user?.role?.roleId ??
    source.roles?.[0]?.roleId ??
    source.roles?.[0]?.id ??
    source.user?.roles?.[0]?.id ??
    source.user?.roles?.[0]?.roleId ??
    (typeof source.roles?.[0] === 'number' ? source.roles[0] : undefined) ??
    (typeof source.roles?.[0] === 'string' ? source.roles[0] : undefined) ??
    (typeof source.user?.roles?.[0] === 'number' ? source.user.roles[0] : undefined) ??
    (typeof source.user?.roles?.[0] === 'string' ? source.user.roles[0] : undefined) ??
    source.roleIds?.[0] ??
    source.user?.roleIds?.[0]
  const roleId = Number(roleIdRaw)
  const roleNameRaw =
    source.role?.name ??
    source.role ??
    source.user?.role?.name ??
    source.user?.roles?.[0]?.name ??
    source.roles?.[0]?.name ??
    (typeof source.roles?.[0] === 'string' ? source.roles[0] : undefined) ??
    (typeof source.user?.roles?.[0] === 'string' ? source.user.roles[0] : undefined) ??
    source.roleName ??
    source.role_name
  const role = ROLE_ID_LABELS[roleId] ?? ROLE_ID_LABELS[Number(roleNameRaw)] ?? roleNameRaw ?? '-'
  const email =
    source.email ??
    source.user?.email ??
    source.mail ??
    source.user?.mail ??
    '-'
  const createdAt = source.createdAt ?? source.created_at ?? source.user?.createdAt ?? source.user?.created_at
  const tanggalDibuat = createdAt
    ? `${new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(createdAt))}, ${new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    }).format(new Date(createdAt))} WIB`
    : '-'

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative z-[9999] w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Detail Pegawai</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-4">
          {loadingDetail && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memuat detail pegawai...</span>
            </div>
          )}

          {detailError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-600">{detailError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1">Nama Lengkap</p>
              <p className="font-medium text-gray-800">{source.nama || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Username</p>
              <p className="font-medium text-gray-800">{username}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Jabatan</p>
              <p className="font-medium text-gray-800">{source.jabatan || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Role</p>
              <p className="font-medium text-gray-800">{role}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">No. HP</p>
              <p className="font-medium text-gray-800">{source.noHp || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Email</p>
              <p className="font-medium text-gray-800 break-all">{email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold ${aktif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {aktif ? 'Aktif' : 'Tidak Aktif'}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Tanggal Dibuat</p>
              <p className="font-medium text-gray-800">{tanggalDibuat}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Alamat</p>
            <p className="text-sm font-medium text-gray-800">{source.alamat || '-'}</p>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full h-11 rounded-xl border-gray-300 text-gray-700 font-semibold text-sm"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// --- User Card ---
function UserCard({ user, onDetail, onEdit }) {
  const aktif = user.statusAktif !== false
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{user.nama}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold ${aktif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {aktif ? 'Aktif' : 'Tidak Aktif'}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium mt-0.5 text-[#0066FF]">{user.jabatan}</p>
          <p className="text-xs text-gray-500 mt-1">{user.noHp}</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{user.alamat}</p>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-md text-gray-400 hover:text-[#0066FF] hover:bg-blue-50 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 w-44 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-20">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onDetail(user)
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Info className="w-4 h-4 text-gray-500" />
                Detail Pegawai
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onEdit(user)
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Pencil className="w-4 h-4 text-gray-500" />
                Edit Pegawai
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Main Page ---
export default function Pengguna() {
  const { authFetch } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('semua')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [userToDetail, setUserToDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [userToEdit, setUserToEdit] = useState(null)

  const fetchPengguna = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/pegawai')
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Gagal mengambil data pengguna')
      setUsers(json.data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    fetchPengguna()
  }, [fetchPengguna])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    const matchSearch = u.nama.toLowerCase().includes(q) || (u.jabatan ?? '').toLowerCase().includes(q)
    const aktif = u.statusAktif !== false
    const matchStatus =
      statusFilter === 'semua' ||
      (statusFilter === 'aktif' && aktif) ||
      (statusFilter === 'nonaktif' && !aktif)
    return matchSearch && matchStatus
  })

  const handleAdded = () => {
    toast.success('Pegawai berhasil ditambahkan')
    fetchPengguna()
  }

  const handleUpdated = () => {
    toast.success('Data pegawai berhasil diperbarui')
    fetchPengguna()
  }

  const handleOpenDetail = useCallback(async (baseUser) => {
    setUserToDetail(baseUser)
    setDetailLoading(true)
    setDetailError('')

    try {
      const res = await authFetch(`/api/pegawai/${baseUser.id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Gagal mengambil detail pegawai')

      const detail = json.data ?? json
      const mergedDetail = { ...(baseUser ?? {}), ...(detail ?? {}) }

      const missingRole =
        mergedDetail.roleId == null &&
        mergedDetail.role_id == null &&
        !mergedDetail.role &&
        !mergedDetail.roles?.length

      const userId = mergedDetail.userId ?? mergedDetail.user?.id

      if (missingRole && userId) {
        try {
          const roleRes = await authFetch(`/api/users/${userId}/roles`)
          const roleJson = await roleRes.json()
          if (roleRes.ok) {
            const rolesData = roleJson.data ?? roleJson
            const normalizedRoles =
              Array.isArray(rolesData)
                ? rolesData
                : Array.isArray(rolesData?.roles)
                  ? rolesData.roles
                  : Array.isArray(rolesData?.data)
                    ? rolesData.data
                    : []
            if (normalizedRoles.length) mergedDetail.roles = normalizedRoles
          }
        } catch {
          // ignore role fallback errors
        }
      }

      setUserToDetail(mergedDetail)
    } catch (err) {
      setDetailError(err.message)
    } finally {
      setDetailLoading(false)
    }
  }, [authFetch])

  const handleCloseDetail = () => {
    setUserToDetail(null)
    setDetailError('')
    setDetailLoading(false)
  }

  return (
    <div className="space-y-5">
      <Toast toasts={toast.toasts} remove={toast.remove} />

      <TambahPenggunaDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAdded={handleAdded}
      />

      <DetailPenggunaModal
        key={userToDetail?.id ?? 'empty-detail'}
        user={userToDetail}
        onClose={handleCloseDetail}
        loadingDetail={detailLoading}
        detailError={detailError}
      />

      <EditPenggunaModal
        user={userToEdit}
        onClose={() => setUserToEdit(null)}
        onUpdated={handleUpdated}
      />

      {/* Page Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pegawai</h1>
        <Button
          onClick={() => setDrawerOpen(true)}
          className="h-10 gap-2 bg-[#0A2472] hover:bg-[#081d5e] text-white text-sm font-semibold shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah Pegawai</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Cari nama atau jabatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 border-gray-200 bg-gray-50 text-sm w-full"
          />
        </div>

        {/* Divider — only on sm+ */}
        <div className="hidden sm:block w-px h-6 bg-gray-200 shrink-0" />

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { value: 'semua',    label: 'Semua',       count: users.length },
            { value: 'aktif',    label: 'Aktif',       count: users.filter(u => u.statusAktif !== false).length },
            { value: 'nonaktif', label: 'Tidak Aktif', count: users.filter(u => u.statusAktif === false).length },
          ].map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === value
                  ? value === 'aktif'
                    ? 'bg-green-100 text-green-700'
                    : value === 'nonaktif'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {label}
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                statusFilter === value
                  ? value === 'aktif'
                    ? 'bg-green-200 text-green-800'
                    : value === 'nonaktif'
                    ? 'bg-red-200 text-red-700'
                    : 'bg-blue-200 text-blue-800'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Memuat data pegawai...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-400 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Tidak ada pegawai ditemukan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onDetail={handleOpenDetail}
                onEdit={setUserToEdit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}