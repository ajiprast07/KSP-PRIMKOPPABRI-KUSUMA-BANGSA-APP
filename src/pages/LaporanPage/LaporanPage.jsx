import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, FileText, RefreshCw } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useAuth } from '@/context/AuthContext'
import capKoperasiImage from '@/assets/cap koperasi.png'
import primkoppabriLogo from '@/assets/primkoppabri.png'
import pepabriLogo from '@/assets/pepabri.png'

function formatCurrency(value) {
  const number = Number(value)
  const safeNumber = Number.isFinite(number) ? number : 0
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(safeNumber)
}

function periodText(month, year) {
  if (!month || !year) return '-'
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function getJakartaTodayParts() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const month = Number(parts.find((p) => p.type === 'month')?.value)
  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const day = Number(parts.find((p) => p.type === 'day')?.value)

  return { month, year, day }
}

function normalizeLaporanPayload(json) {
  if (json?.data && typeof json.data === 'object') return json.data
  if (json && typeof json === 'object' && ('periodeBulan' in json || 'statusLaporan' in json)) return json
  return null
}

function formatExportDateTime() {
  const formatted = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date())
  return `${formatted} WIB`
}

function formatApprovalDate(value) {
  const source = value ? new Date(value) : new Date()
  const date = Number.isNaN(source.getTime()) ? new Date() : source
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date)
}

function resolveApprovalDate(report) {
  return report?.finalizedAt
    || report?.tanggalFinalisasi
    || report?.approvedAt
    || report?.generatedAt
    || report?.updatedAt
    || report?.createdAt
    || new Date()
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
      reader.onerror = () => reject(new Error('Gagal membaca gambar cap'))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function buildPdfFromStatement(
  rows,
  filename,
  periodeText,
  approvalDateText,
  isStamped,
  stampImageDataUrl,
  leftLogoDataUrl,
  rightLogoDataUrl
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const exportedAt = formatExportDateTime()
  const left = 52
  const right = 52
  const pageRight = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxY = pageHeight - 52
  const contentWidth = pageRight - left - right
  const splitX = left + Math.floor(contentWidth * 0.68)

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
    doc.text('KSP PRIMKOPPABRI KUSUMA BANGSA', pageRight / 2, 36, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text('Laporan Operasional Bulanan', pageRight / 2, 56, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105)
    doc.text(`Periode ${periodeText}`, pageRight / 2, 74, { align: 'center' })

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
    }

    doc.setDrawColor(226, 232, 240)
    doc.rect(left, y, contentWidth, rowHeight)
    doc.line(splitX, y, splitX, y + rowHeight)

    doc.setFont('helvetica', row.type === 'section' ? 'bold' : 'normal')
    doc.setFontSize(row.type === 'section' ? 10 : 9)
    doc.setTextColor(row.type === 'section' ? 15 : 51, row.type === 'section' ? 23 : 65, row.type === 'section' ? 42 : 85)
    doc.text(labelLines, left + 7, y + 14)

    doc.setFont('helvetica', row.type === 'section' ? 'bold' : 'normal')
    doc.setFontSize(row.type === 'section' ? 10 : 9)
    doc.setTextColor(row.type === 'section' ? 15 : 30, row.type === 'section' ? 23 : 41, row.type === 'section' ? 42 : 59)
    doc.text(valueLines, pageRight - right - 7, y + 14, { align: 'right' })

    return rowHeight
  }

  drawHeader()
  let y = 112

  rows.forEach((row) => {
    const previewLabel = row.type === 'section' ? String(row.label).toUpperCase() : String(row.label)
    const previewLabelLines = doc.splitTextToSize(previewLabel, splitX - left - 14)
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

  const approvalBlockHeight = 260
  if (y + approvalBlockHeight > maxY) {
    doc.addPage()
    y = 72
  }

  const approvalX = pageRight - right - 6
  const approvalStartY = y + 95
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(`Banyumas, ${approvalDateText}`, approvalX, approvalStartY, { align: 'right' })
  doc.text('Yang Menyetujui', approvalX, approvalStartY + 22, { align: 'right' })
  doc.text('Pimpinan KSP PRIMKOPPABRI KUSUMA BANGSA', approvalX, approvalStartY + 122, { align: 'right' })

  if (isStamped && stampImageDataUrl) {
    const stampWidth = 95
    const stampHeight = 95
    const stampX = pageRight - right - stampWidth - 42
    const stampY = approvalStartY + 26
    doc.addImage(stampImageDataUrl, 'PNG', stampX, stampY, stampWidth, stampHeight)
  }

  renderPageNumbers(doc, exportedAt)
  doc.save(filename)
}

function StatementTable({ periodeText, rows, approvalDateText, isStamped }) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-300 bg-slate-50 px-4 py-5 text-center sm:px-6">
        <div className="grid grid-cols-[72px_1fr_72px] items-center gap-2">
          <div className="flex justify-start">
            <img src={primkoppabriLogo} alt="Logo Primkoppabri" className="h-16 w-16 object-contain" />
          </div>

          <div>
          <p className="text-sm font-bold text-slate-900">KSP PRIMKOPPABRI KUSUMA BANGSA</p>
          <h3 className="text-lg font-bold text-slate-900">Laporan Operasional Bulanan</h3>
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
            <col className="w-[68%]" />
            <col className="w-[32%]" />
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
                ].join(' ')}
              >
                <td className={`px-4 py-2.5 ${row.type === 'item' ? 'text-slate-700' : ''}`}>{row.label}</td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="relative mt-14 border-t border-slate-200 px-4 py-8 sm:px-6 sm:py-10">
        <div className="ml-auto w-full max-w-[260px] text-right text-slate-900">
          <p className="text-sm">Banyumas, {approvalDateText}</p>
          <p className="mt-3 text-sm">Yang Menyetujui</p>
          <p className="mt-24 text-sm">Pimpinan KSP PRIMKOPPABRI KUSUMA BANGSA</p>
        </div>
        {isStamped && (
          <img
            src={capKoperasiImage}
            alt="Cap Koperasi"
            className="pointer-events-none absolute bottom-10 right-12 h-24 w-24 object-contain opacity-90"
          />
        )}
      </div>
    </div>
  )
}

