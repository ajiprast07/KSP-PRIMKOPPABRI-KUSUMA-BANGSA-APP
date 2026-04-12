import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle, Eye, Loader2, MoreVertical, ShieldCheck, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

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
            t.type === 'success' ? 'bg-white border-green-200 text-green-800' : 'bg-white border-red-200 text-red-700'
          }`}
        >
          {t.type === 'success'
            ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => remove(t.id)}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}

function toArray(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.rows)) return data.rows
  if (Array.isArray(data?.list)) return data.list
  return []
}

function formatCurrency(value) {
  const number = Number(value)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(number) ? number : 0)
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  })
}

function getLoanStatusMeta(status) {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'APPROVED' || normalized === 'DISETUJUI' || normalized === 'SUCCESS' || normalized === 'BERHASIL') {
    return { label: 'Disetujui', className: 'bg-emerald-100 text-emerald-700' }
  }
  if (normalized === 'REJECTED' || normalized === 'DITOLAK' || normalized === 'FAILED' || normalized === 'GAGAL') {
    return { label: 'Ditolak', className: 'bg-rose-100 text-rose-700' }
  }
  if (normalized === 'LUNAS') {
    return { label: 'Lunas', className: 'bg-sky-100 text-sky-700' }
  }
  if (normalized === 'PROCESSING' || normalized === 'PROSES') {
    return { label: 'Diproses', className: 'bg-blue-100 text-blue-700' }
  }
  return { label: 'Pending', className: 'bg-amber-100 text-amber-700' }
}

function canVerifyLoanByStatus(status) {
  return String(status || '').toUpperCase() === 'PENDING'
}

function formatDisbursementMethod(value) {
  const normalized = String(value || '').toUpperCase()
  if (!normalized) return '-'
  if (normalized === 'CASH' || normalized === 'TUNAI') return 'Tunai'
  if (normalized === 'TRANSFER') return 'Transfer'
  return String(value)
}

function isDisbursementTransaction(item) {
  return String(item?.jenisTransaksi || '').toUpperCase() === 'PENCAIRAN'
}

export default function VerifikasiPinjaman({ onNavigate }) {
  const { authFetch } = useAuth()
  const toast = useToast()

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionMenuOpenId, setActionMenuOpenId] = useState('')

  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailData, setDetailData] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const [verifyTarget, setVerifyTarget] = useState(null)
  const [verifyDetailLoading, setVerifyDetailLoading] = useState(false)
  const [verifyDetailError, setVerifyDetailError] = useState('')
  const [verifyDetailData, setVerifyDetailData] = useState(null)
  const [verifyNote, setVerifyNote] = useState('')
  const [verifyDisbursementMethod, setVerifyDisbursementMethod] = useState('TRANSFER')
  const [verifySubmittingAction, setVerifySubmittingAction] = useState('')

  const actionMenuContainerRef = useRef(null)

  const fetchAllLoans = useCallback(async () => {
    const collected = []
    const seenCursor = new Set()
    let cursor = null
    let guard = 0

    while (guard < 200) {
      const params = new URLSearchParams()
      if (cursor !== null && cursor !== undefined && cursor !== '') {
        params.set('cursor', String(cursor))
      }

      const query = params.toString()
      const endpoint = query ? `/api/pinjaman?${query}` : '/api/pinjaman'

      const res = await authFetch(endpoint)
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || 'Gagal mengambil data pinjaman')
      }

      const loanRows = toArray(json?.data ?? json)
      collected.push(...loanRows)

      const pg = json?.pagination ?? {}
      const hasNext = Boolean(pg?.hasNext ?? pg?.has_next)
      const nextCursor = pg?.nextCursor ?? pg?.next_cursor
      if (!hasNext || nextCursor === null || nextCursor === undefined || nextCursor === '') {
        break
      }

      const nextCursorKey = String(nextCursor)
      if (seenCursor.has(nextCursorKey)) break
      seenCursor.add(nextCursorKey)
      cursor = nextCursor
      guard += 1
    }

    return Array.from(new Map(collected.map((item) => [item?.id, item])).values())
      .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))
  }, [authFetch])

  const fetchLatestDisbursementTransaction = useCallback(async (loanId) => {
    const targetLoanId = Number(loanId)
    if (!Number.isInteger(targetLoanId) || targetLoanId <= 0) return null

    let latest = null
    const seenCursor = new Set()
    let cursor = null
    let guard = 0

    while (guard < 200) {
      const params = new URLSearchParams()
      if (cursor !== null && cursor !== undefined && cursor !== '') {
        params.set('cursor', String(cursor))
      }

      const query = params.toString()
      const endpoint = query ? `/api/transaksi?${query}` : '/api/transaksi'

      const res = await authFetch(endpoint)
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || 'Gagal mengambil data transaksi')
      }

      const transactionRows = toArray(json?.data ?? json)
      for (const item of transactionRows) {
        const itemLoanId = Number(item?.pinjamanId)
        if (itemLoanId !== targetLoanId) continue
        if (!isDisbursementTransaction(item)) continue
        if (!latest || Number(item?.id || 0) > Number(latest?.id || 0)) {
          latest = item
        }
      }

      const pg = json?.pagination ?? {}
      const hasNext = Boolean(pg?.hasNext ?? pg?.has_next)
      const nextCursor = pg?.nextCursor ?? pg?.next_cursor
      if (!hasNext || nextCursor === null || nextCursor === undefined || nextCursor === '') {
        break
      }

      const nextCursorKey = String(nextCursor)
      if (seenCursor.has(nextCursorKey)) break
      seenCursor.add(nextCursorKey)
      cursor = nextCursor
      guard += 1
    }

    return latest
  }, [authFetch])

  const loadLoans = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await fetchAllLoans()
      setRows(data)
    } catch (err) {
      setRows([])
      setError(err?.message || 'Terjadi kesalahan saat memuat data pinjaman')
    } finally {
      setLoading(false)
    }
  }, [fetchAllLoans])

  useEffect(() => {
    loadLoans()
  }, [loadLoans])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target?.closest?.('[data-loan-action-zone="true"]')) {
        setActionMenuOpenId('')
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const openDetail = useCallback(async (loanId) => {
    setActionMenuOpenId('')
    setIsDetailModalOpen(true)
    setDetailLoading(true)
    setDetailError('')
    setDetailData(null)

    try {
      const [loanResponse, transaction] = await Promise.all([
        authFetch(`/api/pinjaman/${loanId}`),
        fetchLatestDisbursementTransaction(loanId).catch(() => null),
      ])
      const json = await loanResponse.json().catch(() => null)
      if (!loanResponse.ok) {
        throw new Error(json?.message || 'Gagal mengambil detail pinjaman')
      }

      const detailRows = toArray(json?.data ?? json)
      const detail = detailRows[0] || json?.data || null
      if (!detail) throw new Error('Detail pinjaman tidak ditemukan')

      setDetailData({
        ...detail,
        metodePembayaran: transaction?.metodePembayaran ?? null,
        catatan: transaction?.catatan ?? null,
      })
    } catch (err) {
      setDetailError(err?.message || 'Terjadi kesalahan saat memuat detail pinjaman')
    } finally {
      setDetailLoading(false)
    }
  }, [authFetch, fetchLatestDisbursementTransaction])

  const closeDetailModal = useCallback(() => {
    setIsDetailModalOpen(false)
    setDetailLoading(false)
    setDetailError('')
    setDetailData(null)
  }, [])

  const openVerifyModal = useCallback(async (loan) => {
    setActionMenuOpenId('')
    setError('')
    setSuccess('')
    setVerifyDetailLoading(true)
    setVerifyDetailError('')
    setVerifyDetailData(null)

    setVerifyTarget({
      id: loan?.id,
      nasabahName: loan?.nasabah?.nama || '-',
      nominal: loan?.jumlahPinjaman,
      status: String(loan?.status || '').toUpperCase(),
    })
    setVerifyNote('')
    setVerifyDisbursementMethod('TRANSFER')
    setVerifySubmittingAction('')

    try {
      const res = await authFetch(`/api/pinjaman/${loan?.id}`)
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || 'Gagal mengambil detail pinjaman')
      }

      const detailRows = toArray(json?.data ?? json)
      const detail = detailRows[0] || json?.data || null
      if (!detail) {
        throw new Error('Detail pinjaman tidak ditemukan')
      }

      setVerifyDetailData(detail)
    } catch (err) {
      setVerifyDetailError(err?.message || 'Terjadi kesalahan saat memuat detail verifikasi')
    } finally {
      setVerifyDetailLoading(false)
    }
  }, [authFetch])

  const closeVerifyModal = useCallback(() => {
    if (verifySubmittingAction) return
    setVerifyTarget(null)
    setVerifyDetailLoading(false)
    setVerifyDetailError('')
    setVerifyDetailData(null)
    setVerifyNote('')
    setVerifyDisbursementMethod('TRANSFER')
  }, [verifySubmittingAction])

  const submitVerification = useCallback(async (action) => {
    const loanId = Number(verifyTarget?.id)
    if (!Number.isInteger(loanId) || loanId <= 0) {
      setError('Data pinjaman tidak valid untuk diverifikasi')
      return
    }

    const status = action === 'reject' ? 'DITOLAK' : 'DISETUJUI'
    const note = verifyNote.trim()

    setError('')
    setSuccess('')
    setVerifySubmittingAction(action)

    try {
      const candidates = [
        { path: `/api/pinjaman/${loanId}/verifikasi`, method: 'PATCH' },
        { path: `/api/pinjaman/${loanId}/verifikasi`, method: 'POST' },
        { path: `/api/pinjaman/verifikasi/${loanId}`, method: 'PATCH' },
        { path: `/api/pinjaman/verifikasi/${loanId}`, method: 'POST' },
      ]

      let verified = false
      let json = null
      let lastErrorMessage = ''

      for (const candidate of candidates) {
        const res = await authFetch(candidate.path, {
          method: candidate.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            catatan: note,
          }),
        })

        json = await res.json().catch(() => null)
        if (res.ok) {
          verified = true
          break
        }

        lastErrorMessage = json?.message || ''
        if (res.status !== 404) {
          throw new Error(lastErrorMessage || 'Gagal memproses verifikasi pinjaman')
        }
      }

      if (!verified) {
        throw new Error(lastErrorMessage || 'Endpoint verifikasi pinjaman tidak ditemukan (404)')
      }

      const verificationMessage = json?.message || 'Verifikasi pinjaman berhasil'

      // Saat pinjaman disetujui, langsung proses pencairan pinjaman.
      if (action === 'approve') {
        const pencairanRes = await authFetch(`/api/pinjaman/${loanId}/pencairan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metodePembayaran: verifyDisbursementMethod,
            catatan: note,
          }),
        })
        const pencairanJson = await pencairanRes.json().catch(() => null)
        if (!pencairanRes.ok) {
          throw new Error(
            `Verifikasi berhasil, tetapi pencairan gagal: ${pencairanJson?.message || 'Gagal memproses pencairan pinjaman'}`
          )
        }

        setSuccess(pencairanJson?.message || verificationMessage)
      } else {
        setSuccess(verificationMessage)
      }

      setVerifyTarget(null)
      setVerifyNote('')
      await loadLoans()
    } catch (err) {
      setError(err?.message || 'Terjadi kesalahan saat verifikasi pinjaman')
    } finally {
      setVerifySubmittingAction('')
    }
  }, [authFetch, verifyTarget?.id, verifyNote, verifyDisbursementMethod, loadLoans])

  const openDeleteModal = useCallback((loan) => {
    setActionMenuOpenId('')
    setDeleteTarget({
      id: loan?.id,
      nasabahName: loan?.nasabah?.nama || '-',
    })
  }, [])

  const closeDeleteModal = useCallback(() => {
    if (deleteSubmitting) return
    setDeleteTarget(null)
  }, [deleteSubmitting])

  const confirmDeleteLoan = useCallback(async () => {
    const loanId = Number(deleteTarget?.id)
    if (!Number.isInteger(loanId) || loanId <= 0) {
      setError('Data pinjaman tidak valid untuk dihapus')
      setDeleteTarget(null)
      return
    }

    setActionMenuOpenId('')
    setError('')
    setSuccess('')
    setDeleteSubmitting(true)

    try {
      const res = await authFetch(`/api/pinjaman/${loanId}`, { method: 'DELETE' })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || 'Gagal menghapus pinjaman')
      }

      setSuccess(json?.message || 'Pinjaman berhasil dihapus')
      setDeleteTarget(null)
      await loadLoans()
    } catch (err) {
      setError(err?.message || 'Terjadi kesalahan saat menghapus pinjaman')
    } finally {
      setDeleteSubmitting(false)
    }
  }, [authFetch, deleteTarget?.id, loadLoans])

  const detailMeta = useMemo(() => getLoanStatusMeta(detailData?.status), [detailData?.status])

  useEffect(() => {
    if (!error) return
    toast.error(error)
    setError('')
  }, [error, toast])

  useEffect(() => {
    if (!success) return
    toast.success(success)
    setSuccess('')
  }, [success, toast])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-[#111827]">Verifikasi Pinjaman</h1>
        <Button
          type="button"
          variant="outline"
          className="border-slate-200"
          onClick={() => onNavigate?.('transaksi')}
        >
          Kembali ke Transaksi
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" ref={actionMenuContainerRef}>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2">Anggota</th>
                <th className="px-3 py-2">Jumlah</th>
                <th className="px-3 py-2">Tenor</th>
                <th className="px-3 py-2">Sisa</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">Memuat data pinjaman...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">Tidak ada data pinjaman.</td>
                </tr>
              ) : (
                rows.map((loan) => {
                  const statusMeta = getLoanStatusMeta(loan?.status)
                  const canVerify = canVerifyLoanByStatus(loan?.status)
                  return (
                    <tr key={loan.id} className="border-t border-slate-100 text-slate-700">
                      <td className="px-3 py-3 align-top">{loan?.nasabah?.nama || '-'}</td>
                      <td className="px-3 py-3 align-top">{formatCurrency(loan?.jumlahPinjaman)}</td>
                      <td className="px-3 py-3 align-top">{loan?.tenorBulan ?? '-'} Bulan</td>
                      <td className="px-3 py-3 align-top">{formatCurrency(loan?.sisaPinjaman)}</td>
                      <td className="px-3 py-3 align-top">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top text-right">
                        <div className="relative inline-flex" data-loan-action-zone="true">
                          <button
                            type="button"
                            data-loan-action-zone="true"
                            className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                            onClick={() => setActionMenuOpenId((prev) => (prev === String(loan.id) ? '' : String(loan.id)))}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {actionMenuOpenId === String(loan.id) && (
                            <div data-loan-action-zone="true" className="absolute right-0 top-[calc(100%+6px)] z-20 w-40 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                                onClick={() => openDetail(loan.id)}
                              >
                                <Eye className="h-4 w-4" />
                                Detail
                              </button>
                              <button
                                type="button"
                                disabled={!canVerify}
                                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm ${
                                  !canVerify
                                    ? 'cursor-not-allowed bg-emerald-50 text-emerald-700'
                                    : 'text-emerald-700 hover:bg-emerald-50'
                                }`}
                                onClick={() => openVerifyModal(loan)}
                              >
                                <ShieldCheck className="h-4 w-4" />
                                {!canVerify ? 'Sudah Diverifikasi' : 'Verifikasi'}
                              </button>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                                onClick={() => openDeleteModal(loan)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 lg:hidden">
          {loading ? (
            <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500">Memuat data pinjaman...</div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500">Tidak ada data pinjaman.</div>
          ) : (
            rows.map((loan) => {
              const statusMeta = getLoanStatusMeta(loan?.status)
              const canVerify = canVerifyLoanByStatus(loan?.status)
              return (
                <div key={loan.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{loan?.nasabah?.nama || '-'}</p>
                      <p className="text-xs text-slate-500">Pinjaman #{loan?.id ?? '-'}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <p>Jumlah: {formatCurrency(loan?.jumlahPinjaman)}</p>
                    <p className="text-right">Tenor: {loan?.tenorBulan ?? '-'} Bulan</p>
                    <p className="col-span-2 text-right text-sm font-semibold text-slate-700">
                      Sisa: {formatCurrency(loan?.sisaPinjaman)}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 text-xs font-semibold"
                      onClick={() => openDetail(loan.id)}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Detail
                    </Button>
                    <Button
                      type="button"
                      className="h-9 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-100 disabled:text-emerald-700"
                      disabled={!canVerify}
                      onClick={() => openVerifyModal(loan)}
                    >
                      <ShieldCheck className="mr-1 h-4 w-4" />
                      {!canVerify ? 'Selesai' : 'Verifikasi'}
                    </Button>
                    <Button
                      type="button"
                      className="h-9 bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700"
                      onClick={() => openDeleteModal(loan)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Hapus
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <Toast toasts={toast.toasts} remove={toast.remove} />

      {isDetailModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[10000] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={closeDetailModal}
        >
          <div
            className="relative z-[10001] w-full sm:max-w-4xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Detail Pinjaman</h2>
              </div>
              <button
                type="button"
                aria-label="Tutup detail pinjaman"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={closeDetailModal}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 sm:px-6 py-5 overflow-y-auto space-y-5">
              {detailLoading ? (
                <div className="py-16 flex items-center justify-center text-gray-400 text-sm">Memuat detail pinjaman...</div>
              ) : detailError ? (
                <div className="py-8">
                  <p className="text-sm text-red-500">{detailError}</p>
                </div>
              ) : detailData ? (
                <>
                  <div className="rounded-xl border border-gray-200 p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-white">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Nama Anggota</p>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight break-words">{detailData?.nasabah?.nama || '-'}</h3>
                        <p className="text-sm text-[#0066FF] font-medium mt-1">Pinjaman #{detailData?.id ?? '-'}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${detailMeta.className}`}>
                        {detailMeta.label}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900">Data Pinjaman</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Jumlah Pinjaman</span>
                          <span className="text-gray-900 text-right font-medium">{formatCurrency(detailData?.jumlahPinjaman)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Sisa Pinjaman</span>
                          <span className="text-gray-900 text-right font-medium">{formatCurrency(detailData?.sisaPinjaman)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Bunga Persen</span>
                          <span className="text-gray-900 text-right font-medium">{detailData?.bungaPersen ?? '-'}%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Tenor</span>
                          <span className="text-gray-900 text-right font-medium">{detailData?.tenorBulan ?? '-'} Bulan</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Tanggal Persetujuan</span>
                          <span className="text-gray-900 text-right font-medium">{formatDate(detailData?.tanggalPersetujuan)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Metode Pencairan</span>
                          <span className="text-gray-900 text-right font-medium">
                            {formatDisbursementMethod(detailData?.metodePembayaran ?? detailData?.metodePencairan)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Catatan</span>
                          <span className="text-gray-900 text-right font-medium">{detailData?.catatan || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900">Data Anggota</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Nomor Anggota</span>
                          <span className="text-gray-900 text-right font-medium">{detailData?.nasabah?.nomorAnggota || '-'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">NIK</span>
                          <span className="text-gray-900 text-right font-medium">{detailData?.nasabah?.nik || '-'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">No. HP</span>
                          <span className="text-gray-900 text-right font-medium">{detailData?.nasabah?.noHp || '-'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Pekerjaan</span>
                          <span className="text-gray-900 text-right font-medium">{detailData?.nasabah?.pekerjaan || '-'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Instansi</span>
                          <span className="text-gray-900 text-right font-medium">{detailData?.nasabah?.instansi || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900">Data Verifikator</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Nama</span>
                        <span className="text-gray-900 text-right font-medium">{detailData?.verifiedBy?.nama || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Jabatan</span>
                        <span className="text-gray-900 text-right font-medium">{detailData?.verifiedBy?.jabatan || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">No. HP</span>
                        <span className="text-gray-900 text-right font-medium">{detailData?.verifiedBy?.noHp || '-'}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-sm text-gray-500">Detail pinjaman tidak tersedia.</div>
              )}
            </div>

            <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex justify-end">
              <Button type="button" variant="outline" className="h-10" onClick={closeDetailModal}>
                Tutup
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {Boolean(verifyTarget) && createPortal(
        <div
          className="fixed inset-0 z-[10001] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={closeVerifyModal}
        >
          <div
            className="relative z-[10002] w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Verifikasi Pinjaman</h2>
              </div>
              <button
                type="button"
                aria-label="Tutup verifikasi pinjaman"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={closeVerifyModal}
                disabled={Boolean(verifySubmittingAction)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 sm:px-6 py-5 overflow-y-auto space-y-5">
              <div className="rounded-xl border border-gray-200 p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-white">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Nama Anggota</p>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight break-words">{verifyTarget?.nasabahName || '-'}</h3>
                    <p className="text-sm text-[#0066FF] font-medium mt-1">Pinjaman #{verifyTarget?.id ?? '-'}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${getLoanStatusMeta(verifyTarget?.status).className}`}>
                    {getLoanStatusMeta(verifyTarget?.status).label}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Data Pinjaman</h4>
                {verifyDetailLoading ? (
                  <p className="text-sm text-gray-500">Memuat data pinjaman...</p>
                ) : verifyDetailError ? (
                  <p className="text-sm text-red-500">{verifyDetailError}</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Jumlah Pinjaman</span>
                      <span className="text-gray-900 text-right font-medium">{formatCurrency(verifyDetailData?.jumlahPinjaman ?? verifyTarget?.nominal)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Sisa Pinjaman</span>
                      <span className="text-gray-900 text-right font-medium">{formatCurrency(verifyDetailData?.sisaPinjaman)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Bunga Persen</span>
                      <span className="text-gray-900 text-right font-medium">{verifyDetailData?.bungaPersen ?? '-'}%</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Tenor</span>
                      <span className="text-gray-900 text-right font-medium">{verifyDetailData?.tenorBulan ?? '-'} Bulan</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Data Anggota</h4>
                {verifyDetailLoading ? (
                  <p className="text-sm text-gray-500">Memuat data anggota...</p>
                ) : verifyDetailError ? (
                  <p className="text-sm text-red-500">{verifyDetailError}</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Nama Anggota</span>
                      <span className="text-gray-900 text-right font-medium">{verifyDetailData?.nasabah?.nama || verifyTarget?.nasabahName || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Nomor Anggota</span>
                      <span className="text-gray-900 text-right font-medium">{verifyDetailData?.nasabah?.nomorAnggota || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">NIK</span>
                      <span className="text-gray-900 text-right font-medium">{verifyDetailData?.nasabah?.nik || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">No. HP</span>
                      <span className="text-gray-900 text-right font-medium">{verifyDetailData?.nasabah?.noHp || '-'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Metode Pencairan Pinjaman</h4>
                <select
                  value={verifyDisbursementMethod}
                  onChange={(e) => setVerifyDisbursementMethod(e.target.value)}
                  disabled={Boolean(verifySubmittingAction)}
                  className="h-10 w-full rounded-lg border border-gray-100 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:opacity-60"
                >
                  <option value="CASH">Tunai</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>

              <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Catatan Verifikasi</h4>
                <textarea
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  disabled={Boolean(verifySubmittingAction)}
                  rows={4}
                  placeholder="Contoh: Dokumen valid, pengajuan disetujui"
                  className="w-full rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:opacity-60 resize-none"
                />
              </div>
            </div>

            <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-10"
                onClick={closeVerifyModal}
                disabled={Boolean(verifySubmittingAction)}
              >
                Batal
              </Button>
              <Button
                type="button"
                className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => submitVerification('reject')}
                disabled={Boolean(verifySubmittingAction)}
              >
                {verifySubmittingAction === 'reject' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {verifySubmittingAction === 'reject' ? 'Menolak...' : 'Tolak'}
              </Button>
              <Button
                type="button"
                className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => submitVerification('approve')}
                disabled={Boolean(verifySubmittingAction)}
              >
                {verifySubmittingAction === 'approve' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {verifySubmittingAction === 'approve' ? 'Menyetujui...' : 'Setujui'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {Boolean(deleteTarget) && createPortal(
        <div
          className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-w-md sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Hapus Pinjaman</h2>
                <p className="text-xs text-slate-500">Tindakan ini tidak bisa dibatalkan.</p>
              </div>
              <button
                type="button"
                aria-label="Tutup modal hapus"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={closeDeleteModal}
                disabled={deleteSubmitting}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-4 text-sm text-slate-700">
              <p>
                Yakin ingin menghapus pinjaman <span className="font-semibold">#{deleteTarget?.id}</span>
                {' '}milik <span className="font-semibold">{deleteTarget?.nasabahName}</span>?
              </p>
            </div>

            <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 border-slate-200"
                onClick={closeDeleteModal}
                disabled={deleteSubmitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                className="h-10 flex-1 bg-rose-600 text-white hover:bg-rose-700"
                onClick={confirmDeleteLoan}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
