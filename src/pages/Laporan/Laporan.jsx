import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, AlertCircle, FileText } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import primkoppabriLogo from '@/assets/primkoppabri.png'
import pepabriLogo from '@/assets/pepabri.png'

const MONTH_OPTIONS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
]

function getJakartaPeriod() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)

  const monthPart = parts.find((p) => p.type === 'month')?.value
  const yearPart = parts.find((p) => p.type === 'year')?.value

  const bulan = Number(monthPart)
  const tahun = Number(yearPart)

  return {
    bulan: Number.isInteger(bulan) && bulan >= 1 && bulan <= 12 ? bulan : now.getMonth() + 1,
    tahun: Number.isInteger(tahun) && tahun >= 2000 ? tahun : now.getFullYear(),
  }
}

function formatCurrency(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(number)
}

function formatCount(value, suffix = '') {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return `${new Intl.NumberFormat('id-ID').format(number)}${suffix}`
}

function formatPercent(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return `${(number * 100).toFixed(1)}%`
}

function formatDecimal(value, digits = 2) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(number)
}

function periodLabel(periode) {
  if (!periode?.bulan || !periode?.tahun) return '-'
  const date = new Date(periode.tahun, periode.bulan - 1, 1)
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function formatExportDateTime() {
  const formatted = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date())
  return `${formatted} WIB`
}

function renderPageNumbers(doc, exportedAt) {
  const pageCount = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(226, 232, 240)
    doc.line(44, pageHeight - 34, pageWidth - 44, pageHeight - 34)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`Dicetak: ${exportedAt}`, 44, pageHeight - 20)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text(`Halaman ${page}/${pageCount}`, pageWidth - 48, pageHeight - 24, { align: 'right' })
  }
}

