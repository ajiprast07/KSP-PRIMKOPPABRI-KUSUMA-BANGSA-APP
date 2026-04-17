import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, ArrowDownUp, CheckCircle, CheckCircle2, Eye, Filter, Loader2, MoreVertical, Plus, Search, ShieldCheck, Trash2, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'

const PAGE_LIMIT = 20
const ALL_DATA_LIMIT = 100
const INCOMING_TYPES = new Set(['SETORAN', 'ANGSURAN'])
const OUTGOING_TYPES = new Set(['PENARIKAN', 'PINJAMAN'])
const TRANSACTION_TYPE_OPTIONS = [
  { value: 'ALL', label: 'Semua Jenis' },
  { value: 'SETORAN', label: 'Setoran' },
  { value: 'PENARIKAN', label: 'Penarikan' },
  { value: 'PINJAMAN', label: 'Pencairan' },
  { value: 'ANGSURAN', label: 'Angsuran' },
]
const PAYMENT_METHOD_OPTIONS = [
  { value: 'ALL', label: 'Semua Metode' },
  { value: 'CASH', label: 'Tunai' },
  { value: 'TRANSFER', label: 'Transfer' },
]

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

function toNameMap(list, nameKeys = []) {
  return list.reduce((acc, item) => {
    const id = item?.id
    if (id === undefined || id === null) return acc
    const name = nameKeys
      .map((key) => item?.[key])
      .find((value) => String(value || '').trim())
    if (name) acc[String(id)] = String(name)
    return acc
  }, {})
}