function mapStatementRows(report) {
  return [
    { type: 'section', label: '1 - Ringkasan Saldo', value: '' },
    { type: 'item', label: '1.1 - Saldo Awal', value: formatCurrency(report?.saldoAwal) },
    { type: 'item', label: '1.2 - Saldo Akhir', value: formatCurrency(report?.saldoAkhir) },
    { type: 'item', label: '1.3 - Net Cashflow', value: formatCurrency(report?.netCashflow) },

    { type: 'section', label: '2 - Ringkasan Simpanan dan Pinjaman', value: '' },
    { type: 'item', label: '2.1 - Total Setoran', value: formatCurrency(report?.totalSimpanan) },
    { type: 'item', label: '2.2 - Total Pencairan', value: formatCurrency(report?.totalPinjaman) },
    { type: 'item', label: '2.3 - Total Angsuran', value: formatCurrency(report?.totalAngsuran) },
    { type: 'item', label: '2.4 - Total Penarikan', value: formatCurrency(report?.totalPenarikan) },

    { type: 'section', label: '3 - Ringkasan Pemasukan dan Pengeluaran', value: '' },
    { type: 'total', label: '3.1 - Total Pemasukan', value: formatCurrency(report?.totalPemasukan) },
    { type: 'total', label: '3.2 - Total Pengeluaran', value: formatCurrency(report?.totalPengeluaran) },
  ]
}