async function loadImageAsDataUrl(imageUrl) {
  try {
    const response = await fetch(imageUrl)
    const blob = await response.blob()

    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => reject(new Error('Gagal membaca gambar logo'))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function buildPdfFromStatement(rows, filename, periodeText, leftLogoDataUrl, rightLogoDataUrl) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const exportedAt = formatExportDateTime()
  const left = 52
  const right = 52
  const pageRight = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxY = pageHeight - 52
  const contentWidth = pageRight - left - right
  const splitX = left + Math.floor(contentWidth * 0.75)

  const drawHeader = () => {
    if (leftLogoDataUrl) {
      doc.addImage(leftLogoDataUrl, 'PNG', left - 4, 16, 52, 52)
    }
    if (rightLogoDataUrl) {
      doc.addImage(rightLogoDataUrl, 'PNG', pageRight - right - 48, 16, 52, 52)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text('KSP PRIMKOPPABRI KUSUMA BANGSA KCP GUMELAR', pageRight / 2, 36, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('Rekapitulasi Operasional Bulanan', pageRight / 2, 56, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105)
    doc.text(`Periode ${periodeText}`, pageRight / 2, 74, { align: 'center' })

    // Match table header style (bg-slate-200 + border-slate-300).
    doc.setFillColor(226, 232, 240)
    doc.rect(left, 88, contentWidth, 24, 'F')
    doc.setDrawColor(203, 213, 225)
    doc.rect(left, 88, contentWidth, 24)
    doc.line(splitX, 88, splitX, 112)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(51, 65, 85)
    doc.text('Keterangan', left + 7, 104)
    doc.text('Jumlah', pageRight - right - 7, 104, { align: 'right' })
  }

  const drawRow = (row, y) => {
    const labelWidth = splitX - left - 14
    const valueWidth = pageRight - right - splitX - 10
    const rowLabel = row.type === 'section' ? String(row.label).toUpperCase() : String(row.label)
    const labelLines = doc.splitTextToSize(rowLabel, labelWidth)
    const valueLines = doc.splitTextToSize(String(row.value), valueWidth)
    const lineHeight = row.type === 'section' ? 12 : 11
    const rowHeight = Math.max(21, Math.max(labelLines.length, valueLines.length) * lineHeight + 7)

    if (row.type === 'section') {
      doc.setFillColor(226, 232, 240)
      doc.rect(left, y, contentWidth, rowHeight, 'F')
    } else if (row.type === 'total') {
      doc.setFillColor(241, 245, 249)
      doc.rect(left, y, contentWidth, rowHeight, 'F')
    }

    doc.setDrawColor(226, 232, 240)
    doc.rect(left, y, contentWidth, rowHeight)
    doc.line(splitX, y, splitX, y + rowHeight)

    doc.setFont('helvetica', row.type === 'item' ? 'normal' : 'bold')
    doc.setFontSize(row.type === 'section' ? 10 : 9)
    doc.setTextColor(row.type === 'item' ? 51 : 15, row.type === 'item' ? 65 : 23, row.type === 'item' ? 85 : 42)
    doc.text(labelLines, left + 7, y + 14)

    doc.setFont('helvetica', row.type === 'item' ? 'normal' : 'bold')
    doc.setFontSize(row.type === 'section' ? 10 : 9)
    doc.setTextColor(15, 23, 42)
    doc.text(valueLines, pageRight - right - 7, y + 14, { align: 'right' })

    return rowHeight
  }

  drawHeader()
  let y = 112
  rows.forEach((row) => {
    const previewLabelLines = doc.splitTextToSize(String(row.label), splitX - left - 14)
    const previewValueLines = doc.splitTextToSize(String(row.value), pageRight - right - splitX - 10)
    const previewLineHeight = row.type === 'section' ? 12 : 11
    const previewHeight = Math.max(21, Math.max(previewLabelLines.length, previewValueLines.length) * previewLineHeight + 7)

    if (y + previewHeight > maxY) {
      doc.addPage()
      drawHeader()
      y = 112
    }

    const usedHeight = drawRow(row, y)
    y += usedHeight
  })

  renderPageNumbers(doc, exportedAt)
  doc.save(filename)
}

function StatementTable({ periodeText, rows }) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-300 bg-slate-50 px-4 py-5 text-center sm:px-6">
        <div className="grid grid-cols-[72px_1fr_72px] items-center gap-2">
          <div className="flex justify-start">
            <img src={primkoppabriLogo} alt="Logo Primkoppabri" className="h-16 w-16 object-contain" />
          </div>

          <div>
          <p className="text-sm font-bold text-slate-900">KSP PRIMKOPPABRI KUSUMA BANGSA KCP GUMELAR</p>
          <h3 className="text-lg font-bold text-slate-900">Rekapitulasi Operasional Bulanan</h3>
          <p className="mt-0.5 text-sm font-medium text-slate-600">Periode {periodeText}</p>
          </div>

          <div className="flex justify-end">
            <img src={pepabriLogo} alt="Logo Pepabri" className="h-16 w-16 object-contain" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[75%]" />
            <col className="w-[25%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-300 bg-slate-200 text-slate-700">
              <th className="px-4 py-2.5 text-left">Keterangan</th>
              <th className="px-4 py-2.5 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={`${row.label}-${idx}`}
                className={[
                  'border-b border-slate-200 align-top',
                  row.type === 'section' ? 'bg-slate-200 text-base text-slate-900 uppercase font-bold' : '',
                  row.type === 'total' ? 'bg-slate-100 text-slate-900 font-semibold' : '',
                ].join(' ')}
              >
                <td className={`px-4 py-2.5 ${row.type === 'item' ? 'text-slate-700' : ''}`}>{row.label}</td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function mapStatementRows(reports) {
  return [
    { type: 'section', label: '1 - Pendapatan Operasional', value: '' },
    { type: 'item', label: '1.1 - Setoran (Nominal Setoran Simpanan Periode Berjalan)', value: formatCurrency(reports?.transaksi?.breakdown?.pemasukan?.setoran) },
    { type: 'item', label: '1.2 - Angsuran (Nominal Angsuran Pinjaman Periode Berjalan)', value: formatCurrency(reports?.transaksi?.breakdown?.pemasukan?.angsuran) },
    { type: 'total', label: 'TOTAL PEMASUKAN (Simpanan + Angsuran)', value: formatCurrency(reports?.ringkasan?.totalPemasukan) },

    { type: 'section', label: '2 - Pengeluaran Operasional', value: '' },
    { type: 'item', label: '2.1 - Penarikan (Nominal Penarikan Simpanan Periode Berjalan)', value: formatCurrency(reports?.transaksi?.breakdown?.pengeluaran?.penarikan) },
    { type: 'item', label: '2.2 - Pencairan (Nominal Pencairan Pinjaman Periode Berjalan)', value: formatCurrency(reports?.transaksi?.breakdown?.pengeluaran?.pencairan) },
    { type: 'total', label: 'TOTAL PENGELUARAN (Penarikan + Pinjaman)', value: formatCurrency(reports?.ringkasan?.totalPengeluaran) },

    { type: 'section', label: '3 - Ringkasan Simpanan dan Pinjaman', value: '' },
    { type: 'item', label: '3.1 - Jumlah Simpanan Pokok (Nominal Simpanan Pokok Periode Berjalan)', value: formatCurrency(reports?.keuangan?.simpanan?.pokok ?? reports?.keuangan?.simpananPokok ?? reports?.keuangan?.pokok) },
    { type: 'item', label: '3.2 - Jumlah Simpanan Wajib (Nominal Simpanan Wajib Periode Berjalan)', value: formatCurrency(reports?.keuangan?.simpanan?.wajib ?? reports?.keuangan?.simpananWajib ?? reports?.keuangan?.wajib) },
    { type: 'item', label: '3.3 - Jumlah Simpanan Sukarela (Nominal Simpanan Sukarela Periode Berjalan)', value: formatCurrency(reports?.keuangan?.simpanan?.sukarela ?? reports?.keuangan?.simpananSukarela ?? reports?.keuangan?.sukarela) },
    { type: 'item', label: '3.4 - Jumlah Pinjaman Aktif (Jumlah Pinjaman Yang Sedang Berjalan)', value: formatCount(reports?.keuangan?.pinjaman?.jumlahPinjamanAktif, ' orang') },
    { type: 'item', label: '3.5 - Rata-rata Pinjaman (Nominal Rata-rata Pinjaman Periode Berjalan)', value: formatCurrency(reports?.keuangan?.pinjaman?.rataRataPinjaman) },
    { type: 'total', label: 'TOTAL SIMPANAN (Simpanan Pokok + Simpanan Wajib + Simpanan Sukarela)', value: formatCurrency(reports?.keuangan?.totalSimpanan) },
    { type: 'total', label: 'TOTAL PINJAMAN AKTIF (Sisa Pinjaman Aktif)', value: formatCurrency(reports?.keuangan?.pinjaman?.totalPinjaman) },

    { type: 'section', label: '4 - Statistik Keanggotaan', value: '' },
    { type: 'item', label: '4.1 - Anggota Baru (jumlah Anggota Baru Periode Berjalan)', value: formatCount(reports?.anggota?.anggotaBaru, ' orang') },
    { type: 'item', label: '4.2 - Anggota Keluar (jumlah Anggota Keluar Periode Berjalan)', value: formatCount(reports?.anggota?.anggotaKeluar, ' orang') },
    { type: 'total', label: 'TOTAL ANGGOTA (Jumlah Anggota Terdaftar Periode Berjalan)', value: formatCount(reports?.anggota?.totalAnggota, ' orang') },
    { type: 'total', label: 'TOTAL ANGGOTA AKTIF (Jumlah Anggota Berstatus Aktif Periode Berjalan)', value: formatCount(reports?.anggota?.anggotaAktif, ' orang') },

    { type: 'section', label: '5 - Rasio Keuangan', value: '' },
    { type: 'item', label: '5.1 - Rasio Arus Kas (Total Pemasukan ÷ Total Pengeluaran)', value: formatDecimal(reports?.rasio?.rasioArusKas) },
    { type: 'item', label: '5.2 - Pinjaman terhadap Simpanan (Total Pinjaman Aktif ÷ Total Simpanan)', value: formatDecimal(reports?.rasio?.pinjamanTerhadapSimpanan) },
    { type: 'item', label: '5.3 - Rasio Keaktifan (Jumlah Anggota Aktif ÷ Total Anggota × 100%)', value: formatPercent(reports?.rasio?.rasioKeaktifan) },

    { type: 'section', label: '6 - Ringkasan Hasil Keuangan', value: '' },
    { type: 'item', label: '6.1 - Saldo Awal (Total Pemasukan Kumulatif Periode Lalu - total Pengeluaran Kumulatif Periode Lalu)', value: formatCurrency(reports?.ringkasan?.saldoAwal) },
    { type: 'item', label: '6.2 - Saldo Akhir (Saldo Awal + Surplus)', value: formatCurrency(reports?.ringkasan?.saldoAkhir) },
    { type: 'item', label: '6.3 - Surplus (Total Pemasukan - Total Pengeluaran)', value: formatCurrency(reports?.ringkasan?.surplus) },
    { type: 'total', label: 'Laba/Rugi Bersih (Surplus)', value: formatCurrency(reports?.ringkasan?.surplus) },
  ]
}

export default function Laporan({ onNavigate, onPeriodChange, selectedBulan: selectedBulanProp, selectedTahun: selectedTahunProp }) {
  const { authFetch } = useAuth()
  const currentPeriod = useMemo(() => getJakartaPeriod(), [])
  const [selectedBulan, setSelectedBulan] = useState(
    Number.isInteger(selectedBulanProp) ? selectedBulanProp : currentPeriod.bulan
  )
  const [selectedTahun, setSelectedTahun] = useState(
    Number.isInteger(selectedTahunProp) ? selectedTahunProp : currentPeriod.tahun
  )
  const [loading, setLoading] = useState(true)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [error, setError] = useState('')
  const [reports, setReports] = useState(null)
  const yearOptions = useMemo(() => {
    const start = currentPeriod.tahun - 5
    return Array.from({ length: 8 }, (_, idx) => start + idx)
  }, [currentPeriod.tahun])

  useEffect(() => {
    if (Number.isInteger(selectedBulanProp)) setSelectedBulan(selectedBulanProp)
  }, [selectedBulanProp])

  useEffect(() => {
    if (Number.isInteger(selectedTahunProp)) setSelectedTahun(selectedTahunProp)
  }, [selectedTahunProp])

  const fetchReports = useCallback(async (bulan, tahun) => {
    setError('')
    try {
      const qs = `?bulan=${bulan}&tahun=${tahun}`
      const res = await authFetch(`/api/rekapitulasi/bulanan${qs}`)
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.message || 'Gagal mengambil data rekapitulasi')

      // Backend baru bisa mengirim payload langsung atau dibungkus di data.
      setReports(json?.data ?? json ?? null)
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat mengambil data rekapitulasi')
    }
  }, [authFetch])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      setLoading(true)
      await fetchReports(selectedBulan, selectedTahun)
      if (!cancelled) setLoading(false)
    }

    init()
    return () => {
      cancelled = true
    }
  }, [fetchReports, selectedBulan, selectedTahun])

  const handleDownloadAll = async () => {
    setDownloadingAll(true)
    try {
      const [leftLogoDataUrl, rightLogoDataUrl] = await Promise.all([
        loadImageAsDataUrl(primkoppabriLogo),
        loadImageAsDataUrl(pepabriLogo),
      ])

      buildPdfFromStatement(
        statementRows,
        `rekapitulasi-koperasi-lengkap-${selectedBulan}-${selectedTahun}.pdf`,
        periodeText,
        leftLogoDataUrl,
        rightLogoDataUrl
      )
    } finally {
      setDownloadingAll(false)
    }
  }

  const periodeText = useMemo(() => {
    return periodLabel(reports?.periode || { bulan: selectedBulan, tahun: selectedTahun })
  }, [reports, selectedBulan, selectedTahun])

  const statementRows = useMemo(() => mapStatementRows(reports), [reports])

  const hasReportData = statementRows.some((row) => row.value && row.value !== '-')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rekapitulasi</h1>
          <p className="text-sm text-slate-500">Rekapitulasi Operasional Koperasi Periode {periodeText}</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <select
            value={selectedBulan}
            onChange={(e) => {
              const nextBulan = Number(e.target.value)
              setSelectedBulan(nextBulan)
              onPeriodChange?.(nextBulan, selectedTahun)
            }}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-[150px]"
          >
            {MONTH_OPTIONS.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>

          <select
            value={selectedTahun}
            onChange={(e) => {
              const nextTahun = Number(e.target.value)
              setSelectedTahun(nextTahun)
              onPeriodChange?.(selectedBulan, nextTahun)
            }}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-[110px]"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate?.('laporan-page')}
            className="w-full sm:w-auto"
          >
            <FileText className="mr-2 h-4 w-4" />
            Laporan
          </Button>

          <Button
            type="button"
            onClick={handleDownloadAll}
            disabled={loading || downloadingAll || !hasReportData}
            className="w-full sm:w-auto bg-[#0A2472] hover:bg-[#081d5e]"
          >
            <Download className="mr-2 h-4 w-4" />
            {downloadingAll ? 'Menyiapkan PDF...' : 'Download Rekapitulasi Bulanan'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="h-[520px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
        ) : (
          <StatementTable periodeText={periodeText} rows={statementRows} />
        )}
      </div>
    </div>
  )
}
