import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Search, Plus, Pencil, MoreVertical, Info,
  Users, UserCheck, UserX, UserMinus,
  Loader2, CheckCircle, AlertCircle, X, ExternalLink,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'

// --- Status config ---
const STATUS_CONFIG = {
  AKTIF:    { label: 'Aktif',       badge: 'bg-green-100 text-green-700',   activeClass: 'bg-green-100 text-green-700',   countClass: 'bg-green-200 text-green-800' },
  PENDING:  { label: 'Pending',     badge: 'bg-yellow-100 text-yellow-700', activeClass: 'bg-yellow-100 text-yellow-700', countClass: 'bg-yellow-200 text-yellow-800' },
  DITOLAK:  { label: 'Ditolak',     badge: 'bg-orange-100 text-orange-700', activeClass: 'bg-orange-100 text-orange-700', countClass: 'bg-orange-200 text-orange-800' },
  NONAKTIF: { label: 'Tidak Aktif', badge: 'bg-red-100 text-red-600',       activeClass: 'bg-red-100 text-red-600',       countClass: 'bg-red-200 text-red-700' },
}
const getStatus = (s) => STATUS_CONFIG[s] ?? { label: s, badge: 'bg-gray-100 text-gray-500', activeClass: 'bg-gray-100 text-gray-500', countClass: 'bg-gray-200 text-gray-600' }
const canVerifyByStatus = (status) => ['PENDING', 'DITOLAK'].includes(String(status ?? '').toUpperCase())

function toArray(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.rows)) return data.rows
  if (Array.isArray(data?.list)) return data.list
  return []
}

function normalizeJenisDokumen(jenis = '') {
  const value = String(jenis).toUpperCase().replace(/\s+/g, '_')
  if (value.includes('KTP')) return 'KTP'
  if (value === 'KK' || value.includes('KARTU_KELUARGA')) return 'KK'
  if (value.includes('SLIP') && value.includes('GAJI')) return 'SLIP_GAJI'
  return value
}

function sortDokumenByPriority(list = []) {
  const priority = { KTP: 0, KK: 1, SLIP_GAJI: 2 }
  return [...list].sort((a, b) => {
    const aPriority = priority[normalizeJenisDokumen(a?.jenisDokumen)] ?? 99
    const bPriority = priority[normalizeJenisDokumen(b?.jenisDokumen)] ?? 99
    if (aPriority !== bPriority) return aPriority - bPriority

    const aTime = new Date(a?.uploadedAt || 0).getTime()
    const bTime = new Date(b?.uploadedAt || 0).getTime()
    return bTime - aTime
  })
}

function mapDokumenByJenis(list = []) {
  const mapped = { KTP: null, KK: null, SLIP_GAJI: null }
  for (const dok of list) {
    const jenis = normalizeJenisDokumen(dok?.jenisDokumen)
    if (jenis === 'KTP' || jenis === 'KK' || jenis === 'SLIP_GAJI') {
      if (!mapped[jenis]) mapped[jenis] = dok
    }
  }
  return mapped
}

function getFileExtension(fileName = '') {
  const parts = String(fileName).toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() : ''
}

function validateDokumenFileType(jenisDokumen, file) {
  if (!file) return { ok: true }

  const mime = String(file.type || '').toLowerCase()
  const ext = getFileExtension(file.name)

  const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const allowedImageExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf']
  const isAllowed = allowedImageMimes.includes(mime) || mime === 'application/pdf' || allowedImageExts.includes(ext)

  if (jenisDokumen === 'SLIP_GAJI') {
    return isAllowed
      ? { ok: true }
      : { ok: false, message: 'Slip Gaji harus berupa JPG, PNG, WEBP, atau PDF.' }
  }

  return isAllowed
    ? { ok: true }
    : { ok: false, message: `${jenisDokumen} harus berupa JPG, PNG, WEBP, atau PDF.` }
}

function isImageDocument(url = '', mimeType = '') {
  const lowerMime = String(mimeType).toLowerCase()
  if (lowerMime.startsWith('image/')) return true
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(String(url))
}