export default function LaporanPage({ onNavigate, selectedBulan, selectedTahun }) {
  const { authFetch } = useAuth()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const fetchLaporanKeuangan = useCallback(async (bulan, tahun) => {
    if (!bulan || !tahun) return
    setLoading(true)
    setReport(null)

    setError('')
    try {
      const qs = `?bulan=${bulan}&tahun=${tahun}`
      const res = await authFetch(`/api/laporan/keuangan${qs}`)
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.message || 'Gagal mengambil laporan keuangan')
      setReport(normalizeLaporanPayload(json))
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat mengambil laporan keuangan')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    fetchLaporanKeuangan(selectedBulan, selectedTahun)
  }, [fetchLaporanKeuangan, selectedBulan, selectedTahun])

  const callWithMethodFallback = useCallback(async (url, primaryMethod, fallbackMethod, body) => {
    const request = async (method) => {
      const res = await authFetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json().catch(() => null)
      return { res, json }
    }

    let result = await request(primaryMethod)
    if (!result.res.ok && (result.res.status === 404 || result.res.status === 405)) {
      result = await request(fallbackMethod)
    }
    return result
  }, [authFetch])

  const isFinalized = String(report?.statusLaporan || '').toUpperCase() === 'FINAL'

  const isLastThreeDaysOfSelectedMonth = useMemo(() => {
    if (!selectedBulan || !selectedTahun) return false
    const today = getJakartaTodayParts()
    if (today.month !== selectedBulan || today.year !== selectedTahun) return false

    const lastDay = new Date(selectedTahun, selectedBulan, 0).getDate()
    return today.day >= (lastDay - 2)
  }, [selectedBulan, selectedTahun])

  const handleGenerateOrFinalize = async () => {
    const bulan = Number.parseInt(String(selectedBulan), 10)
    const tahun = Number.parseInt(String(selectedTahun), 10)
    if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12) {
      setError('Periode bulan tidak valid.')
      return
    }
    if (!Number.isInteger(tahun) || tahun < 2000) {
      setError('Periode tahun tidak valid.')
      return
    }

    setGenerating(true)
    setError('')
    const periodQuery = `?bulan=${bulan}&tahun=${tahun}`

    try {
      if (isLastThreeDaysOfSelectedMonth) {
        if (!report?.id) {
          throw new Error('Laporan keuangan belum tersedia untuk finalisasi.')
        }

        const reportBulan = Number(report?.periodeBulan)
        const reportTahun = Number(report?.periodeTahun)
        if (reportBulan !== bulan || reportTahun !== tahun) {
          throw new Error('Periode laporan tidak sesuai dengan periode yang sedang dipilih.')
        }

        const { res, json } = await callWithMethodFallback(
          `/api/laporan/keuangan/${report.id}/finalize${periodQuery}`,
          'PATCH',
          'POST',
          {
            bulan,
            tahun,
          }
        )
        if (!res.ok) throw new Error(json?.message || 'Gagal finalisasi laporan keuangan')
        setReport(normalizeLaporanPayload(json))
      } else {
        const { res, json } = await callWithMethodFallback(
          `/api/laporan/keuangan/generate${periodQuery}`,
          'POST',
          'PATCH',
          {
            bulan,
            tahun,
          }
        )
        if (!res.ok) throw new Error(json?.message || 'Gagal mencetak laporan keuangan')
        setReport(normalizeLaporanPayload(json))
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat memproses laporan keuangan')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!report) return
    setDownloading(true)
    try {
      const approvalDateText = formatApprovalDate(resolveApprovalDate(report))
      const isStamped = String(report?.statusLaporan || '').toUpperCase() === 'FINAL' || String(report?.statusLaporan || '').toUpperCase() === 'PUBLISHED'
      const [stampImageDataUrl, leftLogoDataUrl, rightLogoDataUrl] = await Promise.all([
        isStamped ? loadImageAsDataUrl(capKoperasiImage) : Promise.resolve(null),
        loadImageAsDataUrl(primkoppabriLogo),
        loadImageAsDataUrl(pepabriLogo),
      ])
      buildPdfFromStatement(
        statementRows,
        `laporan-keuangan-${report.periodeBulan}-${report.periodeTahun}.pdf`,
        periodText(report.periodeBulan, report.periodeTahun),
        approvalDateText,
        isStamped,
        stampImageDataUrl,
        leftLogoDataUrl,
        rightLogoDataUrl
      )
    } finally {
      setDownloading(false)
    }
  }

  const statementRows = useMemo(() => mapStatementRows(report), [report])
  const approvalDateText = useMemo(() => formatApprovalDate(resolveApprovalDate(report)), [report])

  const status = String(report?.statusLaporan || 'DRAFT').toUpperCase()
  const statusClass = status === 'FINAL' || status === 'PUBLISHED'
    ? 'bg-green-100 text-green-700'
    : 'bg-yellow-100 text-yellow-700'

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Laporan</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">Laporan Operasional Koperasi Periode {periodText(selectedBulan, selectedTahun)}</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigate?.('laporan')}
            className="w-full sm:w-auto h-10"
          >
            <FileText className="mr-2 h-4 w-4" />
            Rekapitulasi
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateOrFinalize}
            disabled={loading || generating || (isLastThreeDaysOfSelectedMonth && isFinalized)}
            className="w-full sm:w-auto h-10"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            {generating
              ? (isLastThreeDaysOfSelectedMonth ? 'Finalisasi...' : 'Mencetak...')
              : (isLastThreeDaysOfSelectedMonth
                ? (isFinalized ? 'Sudah Final' : 'Finalisasi')
                : 'Cetak Laporan')}
          </Button>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={loading || downloading || !report}
            className="w-full sm:w-auto h-10 bg-[#0A2472] hover:bg-[#081d5e]"
          >
            <Download className="mr-2 h-4 w-4" />
            {downloading ? 'Menyiapkan...' : 'Download Laporan'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-slate-500">Memuat laporan keuangan...</p>
          ) : !report ? (
            <p className="text-sm text-slate-500">Data laporan keuangan belum tersedia.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Periode: <span className="font-semibold text-slate-800">{periodText(report.periodeBulan, report.periodeTahun)}</span>
                </p>
                <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                  {status}
                </span>
              </div>

              <StatementTable
                periodeText={periodText(report.periodeBulan, report.periodeTahun)}
                rows={statementRows}
                approvalDateText={approvalDateText}
                isStamped={isFinalized}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
