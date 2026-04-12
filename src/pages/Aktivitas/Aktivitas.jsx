import { useCallback, useEffect, useMemo, useState } from 'react'
import { Filter, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'

const ALL_DATA_LIMIT = 100

const ACTION_FILTER_OPTIONS = [
  { value: 'semua', label: 'Semua Aksi' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'LOGOUT', label: 'LOGOUT' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
]

function normalizeMessage(message, fallback) {
  if (Array.isArray(message)) return message.join(', ')
  if (typeof message === 'string' && message.trim()) return message
  return fallback
}

function formatJakartaDate(dateValue) {
  if (!dateValue) return '-'
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date) + ' WIB'
}

function getJakartaDateKey(dateValue) {
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value

  if (!year || !month || !day) return ''
  return `${year}-${month}-${day}`
}

function getActionClasses(action) {
  const label = String(action ?? '').toUpperCase()
  if (label === 'CREATE') return 'bg-emerald-100 text-emerald-700'
  if (label === 'UPDATE') return 'bg-amber-100 text-amber-700'
  if (label === 'LOGIN') return 'bg-blue-100 text-blue-700'
  if (label === 'LOGOUT') return 'bg-gray-200 text-gray-700'
  return 'bg-gray-100 text-gray-600'
}

function JsonPanel({ title, value }) {
  const output = value == null ? '-' : JSON.stringify(value, null, 2)

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <pre className="max-h-52 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap break-words">
        {output}
      </pre>
    </div>
  )
}

function ListLoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="hidden lg:block space-y-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={`row-${idx}`} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={`card-${idx}`} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