function resolvePinjamanReferenceId(tx) {
  return (
    tx?.pinjamanId ??
    tx?.pinjaman_id ??
    tx?.referensiId ??
    tx?.referenceId ??
    tx?.refId ??
    tx?.sumberId ??
    tx?.relatedId ??
    tx?.entityId ??
    null
  )
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

function normalizeTransactionType(type) {
  const normalized = String(type || '').toUpperCase()
  if (normalized === 'PENCAIRAN') return 'PINJAMAN'
  return normalized
}

function mapTypeLabel(type) {
  const normalized = normalizeTransactionType(type)
  if (normalized === 'SETORAN') return 'Setoran'
  if (normalized === 'ANGSURAN') return 'Angsuran'
  if (normalized === 'PENARIKAN') return 'Penarikan'
  if (normalized === 'PINJAMAN') return 'Pencairan'
  return normalized || '-'
}

function mapMethodLabel(method) {
  const normalized = String(method || '').toUpperCase()
  if (normalized === 'TRANSFER') return 'Transfer'
  if (normalized === 'CASH') return 'Tunai'
  return normalized || '-'
}

function getStatusMeta(tx) {
  const txType = normalizeTransactionType(tx?.jenisTransaksi)
  if (txType !== 'PINJAMAN') {
    return { label: 'Tidak Perlu Persetujuan', className: 'bg-slate-100 text-slate-600' }
  }
  const normalized = String(
    tx?.pinjamanStatus ||
    tx?.pinjaman?.status ||
    tx?.status ||
    ''
  ).toUpperCase()
  if (normalized === 'APPROVED' || normalized === 'DISETUJUI' || normalized === 'SUCCESS' || normalized === 'BERHASIL') {
    return { label: 'Disetujui', className: 'bg-emerald-100 text-emerald-700' }
  }
  if (normalized === 'REJECTED' || normalized === 'DITOLAK' || normalized === 'FAILED' || normalized === 'GAGAL') {
    return { label: 'Ditolak', className: 'bg-rose-100 text-rose-700' }
  }
  if (normalized === 'PROCESSING' || normalized === 'PROSES') {
    return { label: 'Diproses', className: 'bg-blue-100 text-blue-700' }
  }
  return { label: 'Pending', className: 'bg-amber-100 text-amber-700' }
}

function resolveNasabahName(tx) {
  return tx?.nasabah?.nama || tx?.nasabahNama || tx?.namaNasabah || tx?.nasabah_name || '-'
}

function resolvePegawaiName(tx) {
  return tx?.pegawai?.nama || tx?.pegawaiNama || tx?.namaPegawai || tx?.pegawai_name || '-'
}

function flowBadgeClass(type) {
  const normalized = normalizeTransactionType(type)
  if (INCOMING_TYPES.has(normalized)) return 'bg-emerald-100 text-emerald-700'
  if (OUTGOING_TYPES.has(normalized)) return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-slate-700'
}

function computeSummary(transactions) {
  return transactions.reduce(
    (acc, tx) => {
      const nominal = Number(tx?.nominal)
      const safeNominal = Number.isFinite(nominal) ? nominal : 0
      const txType = normalizeTransactionType(tx?.jenisTransaksi)
      if (INCOMING_TYPES.has(txType)) acc.incoming += safeNominal
      else if (OUTGOING_TYPES.has(txType)) acc.outgoing += safeNominal
      return acc
    },
    { incoming: 0, outgoing: 0 }
  )
}

// Helper: enrich raw tx rows with nasabah/pegawai/pinjaman lookups
function enrichTransactions(txRows, nasabahMap, pegawaiMap, pinjamanMap) {
  return txRows.map((tx) => {
    const nasabahId = tx?.nasabahId ?? tx?.nasabah?.id
    const pegawaiId = tx?.pegawaiId ?? tx?.pegawai?.id
    const pinjamanRefId = resolvePinjamanReferenceId(tx)
    const loanFromMap =
      pinjamanRefId !== null && pinjamanRefId !== undefined
        ? pinjamanMap[String(pinjamanRefId)]
        : undefined

    return {
      ...tx,
      nasabahNama:
        tx?.nasabah?.nama ||
        tx?.nasabahNama ||
        tx?.namaNasabah ||
        tx?.nasabah_name ||
        loanFromMap?.nasabahNama ||
        nasabahMap[String(nasabahId)] ||
        '-',
      pegawaiNama:
        tx?.pegawai?.nama ||
        tx?.pegawaiNama ||
        tx?.namaPegawai ||
        tx?.pegawai_name ||
        pegawaiMap[String(pegawaiId)] ||
        '-',
      pinjamanStatus: loanFromMap?.status || tx?.pinjamanStatus || null,
    }
  })
}

export default function Transaksi({ onNavigate }) {
  const { authFetch, dataVersion } = useAuth()
  const toast = useToast()

  // ─── loading / error ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ─── search & filter state ────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [methodFilter, setMethodFilter] = useState('ALL')
  const [filterSpecificDate, setFilterSpecificDate] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  // filter modal draft state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [draftTypeFilter, setDraftTypeFilter] = useState('ALL')
  const [draftMethodFilter, setDraftMethodFilter] = useState('ALL')
  const [draftSpecificDate, setDraftSpecificDate] = useState('')
  const [draftDateFrom, setDraftDateFrom] = useState('')
  const [draftDateTo, setDraftDateTo] = useState('')
  const [filterError, setFilterError] = useState('')

  // ─── paginated data store ─────────────────────────────────────────────────
  const [transactions, setTransactions] = useState([])
  const [pageIndex, setPageIndex] = useState(1)
  const [actionMenuOpenId, setActionMenuOpenId] = useState('')
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailData, setDetailData] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')


function isActiveNasabah(nasabah) {
  const statusCandidates = [
    nasabah?.status,
    nasabah?.statusKeanggotaan,
    nasabah?.memberStatus,
    nasabah?.keanggotaan,
  ]

  const normalized = statusCandidates
    .map((value) => String(value || '').toUpperCase())
    .find((value) => value)

  return normalized === 'AKTIF' || normalized === 'ACTIVE'
}

function isApprovedLoanStatus(status) {
  const normalized = String(status || '').toUpperCase()
  return normalized === 'DISETUJUI' || normalized === 'APPROVED' || normalized === 'BERHASIL' || normalized === 'SUCCESS'
}

function toNasabahOption(item) {
  const statusCandidates = [
    item?.status,
    item?.statusKeanggotaan,
    item?.memberStatus,
    item?.keanggotaan,
  ]
  const normalizedStatus = statusCandidates
    .map((value) => String(value || '').toUpperCase())
    .find((value) => value) || ''

  return {
    id: Number(item?.id),
    name: String(item?.nama || item?.namaLengkap || item?.fullName || `Anggota #${item?.id}`),
    status: normalizedStatus,
    isActive: normalizedStatus === 'AKTIF' || normalizedStatus === 'ACTIVE',
  }
}
  // ─── add menu ─────────────────────────────────────────────────────────────
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [activeMenuItem, setActiveMenuItem] = useState('Setoran')
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false)
  const [loanNasabahId, setLoanNasabahId] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [loanTenor, setLoanTenor] = useState('3')
  const [loanNasabahSearch, setLoanNasabahSearch] = useState('')
  const [loanSubmitting, setLoanSubmitting] = useState(false)
  const [loanError, setLoanError] = useState('')
  const [loanSuccess, setLoanSuccess] = useState('')
  const [activeNasabahOptions, setActiveNasabahOptions] = useState([])

  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false)
  const [installmentPinjamanId, setInstallmentPinjamanId] = useState('')
  const [installmentNasabahId, setInstallmentNasabahId] = useState('')
  const [installmentAmount, setInstallmentAmount] = useState('')
  const [installmentNote, setInstallmentNote] = useState('')
  const [installmentMethod, setInstallmentMethod] = useState('CASH')
  const [installmentLoanSearch, setInstallmentLoanSearch] = useState('')
  const [installmentSubmitting, setInstallmentSubmitting] = useState(false)
  const [installmentError, setInstallmentError] = useState('')
  const [installmentSuccess, setInstallmentSuccess] = useState('')
  const [installmentLoanOptions, setInstallmentLoanOptions] = useState([])
  const [installmentNasabahOptions, setInstallmentNasabahOptions] = useState([])

  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false)
  const [savingsNasabahId, setSavingsNasabahId] = useState('')
  const [savingsNasabahSearch, setSavingsNasabahSearch] = useState('')
  const [savingsRekeningId, setSavingsRekeningId] = useState('')
  const [savingsRekeningOptions, setSavingsRekeningOptions] = useState([])
  const [savingsAmount, setSavingsAmount] = useState('')
  const [savingsMethod, setSavingsMethod] = useState('CASH')
  const [savingsNote, setSavingsNote] = useState('')
  const [savingsLoadingRekening, setSavingsLoadingRekening] = useState(false)
  const [savingsSubmitting, setSavingsSubmitting] = useState(false)
  const [savingsError, setSavingsError] = useState('')
  const [savingsSuccess, setSavingsSuccess] = useState('')
  const [savingsNasabahOptions, setSavingsNasabahOptions] = useState([])

  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false)
  const [withdrawalNasabahId, setWithdrawalNasabahId] = useState('')
  const [withdrawalNasabahSearch, setWithdrawalNasabahSearch] = useState('')
  const [withdrawalRekeningId, setWithdrawalRekeningId] = useState('')
  const [withdrawalRekeningOptions, setWithdrawalRekeningOptions] = useState([])
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [withdrawalMethod, setWithdrawalMethod] = useState('CASH')
  const [withdrawalNote, setWithdrawalNote] = useState('')
  const [withdrawalLoadingRekening, setWithdrawalLoadingRekening] = useState(false)
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false)
  const [withdrawalError, setWithdrawalError] = useState('')
  const [withdrawalSuccess, setWithdrawalSuccess] = useState('')
  const [withdrawalNasabahOptions, setWithdrawalNasabahOptions] = useState([])

  const addMenuRef = useRef(null)
  const lookupCacheRef = useRef(null)

  const addMenuItems = useMemo(() => ['Setoran', 'Penarikan', 'Pencairan', 'Angsuran'], [])
  const displayedNasabahOptions = useMemo(() => {
    const keyword = loanNasabahSearch.trim().toLowerCase()

    const sorted = [...activeNasabahOptions].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'id', { sensitivity: 'base' })
    )

    if (!keyword) return sorted
    return sorted.filter((item) => item.name.toLowerCase().includes(keyword))
  }, [activeNasabahOptions, loanNasabahSearch])

  const displayedInstallmentNasabahOptions = useMemo(() => {
    const keyword = installmentLoanSearch.trim().toLowerCase()

    const sorted = [...installmentNasabahOptions].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'id', { sensitivity: 'base' })
    )

    if (!keyword) return sorted
    return sorted.filter((item) => item.name.toLowerCase().includes(keyword))
  }, [installmentNasabahOptions, installmentLoanSearch])

  const displayedInstallmentLoanOptions = useMemo(() => {
    if (!installmentNasabahId) return []

    const selectedMemberLoans = installmentLoanOptions
      .filter((item) => String(item.nasabahId) === String(installmentNasabahId))
      .sort((a, b) => Number(b.id) - Number(a.id))

    return selectedMemberLoans.map((item, index) => ({
      ...item,
      installmentOrder: selectedMemberLoans.length - index,
      label: `Pencairan ke-${selectedMemberLoans.length - index}`,
    }))
  }, [installmentLoanOptions, installmentNasabahId])

  const displayedSavingsNasabahOptions = useMemo(() => {
    const keyword = savingsNasabahSearch.trim().toLowerCase()
    const sorted = [...savingsNasabahOptions].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'id', { sensitivity: 'base' })
    )

    if (!keyword) return sorted
    return sorted.filter((item) => item.name.toLowerCase().includes(keyword))
  }, [savingsNasabahOptions, savingsNasabahSearch])

  const selectedSavingsRekening = useMemo(
    () => savingsRekeningOptions.find((item) => String(item.id) === savingsRekeningId) || null,
    [savingsRekeningOptions, savingsRekeningId]
  )

  const displayedWithdrawalNasabahOptions = useMemo(() => {
    const keyword = withdrawalNasabahSearch.trim().toLowerCase()
    const sorted = [...withdrawalNasabahOptions].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'id', { sensitivity: 'base' })
    )

    if (!keyword) return sorted
    return sorted.filter((item) => item.name.toLowerCase().includes(keyword))
  }, [withdrawalNasabahOptions, withdrawalNasabahSearch])

  const selectedWithdrawalRekening = useMemo(
    () => withdrawalRekeningOptions.find((item) => String(item.id) === withdrawalRekeningId) || null,
    [withdrawalRekeningOptions, withdrawalRekeningId]
  )

  const selectedWithdrawalNasabah = useMemo(
    () => withdrawalNasabahOptions.find((item) => String(item.id) === withdrawalNasabahId) || null,
    [withdrawalNasabahOptions, withdrawalNasabahId]
  )

  const selectedInstallmentLoan = useMemo(
    () => installmentLoanOptions.find((item) => String(item.id) === installmentPinjamanId) || null,
    [installmentLoanOptions, installmentPinjamanId]
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch lookup tables once (or whenever dataVersion changes)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchLookups = useCallback(async () => {
    if (lookupCacheRef.current) return lookupCacheRef.current

    const [nasabahRes, pegawaiRes, pinjamanRes] = await Promise.all([
      authFetch('/api/nasabah'),
      authFetch('/api/pegawai'),
      authFetch('/api/pinjaman'),
    ])

    const nasabahJson = await nasabahRes.json().catch(() => null)
    const pegawaiJson = await pegawaiRes.json().catch(() => null)
    const pinjamanJson = await pinjamanRes.json().catch(() => null)

    const newNasabahMap = nasabahRes.ok
      ? toNameMap(toArray(nasabahJson?.data ?? nasabahJson), ['nama', 'namaLengkap', 'fullName'])
      : {}

    const newPegawaiMap = pegawaiRes.ok
      ? toNameMap(toArray(pegawaiJson?.data ?? pegawaiJson), ['nama', 'namaLengkap', 'fullName'])
      : {}

    const pinjamanRows = pinjamanRes.ok ? toArray(pinjamanJson?.data ?? pinjamanJson) : []
    const newPinjamanMap = pinjamanRows.reduce((acc, item) => {
      if (item?.id === undefined || item?.id === null) return acc
      acc[String(item.id)] = {
        status: item?.status,
        nasabahNama: item?.nasabah?.nama || '-',
      }
      return acc
    }, {})

    const lookupMaps = { newNasabahMap, newPegawaiMap, newPinjamanMap }
    lookupCacheRef.current = lookupMaps
    return lookupMaps
  }, [authFetch])

  useEffect(() => {
    lookupCacheRef.current = null
  }, [dataVersion])

  const fetchPendingVerificationCount = useCallback(async () => {
    try {
      let pendingCount = 0
      const visitedCursor = new Set()
      let after = null
      let guard = 0

      while (guard < 200) {
        const params = new URLSearchParams({ status: 'PENDING' })
        if (after !== null && after !== undefined && after !== '') {
          params.set('after', String(after))
        }

        const query = params.toString()
        const endpoint = query ? `/api/pinjaman?${query}` : '/api/pinjaman'

        const res = await authFetch(endpoint)
        const json = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(json?.message || 'Gagal mengambil data pinjaman')
        }

        const rows = toArray(json?.data ?? json)
  pendingCount += rows.filter((loan) => String(loan?.status || '').toUpperCase() === 'PENDING').length

        const pg = json?.pagination ?? {}
        const hasNext = Boolean(pg?.hasNext ?? pg?.has_next)
        const nextCursor = pg?.nextCursor ?? pg?.next_cursor
        if (!hasNext || nextCursor === null || nextCursor === undefined || nextCursor === '') {
          break
        }
        if (visitedCursor.has(String(nextCursor))) {
          break
        }

        visitedCursor.add(String(nextCursor))
        after = nextCursor
        guard += 1
      }

      setPendingVerificationCount(pendingCount)
    } catch {
      setPendingVerificationCount(0)
    }
  }, [authFetch])

  const fetchAllTransactions = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const baseParams = new URLSearchParams({ limit: String(ALL_DATA_LIMIT) })

      if (typeFilter !== 'ALL') {
        const apiType = typeFilter === 'PINJAMAN' ? 'PENCAIRAN' : typeFilter
        baseParams.set('jenisTransaksi', apiType)
      }

      if (filterSpecificDate) {
        baseParams.set('tanggalFrom', `${filterSpecificDate}T00:00:00`)
        baseParams.set('tanggalTo', `${filterSpecificDate}T23:59:59.999`)
      } else {
        if (filterDateFrom) baseParams.set('tanggalFrom', `${filterDateFrom}T00:00:00`)
        if (filterDateTo) baseParams.set('tanggalTo', `${filterDateTo}T23:59:59.999`)
      }

      const { newNasabahMap, newPegawaiMap, newPinjamanMap } = await fetchLookups()

      let after = null
      let guard = 0
      const visitedCursor = new Set()
      const mergedRows = []

      while (guard < 500) {
        const params = new URLSearchParams(baseParams)
        if (after !== null && after !== undefined && after !== '') {
          params.set('after', String(after))
        }

        const query = params.toString()
        const endpoint = query ? `/api/transaksi?${query}` : '/api/transaksi'

        const res = await authFetch(endpoint)
        const json = await res.json().catch(() => null)

        if (!res.ok) {
          throw new Error(json?.message || 'Gagal mengambil data transaksi')
        }

        const rows = toArray(json?.data ?? json)
        mergedRows.push(...rows)

        const pg = json?.pagination ?? {}
        const hasNext = Boolean(pg?.hasNext ?? pg?.has_next)
        const nextCursor = pg?.nextCursor ?? pg?.next_cursor

        if (!hasNext || nextCursor === null || nextCursor === undefined || nextCursor === '') {
          break
        }
        if (visitedCursor.has(String(nextCursor))) {
          break
        }

        visitedCursor.add(String(nextCursor))
        after = nextCursor
        guard += 1
      }

      const uniqueRows = Array.from(
        new Map(mergedRows.map((item) => [String(item?.id ?? Math.random()), item])).values()
      )

      const enrichedRows = enrichTransactions(uniqueRows, newNasabahMap, newPegawaiMap, newPinjamanMap)
      setTransactions(enrichedRows)
    } catch (err) {
      setError(err?.message || 'Terjadi kesalahan saat mengambil transaksi')
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [
    authFetch,
    fetchLookups,
    typeFilter,
    filterSpecificDate,
    filterDateFrom,
    filterDateTo,
  ])

  const goToNextPage = useCallback(() => {
    setPageIndex((prev) => prev + 1)
    setActionMenuOpenId('')
  }, [])

  const goToPrevPage = useCallback(() => {
    if (pageIndex <= 1) return
    setPageIndex((prev) => Math.max(1, prev - 1))
    setActionMenuOpenId('')
  }, [pageIndex])

  // ─────────────────────────────────────────────────────────────────────────
  // Initial fetch / refresh
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAllTransactions()
  }, [fetchAllTransactions, dataVersion])

  useEffect(() => {
    fetchPendingVerificationCount()
  }, [fetchPendingVerificationCount, dataVersion])

  // ─────────────────────────────────────────────────────────────────────────
  // Add-menu outside-click handler
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!addMenuOpen) return undefined
    const handleOutsideClick = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setAddMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [addMenuOpen])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target?.closest?.('[data-transaction-action-zone="true"]')) {
        setActionMenuOpenId('')
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const closeLoanModal = useCallback(() => {
    setIsLoanModalOpen(false)
    setLoanError('')
  }, [])

  const closeInstallmentModal = useCallback(() => {
    setIsInstallmentModalOpen(false)
    setInstallmentNasabahId('')
    setInstallmentPinjamanId('')
    setInstallmentError('')
  }, [])

  const closeSavingsModal = useCallback(() => {
    setIsSavingsModalOpen(false)
    setSavingsError('')
  }, [])

  const closeWithdrawalModal = useCallback(() => {
    setIsWithdrawalModalOpen(false)
    setWithdrawalError('')
  }, [])

  const openDetailModal = useCallback(async (row) => {
    const transactionId = row?.id
    setActionMenuOpenId('')
    setIsDetailModalOpen(true)
    setDetailLoading(true)
    setDetailError('')
    setDetailData(null)

    try {
      const res = await authFetch(`/api/transaksi/${transactionId}`)
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || 'Gagal mengambil detail transaksi')
      }

      const detailRows = toArray(json?.data ?? json)
      const detail = detailRows[0] || json?.data || null
      if (!detail) {
        throw new Error('Detail transaksi tidak ditemukan')
      }

      setDetailData({
        ...detail,
        pinjamanStatus:
          detail?.pinjamanStatus ||
          detail?.pinjaman?.status ||
          row?.pinjamanStatus ||
          row?.pinjaman?.status ||
          row?.status ||
          null,
      })
    } catch (err) {
      setDetailError(err?.message || 'Terjadi kesalahan saat memuat detail transaksi')
    } finally {
      setDetailLoading(false)
    }
  }, [authFetch])

  const closeDetailModal = useCallback(() => {
    setIsDetailModalOpen(false)
    setDetailLoading(false)
    setDetailError('')
    setDetailData(null)
  }, [])

  const openDeleteModal = useCallback((row) => {
    setActionMenuOpenId('')
    setDeleteTarget({
      id: row?.id,
      nasabahName: resolveNasabahName(row),
      typeLabel: mapTypeLabel(row?.jenisTransaksi),
      nominal: row?.nominal,
    })
  }, [])

  const closeDeleteModal = useCallback(() => {
    if (deleteSubmitting) return
    setDeleteTarget(null)
  }, [deleteSubmitting])

  const confirmDeleteTransaction = useCallback(async () => {
    const transactionId = Number(deleteTarget?.id)
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      setError('Data transaksi tidak valid untuk dihapus')
      setDeleteTarget(null)
      return
    }

    setDeleteSubmitting(true)
    setError('')
    setActionSuccess('')

    try {
      const res = await authFetch(`/api/transaksi/${transactionId}`, { method: 'DELETE' })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || 'Gagal menghapus transaksi')
      }

      setActionSuccess(json?.message || 'Transaksi berhasil dihapus')
      setDeleteTarget(null)
      await fetchAllTransactions()
    } catch (err) {
      setError(err?.message || 'Terjadi kesalahan saat menghapus transaksi')
    } finally {
      setDeleteSubmitting(false)
    }
  }, [authFetch, deleteTarget?.id, fetchAllTransactions])

  const openLoanModal = useCallback(async () => {
    setLoanError('')
    setLoanSuccess('')
    setLoanSubmitting(false)
    setLoanNasabahId('')
    setLoanAmount('')
    setLoanTenor('3')
    setLoanNasabahSearch('')

    try {
      const res = await authFetch('/api/nasabah')
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || 'Gagal mengambil data nasabah')
      }

      const rows = toArray(json?.data ?? json)
      const options = rows
        .filter((item) => item?.id !== undefined && item?.id !== null)
        .filter((item) => isActiveNasabah(item))
        .map((item) => toNasabahOption(item))

      setActiveNasabahOptions(options)
      setIsLoanModalOpen(true)
    } catch (err) {
      setLoanError(err?.message || 'Terjadi kesalahan saat memuat nasabah aktif')
      setIsLoanModalOpen(true)
      setActiveNasabahOptions([])
    }
  }, [authFetch])

  const openInstallmentModal = useCallback(async () => {
    setInstallmentError('')
    setInstallmentSuccess('')
    setInstallmentSubmitting(false)
    setInstallmentNasabahId('')
    setInstallmentPinjamanId('')
    setInstallmentAmount('')
    setInstallmentNote('')
    setInstallmentMethod('CASH')
    setInstallmentLoanSearch('')

    try {
      const [nasabahRes, pinjamanRes] = await Promise.all([
        authFetch('/api/nasabah'),
        authFetch('/api/pinjaman'),
      ])

      const nasabahJson = await nasabahRes.json().catch(() => null)
      const pinjamanJson = await pinjamanRes.json().catch(() => null)

      if (!nasabahRes.ok) {
        throw new Error(nasabahJson?.message || 'Gagal mengambil data nasabah')
      }
      if (!pinjamanRes.ok) {
        throw new Error(pinjamanJson?.message || 'Gagal mengambil data pinjaman')
      }

      const nasabahRows = toArray(nasabahJson?.data ?? nasabahJson)
      const pinjamanRows = toArray(pinjamanJson?.data ?? pinjamanJson)

      const nasabahMap = new Map(
        nasabahRows
          .filter((item) => item?.id !== undefined && item?.id !== null)
          .map((item) => [String(item.id), toNasabahOption(item)])
      )
      const nasabahNameMap = new Map(
        Array.from(nasabahMap.values()).map((item) => [String(item.name || '').trim().toLowerCase(), item])
      )

      const loans = pinjamanRows.reduce((acc, loan) => {
        const loanId = loan?.id
        const nasabahId = loan?.nasabahId ?? loan?.nasabah?.id
        if (loanId === undefined || loanId === null) return acc
        if (!isApprovedLoanStatus(loan?.status)) return acc

        const nasabahNameFromLoan = String(loan?.nasabah?.nama || '').trim()
        const nasabahById = nasabahId !== undefined && nasabahId !== null ? nasabahMap.get(String(nasabahId)) : null
        const nasabahByName = nasabahNameFromLoan
          ? nasabahNameMap.get(nasabahNameFromLoan.toLowerCase())
          : null
        const nasabah = nasabahById || nasabahByName

        if (!nasabah) return acc

        acc.push({
          id: Number(loanId),
          nasabahId: Number(nasabah?.id || nasabahId || 0),
          nasabahName: nasabah.name,
          jumlahPinjaman: Number(loan?.jumlahPinjaman ?? 0),
          sisaPinjaman: Number(loan?.sisaPinjaman ?? 0),
        })
        return acc
      }, [])

      const nasabahWithLoans = Array.from(
        new Map(
          loans.map((item) => [
            String(item.nasabahId),
            { id: item.nasabahId, name: item.nasabahName },
          ])
        ).values()
      )

      setInstallmentLoanOptions(loans)
      setInstallmentNasabahOptions(nasabahWithLoans)
      setIsInstallmentModalOpen(true)
    } catch (err) {
      setInstallmentError(err?.message || 'Terjadi kesalahan saat memuat data angsuran')
      setInstallmentLoanOptions([])
      setInstallmentNasabahOptions([])
      setIsInstallmentModalOpen(true)
    }
  }, [authFetch])

  const openSavingsModal = useCallback(async () => {
    setSavingsError('')
    setSavingsSuccess('')
    setSavingsSubmitting(false)
    setSavingsNasabahId('')
    setSavingsNasabahSearch('')
    setSavingsRekeningId('')
    setSavingsRekeningOptions([])
    setSavingsAmount('')
    setSavingsMethod('CASH')
    setSavingsNote('')

    try {
      const res = await authFetch('/api/nasabah')
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || 'Gagal mengambil data nasabah')
      }

      const rows = toArray(json?.data ?? json)
      const options = rows
        .filter((item) => item?.id !== undefined && item?.id !== null)
        .filter((item) => isActiveNasabah(item))
        .map((item) => toNasabahOption(item))

      setSavingsNasabahOptions(options)
      setIsSavingsModalOpen(true)
    } catch (err) {
      setSavingsError(err?.message || 'Terjadi kesalahan saat memuat nasabah aktif')
      setSavingsNasabahOptions([])
      setIsSavingsModalOpen(true)
    }
  }, [authFetch])

  const openWithdrawalModal = useCallback(async () => {
    setWithdrawalError('')
    setWithdrawalSuccess('')
    setWithdrawalSubmitting(false)
    setWithdrawalNasabahId('')
    setWithdrawalNasabahSearch('')
    setWithdrawalRekeningId('')
    setWithdrawalRekeningOptions([])
    setWithdrawalAmount('')
    setWithdrawalMethod('CASH')
    setWithdrawalNote('')

    try {
      const res = await authFetch('/api/nasabah')
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || 'Gagal mengambil data nasabah')
      }

      const rows = toArray(json?.data ?? json)
      const nasabahList = rows
        .filter((item) => item?.id !== undefined && item?.id !== null)
        .map((item) => toNasabahOption(item))

      const checks = await Promise.all(
        nasabahList.map(async (nasabah) => {
          try {
            const rekeningRes = await authFetch(`/api/simpanan/nasabah/${nasabah.id}`)
            const rekeningJson = await rekeningRes.json().catch(() => null)
            if (!rekeningRes.ok) return null

            const rekeningRows = toArray(rekeningJson?.data ?? rekeningJson)
            return rekeningRows.length > 0 ? nasabah : null
          } catch {
            return null
          }
        })
      )

      const options = checks.filter(Boolean)

      setWithdrawalNasabahOptions(options)
      setIsWithdrawalModalOpen(true)
    } catch (err) {
      setWithdrawalError(err?.message || 'Terjadi kesalahan saat memuat anggota dengan simpanan')
      setWithdrawalNasabahOptions([])
      setIsWithdrawalModalOpen(true)
    }
  }, [authFetch])

  const handleAddMenuItemClick = useCallback((item) => {
    setActiveMenuItem(item)
    setAddMenuOpen(false)

    if (item === 'Setoran') {
      openSavingsModal()
      return
    }
    if (item === 'Pencairan') {
      openLoanModal()
      return
    }
    if (item === 'Angsuran') {
      openInstallmentModal()
      return
    }
    if (item === 'Penarikan') {
      openWithdrawalModal()
    }
  }, [openInstallmentModal, openLoanModal, openSavingsModal, openWithdrawalModal])

  const submitLoan = useCallback(async () => {
    const nasabahId = Number(loanNasabahId)
    const jumlahPinjaman = Number(loanAmount)
    const tenorBulan = Number(loanTenor)

    if (!Number.isInteger(nasabahId) || nasabahId <= 0) {
      setLoanError('Pilih anggota aktif terlebih dahulu.')
      return
    }
    if (!Number.isFinite(jumlahPinjaman) || jumlahPinjaman <= 0) {
      setLoanError('Jumlah pencairan harus lebih besar dari 0.')
      return
    }
    if (!Number.isInteger(tenorBulan) || ![3, 6, 12].includes(tenorBulan)) {
      setLoanError('Tenor bulan hanya bisa 3, 6, atau 12.')
      return
    }

    setLoanSubmitting(true)
    setLoanError('')

    try {
      const res = await authFetch('/api/pinjaman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nasabahId, jumlahPinjaman, tenorBulan }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || 'Gagal menambahkan pencairan')
      }

      setLoanSuccess(json?.message || 'Pengajuan pencairan berhasil dibuat')
      setIsLoanModalOpen(false)
      await fetchAllTransactions()
      await fetchPendingVerificationCount()
    } catch (err) {
      setLoanError(err?.message || 'Terjadi kesalahan saat membuat pencairan')
    } finally {
      setLoanSubmitting(false)
    }
  }, [authFetch, loanNasabahId, loanAmount, loanTenor, fetchAllTransactions, fetchPendingVerificationCount])

  const submitInstallment = useCallback(async () => {
    const pinjamanId = Number(installmentPinjamanId)
    const nominal = Number(installmentAmount)

    if (!Number.isInteger(pinjamanId) || pinjamanId <= 0) {
      setInstallmentError('Pilih pencairan terlebih dahulu.')
      return
    }
    if (!Number.isFinite(nominal) || nominal <= 0) {
      setInstallmentError('Nominal angsuran harus lebih besar dari 0.')
      return
    }

    setInstallmentSubmitting(true)
    setInstallmentError('')

    try {
      const res = await authFetch(`/api/pinjaman/${pinjamanId}/angsuran`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nominal,
          metodePembayaran: installmentMethod,
          catatan: installmentNote.trim(),
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || 'Gagal menambahkan angsuran')
      }

      setInstallmentSuccess(json?.message || 'Transaksi berhasil diproses')
      setIsInstallmentModalOpen(false)
      await fetchAllTransactions()
    } catch (err) {
      setInstallmentError(err?.message || 'Terjadi kesalahan saat membuat angsuran')
    } finally {
      setInstallmentSubmitting(false)
    }
  }, [
    authFetch,
    installmentPinjamanId,
    installmentAmount,
    installmentMethod,
    installmentNote,
    fetchAllTransactions,
  ])

  useEffect(() => {
    if (!isSavingsModalOpen || !savingsNasabahId) {
      setSavingsRekeningOptions([])
      setSavingsRekeningId('')
      return
    }

    let isCancelled = false

    const loadRekeningByNasabah = async () => {
      setSavingsLoadingRekening(true)
      setSavingsError('')

      try {
        const res = await authFetch(`/api/simpanan/nasabah/${savingsNasabahId}`)
        const json = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(json?.message || 'Gagal mengambil rekening setoran anggota')
        }

        const rows = toArray(json?.data ?? json)
        const options = rows
          .filter((item) => item?.id !== undefined && item?.id !== null)
          .map((item) => ({
            id: Number(item.id),
            jenisSimpanan: String(item?.jenisSimpanan || '-'),
            saldoBerjalan: Number(item?.saldoBerjalan ?? 0),
            label: `${String(item?.jenisSimpanan || '-')}`,
          }))
          .sort((a, b) => Number(b.id) - Number(a.id))

        if (isCancelled) return

        setSavingsRekeningOptions(options)
        setSavingsRekeningId(options.length > 0 ? String(options[0].id) : '')
      } catch (err) {
        if (isCancelled) return
        setSavingsError(err?.message || 'Terjadi kesalahan saat mengambil rekening setoran')
        setSavingsRekeningOptions([])
        setSavingsRekeningId('')
      } finally {
        if (!isCancelled) setSavingsLoadingRekening(false)
      }
    }

    loadRekeningByNasabah()

    return () => {
      isCancelled = true
    }
  }, [authFetch, isSavingsModalOpen, savingsNasabahId])

  const submitSavings = useCallback(async () => {
    const rekeningId = Number(savingsRekeningId)
    const nominal = Number(savingsAmount)

    if (!Number.isInteger(rekeningId) || rekeningId <= 0) {
      setSavingsError('Pilih rekening setoran terlebih dahulu.')
      return
    }
    if (!Number.isFinite(nominal) || nominal <= 0) {
      setSavingsError('Nominal setoran harus lebih besar dari 0.')
      return
    }

    setSavingsSubmitting(true)
    setSavingsError('')

    try {
      const res = await authFetch(`/api/simpanan/rekening/${rekeningId}/setoran`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nominal,
          metodePembayaran: savingsMethod,
          catatan: savingsNote.trim(),
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || 'Gagal menambahkan setoran')
      }

      setSavingsSuccess(json?.message || 'Transaksi berhasil diproses')
      setIsSavingsModalOpen(false)
      await fetchAllTransactions()
    } catch (err) {
      setSavingsError(err?.message || 'Terjadi kesalahan saat membuat setoran')
    } finally {
      setSavingsSubmitting(false)
    }
  }, [authFetch, savingsRekeningId, savingsAmount, savingsMethod, savingsNote, fetchAllTransactions])

  useEffect(() => {
    if (!isWithdrawalModalOpen || !withdrawalNasabahId) {
      setWithdrawalRekeningOptions([])
      setWithdrawalRekeningId('')
      return
    }

    let isCancelled = false

    const loadRekeningByNasabah = async () => {
      setWithdrawalLoadingRekening(true)
      setWithdrawalError('')

      try {
        const res = await authFetch(`/api/simpanan/nasabah/${withdrawalNasabahId}`)
        const json = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(json?.message || 'Gagal mengambil rekening setoran anggota')
        }

        const rows = toArray(json?.data ?? json)
        const options = rows
          .filter((item) => item?.id !== undefined && item?.id !== null)
          .map((item) => ({
            id: Number(item.id),
            jenisSimpanan: String(item?.jenisSimpanan || '-'),
            saldoBerjalan: Number(item?.saldoBerjalan ?? 0),
            label: `${String(item?.jenisSimpanan || '-')}`,
          }))
          .filter((item) => {
            if (!selectedWithdrawalNasabah?.isActive) return true
            const jenis = String(item?.jenisSimpanan || '').toUpperCase()
            return jenis === 'SUKARELA'
          })
          .sort((a, b) => Number(b.id) - Number(a.id))

        if (isCancelled) return

        setWithdrawalRekeningOptions(options)
        setWithdrawalRekeningId(options.length > 0 ? String(options[0].id) : '')
        if (selectedWithdrawalNasabah?.isActive && options.length === 0) {
          setWithdrawalError('Untuk anggota aktif, penarikan hanya bisa dari simpanan sukarela.')
        }
      } catch (err) {
        if (isCancelled) return
        setWithdrawalError(err?.message || 'Terjadi kesalahan saat mengambil rekening setoran')
        setWithdrawalRekeningOptions([])
        setWithdrawalRekeningId('')
      } finally {
        if (!isCancelled) setWithdrawalLoadingRekening(false)
      }
    }

    loadRekeningByNasabah()

    return () => {
      isCancelled = true
    }
  }, [authFetch, isWithdrawalModalOpen, withdrawalNasabahId, selectedWithdrawalNasabah?.isActive])

  const submitWithdrawal = useCallback(async () => {
    const rekeningId = Number(withdrawalRekeningId)
    const nominal = Number(withdrawalAmount)
    const selectedJenis = String(selectedWithdrawalRekening?.jenisSimpanan || '').toUpperCase()
    const isNonSukarelaType = selectedJenis !== 'SUKARELA'

    if (!Number.isInteger(rekeningId) || rekeningId <= 0) {
      setWithdrawalError('Pilih rekening setoran terlebih dahulu.')
      return
    }
    if (selectedWithdrawalNasabah?.isActive && isNonSukarelaType) {
      setWithdrawalError('Anggota aktif hanya dapat melakukan penarikan simpanan sukarela.')
      return
    }
    if (!Number.isFinite(nominal) || nominal <= 0) {
      setWithdrawalError('Nominal penarikan harus lebih besar dari 0.')
      return
    }

    setWithdrawalSubmitting(true)
    setWithdrawalError('')

    try {
      const res = await authFetch(`/api/simpanan/rekening/${rekeningId}/penarikan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nominal,
          metodePembayaran: withdrawalMethod,
          catatan: withdrawalNote.trim(),
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.message || 'Gagal menambahkan penarikan')
      }

      setWithdrawalSuccess(json?.message || 'Transaksi berhasil diproses')
      setIsWithdrawalModalOpen(false)
      await fetchAllTransactions()
    } catch (err) {
      setWithdrawalError(err?.message || 'Terjadi kesalahan saat membuat penarikan')
    } finally {
      setWithdrawalSubmitting(false)
    }
  }, [
    authFetch,
    withdrawalRekeningId,
    selectedWithdrawalRekening?.jenisSimpanan,
    selectedWithdrawalNasabah?.isActive,
    withdrawalAmount,
    withdrawalMethod,
    withdrawalNote,
    fetchAllTransactions,
  ])

  // ─────────────────────────────────────────────────────────────────────────
  // Filter modal helpers
  // ─────────────────────────────────────────────────────────────────────────
  const openFilterModal = useCallback(() => {
    setDraftTypeFilter(typeFilter)
    setDraftMethodFilter(methodFilter)
    setDraftSpecificDate(filterSpecificDate)
    setDraftDateFrom(filterDateFrom)
    setDraftDateTo(filterDateTo)
    setFilterError('')
    setIsFilterModalOpen(true)
  }, [typeFilter, methodFilter, filterSpecificDate, filterDateFrom, filterDateTo])

  const applyFilterModal = useCallback(() => {
    if (!draftSpecificDate && draftDateFrom && draftDateTo && draftDateFrom > draftDateTo) {
      setFilterError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.')
      return
    }
    setTypeFilter(draftTypeFilter)
    setMethodFilter(draftMethodFilter)
    setFilterSpecificDate(draftSpecificDate)
    if (draftSpecificDate) {
      setFilterDateFrom('')
      setFilterDateTo('')
    } else {
      setFilterDateFrom(draftDateFrom)
      setFilterDateTo(draftDateTo)
    }
    setPageIndex(1)
    setFilterError('')
    setIsFilterModalOpen(false)
  }, [draftTypeFilter, draftMethodFilter, draftSpecificDate, draftDateFrom, draftDateTo])

  const resetFilterModal = useCallback(() => {
    setDraftTypeFilter('ALL')
    setDraftMethodFilter('ALL')
    setDraftSpecificDate('')
    setDraftDateFrom('')
    setDraftDateTo('')
    setFilterError('')
  }, [])

  const handleDateFromChange = useCallback((value) => {
    setDraftDateFrom(value)
    if (value) setDraftSpecificDate('')
  }, [])

  const handleDateToChange = useCallback((value) => {
    setDraftDateTo(value)
    if (value) setDraftSpecificDate('')
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Filtering
  // ─────────────────────────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    const sourceRows = transactions
    const keyword = search.trim().toLowerCase()

    return sourceRows.filter((tx) => {
      const txType = normalizeTransactionType(tx?.jenisTransaksi)
      if (typeFilter !== 'ALL' && txType !== typeFilter) return false

      const txMethod = String(tx?.metodePembayaran || '').toUpperCase()
      if (methodFilter !== 'ALL' && txMethod !== methodFilter) return false

      if (!keyword) return true
      const haystack = [
        resolveNasabahName(tx),
        resolvePegawaiName(tx),
        mapMethodLabel(tx?.metodePembayaran),
      ]
        .map((item) => String(item ?? '').toLowerCase())
        .join(' ')

      return haystack.includes(keyword)
    })
  }, [
    transactions,
    search,
    typeFilter,
    methodFilter,
  ])

  useEffect(() => {
    setPageIndex(1)
  }, [search, typeFilter, methodFilter, filterSpecificDate, filterDateFrom, filterDateTo])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTransactions.length / PAGE_LIMIT)),
    [filteredTransactions.length]
  )

  const paginatedTransactions = useMemo(() => {
    const start = (pageIndex - 1) * PAGE_LIMIT
    const end = start + PAGE_LIMIT
    return filteredTransactions.slice(start, end)
  }, [filteredTransactions, pageIndex])

  const summary = useMemo(() => computeSummary(filteredTransactions), [filteredTransactions])

  const hasActiveFilter =
    typeFilter !== 'ALL' ||
    methodFilter !== 'ALL' ||
    Boolean(filterSpecificDate) ||
    Boolean(filterDateFrom) ||
    Boolean(filterDateTo)

  const summaryCards = useMemo(
    () => [
      { title: 'Transaksi Masuk', value: formatCurrency(summary.incoming), color: 'text-emerald-700', icon: TrendingUp },
      { title: 'Transaksi Keluar', value: formatCurrency(summary.outgoing), color: 'text-rose-600', icon: TrendingDown },
      { title: 'Menunggu Verifikasi', value: `${pendingVerificationCount} Transaksi`, color: 'text-[#1967D2]', icon: CheckCircle2 },
    ],
    [summary.incoming, summary.outgoing, pendingVerificationCount]
  )
  useEffect(() => {
    if (!error) return
    toast.error(error)
    setError('')
  }, [error, toast])

  useEffect(() => {
    if (!actionSuccess) return
    toast.success(actionSuccess)
    setActionSuccess('')
  }, [actionSuccess, toast])

  useEffect(() => {
    if (!loanSuccess) return
    toast.success(loanSuccess)
    setLoanSuccess('')
  }, [loanSuccess, toast])

  useEffect(() => {
    if (!installmentSuccess) return
    toast.success(installmentSuccess)
    setInstallmentSuccess('')
  }, [installmentSuccess, toast])

  useEffect(() => {
    if (!savingsSuccess) return
    toast.success(savingsSuccess)
    setSavingsSuccess('')
  }, [savingsSuccess, toast])

  useEffect(() => {
    if (!withdrawalSuccess) return
    toast.success(withdrawalSuccess)
    setWithdrawalSuccess('')
  }, [withdrawalSuccess, toast])

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-[#111827]">Transaksi</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Icon className="h-4 w-4" />
                <span>{card.title}</span>
              </div>
              <p className={`text-[36px] font-semibold leading-none tracking-tight ${card.color}`}>{card.value}</p>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        {/* Toolbar */}
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:max-w-md">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-10 pl-9"
                placeholder="Cari anggota, pegawai, metode"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className={`h-10 w-10 border-slate-200 ${hasActiveFilter ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : ''}`}
              onClick={openFilterModal}
              title="Filter"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full border-slate-200 text-slate-700 hover:bg-slate-50 sm:w-auto"
              onClick={() => onNavigate?.('verifikasi-pinjaman')}
            >
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              Verifikasi Pinjaman
            </Button>

            <div className="relative" ref={addMenuRef}>
              <Button
                className="h-10 w-full bg-[#003399] px-4 text-white hover:bg-[#002b84] sm:w-auto"
                onClick={() => setAddMenuOpen((prev) => !prev)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                tambah transaksi
              </Button>

              {addMenuOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-[300px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  {addMenuItems.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleAddMenuItemClick(item)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-slate-800 hover:bg-slate-100 ${activeMenuItem === item ? 'bg-slate-100' : ''}`}
                    >
                      <Wallet className="h-5 w-5 shrink-0 text-slate-700" />
                      <span className="text-[15px] leading-none tracking-tight">{item}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    Jenis <ArrowDownUp className="h-3 w-3" />
                  </span>
                </th>
                <th className="px-3 py-2">Anggota</th>
                <th className="px-3 py-2">Pegawai</th>
                <th className="px-3 py-2">Nominal</th>
                <th className="px-3 py-2">Metode</th>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">Memuat data transaksi...</td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">Tidak ada data transaksi.</td>
                </tr>
              ) : (
                paginatedTransactions.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 text-slate-700">
                    <td className="px-3 py-3 align-top">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${flowBadgeClass(row.jenisTransaksi)}`}>
                        {mapTypeLabel(row.jenisTransaksi)}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top font-medium text-slate-700">{resolveNasabahName(row)}</td>
                    <td className="px-3 py-3 align-top font-medium text-slate-700">{resolvePegawaiName(row)}</td>
                    <td className="px-3 py-3 align-top font-medium text-slate-700">{formatCurrency(row.nominal)}</td>
                    <td className="px-3 py-3 align-top text-slate-500">{mapMethodLabel(row.metodePembayaran)}</td>
                    <td className="px-3 py-3 align-top text-slate-500">{formatDate(row.tanggal)}</td>
                    <td className="px-3 py-3 align-top text-right">
                      <div className="relative inline-flex" data-transaction-action-zone="true">
                        <button
                          type="button"
                          data-transaction-action-zone="true"
                          className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                          onClick={() => setActionMenuOpenId((prev) => (prev === String(row.id) ? '' : String(row.id)))}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {actionMenuOpenId === String(row.id) && (
                          <div
                            data-transaction-action-zone="true"
                            className="absolute right-0 top-[calc(100%+6px)] z-20 w-40 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
                          >
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                              onClick={() => openDetailModal(row)}
                            >
                              <Eye className="h-4 w-4" />
                              Detail
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                              onClick={() => openDeleteModal(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 lg:hidden">
          {loading ? (
            <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500">Memuat data transaksi...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500">Tidak ada data transaksi.</div>
          ) : (
            paginatedTransactions.map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{mapTypeLabel(row.jenisTransaksi)}</p>
                    <p className="text-xs text-slate-500">Transaksi #{row?.id ?? '-'}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${flowBadgeClass(row.jenisTransaksi)}`}>
                    {mapTypeLabel(row.jenisTransaksi)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <p>Anggota: {resolveNasabahName(row)}</p>
                  <p className="text-right">Pegawai: {resolvePegawaiName(row)}</p>
                  <p>Tanggal: {formatDate(row.tanggal)}</p>
                  <p className="text-right">Metode: {mapMethodLabel(row.metodePembayaran)}</p>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="text-right">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusMeta(row).className}`}>
                      {getStatusMeta(row).label}
                    </span>
                  </p>
                  <p className="col-span-2 text-right text-sm font-semibold text-slate-700">{formatCurrency(row.nominal)}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 text-xs font-semibold"
                    onClick={() => openDetailModal(row)}
                  >
                    <Eye className="mr-1.5 h-4 w-4" />
                    Detail
                  </Button>
                  <Button
                    type="button"
                    className="h-9 bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700"
                    onClick={() => openDeleteModal(row)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Hapus
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination row */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Halaman <span className="font-semibold text-gray-700">{pageIndex}</span>
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 px-3 text-xs"
              onClick={goToPrevPage}
              disabled={loading || pageIndex <= 1}
            >
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 px-3 text-xs"
              onClick={goToNextPage}
              disabled={loading || pageIndex >= totalPages}
            >
              Berikutnya
            </Button>
          </div>
        </div>

      </div>

      {isDetailModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[10000] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={closeDetailModal}
        >
          <div
            className="relative z-[10001] w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Detail Transaksi</h2>
              </div>
              <button
                type="button"
                aria-label="Tutup detail transaksi"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={closeDetailModal}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 sm:px-6 py-5 overflow-y-auto space-y-5">
              {detailLoading ? (
                <div className="py-16 flex items-center justify-center gap-2 text-gray-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memuat detail transaksi...</span>
                </div>
              ) : detailError ? (
                <div className="py-8">
                  <p className="text-sm text-rose-600">{detailError}</p>
                </div>
              ) : detailData ? (
                <>
                  <div className="rounded-xl border border-gray-200 p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Jenis Transaksi</p>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight break-words">{mapTypeLabel(detailData?.jenisTransaksi)}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900">Data Transaksi</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">ID Transaksi</span>
                        <span className="text-gray-900 text-right font-medium">{detailData?.id ?? '-'}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Jenis</span>
                        <span className="text-gray-900 text-right font-medium">{mapTypeLabel(detailData?.jenisTransaksi)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Nominal</span>
                        <span className="text-gray-900 text-right font-medium">{formatCurrency(detailData?.nominal)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Tanggal</span>
                        <span className="text-gray-900 text-right font-medium">{formatDate(detailData?.tanggal)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Metode Pembayaran</span>
                        <span className="text-gray-900 text-right font-medium">{mapMethodLabel(detailData?.metodePembayaran)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Catatan</span>
                        <span className="text-gray-900 text-right font-medium">{detailData?.catatan || '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900">Data Anggota</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Nama</span>
                          <span className="text-gray-900 text-right font-medium">{detailData?.nasabah?.nama || '-'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Nomor Anggota</span>
                          <span className="text-gray-900 text-right font-medium">{detailData?.nasabah?.nomorAnggota || '-'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Pekerjaan</span>
                          <span className="text-gray-900 text-right font-medium">{detailData?.nasabah?.pekerjaan || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900">Data Pegawai</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Nama</span>
                          <span className="text-gray-900 text-right font-medium">{detailData?.pegawai?.nama || '-'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500">Jabatan</span>
                          <span className="text-gray-900 text-right font-medium">{detailData?.pegawai?.jabatan || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </>
              ) : (
                <div className="py-8 text-sm text-gray-500">Detail transaksi tidak tersedia.</div>
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

      {Boolean(deleteTarget) && createPortal(
        <div
          className="fixed inset-0 z-[10002] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={closeDeleteModal}
        >
          <div
            className="relative z-[10003] w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Hapus Transaksi</h2>
              <button
                type="button"
                aria-label="Tutup modal hapus transaksi"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={closeDeleteModal}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 sm:px-6 py-5 space-y-3 text-sm">
              <p className="text-gray-700">Apakah Anda yakin ingin menghapus transaksi ini?</p>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-1 text-gray-700">
                <p><span className="text-gray-500">ID:</span> {deleteTarget?.id ?? '-'}</p>
                <p><span className="text-gray-500">Jenis:</span> {deleteTarget?.typeLabel || '-'}</p>
                <p><span className="text-gray-500">Anggota:</span> {deleteTarget?.nasabahName || '-'}</p>
                <p><span className="text-gray-500">Nominal:</span> {formatCurrency(deleteTarget?.nominal)}</p>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1"
                onClick={closeDeleteModal}
                disabled={deleteSubmitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                className="h-10 flex-1 bg-rose-600 text-white hover:bg-rose-700"
                onClick={confirmDeleteTransaction}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Filter modal */}
      {isFilterModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9998] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => { setIsFilterModalOpen(false); setFilterError('') }}
        >
          <div
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white border border-slate-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Filter Transaksi</h2>
                <p className="text-xs text-slate-500">Pilih jenis transaksi dan rentang tanggal</p>
              </div>
              <button
                type="button"
                aria-label="Tutup filter"
                className="rounded-md p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                onClick={() => { setIsFilterModalOpen(false); setFilterError('') }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Jenis Transaksi</label>
                <select
                  value={draftTypeFilter}
                  onChange={(e) => setDraftTypeFilter(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {TRANSACTION_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Dari Tanggal</label>
                  <Input
                    type="date"
                    value={draftDateFrom}
                    onChange={(e) => handleDateFromChange(e.target.value)}
                    className="h-10"
                    disabled={Boolean(draftSpecificDate)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Sampai Tanggal</label>
                  <Input
                    type="date"
                    value={draftDateTo}
                    onChange={(e) => handleDateToChange(e.target.value)}
                    className="h-10"
                    disabled={Boolean(draftSpecificDate)}
                  />
                </div>
              </div>

              {filterError && <p className="text-sm text-rose-600">{filterError}</p>}
            </div>

            <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 border-slate-200"
                onClick={resetFilterModal}
              >
                Reset
              </Button>
              <Button
                type="button"
                className="h-10 flex-1 bg-[#003399] hover:bg-[#002b84] text-white"
                onClick={applyFilterModal}
              >
                Terapkan
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Loan modal */}
      {isLoanModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={closeLoanModal}
        >
          <div
            className="w-full rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-w-md sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Tambah Pencairan</h2>
              </div>
              <button
                type="button"
                aria-label="Tutup tambah pencairan"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={closeLoanModal}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Anggota Aktif</label>
                <Input
                  type="text"
                  value={loanNasabahSearch}
                  onChange={(e) => setLoanNasabahSearch(e.target.value)}
                  className="h-10"
                  placeholder="Cari nama anggota..."
                />
                <select
                  value={loanNasabahId}
                  onChange={(e) => setLoanNasabahId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih anggota</option>
                  {displayedNasabahOptions.map((item) => (
                    <option key={item.id} value={String(item.id)}>{item.name}</option>
                  ))}
                </select>
                {displayedNasabahOptions.length === 0 && (
                  <p className="text-xs text-slate-500">Tidak ada anggota aktif yang cocok dengan pencarian.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Jumlah Pencairan</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  className="h-10"
                  placeholder="Contoh: 10000000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Tenor (Bulan)</label>
                <select
                  value={loanTenor}
                  onChange={(e) => setLoanTenor(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[3, 6, 12].map((month) => (
                    <option key={month} value={String(month)}>{month} Bulan</option>
                  ))}
                </select>
              </div>

              {loanError && (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{loanError}</p>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 border-slate-200"
                onClick={closeLoanModal}
                disabled={loanSubmitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                className="h-10 flex-1 bg-[#003399] text-white hover:bg-[#002b84]"
                onClick={submitLoan}
                disabled={loanSubmitting}
              >
                {loanSubmitting ? 'Menyimpan...' : 'Simpan Pencairan'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Installment modal */}
      {isInstallmentModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={closeInstallmentModal}
        >
          <div
            className="w-full rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-w-md sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Tambah Angsuran</h2>
              </div>
              <button
                type="button"
                aria-label="Tutup tambah angsuran"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={closeInstallmentModal}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Anggota</label>
                <Input
                  type="text"
                  value={installmentLoanSearch}
                  onChange={(e) => setInstallmentLoanSearch(e.target.value)}
                  className="h-10"
                  placeholder="Cari anggota yang punya pinjaman..."
                />
                <select
                  value={installmentNasabahId}
                  onChange={(e) => {
                    setInstallmentNasabahId(e.target.value)
                    setInstallmentPinjamanId('')
                  }}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih anggota</option>
                  {displayedInstallmentNasabahOptions.map((item) => (
                    <option key={item.id} value={String(item.id)}>{item.name}</option>
                  ))}
                </select>
                {displayedInstallmentNasabahOptions.length === 0 && (
                  <p className="text-xs text-slate-500">Tidak ada anggota yang memiliki pinjaman.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Pencairan Anggota</label>
                <select
                  value={installmentPinjamanId}
                  onChange={(e) => setInstallmentPinjamanId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!installmentNasabahId}
                >
                  <option value="">Pilih pinjaman</option>
                  {displayedInstallmentLoanOptions.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.label} - Sisa {formatCurrency(item.sisaPinjaman)}
                    </option>
                  ))}
                </select>
                {installmentNasabahId && displayedInstallmentLoanOptions.length === 0 && (
                  <p className="text-xs text-slate-500">Anggota ini belum memiliki pinjaman yang bisa diangsur.</p>
                )}
                {selectedInstallmentLoan && (
                  <div className="space-y-1 text-xs text-slate-600">
                    <p>
                      Pencairan dipilih milik: <span className="font-semibold text-slate-800">{selectedInstallmentLoan.nasabahName}</span>
                    </p>
                    <p>
                      Nominal pencairan: <span className="font-semibold text-slate-800">{formatCurrency(selectedInstallmentLoan.jumlahPinjaman)}</span>
                    </p>
                    <p>
                      Sisa pencairan: <span className="font-semibold text-slate-800">{formatCurrency(selectedInstallmentLoan.sisaPinjaman)}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nominal Angsuran</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value)}
                  className="h-10"
                  placeholder="Contoh: 300000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Metode Pembayaran</label>
                <select
                  value={installmentMethod}
                  onChange={(e) => setInstallmentMethod(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Tunai</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Catatan</label>
                <textarea
                  value={installmentNote}
                  onChange={(e) => setInstallmentNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Pembayaran angsuran bulan 1"
                />
              </div>

              {installmentError && (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{installmentError}</p>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 border-slate-200"
                onClick={closeInstallmentModal}
                disabled={installmentSubmitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                className="h-10 flex-1 bg-[#003399] text-white hover:bg-[#002b84]"
                onClick={submitInstallment}
                disabled={installmentSubmitting}
              >
                {installmentSubmitting ? 'Menyimpan...' : 'Simpan Angsuran'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Savings modal */}
      {isSavingsModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={closeSavingsModal}
        >
          <div
            className="w-full rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-w-md sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Tambah Setoran</h2>
              </div>
              <button
                type="button"
                aria-label="Tutup tambah setoran"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={closeSavingsModal}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Anggota Aktif</label>
                <Input
                  type="text"
                  value={savingsNasabahSearch}
                  onChange={(e) => setSavingsNasabahSearch(e.target.value)}
                  className="h-10"
                  placeholder="Cari nama anggota..."
                />
                <select
                  value={savingsNasabahId}
                  onChange={(e) => setSavingsNasabahId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih anggota</option>
                  {displayedSavingsNasabahOptions.map((item) => (
                    <option key={item.id} value={String(item.id)}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Rekening Setoran</label>
                <select
                  value={savingsRekeningId}
                  onChange={(e) => setSavingsRekeningId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!savingsNasabahId || savingsLoadingRekening}
                >
                  <option value="">{savingsLoadingRekening ? 'Memuat rekening...' : 'Pilih rekening setoran'}</option>
                  {savingsRekeningOptions.map((item) => (
                    <option key={item.id} value={String(item.id)}>{item.label}</option>
                  ))}
                </select>
                {selectedSavingsRekening && (
                  <p className="text-xs text-slate-600">
                    Jenis: <span className="font-semibold text-slate-800">{selectedSavingsRekening.jenisSimpanan}</span>
                    {' | '}
                    Saldo berjalan: <span className="font-semibold text-slate-800">{formatCurrency(selectedSavingsRekening.saldoBerjalan)}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nominal Setoran</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={savingsAmount}
                  onChange={(e) => setSavingsAmount(e.target.value)}
                  className="h-10"
                  placeholder="Contoh: 200000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Metode Pembayaran</label>
                <select
                  value={savingsMethod}
                  onChange={(e) => setSavingsMethod(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Tunai</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Catatan</label>
                <textarea
                  value={savingsNote}
                  onChange={(e) => setSavingsNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Setoran rutin wajib"
                />
              </div>

              {savingsError && (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{savingsError}</p>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 border-slate-200"
                onClick={closeSavingsModal}
                disabled={savingsSubmitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                className="h-10 flex-1 bg-[#003399] text-white hover:bg-[#002b84]"
                onClick={submitSavings}
                disabled={savingsSubmitting}
              >
                {savingsSubmitting ? 'Menyimpan...' : 'Simpan Setoran'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Withdrawal modal */}
      {isWithdrawalModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={closeWithdrawalModal}
        >
          <div
            className="w-full rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:max-w-md sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Tambah Penarikan</h2>
              </div>
              <button
                type="button"
                aria-label="Tutup tambah penarikan"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={closeWithdrawalModal}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Anggota Aktif Dan Tidak Aktif</label>
                <Input
                  type="text"
                  value={withdrawalNasabahSearch}
                  onChange={(e) => setWithdrawalNasabahSearch(e.target.value)}
                  className="h-10"
                  placeholder="Cari nama anggota..."
                />
                <select
                  value={withdrawalNasabahId}
                  onChange={(e) => setWithdrawalNasabahId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih anggota</option>
                  {displayedWithdrawalNasabahOptions.map((item) => (
                    <option key={item.id} value={String(item.id)}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Rekening Setoran</label>
                <select
                  value={withdrawalRekeningId}
                  onChange={(e) => setWithdrawalRekeningId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!withdrawalNasabahId || withdrawalLoadingRekening}
                >
                  <option value="">{withdrawalLoadingRekening ? 'Memuat rekening...' : 'Pilih rekening setoran'}</option>
                  {withdrawalRekeningOptions.map((item) => (
                    <option key={item.id} value={String(item.id)}>{item.label}</option>
                  ))}
                </select>
                {selectedWithdrawalRekening && (
                  <p className="text-xs text-slate-600">
                    Jenis: <span className="font-semibold text-slate-800">{selectedWithdrawalRekening.jenisSimpanan}</span>
                    {' | '}
                    Saldo berjalan: <span className="font-semibold text-slate-800">{formatCurrency(selectedWithdrawalRekening.saldoBerjalan)}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nominal Penarikan</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  className="h-10"
                  placeholder="Contoh: 100000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Metode Pembayaran</label>
                <select
                  value={withdrawalMethod}
                  onChange={(e) => setWithdrawalMethod(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Tunai</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Catatan</label>
                <textarea
                  value={withdrawalNote}
                  onChange={(e) => setWithdrawalNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Penarikan setoran anggota non aktif"
                />
              </div>

              {withdrawalError && (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{withdrawalError}</p>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 border-slate-200"
                onClick={closeWithdrawalModal}
                disabled={withdrawalSubmitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                className="h-10 flex-1 bg-[#003399] text-white hover:bg-[#002b84]"
                onClick={submitWithdrawal}
                disabled={withdrawalSubmitting}
              >
                {withdrawalSubmitting ? 'Menyimpan...' : 'Simpan Penarikan'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <Toast toasts={toast.toasts} remove={toast.remove} />
    </div>
  )
}