import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Settings, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

function getValueByPath(source, path) {
  if (!source || !path) return undefined
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), source)
}

function pickFirst(source, paths, fallback) {
  for (const path of paths) {
    const value = getValueByPath(source, path)
    if (value !== undefined && value !== null) return value
  }
  return fallback
}

function pickNumber(source, paths, fallback = 0) {
  const value = pickFirst(source, paths, fallback)
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function pickArray(source, paths) {
  const value = pickFirst(source, paths, [])
  return Array.isArray(value) ? value : []
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatCompactNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  if (Math.abs(number) >= 1000000000) return `${(number / 1000000000).toFixed(1)}B`
  if (Math.abs(number) >= 1000000) return `${(number / 1000000).toFixed(1)}Jt`
  if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(1)}Rb`
  return String(number)
}

function formatCompactCurrencyLabel(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  if (Math.abs(number) >= 1000000000) return `${(number / 1000000000).toFixed(1)}m`
  if (Math.abs(number) >= 1000000) return `${(number / 1000000).toFixed(0)}jt`
  if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(0)}rb`
  return `${Math.round(number)}`
}

function DashboardLineTooltip({ active, payload, valueFormatter }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-gray-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-1">
        {payload
          .filter((entry) => Number.isFinite(Number(entry?.value)))
          .map((entry) => (
            <div key={entry?.dataKey} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full border-2 bg-white"
                style={{ borderColor: entry.color }}
              />
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white"
                style={{ backgroundColor: entry.color }}
              >
                {valueFormatter(entry.value)}
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}

function resolveMonthIndex(value) {
  if (value === undefined || value === null) return null

  if (typeof value === 'number') {
    return value >= 1 && value <= 12 ? value : null
  }

  const text = String(value).trim()
  if (!text) return null

  if (/^\d{1,2}$/.test(text)) {
    const month = Number(text)
    return month >= 1 && month <= 12 ? month : null
  }

  const mmYyyy = text.match(/^(\d{1,2})[/-](\d{4})$/)
  if (mmYyyy) {
    const month = Number(mmYyyy[1])
    return month >= 1 && month <= 12 ? month : null
  }

  const yyyyMm = text.match(/^(\d{4})[/-](\d{1,2})(?:[/-]\d{1,2})?$/)
  if (yyyyMm) {
    const month = Number(yyyyMm[2])
    return month >= 1 && month <= 12 ? month : null
  }

  const monthAliases = {
    jan: 1,
    januari: 1,
    feb: 2,
    februari: 2,
    mar: 3,
    maret: 3,
    apr: 4,
    april: 4,
    mei: 5,
    may: 5,
    jun: 6,
    juni: 6,
    jul: 7,
    juli: 7,
    agu: 8,
    agt: 8,
    agustus: 8,
    aug: 8,
    sep: 9,
    sept: 9,
    september: 9,
    okt: 10,
    october: 10,
    oktober: 10,
    nov: 11,
    november: 11,
    des: 12,
    dec: 12,
    desember: 12,
    december: 12,
  }

  const lowered = text.toLowerCase()
  for (const [alias, month] of Object.entries(monthAliases)) {
    if (lowered.includes(alias)) return month
  }

  const parsedDate = new Date(text)
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.getMonth() + 1
  }

  return null
}

function resolvePeriodSortKey(value) {
  if (value === undefined || value === null) return null

  if (typeof value === 'number') {
    if (value >= 1 && value <= 12) {
      const currentYear = new Date().getFullYear()
      return currentYear * 100 + value
    }
    return null
  }

  const text = String(value).trim()
  if (!text) return null

  const mmYyyy = text.match(/^(\d{1,2})[/-](\d{4})$/)
  if (mmYyyy) {
    const month = Number(mmYyyy[1])
    const year = Number(mmYyyy[2])
    if (month >= 1 && month <= 12) return year * 100 + month
  }

  const yyyyMm = text.match(/^(\d{4})[/-](\d{1,2})(?:[/-]\d{1,2})?$/)
  if (yyyyMm) {
    const year = Number(yyyyMm[1])
    const month = Number(yyyyMm[2])
    if (month >= 1 && month <= 12) return year * 100 + month
  }

  const month = resolveMonthIndex(text)
  const yearMatch = text.match(/(19|20)\d{2}/)
  if (month && yearMatch) {
    return Number(yearMatch[0]) * 100 + month
  }

  return null
}

function StatCard({ title, value, subtitle, valueColor = 'text-[#0066FF]' }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="w-5 h-5 text-gray-500" />
        <span className="text-sm text-gray-500 font-medium">{title}</span>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">{subtitle}</p>
    </div>
  )
}

export default function Dashboard() {
  const { authFetch } = useAuth()
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 640px)').matches
  })
  const [dashboardData, setDashboardData] = useState(null)
  const [nasabahStats, setNasabahStats] = useState({
    total: 0,
    aktif: 0,
    pending: 0,
    ditolak: 0,
    nonaktif: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/dashboard')
      const json = await res.json()
      if (!res.ok) {
        const message = Array.isArray(json?.message) ? json.message.join(', ') : json?.message
        throw new Error(message || 'Gagal mengambil data beranda')
      }
      const normalizedDashboard = json?.data ?? json?.result ?? json ?? null
      setDashboardData(normalizedDashboard)

      const nasabahRes = await authFetch('/api/nasabah')
      const nasabahJson = await nasabahRes.json()
      if (!nasabahRes.ok) {
        const message = Array.isArray(nasabahJson?.message) ? nasabahJson.message.join(', ') : nasabahJson?.message
        throw new Error(message || 'Gagal mengambil data nasabah')
      }

      const nasabahData = nasabahJson?.data ?? nasabahJson?.result ?? nasabahJson
      const nasabahList = Array.isArray(nasabahData)
        ? nasabahData
        : (nasabahData?.items ?? nasabahData?.rows ?? nasabahData?.list ?? nasabahData?.nasabah ?? [])

      const stats = nasabahList.reduce((acc, item) => {
        const status = String(item.status ?? item.statusKeanggotaan ?? item.status_keanggotaan ?? '').toUpperCase()
        if (status === 'AKTIF') acc.aktif += 1
        else if (status === 'PENDING') acc.pending += 1
        else if (status === 'DITOLAK') acc.ditolak += 1
        else if (status === 'NONAKTIF') acc.nonaktif += 1
        return acc
      }, { aktif: 0, pending: 0, ditolak: 0, nonaktif: 0 })

      setNasabahStats({
        total: nasabahList.length,
        aktif: stats.aktif,
        pending: stats.pending,
        ditolak: stats.ditolak,
        nonaktif: stats.nonaktif,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia('(max-width: 640px)')
    const handleChange = (event) => setIsMobile(event.matches)

    setIsMobile(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  const ringkasanUtama = pickFirst(dashboardData, ['ringkasanUtama', 'ringkasan_utama'], {})
  const keanggotaan = pickFirst(dashboardData, ['keanggotaan', 'anggota', 'membership'], {})

  const totalSimpanan = pickNumber(ringkasanUtama, ['totalSimpanan', 'total_simpanan'])
  const totalPinjaman = pickNumber(ringkasanUtama, ['totalPinjamanOutstanding', 'total_pinjaman_outstanding'])
  const totalAnggota = pickNumber(ringkasanUtama, ['totalAnggota', 'total_anggota'])
  const anggotaAktif = pickNumber(ringkasanUtama, ['anggotaAktif', 'anggota_aktif'])

  const statsFromDashboard = {
    total: totalAnggota || nasabahStats.total,
    aktif: anggotaAktif || nasabahStats.aktif,
    pending: nasabahStats.pending,
    ditolak: nasabahStats.ditolak,
    nonaktif: nasabahStats.nonaktif,
  }

  const cashflowData = useMemo(() => {
    const source = pickArray(dashboardData, [
      'aktivitasTransaksi.cashflowTrend',
      'aktivitasTransaksi.trenCashflow',
      'cashflowTrend',
      'trenCashflow',
    ])

    return source
      .map((item, index) => ({
        rowIndex: index,
        periodSortKey: resolvePeriodSortKey(item.bulan ?? item.month ?? item.periode),
        monthIndex: resolveMonthIndex(item.bulan ?? item.month ?? item.periode) ?? index + 1,
        bulan: String(item.bulan ?? item.month ?? item.periode ?? '-'),
        kasMasuk: pickNumber(item, ['kasMasuk', 'cashIn', 'kas_masuk']),
        kasKeluar: pickNumber(item, ['kasKeluar', 'cashOut', 'kas_keluar']),
      }))
      .sort((a, b) => {
        if (a.periodSortKey !== null && b.periodSortKey !== null) {
          return a.periodSortKey - b.periodSortKey
        }
        if (a.periodSortKey !== null) return -1
        if (b.periodSortKey !== null) return 1
        return a.rowIndex - b.rowIndex
      })
  }, [dashboardData])

  const trenAnggotaData = useMemo(() => {
    const source = pickArray(keanggotaan, ['tren', 'trenAnggota', 'membershipTrend', 'tren_anggota'])

    return source
      .map((item, index) => ({
        rowIndex: index,
        periodSortKey: resolvePeriodSortKey(item.bulan ?? item.month ?? item.periode),
        monthIndex: resolveMonthIndex(item.bulan ?? item.month ?? item.periode) ?? index + 1,
        bulan: String(item.bulan ?? item.month ?? item.periode ?? '-'),
        anggotaBaru: pickNumber(item, ['anggotaBaru', 'memberBaru', 'newMembers']),
        anggotaKeluar: pickNumber(item, ['anggotaKeluar', 'memberKeluar', 'inactiveMembers']),
      }))
      .sort((a, b) => {
        if (a.periodSortKey !== null && b.periodSortKey !== null) {
          return a.periodSortKey - b.periodSortKey
        }
        if (a.periodSortKey !== null) return -1
        if (b.periodSortKey !== null) return 1
        return a.rowIndex - b.rowIndex
      })
  }, [keanggotaan])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Beranda</h1>
      </div>

      {loading && (
        <div className="bg-white rounded-xl p-8 shadow-sm flex items-center justify-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Memuat data beranda...</span>
        </div>
      )}

      {!loading && error && (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Total Simpanan"
              value={formatCurrency(totalSimpanan)}
              subtitle="Total Simpanan Diterima"
              valueColor="text-green-600"
            />
            <StatCard
              title="Total Pinjaman"
              value={formatCurrency(totalPinjaman)}
              subtitle="Total Pinjaman Diberikan"
              valueColor="text-red-500"
            />
            <StatCard
              title="Total Anggota"
              value={statsFromDashboard.total}
              subtitle="Total Anggota Terdaftar"
              valueColor="text-[#0066FF]"
            />
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm h-[280px] sm:h-[340px] flex flex-col">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Grafik Cashflow Bulanan</h3>
              <div className={`flex-1 min-h-0 ${isMobile ? 'overflow-x-auto' : ''}`}>
                {cashflowData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    Data cashflow belum tersedia.
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    <div
                      className="min-h-0 flex-1"
                      style={isMobile ? { minWidth: `${Math.max(cashflowData.length * 76, 680)}px` } : undefined}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={cashflowData}
                          margin={{ top: 8, right: isMobile ? 10 : 14, left: isMobile ? 0 : 4, bottom: 6 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                          <XAxis
                            dataKey="bulan"
                            tick={{ fontSize: isMobile ? 10 : 10, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                          />
                          <YAxis
                            tick={{ fontSize: isMobile ? 9 : 10, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={formatCompactNumber}
                            width={isMobile ? 40 : 44}
                          />
                          <Tooltip
                            cursor={{ stroke: '#c9d7bd', strokeDasharray: '3 3', strokeWidth: 1 }}
                            content={({ active, payload }) => (
                              <DashboardLineTooltip
                                active={active}
                                payload={payload}
                                valueFormatter={formatCompactCurrencyLabel}
                              />
                            )}
                          />
                          <Line
                            type="monotone"
                            dataKey="kasMasuk"
                            stroke="#65a30d"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 4, fill: '#fff', stroke: '#65a30d', strokeWidth: 2 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="kasKeluar"
                            stroke="#f97316"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 4, fill: '#fff', stroke: '#f97316', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-4 text-xs sm:text-xs text-gray-500 flex-wrap">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#65a30d]" />
                        Kas Masuk
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
                        Kas Keluar
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm h-[280px] sm:h-[340px] flex flex-col">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Tren Keanggotaan</h3>
              <div className={`flex-1 min-h-0 ${isMobile ? 'overflow-x-auto' : ''}`}>
                {trenAnggotaData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    Data tren keanggotaan belum tersedia.
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    <div
                      className="min-h-0 flex-1"
                      style={isMobile ? { minWidth: `${Math.max(trenAnggotaData.length * 76, 680)}px` } : undefined}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={trenAnggotaData}
                          margin={{ top: 8, right: isMobile ? 10 : 14, left: isMobile ? 0 : 4, bottom: 6 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                          <XAxis
                            dataKey="bulan"
                            tick={{ fontSize: isMobile ? 10 : 10, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                          />
                          <YAxis
                            tick={{ fontSize: isMobile ? 9 : 10, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                            width={isMobile ? 34 : 40}
                          />
                          <Tooltip
                            cursor={{ stroke: '#b8c7e0', strokeDasharray: '3 3', strokeWidth: 1 }}
                            content={({ active, payload }) => (
                              <DashboardLineTooltip
                                active={active}
                                payload={payload}
                                valueFormatter={(value) => `${Math.round(Number(value) || 0)} anggota`}
                              />
                            )}
                          />
                          <Line
                            type="monotone"
                            dataKey="anggotaBaru"
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 4, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="anggotaKeluar"
                            stroke="#f97316"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 4, fill: '#fff', stroke: '#f97316', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-4 text-xs sm:text-xs text-gray-500 flex-wrap">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
                        Anggota Baru
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
                        Anggota Keluar
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  )
}