function DetailModal({ open, onClose, loading, error, detail }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-t-2xl bg-white shadow-xl border border-gray-100 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Detail Aktivitas</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-4 sm:px-5 max-h-[calc(90vh-78px)] overflow-auto">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-5 w-44 rounded bg-gray-100" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={`detail-meta-${idx}`} className="h-14 rounded-lg bg-gray-100" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="h-40 rounded-lg bg-gray-100" />
                <div className="h-40 rounded-lg bg-gray-100" />
              </div>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : !detail ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">Detail aktivitas tidak ditemukan.</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">ID</p>
                  <p className="mt-1 text-gray-800 break-all">{detail.id ?? '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Waktu</p>
                  <p className="mt-1 text-gray-800">{formatJakartaDate(detail.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Aksi</p>
                  <span className={`mt-1 inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${getActionClasses(detail.action)}`}>
                    {String(detail.action ?? '-').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Entitas</p>
                  <p className="mt-1 text-gray-800">{detail.entityName ?? '-'} {detail.entityId != null ? `#${detail.entityId}` : ''}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">User ID</p>
                  <p className="mt-1 text-gray-800">{detail.userId ?? '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">IP Address</p>
                  <p className="mt-1 text-gray-800 break-all">{detail.ipAddress ?? '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <JsonPanel title="Old Value" value={detail.oldValue} />
                <JsonPanel title="New Value" value={detail.newValue} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Aktivitas() {
  const { authFetch } = useAuth()
  const [auditTrails, setAuditTrails] = useState([])
  const [allAuditTrails, setAllAuditTrails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [actionFilter, setActionFilter] = useState('semua')
  const [selectedDate, setSelectedDate] = useState('')
  const [draftActionFilter, setDraftActionFilter] = useState('semua')
  const [draftSelectedDate, setDraftSelectedDate] = useState('')
  const [page, setPage] = useState(1)
  const [filteredPage, setFilteredPage] = useState(1)
  const [limit] = useState(20)
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  })

  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const fetchAuditTrails = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
      setError('')
    }

    try {
      const res = await authFetch(`/api/audit-trails?page=${page}&limit=${limit}`)
      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(normalizeMessage(json?.message, 'Gagal mengambil data audit trail'))
      }

      const rows = Array.isArray(json?.data) ? json.data : []
      const pg = json?.pagination ?? {}

      setAuditTrails(rows)
      setPagination({
        page: Number(pg.page) || page,
        totalPages: Number(pg.totalPages) || 1,
        total: Number(pg.total) || rows.length,
        hasNext: Boolean(pg.hasNext),
        hasPrev: Boolean(pg.hasPrev),
      })
    } catch (err) {
      if (!silent) {
        setError(err.message || 'Terjadi kesalahan saat mengambil data audit trail')
        setAuditTrails([])
        setPagination((prev) => ({ ...prev, total: 0, totalPages: 1, hasNext: false, hasPrev: false }))
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [authFetch, page, limit])

  const fetchAllAuditTrails = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
      setError('')
    }

    try {
      let currentPage = 1
      let hasNext = true
      let guard = 0
      const mergedRows = []

      while (hasNext && guard < 500) {
        const res = await authFetch(`/api/audit-trails?page=${currentPage}&limit=${ALL_DATA_LIMIT}`)
        const json = await res.json().catch(() => null)

        if (!res.ok) {
          throw new Error(normalizeMessage(json?.message, 'Gagal mengambil data audit trail'))
        }

        const rows = Array.isArray(json?.data) ? json.data : []
        mergedRows.push(...rows)

        hasNext = Boolean(json?.pagination?.hasNext)
        currentPage += 1
        guard += 1
      }

      const uniqueRows = Array.from(new Map(mergedRows.map((item) => [item?.id, item])).values())
      setAllAuditTrails(uniqueRows)
    } catch (err) {
      if (!silent) {
        setError(err.message || 'Terjadi kesalahan saat mengambil data audit trail')
        setAllAuditTrails([])
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [authFetch])

  const hasActiveSearch = search.trim().length > 0
  const isFilteredView = actionFilter !== 'semua' || Boolean(selectedDate) || hasActiveSearch

  const sourceRows = useMemo(() => {
    return isFilteredView ? allAuditTrails : auditTrails
  }, [isFilteredView, allAuditTrails, auditTrails])

  useEffect(() => {
    if (isFilteredView) {
      fetchAllAuditTrails()
      return
    }

    fetchAuditTrails()
  }, [isFilteredView, fetchAllAuditTrails, fetchAuditTrails])

  const openDetail = useCallback(async (id) => {
    setSelectedId(id)
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)

    try {
      const res = await authFetch(`/api/audit-trails/${id}`)
      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(normalizeMessage(json?.message, 'Gagal mengambil detail audit trail'))
      }

      setDetail(json?.data ?? null)
    } catch (err) {
      setDetailError(err.message || 'Terjadi kesalahan saat mengambil detail audit trail')
    } finally {
      setDetailLoading(false)
    }
  }, [authFetch])

  const closeDetail = () => {
    setSelectedId(null)
    setDetail(null)
    setDetailError('')
    setDetailLoading(false)
  }

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return sourceRows.filter((item) => {
      const actionValue = String(item?.action ?? '').toUpperCase()
      const dateKey = getJakartaDateKey(item?.createdAt)

      const matchAction = actionFilter === 'semua' || actionValue === actionFilter
      const matchDate = !selectedDate || dateKey === selectedDate

      const haystack = [
        item?.id,
        item?.entityName,
        item?.action,
        item?.user?.username,
        item?.user?.email,
        item?.ipAddress,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchSearch = !keyword || haystack.includes(keyword)

      return matchSearch && matchAction && matchDate
    })
  }, [sourceRows, search, actionFilter, selectedDate])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (actionFilter !== 'semua') count += 1
    if (selectedDate) count += 1
    return count
  }, [actionFilter, selectedDate])

  const filteredTotalPages = Math.max(1, Math.ceil(filteredRows.length / limit))
  const displayedPage = isFilteredView ? filteredPage : pagination.page
  const displayedTotalPages = isFilteredView ? filteredTotalPages : Math.max(1, pagination.totalPages)

  const paginatedRows = useMemo(() => {
    if (!isFilteredView) return filteredRows
    const start = (filteredPage - 1) * limit
    const end = start + limit
    return filteredRows.slice(start, end)
  }, [isFilteredView, filteredRows, filteredPage, limit])

  useEffect(() => {
    if (!isFilteredView) return
    setFilteredPage(1)
  }, [isFilteredView, actionFilter, selectedDate, search])

  useEffect(() => {
    if (!isFilteredView) return
    if (filteredPage > filteredTotalPages) {
      setFilteredPage(filteredTotalPages)
    }
  }, [isFilteredView, filteredPage, filteredTotalPages])

  const openFilterModal = () => {
    setDraftActionFilter(actionFilter)
    setDraftSelectedDate(selectedDate)
    setShowFilterModal(true)
  }

  const applyFilterModal = () => {
    setActionFilter(draftActionFilter)
    setSelectedDate(draftSelectedDate)
    setShowFilterModal(false)
  }

  const resetDraftFilters = () => {
    setDraftActionFilter('semua')
    setDraftSelectedDate('')
  }

  return (
    <div className="space-y-5">
      <DetailModal
        open={Boolean(selectedId)}
        onClose={closeDetail}
        loading={detailLoading}
        error={detailError}
        detail={detail}
      />

      {showFilterModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilterModal(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-t-2xl border border-gray-100 bg-white shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-base font-bold text-gray-900">Filter Aktivitas</h2>
                <p className="text-xs text-gray-500 mt-0.5">Atur filter tanggal dan aksi</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-4 sm:px-5 space-y-4 overflow-auto max-h-[calc(90vh-130px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Tanggal Aktivitas</label>
                  <Input
                    type="date"
                    value={draftSelectedDate}
                    onChange={(event) => setDraftSelectedDate(event.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Aksi</label>
                <select
                  value={draftActionFilter}
                  onChange={(event) => setDraftActionFilter(event.target.value)}
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:ring-offset-2"
                >
                  {ACTION_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-gray-100 px-4 py-4 sm:px-5">
              <Button
                type="button"
                variant="outline"
                onClick={resetDraftFilters}
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilterModal(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                className="bg-[#0066FF] text-white hover:bg-[#0052cc]"
                onClick={applyFilterModal}
              >
                Terapkan
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Aktivitas</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex w-full sm:max-w-xl items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari aksi, entitas, user, IP..."
                className="pl-9 h-10"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 px-3 shrink-0"
              onClick={openFilterModal}
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 ? (
                <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-[#0066FF] px-1.5 text-[11px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </div>
        </div>


        {loading ? (
          <ListLoadingSkeleton />
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : filteredRows.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-500">Tidak ada data aktivitas yang sesuai.</div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-3 font-semibold">Waktu</th>
                    <th className="px-3 py-3 font-semibold">Aksi</th>
                    <th className="px-3 py-3 font-semibold">Entitas</th>
                    <th className="px-3 py-3 font-semibold">Pengguna</th>
                    <th className="px-3 py-3 font-semibold">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 hover:bg-gray-50/70 cursor-pointer"
                      onClick={() => openDetail(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openDetail(item.id)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Lihat detail aktivitas ${item.id}`}
                    >
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{formatJakartaDate(item.createdAt)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${getActionClasses(item.action)}`}>
                          {String(item.action ?? '-').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-700">{item.entityName ?? '-'} {item.entityId != null ? `#${item.entityId}` : ''}</td>
                      <td className="px-3 py-3 text-gray-700">
                        <div className="font-medium">{item.user?.username ?? '-'}</div>
                        <div className="text-xs text-gray-500">{item.user?.email ?? '-'}</div>
                      </td>
                      <td className="px-3 py-3 text-gray-700 font-mono text-xs">{item.ipAddress ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {paginatedRows.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 p-4 space-y-3 cursor-pointer hover:border-gray-300"
                  onClick={() => openDetail(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openDetail(item.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Lihat detail aktivitas ${item.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.entityName ?? '-'} {item.entityId != null ? `#${item.entityId}` : ''}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatJakartaDate(item.createdAt)}</p>
                    </div>
                    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${getActionClasses(item.action)}`}>
                      {String(item.action ?? '-').toUpperCase()}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <p><span className="font-medium text-gray-700">User:</span> {item.user?.username ?? '-'} ({item.user?.email ?? '-'})</p>
                    <p><span className="font-medium text-gray-700">IP:</span> {item.ipAddress ?? '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500">
            Halaman <span className="font-semibold text-gray-700">{displayedPage}</span>
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (isFilteredView) {
                  setFilteredPage((prev) => Math.max(1, prev - 1))
                  return
                }
                setPage((prev) => Math.max(1, prev - 1))
              }}
              disabled={loading || (isFilteredView ? filteredPage <= 1 : !pagination.hasPrev)}
            >
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (isFilteredView) {
                  setFilteredPage((prev) => Math.min(filteredTotalPages, prev + 1))
                  return
                }
                setPage((prev) => prev + 1)
              }}
              disabled={loading || (isFilteredView ? filteredPage >= filteredTotalPages : !pagination.hasNext)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