function toDateInputValue(value) {
  if (!value) return ''

  const raw = String(value)
  const yyyyMmDd = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (yyyyMmDd) return yyyyMmDd[1]

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function DokumenPreviewModal({ open, onClose, dokumen }) {
  if (!open || !dokumen?.fileUrl) return null

  const isImage = isImageDocument(dokumen.fileUrl, dokumen.mimeType)

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full h-[88vh] sm:h-auto sm:max-h-[90vh] sm:max-w-5xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{dokumen.jenisDokumen || 'Dokumen'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-gray-50 p-3 sm:p-4">
          {isImage ? (
            <img
              src={dokumen.fileUrl}
              alt={dokumen.jenisDokumen || 'Dokumen Anggota'}
              className="w-full h-full object-contain rounded-lg bg-white border border-gray-100"
            />
          ) : (
            <iframe
              title={dokumen.jenisDokumen || 'Dokumen Anggota'}
              src={dokumen.fileUrl}
              className="w-full h-full rounded-lg bg-white border border-gray-100"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

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
          <button onClick={() => remove(t.id)} className="text-gray-300 hover:text-gray-500 transition-colors ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}

// --- Stat Card ---
function StatCard(props) {
  const Icon = props.icon
  const { iconBg, label, value, valueColor } = props
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-xl font-bold mt-0.5 ${valueColor}`}>{value}</p>
      </div>
    </div>
  )
}

// --- Member Card ---
function MemberCard({ member, onDetail, onVerify, onEdit }) {
  const cfg = getStatus(member.status)
  const canVerify = canVerifyByStatus(member.status)
  const tanggal = member.tanggalDaftar
    ? new Date(member.tanggalDaftar).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-'
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
            <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{member.nama}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-[#0066FF] font-medium mt-0.5">{member.nomorAnggota}</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">No. HP</p>
              <p className="text-xs text-gray-700 font-medium">{member.noHp || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pekerjaan</p>
              <p className="text-xs text-gray-700 font-medium truncate">{member.pekerjaan || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Alamat</p>
              <p className="text-xs text-gray-700 font-medium leading-relaxed break-words">{member.alamat || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Instansi</p>
              <p className="text-xs text-gray-700 font-medium truncate">{member.instansi || '-'}</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Terdaftar: {tanggal}</p>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-md text-gray-400 hover:text-[#0066FF] hover:bg-blue-50 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 w-45 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-20">
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onDetail(member)
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Info className="w-4 h-4 text-gray-500" />
                Detail Anggota
              </button>
              <button
                onClick={() => {
                  if (!canVerify) return
                  setMenuOpen(false)
                  onVerify(member)
                }}
                disabled={!canVerify}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                  !canVerify
                    ? 'text-green-700 bg-green-50 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CheckCircle className={`w-4 h-4 ${!canVerify ? 'text-green-600' : 'text-gray-500'}`} />
                {!canVerify ? 'Sudah Diverifikasi' : 'Verifikasi Anggota'}
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false)
                  onEdit(member)
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Pencil className="w-4 h-4 text-gray-500" />
                Edit Anggota
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TambahAnggotaModal({ open, onClose, onAdded }) {
  const { authFetch } = useAuth()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [form, setForm] = useState({
    nama: '',
    nik: '',
    noHp: '',
    alamat: '',
    pekerjaan: '',
    instansi: '',
    penghasilanBulanan: '',
    tanggalLahir: '',
  })
  const [files, setFiles] = useState({ ktp: null, kk: null, slipGaji: null })

  useEffect(() => {
    if (!open) return
    setStep(1)
    setSubmitting(false)
    setApiError('')
    setForm({
      nama: '',
      nik: '',
      noHp: '',
      alamat: '',
      pekerjaan: '',
      instansi: '',
      penghasilanBulanan: '',
      tanggalLahir: '',
    })
    setFiles({ ktp: null, kk: null, slipGaji: null })
  }, [open])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const validateStep1 = useCallback(() => {
    if (!form.nama.trim() || !form.nik.trim()) {
      return { ok: false, message: 'Nama dan NIK wajib diisi.' }
    }

    const penghasilanRaw = String(form.penghasilanBulanan ?? '').trim()
    const penghasilanNormalized = penghasilanRaw.replace(/\./g, '').replace(',', '.')
    const penghasilanNumber = Number(penghasilanNormalized)
    if (!penghasilanRaw || Number.isNaN(penghasilanNumber) || penghasilanNumber < 0) {
      return { ok: false, message: 'Penghasilan bulanan wajib berupa angka dan tidak boleh kurang dari 0.' }
    }

    return { ok: true, penghasilanNumber }
  }, [form])

  const handleCreateMember = (e) => {
    e.preventDefault()
    const validation = validateStep1()
    if (!validation.ok) {
      setApiError(validation.message)
      return
    }

    setApiError('')
    setStep(2)
  }

  const uploadDokumen = async (nasabahId, docs) => {
    const formData = new FormData()
    formData.append('ktp', docs.ktp)
    formData.append('kk', docs.kk)
    if (docs.slipGaji) {
      formData.append('slipGaji', docs.slipGaji)
    }

    const res = await authFetch(`/api/nasabah/${nasabahId}/dokumen`, {
      method: 'POST',
      body: formData,
    })

    const json = await res.json().catch(() => null)
    const message = Array.isArray(json?.message)
      ? json.message.join(', ')
      : (json?.message || '')

    if (!res.ok) {
      throw new Error(message || 'Gagal upload dokumen anggota')
    }

    return json?.data ?? []
  }

  const handleUploadDocuments = async (e) => {
    e.preventDefault()

    if (!files.ktp || !files.kk) {
      setApiError('Dokumen KTP dan KK wajib diunggah.')
      return
    }

    const ktpValidation = validateDokumenFileType('KTP', files.ktp)
    if (!ktpValidation.ok) {
      setApiError(ktpValidation.message)
      return
    }
    const kkValidation = validateDokumenFileType('KK', files.kk)
    if (!kkValidation.ok) {
      setApiError(kkValidation.message)
      return
    }
    const slipValidation = validateDokumenFileType('SLIP_GAJI', files.slipGaji)
    if (!slipValidation.ok) {
      setApiError(slipValidation.message)
      return
    }

    const validation = validateStep1()
    if (!validation.ok) {
      setApiError(validation.message)
      setStep(1)
      return
    }
    const { penghasilanNumber } = validation

    setSubmitting(true)
    setApiError('')
    let nasabahId = null
    try {
      const createRes = await authFetch('/api/nasabah', {
        method: 'POST',
        body: JSON.stringify({
          nama: form.nama,
          nik: form.nik,
          noHp: form.noHp,
          alamat: form.alamat,
          pekerjaan: form.pekerjaan,
          instansi: form.instansi,
          penghasilanBulanan: penghasilanNumber,
          tanggalLahir: form.tanggalLahir,
        }),
      })
      const createJson = await createRes.json()
      if (!createRes.ok) throw new Error(createJson.message || 'Gagal menambahkan anggota')

      nasabahId = createJson.data?.id
      if (!nasabahId) throw new Error('ID anggota tidak ditemukan.')

      await uploadDokumen(nasabahId, files)

      onAdded()
      onClose()
    } catch (err) {
      setApiError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative z-[9999] w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Tambah Anggota</h2>
            <p className="text-xs text-gray-400 mt-0.5">Langkah {step} dari 2</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 sm:px-6 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-[#0A6FFF]" />
            <div className={`flex-1 h-1.5 rounded-full ${step === 2 ? 'bg-[#0A6FFF]' : 'bg-gray-200'}`} />
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleCreateMember} className="px-5 sm:px-6 py-5 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nama</Label>
                <Input name="nama" value={form.nama} onChange={handleChange} placeholder="Nama lengkap anggota" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>NIK</Label>
                <Input name="nik" value={form.nik} onChange={handleChange} placeholder="3201xxxxxxxxxxxx" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>No. HP</Label>
                <Input name="noHp" value={form.noHp} onChange={handleChange} placeholder="0812xxxxxx" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Pekerjaan</Label>
                <Input name="pekerjaan" value={form.pekerjaan} onChange={handleChange} placeholder="Wiraswasta" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label>Penghasilan Bulanan</Label>
                <Input
                  name="penghasilanBulanan"
                  type="number"
                  min={0}
                  step="1000"
                  value={form.penghasilanBulanan}
                  onChange={handleChange}
                  placeholder="5000000"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Lahir</Label>
                <Input
                  name="tanggalLahir"
                  type="date"
                  value={form.tanggalLahir}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Instansi</Label>
                <Input name="instansi" value={form.instansi} onChange={handleChange} placeholder="Nama instansi" className="h-10" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Alamat</Label>
                <Input name="alamat" value={form.alamat} onChange={handleChange} placeholder="Alamat lengkap" className="h-10" />
              </div>
            </div>

            {apiError && <p className="text-sm text-red-500">{apiError}</p>}

            <div className="pt-1 flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-10">Batal</Button>
              <Button type="submit" disabled={submitting} className="flex-1 h-10 bg-[#0A2472] hover:bg-[#081d5e]">
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {submitting ? 'Memproses...' : 'Lanjut Upload Dokumen'}
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleUploadDocuments} className="px-5 sm:px-6 py-5 space-y-4 overflow-y-auto">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-sm font-medium text-blue-800">Upload dokumen anggota</p>
              <p className="text-xs text-blue-700 mt-0.5">Data step 1 dan dokumen akan dikirim bersamaan saat klik Simpan Anggota.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Upload KTP</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setFiles((p) => ({ ...p, ktp: e.target.files?.[0] ?? null }))} className="h-10" />
              {files.ktp && <p className="text-[11px] text-gray-500">Dipilih: {files.ktp.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Upload KK</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setFiles((p) => ({ ...p, kk: e.target.files?.[0] ?? null }))} className="h-10" />
              {files.kk && <p className="text-[11px] text-gray-500">Dipilih: {files.kk.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Upload Slip Gaji (Opsional)</Label>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setFiles((p) => ({ ...p, slipGaji: e.target.files?.[0] ?? null }))} className="h-10" />
              {files.slipGaji && <p className="text-[11px] text-gray-500">Dipilih: {files.slipGaji.name}</p>}
            </div>

            {apiError && <p className="text-sm text-red-500">{apiError}</p>}

            <div className="pt-1 flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-10">Kembali</Button>
              <Button type="submit" disabled={submitting} className="flex-1 h-10 bg-[#0A2472] hover:bg-[#081d5e]">
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {submitting ? 'Menyimpan...' : 'Simpan Anggota'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}

function EditAnggotaModal({ member, open, onClose, onUpdated }) {
  const { authFetch } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [pegawaiList, setPegawaiList] = useState([])
  const [loadingPegawai, setLoadingPegawai] = useState(false)
  const [loadingDokumen, setLoadingDokumen] = useState(false)
  const [existingDokumen, setExistingDokumen] = useState({ KTP: null, KK: null, SLIP_GAJI: null })
  const [previewDokumen, setPreviewDokumen] = useState(null)
  const [editFiles, setEditFiles] = useState({ ktp: null, kk: null, slipGaji: null })
  const [form, setForm] = useState({
    nama: '',
    noHp: '',
    alamat: '',
    pekerjaan: '',
    instansi: '',
    penghasilanBulanan: '',
    tanggalLahir: '',
    pegawaiId: '',
    status: '',
  })
  const memberStatus = String(member?.status ?? '').toUpperCase()
  const isStatusLocked = memberStatus === 'PENDING' || memberStatus === 'DITOLAK'

  const syncExistingDokumen = useCallback((dokumenList) => {
    setExistingDokumen(mapDokumenByJenis(Array.isArray(dokumenList) ? dokumenList : []))
  }, [])

  useEffect(() => {
    if (!open) return
    setLoadingPegawai(true)
    const fetchPegawai = async () => {
      try {
        const res = await authFetch('/api/pegawai')
        const json = await res.json().catch(() => null)
        if (!res.ok) {
          setPegawaiList([])
          return
        }
        const allPegawai = json?.data ?? []
        const aktivPegawai = allPegawai.filter((p) => p.statusAktif !== false)
        setPegawaiList(aktivPegawai)
      } catch {
        setPegawaiList([])
      } finally {
        setLoadingPegawai(false)
      }
    }
    fetchPegawai()
  }, [open, authFetch])

  useEffect(() => {
    if (!open || !member) return
    setSubmitting(false)
    setApiError('')
    setPreviewDokumen(null)
    setEditFiles({ ktp: null, kk: null, slipGaji: null })
    syncExistingDokumen(member.dokumen)
    setForm({
      nama: member.nama || '',
      noHp: member.noHp || '',
      alamat: member.alamat || '',
      pekerjaan: member.pekerjaan || '',
      instansi: member.instansi || '',
      penghasilanBulanan: member.penghasilanBulanan || '',
      tanggalLahir: toDateInputValue(member.tanggalLahir),
      pegawaiId: member.pegawaiId || '',
      status: member.status || '',
    })
  }, [open, member, syncExistingDokumen])

  useEffect(() => {
    if (!open || !member?.id) return
    let cancelled = false

    const fetchLatestDokumen = async () => {
      setLoadingDokumen(true)
      try {
        const res = await authFetch(`/api/nasabah/${member.id}`)
        const json = await res.json().catch(() => null)
        if (!res.ok) return
        if (cancelled) return
        syncExistingDokumen(json?.data?.dokumen)
      } finally {
        if (!cancelled) setLoadingDokumen(false)
      }
    }

    fetchLatestDokumen()
    return () => {
      cancelled = true
    }
  }, [open, member, authFetch, syncExistingDokumen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const updateDokumenByJenis = useCallback(async (nasabahId, jenisDokumen, file) => {
    if (!file) return

    const validation = validateDokumenFileType(jenisDokumen, file)
    if (!validation.ok) {
      throw new Error(validation.message)
    }

    const legacyField = jenisDokumen === 'KTP'
      ? 'ktp'
      : jenisDokumen === 'KK'
        ? 'kk'
        : 'file'

    const send = async (method, fieldName) => {
      const formData = new FormData()
      formData.append(fieldName, file)

      const res = await authFetch(`/api/nasabah/${nasabahId}/dokumen/${jenisDokumen}`, {
        method,
        body: formData,
      })
      const json = await res.json().catch(() => null)
      return { res, json }
    }

    const executeWithField = async (fieldName) => {
      let result = await send('PATCH', fieldName)
      if (!result.res.ok && (result.res.status === 404 || result.res.status === 405)) {
        result = await send('PUT', fieldName)
      }
      return result
    }

    // Endpoint edit dokumen terbaru umumnya memakai field tunggal "file".
    let result = await executeWithField('file')

    // Untuk KTP/KK, fallback ke field spesifik jika backend memerlukannya.
    // SLIP_GAJI dipaksa pakai field "file" agar tidak kena error Unexpected field - slipGaji.
    if (!result.res.ok && legacyField !== 'file') {
      result = await executeWithField(legacyField)
    }

    if (!result.res.ok) {
      const msg = Array.isArray(result.json?.message) ? result.json.message.join(', ') : result.json?.message
      throw new Error(msg || `Gagal memperbarui dokumen ${jenisDokumen}`)
    }
  }, [authFetch])

  const validateForm = useCallback(() => {
    if (!form.nama.trim()) {
      return { ok: false, message: 'Nama wajib diisi.' }
    }

    const penghasilanRaw = String(form.penghasilanBulanan ?? '').trim()
    const penghasilanNormalized = penghasilanRaw.replace(/\./g, '').replace(',', '.')
    const penghasilanNumber = Number(penghasilanNormalized)
    if (penghasilanRaw && (Number.isNaN(penghasilanNumber) || penghasilanNumber < 0)) {
      return { ok: false, message: 'Penghasilan bulanan harus berupa angka dan tidak boleh kurang dari 0.' }
    }

    return { ok: true, penghasilanNumber }
  }, [form])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validation = validateForm()
    if (!validation.ok) {
      setApiError(validation.message)
      return
    }

    const { penghasilanNumber } = validation

    setSubmitting(true)
    setApiError('')
    try {
      const payload = {
        nama: form.nama.trim(),
        alamat: form.alamat.trim(),
        noHp: form.noHp.trim(),
        pekerjaan: form.pekerjaan.trim(),
        instansi: form.instansi.trim(),
      }

      if (form.penghasilanBulanan) {
        payload.penghasilanBulanan = penghasilanNumber
      }

      if (form.tanggalLahir) {
        payload.tanggalLahir = form.tanggalLahir
      }

      if (form.pegawaiId) {
        payload.pegawaiId = Number(form.pegawaiId)
      }

      const res = await authFetch(`/api/nasabah/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.message || 'Gagal memperbarui data anggota')

      // Update status only when member status is not locked (PENDING/DITOLAK).
      if (!isStatusLocked && form.status && form.status !== 'PENDING' && form.status !== member.status) {
        const statusRes = await authFetch(`/api/nasabah/${member.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: form.status }),
        })
        const statusJson = await statusRes.json().catch(() => null)
        if (!statusRes.ok) throw new Error(statusJson?.message || 'Gagal memperbarui status anggota')
      }

      await updateDokumenByJenis(member.id, 'KTP', editFiles.ktp)
      await updateDokumenByJenis(member.id, 'KK', editFiles.kk)
      await updateDokumenByJenis(member.id, 'SLIP_GAJI', editFiles.slipGaji)

      onUpdated()
      onClose()
    } catch (err) {
      setApiError(err.message || 'Terjadi kesalahan saat memperbarui data anggota')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open || !member) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative z-[9999] w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Edit Anggota</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 sm:px-6 py-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input
                name="nama"
                value={form.nama}
                onChange={handleChange}
                placeholder="Nama lengkap anggota"
                className="h-10"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label>No. HP</Label>
              <Input
                name="noHp"
                value={form.noHp}
                onChange={handleChange}
                placeholder="0812xxxxxx"
                className="h-10"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Pekerjaan</Label>
              <Input
                name="pekerjaan"
                value={form.pekerjaan}
                onChange={handleChange}
                placeholder="Wiraswasta"
                className="h-10"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Penghasilan Bulanan</Label>
              <Input
                name="penghasilanBulanan"
                type="number"
                min={0}
                step="1000"
                value={form.penghasilanBulanan}
                onChange={handleChange}
                placeholder="5000000"
                className="h-10"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Lahir</Label>
              <Input
                name="tanggalLahir"
                type="date"
                value={form.tanggalLahir}
                onChange={handleChange}
                className="h-10"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Petugas Penanggung Jawab</Label>
              <select
                name="pegawaiId"
                value={form.pegawaiId}
                onChange={handleChange}
                disabled={submitting || loadingPegawai}
                className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">{loadingPegawai ? 'Memuat pegawai...' : 'Pilih Pegawai'}</option>
                {pegawaiList.map((pegawai) => (
                  <option key={pegawai.id} value={pegawai.id}>
                    {pegawai.nama}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Instansi</Label>
              <Input
                name="instansi"
                value={form.instansi}
                onChange={handleChange}
                placeholder="Nama instansi"
                className="h-10"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Alamat</Label>
              <Input
                name="alamat"
                value={form.alamat}
                onChange={handleChange}
                placeholder="Alamat lengkap"
                className="h-10"
                disabled={submitting}
              />
            </div>

          </div>

          <div className="pt-4 border-t border-gray-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ganti Dokumen KTP</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setEditFiles((p) => ({ ...p, ktp: e.target.files?.[0] ?? null }))}
                  className="h-10"
                  disabled={submitting}
                />
                {loadingDokumen ? (
                  <p className="text-[11px] text-gray-400">Memuat dokumen saat ini...</p>
                ) : existingDokumen.KTP?.fileUrl ? (
                  <button
                    type="button"
                    onClick={() => setPreviewDokumen(existingDokumen.KTP)}
                    className="inline-flex items-center gap-1.5 text-[11px] text-blue-700 hover:text-blue-800 font-medium"
                  >
                    Dokumen saat ini: Lihat KTP
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <p className="text-[11px] text-gray-400">Dokumen saat ini: Belum tersedia</p>
                )}
                {editFiles.ktp && <p className="text-[11px] text-gray-500">Dipilih: {editFiles.ktp.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Ganti Dokumen KK</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setEditFiles((p) => ({ ...p, kk: e.target.files?.[0] ?? null }))}
                  className="h-10"
                  disabled={submitting}
                />
                {loadingDokumen ? (
                  <p className="text-[11px] text-gray-400">Memuat dokumen saat ini...</p>
                ) : existingDokumen.KK?.fileUrl ? (
                  <button
                    type="button"
                    onClick={() => setPreviewDokumen(existingDokumen.KK)}
                    className="inline-flex items-center gap-1.5 text-[11px] text-blue-700 hover:text-blue-800 font-medium"
                  >
                    Dokumen saat ini: Lihat KK
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <p className="text-[11px] text-gray-400">Dokumen saat ini: Belum tersedia</p>
                )}
                {editFiles.kk && <p className="text-[11px] text-gray-500">Dipilih: {editFiles.kk.name}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Ganti Slip Gaji</Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setEditFiles((p) => ({ ...p, slipGaji: e.target.files?.[0] ?? null }))}
                  className="h-10"
                  disabled={submitting}
                />
                {loadingDokumen ? (
                  <p className="text-[11px] text-gray-400">Memuat dokumen saat ini...</p>
                ) : existingDokumen.SLIP_GAJI?.fileUrl ? (
                  <button
                    type="button"
                    onClick={() => setPreviewDokumen(existingDokumen.SLIP_GAJI)}
                    className="inline-flex items-center gap-1.5 text-[11px] text-blue-700 hover:text-blue-800 font-medium"
                  >
                    Dokumen saat ini: Lihat Slip Gaji
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <p className="text-[11px] text-gray-400">Dokumen saat ini: Belum tersedia</p>
                )}
                {editFiles.slipGaji && <p className="text-[11px] text-gray-500">Dipilih: {editFiles.slipGaji.name}</p>}
              </div>
            </div>
          </div>

          {!isStatusLocked && (
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <div className="space-y-2">
                <Label>Status Anggota</Label>
                <p className="text-xs text-gray-500">{form.status === 'AKTIF' ? 'Anggota aktif' : form.status === 'NONAKTIF' ? 'Anggota tidak aktif' : 'Pilih status'}</p>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, status: p.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF' }))}
                  disabled={submitting}
                  className={`relative inline-flex h-8 w-14 rounded-full transition-colors ${form.status === 'AKTIF' ? 'bg-green-500' : 'bg-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${form.status === 'AKTIF' ? 'translate-x-7' : 'translate-x-1'} mt-1`}
                  />
                </button>
              </div>
            </div>
          )}

          {isStatusLocked && (
            <div className="pt-4 border-t border-gray-200">
              <div className="rounded-lg border border-yellow-100 bg-yellow-50 px-4 py-3">
                <p className="text-sm font-medium text-yellow-800">Status Tidak Bisa Diubah</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Status {memberStatus || '-'} tidak dapat diubah melalui menu edit. Hubungi pimpinan untuk proses verifikasi status.
                </p>
              </div>
            </div>
          )}

          {apiError && <p className="text-sm text-red-500">{apiError}</p>}

          <div className="pt-1 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 h-10"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 h-10 bg-[#0A2472] hover:bg-[#081d5e]"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </div>
      <DokumenPreviewModal
        open={!!previewDokumen}
        onClose={() => setPreviewDokumen(null)}
        dokumen={previewDokumen}
      />
    </div>,
    document.body
  )
}

function VerifikasiAnggotaModal({ memberId, open, onClose, onVerified }) {
  const { authFetch } = useAuth()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submittingAction, setSubmittingAction] = useState('')
  const [catatan, setCatatan] = useState('')
  const [previewDokumen, setPreviewDokumen] = useState(null)

  const formatDate = (value, withTime = false) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    const formatted = date.toLocaleString('id-ID', withTime
      ? { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }
      : { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
    return withTime ? `${formatted} WIB` : formatted
  }

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '-'
    const num = Number(value)
    if (Number.isNaN(num)) return '-'
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num)
  }

  const fetchDetail = useCallback(async () => {
    if (!memberId) return
    setLoading(true)
    setError('')
    try {
      const res = await authFetch(`/api/nasabah/${memberId}`)
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.message || 'Gagal mengambil detail anggota')
      setDetail(json?.data ?? null)
      setCatatan(json?.data?.catatan ?? '')
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat mengambil detail anggota')
      setDetail(null)
      setCatatan('')
    } finally {
      setLoading(false)
    }
  }, [authFetch, memberId])

  useEffect(() => {
    if (!open) return
    fetchDetail()
  }, [open, fetchDetail])

  useEffect(() => {
    if (!open) {
      setDetail(null)
      setError('')
      setLoading(false)
      setCatatan('')
      setSubmittingAction('')
      setPreviewDokumen(null)
    }
  }, [open])

  const handleVerifyMember = async (action) => {
    if (!detail?.id) return

    setSubmittingAction(action)
    setError('')
    try {
      const status = action === 'approve' ? 'AKTIF' : 'DITOLAK'
      const res = await authFetch(`/api/nasabah/${detail.id}/verifikasi`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          catatan: catatan.trim(),
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || (action === 'approve' ? 'Gagal menyetujui anggota' : 'Gagal menolak anggota'))
      }

      onVerified?.(action)
      onClose()
    } catch (err) {
      setError(err.message || 'Gagal memproses verifikasi anggota')
    } finally {
      setSubmittingAction('')
    }
  }

  if (!open) return null

  const isSubmitting = !!submittingAction
  const canVerify = canVerifyByStatus(detail?.status)
  const statusConfig = getStatus(String(detail?.status ?? 'PENDING').toUpperCase())
  const dokumenList = sortDokumenByPriority(Array.isArray(detail?.dokumen) ? detail.dokumen : [])

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative z-[9999] w-full sm:max-w-4xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Verifikasi Anggota</h2>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memuat data verifikasi...</span>
            </div>
          ) : error ? (
            <div className="py-8 space-y-3">
              <p className="text-sm text-red-500">{error}</p>
              <Button type="button" variant="outline" onClick={fetchDetail} className="h-9" disabled={isSubmitting}>
                Coba Lagi
              </Button>
            </div>
          ) : !detail ? (
            <div className="py-8 text-sm text-gray-500">Data anggota tidak tersedia.</div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-200 p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Nama Anggota</p>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight break-words">{detail.nama || '-'}</h3>
                    <p className="text-sm text-[#0066FF] font-medium mt-1">{detail.nomorAnggota || '-'}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${statusConfig.badge}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Data Pribadi</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">NIK</span>
                      <span className="text-gray-900 text-right font-medium">{detail.nik || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">No. HP</span>
                      <span className="text-gray-900 text-right font-medium">{detail.noHp || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Tanggal Lahir</span>
                      <span className="text-gray-900 text-right font-medium">{formatDate(detail.tanggalLahir)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Tanggal Daftar</span>
                      <span className="text-gray-900 text-right font-medium">{formatDate(detail.tanggalDaftar, true)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Penghasilan Bulanan</span>
                      <span className="text-gray-900 text-right font-medium">{formatCurrency(detail.penghasilanBulanan)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Data Pekerjaan</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Pekerjaan</span>
                      <span className="text-gray-900 text-right font-medium">{detail.pekerjaan || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Instansi</span>
                      <span className="text-gray-900 text-right font-medium">{detail.instansi || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Petugas Penanggung Jawab</span>
                      <span className="text-gray-900 text-right font-medium">{detail.pegawai?.nama || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Jabatan Petugas</span>
                      <span className="text-gray-900 text-right font-medium">{detail.pegawai?.jabatan || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Terakhir Diperbarui</span>
                      <span className="text-gray-900 text-right font-medium">{formatDate(detail.updatedAt, true)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">Alamat</h4>
                <p className="text-sm text-gray-700 leading-relaxed break-words">{detail.alamat || '-'}</p>
              </div>

              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Dokumen Anggota</h4>
                {dokumenList.length === 0 ? (
                  <p className="text-sm text-gray-500">Belum ada dokumen terunggah.</p>
                ) : (
                  <div className="space-y-2">
                    {dokumenList.map((dok) => (
                      <div key={dok.id} className="rounded-lg border border-gray-100 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{dok.jenisDokumen || 'Dokumen'}</p>
                          <p className="text-xs text-gray-500">Diunggah: {formatDate(dok.uploadedAt, true)}</p>
                        </div>
                        {dok.fileUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewDokumen(dok)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800"
                          >
                            Lihat Dokumen
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">URL dokumen tidak tersedia</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleVerifyMember('approve')
                }}
                className="space-y-4"
              >
                <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Catatan Verifikasi</h4>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-700">Masukkan catatan verifikasi (opsional)</Label>
                    <textarea
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      disabled={isSubmitting || !canVerify}
                      placeholder="Contoh: Dokumen valid, Dokumen tidak valid..."
                      className="w-full h-20 px-3 py-2 border border-gray-100 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:opacity-60 resize-none"
                    />
                  </div>
                </div>

                {!canVerify && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                    <p className="text-sm font-medium text-green-800">Anggota ini sudah disetujui</p>
                    <p className="text-xs text-green-700 mt-1">Status AKTIF dianggap sudah disetujui, aksi verifikasi tidak diperlukan lagi.</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 h-10"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleVerifyMember('reject')}
                    disabled={isSubmitting || !canVerify}
                    className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {submittingAction === 'reject' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {submittingAction === 'reject' ? 'Menolak...' : 'Tolak'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !canVerify}
                    className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {submittingAction === 'approve' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {submittingAction === 'approve' ? 'Menyetujui...' : 'Setujui'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
      <DokumenPreviewModal
        open={!!previewDokumen}
        onClose={() => setPreviewDokumen(null)}
        dokumen={previewDokumen}
      />
    </div>,
    document.body
  )
}

function DetailAnggotaModal({ memberId, open, onClose }) {
  const { authFetch } = useAuth()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewDokumen, setPreviewDokumen] = useState(null)
  const [memberSavings, setMemberSavings] = useState([])
  const [memberLoans, setMemberLoans] = useState([])
  const [financeLoading, setFinanceLoading] = useState(false)
  const [financeError, setFinanceError] = useState('')

  const formatDate = (value, withTime = false) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    const formatted = date.toLocaleString('id-ID', withTime
      ? { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }
      : { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
    return withTime ? `${formatted} WIB` : formatted
  }

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '-'
    const num = Number(value)
    if (Number.isNaN(num)) return '-'
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num)
  }

  const fetchMemberFinanceData = useCallback(async (nasabahId) => {
    if (!nasabahId) {
      setMemberSavings([])
      setMemberLoans([])
      return
    }

    setFinanceLoading(true)
    setFinanceError('')

    try {
      const simpananRes = await authFetch(`/api/simpanan/nasabah/${nasabahId}`)
      const simpananJson = await simpananRes.json().catch(() => null)
      if (!simpananRes.ok) throw new Error(simpananJson?.message || 'Gagal mengambil data simpanan anggota')

      const simpananRows = toArray(simpananJson?.data ?? simpananJson)
      const simpananTarget = { SUKARELA: 0, WAJIB: 0, POKOK: 0 }

      simpananRows.forEach((item) => {
        const jenis = String(item?.jenisSimpanan || '').toUpperCase()
        if (!(jenis in simpananTarget)) return
        const nominal = Number(item?.saldoBerjalan ?? item?.saldo ?? item?.nominal ?? 0)
        simpananTarget[jenis] += Number.isFinite(nominal) ? nominal : 0
      })

      setMemberSavings([
        { key: 'SUKARELA', label: 'SUKARELA', nominal: simpananTarget.SUKARELA },
        { key: 'WAJIB', label: 'WAJIB', nominal: simpananTarget.WAJIB },
        { key: 'POKOK', label: 'POKOK', nominal: simpananTarget.POKOK },
      ])

      const collectedLoans = []
      const visitedCursor = new Set()
      let cursor = null
      let guard = 0

      while (guard < 200) {
        const params = new URLSearchParams()
        if (cursor !== null && cursor !== undefined && cursor !== '') {
          params.set('cursor', String(cursor))
        }

        const query = params.toString()
        const endpoint = query
          ? `/api/pinjaman/nasabah/${nasabahId}?${query}`
          : `/api/pinjaman/nasabah/${nasabahId}`

        const loanRes = await authFetch(endpoint)
        const loanJson = await loanRes.json().catch(() => null)
        if (!loanRes.ok) throw new Error(loanJson?.message || 'Gagal mengambil data pinjaman anggota')

        const rows = toArray(loanJson?.data ?? loanJson)
        collectedLoans.push(...rows)

        const pg = loanJson?.pagination ?? {}
        const hasNext = Boolean(pg?.hasNext ?? pg?.has_next)
        const nextCursor = pg?.nextCursor ?? pg?.next_cursor
        if (!hasNext || nextCursor === null || nextCursor === undefined || nextCursor === '') {
          break
        }
        if (visitedCursor.has(String(nextCursor))) {
          break
        }

        visitedCursor.add(String(nextCursor))
        cursor = nextCursor
        guard += 1
      }

      const filteredLoans = Array.from(new Map(collectedLoans.map((loan) => [loan?.id, loan])).values())
        .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))

      setMemberLoans(filteredLoans)
    } catch (err) {
      setFinanceError(err.message || 'Terjadi kesalahan saat mengambil data simpanan dan pinjaman anggota')
      setMemberSavings([])
      setMemberLoans([])
    } finally {
      setFinanceLoading(false)
    }
  }, [authFetch])

  const fetchDetail = useCallback(async () => {
    if (!memberId) return
    setLoading(true)
    setError('')
    try {
      const res = await authFetch(`/api/nasabah/${memberId}`)
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.message || 'Gagal mengambil detail anggota')
      setDetail(json?.data ?? null)
      await fetchMemberFinanceData(memberId)
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat mengambil detail anggota')
      setDetail(null)
      setMemberSavings([])
      setMemberLoans([])
    } finally {
      setLoading(false)
    }
  }, [authFetch, fetchMemberFinanceData, memberId])

  useEffect(() => {
    if (!open) return
    fetchDetail()
  }, [open, fetchDetail])

  useEffect(() => {
    if (!open) {
      setDetail(null)
      setError('')
      setLoading(false)
      setPreviewDokumen(null)
      setMemberSavings([])
      setMemberLoans([])
      setFinanceError('')
      setFinanceLoading(false)
    }
  }, [open])

  if (!open) return null

  const statusConfig = getStatus(String(detail?.status ?? 'PENDING').toUpperCase())
  const dokumenList = sortDokumenByPriority(Array.isArray(detail?.dokumen) ? detail.dokumen : [])
  return createPortal(
    <div
      className="fixed inset-0 z-[9998] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative z-[9999] w-full sm:max-w-4xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Detail Anggota</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memuat detail anggota...</span>
            </div>
          ) : error ? (
            <div className="py-8 space-y-3">
              <p className="text-sm text-red-500">{error}</p>
              <Button type="button" variant="outline" onClick={fetchDetail} className="h-9">
                Coba Lagi
              </Button>
            </div>
          ) : !detail ? (
            <div className="py-8 text-sm text-gray-500">Data anggota tidak tersedia.</div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-200 p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Nama Anggota</p>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight break-words">{detail.nama || '-'}</h3>
                    <p className="text-sm text-[#0066FF] font-medium mt-1">{detail.nomorAnggota || '-'}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${statusConfig.badge}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Data Pribadi</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">NIK</span>
                      <span className="text-gray-900 text-right">{detail.nik || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">No. HP</span>
                      <span className="text-gray-900 text-right">{detail.noHp || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Tanggal Lahir</span>
                      <span className="text-gray-900 text-right">{formatDate(detail.tanggalLahir)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Tanggal Daftar</span>
                      <span className="text-gray-900 text-right">{formatDate(detail.tanggalDaftar, true)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Penghasilan Bulanan</span>
                      <span className="text-gray-900 text-right">{formatCurrency(detail.penghasilanBulanan)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Pekerjaan</span>
                      <span className="text-gray-900 text-right">{detail.pekerjaan || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Instansi</span>
                      <span className="text-gray-900 text-right">{detail.instansi || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Data Penanggung Jawab</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Petugas Penanggung Jawab</span>
                      <span className="text-gray-900 text-right">{detail.pegawai?.nama || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Jabatan Petugas</span>
                      <span className="text-gray-900 text-right">{detail.pegawai?.jabatan || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Terakhir Diperbarui</span>
                      <span className="text-gray-900 text-right">{formatDate(detail.updatedAt, true)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">Alamat</h4>
                <p className="text-sm text-gray-700 leading-relaxed break-words">{detail.alamat || '-'}</p>
              </div>

              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Dokumen Anggota</h4>
                {dokumenList.length === 0 ? (
                  <p className="text-sm text-gray-500">Belum ada dokumen terunggah.</p>
                ) : (
                  <div className="space-y-2">
                    {dokumenList.map((dok) => (
                      <div key={dok.id} className="rounded-lg border border-gray-100 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{dok.jenisDokumen || 'Dokumen'}</p>
                          <p className="text-xs text-gray-500">Diunggah: {formatDate(dok.uploadedAt, true)}</p>
                        </div>
                        {dok.fileUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewDokumen(dok)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800"
                          >
                            Lihat Dokumen
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">URL dokumen tidak tersedia</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-100 p-4 space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Data Simpanan dan Pinjaman</h4>

                {financeLoading ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-gray-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memuat data simpanan dan pinjaman...</span>
                  </div>
                ) : financeError ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {financeError}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-gray-100 p-3 space-y-3">
                      <h5 className="text-sm font-semibold text-gray-900">Data Simpanan</h5>
                      <div className="space-y-2 text-sm">
                        {memberSavings.map((item) => (
                          <div key={item.key} className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2">
                            <span className="font-medium text-gray-700">{item.label}</span>
                            <span className="font-semibold text-gray-900">{formatCurrency(item.nominal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-100 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-sm font-semibold text-gray-900">Data Pinjaman</h5>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {memberLoans.length} pinjaman
                        </span>
                      </div>

                      {memberLoans.length === 0 ? (
                        <p className="text-xs text-gray-500">Belum ada data pinjaman.</p>
                      ) : (
                        <div className="space-y-2">
                          {memberLoans.map((loan, index) => (
                            <div key={loan?.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs sm:text-sm">
                              <p className="font-semibold text-gray-800">Pinjaman ke-{memberLoans.length - index}</p>
                              <p className="text-gray-600">Jumlah Pinjaman: {formatCurrency(loan?.jumlahPinjaman)}</p>
                              <p className="text-gray-600">Total Pengembalian: {formatCurrency(loan?.totalPengembalian)}</p>
                              <p className="text-gray-600">Sisa: {formatCurrency(loan?.sisaPinjaman)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto h-10">
            Tutup
          </Button>
        </div>
        <DokumenPreviewModal
          open={!!previewDokumen}
          onClose={() => setPreviewDokumen(null)}
          dokumen={previewDokumen}
        />
      </div>
    </div>,
    document.body
  )
}

// --- Main Page ---
export default function Keanggotaan() {
  const { authFetch } = useAuth()
  const toast = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('SEMUA')
  const [tambahModalOpen, setTambahModalOpen] = useState(false)
  const [detailMemberId, setDetailMemberId] = useState(null)
  const [verifyMemberId, setVerifyMemberId] = useState(null)
  const [memberToEdit, setMemberToEdit] = useState(null)

  const normalizeMember = useCallback((item) => ({
    ...item,
    nomorAnggota: item.nomorAnggota ?? item.noAnggota ?? item.nomor_anggota ?? '-',
    nama: item.nama ?? item.namaLengkap ?? item.fullName ?? '-',
    alamat: item.alamat ?? item.address ?? item.domisili ?? '-',
    noHp: item.noHp ?? item.nohp ?? item.nomorHp ?? item.phone ?? '-',
    pekerjaan: item.pekerjaan ?? item.job ?? '-',
    instansi: item.instansi ?? item.institution ?? '-',
    status: String(item.status ?? 'PENDING').toUpperCase(),
  }), [])

  const fetchNasabah = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/nasabah')
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Gagal mengambil data anggota')
      const baseMembers = (json.data ?? []).map(normalizeMember)

      const membersWithDetail = await Promise.all(
        baseMembers.map(async (member) => {
          if (!member?.id) return member
          try {
            const detailRes = await authFetch(`/api/nasabah/${member.id}`)
            const detailJson = await detailRes.json()
            if (!detailRes.ok) return member
            const detail = detailJson.data ?? {}
            return normalizeMember({ ...member, ...detail })
          } catch {
            return member
          }
        })
      )

      setMembers(membersWithDetail)
    } catch (err) {
      setError(err.message)
      return err.message
    } finally {
      setLoading(false)
    }
  }, [authFetch, normalizeMember])

  useEffect(() => {
    fetchNasabah().then((errMsg) => { if (errMsg) toastRef.current.error(errMsg) })
  }, [fetchNasabah])

  const filtered = members.filter((m) => {
    const q = search.toLowerCase()
    const matchSearch =
      (m.nama ?? '').toLowerCase().includes(q) ||
      (m.nomorAnggota ?? '').toLowerCase().includes(q) ||
      (m.alamat ?? '').toLowerCase().includes(q) ||
      (m.pekerjaan ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'SEMUA' || m.status === statusFilter
    return matchSearch && matchStatus
  })

  const total    = members.length
  const aktif    = members.filter((m) => m.status === 'AKTIF').length
  const pending  = members.filter((m) => m.status === 'PENDING').length
  const ditolak  = members.filter((m) => m.status === 'DITOLAK').length
  const nonaktif = members.filter((m) => m.status === 'NONAKTIF').length

  const handleEdit = (member) => {
    setMemberToEdit(member)
  }

  const handleEditUpdated = () => {
    toast.success('Data anggota berhasil diperbarui')
    fetchNasabah()
  }

  const handleDetail = (member) => {
    setDetailMemberId(member?.id ?? null)
  }

  const handleVerify = (member) => {
    setVerifyMemberId(member?.id ?? null)
  }

  const handleVerified = (action) => {
    if (action === 'approve') {
      toast.success('Anggota berhasil disetujui')
    } else if (action === 'reject') {
      toast.success('Anggota berhasil ditolak')
    } else {
      toast.success('Status verifikasi anggota berhasil diperbarui')
    }
    fetchNasabah()
  }

  const handleAdded = () => {
    toast.success('Anggota berhasil ditambahkan')
    fetchNasabah()
  }

  const filterOptions = [
    { value: 'SEMUA',    label: 'Semua',      count: total,    activeClass: 'bg-blue-100 text-blue-700',     countClass: 'bg-blue-200 text-blue-800' },
    { value: 'AKTIF',    label: 'Aktif',       count: aktif,    activeClass: 'bg-green-100 text-green-700',   countClass: 'bg-green-200 text-green-800' },
    { value: 'PENDING',  label: 'Pending',     count: pending,  activeClass: 'bg-yellow-100 text-yellow-700', countClass: 'bg-yellow-200 text-yellow-800' },
    { value: 'DITOLAK',  label: 'Ditolak',     count: ditolak,  activeClass: 'bg-orange-100 text-orange-700', countClass: 'bg-orange-200 text-orange-800' },
    { value: 'NONAKTIF', label: 'Tidak Aktif', count: nonaktif, activeClass: 'bg-red-100 text-red-600',      countClass: 'bg-red-200 text-red-700' },
  ]

  return (
    <div className="space-y-5">
      <Toast toasts={toast.toasts} remove={toast.remove} />
      <TambahAnggotaModal
        open={tambahModalOpen}
        onClose={() => setTambahModalOpen(false)}
        onAdded={handleAdded}
      />
      <DetailAnggotaModal
        memberId={detailMemberId}
        open={!!detailMemberId}
        onClose={() => setDetailMemberId(null)}
      />
      <VerifikasiAnggotaModal
        memberId={verifyMemberId}
        open={!!verifyMemberId}
        onClose={() => setVerifyMemberId(null)}
        onVerified={handleVerified}
      />
      <EditAnggotaModal
        member={memberToEdit}
        open={!!memberToEdit}
        onClose={() => setMemberToEdit(null)}
        onUpdated={handleEditUpdated}
      />

      {/* Page Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Keanggotaan</h1>
        <Button
          onClick={() => setTambahModalOpen(true)}
          className="h-10 gap-2 bg-[#0A2472] hover:bg-[#081d5e] text-white text-sm font-semibold shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah Anggota</span>
          <span className="sm:hidden">Tambah</span>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard icon={Users}     iconBg="bg-blue-50"   label="Total Anggota" value={loading ? '...' : `${total} Orang`}    valueColor="text-[#0066FF]" />
        <StatCard icon={UserCheck} iconBg="bg-green-50"  label="Aktif"         value={loading ? '...' : `${aktif} Orang`}    valueColor="text-green-600" />
        <StatCard icon={UserMinus} iconBg="bg-yellow-50" label="Pending"       value={loading ? '...' : `${pending} Orang`}  valueColor="text-yellow-600" />
        <StatCard icon={AlertCircle} iconBg="bg-orange-50" label="Ditolak"     value={loading ? '...' : `${ditolak} Orang`}  valueColor="text-orange-600" />
        <StatCard icon={UserX}     iconBg="bg-red-50"    label="Tidak Aktif"   value={loading ? '...' : `${nonaktif} Orang`} valueColor="text-red-500" />
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Cari nama, nomor anggota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 border-gray-200 bg-gray-50 text-sm w-full"
          />
        </div>

        <div className="hidden sm:block w-px h-6 bg-gray-200 shrink-0" />

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {filterOptions.map(({ value, label, count, activeClass, countClass }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === value ? activeClass : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {label}
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                statusFilter === value ? countClass : 'bg-gray-200 text-gray-600'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Member Grid */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Memuat data anggota...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-400 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Tidak ada anggota ditemukan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onDetail={handleDetail}
                onVerify={handleVerify}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
