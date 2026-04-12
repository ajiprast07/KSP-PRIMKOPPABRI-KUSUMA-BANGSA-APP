import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle, Loader2, Save, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

function normalizeMessage(message, fallback) {
  const replaceSettingTerm = (text) => String(text)
    .replace(/\bSettings\b/g, 'Pengaturan')
    .replace(/\bSetting\b/g, 'Pengaturan')
    .replace(/\bsettings\b/g, 'pengaturan')
    .replace(/\bsetting\b/g, 'pengaturan')

  if (Array.isArray(message)) return replaceSettingTerm(message.join(', '))
  if (typeof message === 'string' && message.trim()) return replaceSettingTerm(message)
  return replaceSettingTerm(fallback)
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

function getTypeBadgeClass(valueType) {
  const type = String(valueType || '').toUpperCase()
  if (type === 'NUMBER') return 'bg-blue-100 text-blue-700'
  if (type === 'BOOLEAN') return 'bg-emerald-100 text-emerald-700'
  return 'bg-gray-100 text-gray-700'
}

function parseSettingValue(setting, rawValue) {
  const type = String(setting?.valueType || '').toUpperCase()
  if (type === 'BOOLEAN') {
    return String(rawValue) === 'true' ? 'true' : 'false'
  }

  if (type === 'NUMBER') {
    const normalized = String(rawValue ?? '').trim()
    return normalized
  }

  return String(rawValue ?? '')
}

function prettifyKey(key) {
  return String(key || '-')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim()
}

function getSectionKey(setting) {
  const text = `${setting?.key || ''} ${setting?.description || ''}`.toLowerCase()

  if (/pinjaman|bunga|tenor/.test(text)) return 'pinjaman'
  if (/angsuran|denda|jatuh tempo/.test(text)) return 'angsuran'
  if (/simpanan/.test(text)) return 'simpanan'
  if (/penarikan|tarik|withdraw/.test(text)) return 'penarikan'
  if (/anggota|anggota/.test(text)) return 'anggota'
  if (/koperasi/.test(text)) return 'koperasi'
  return 'lainnya'
}

function isTenorField(setting) {
  const text = `${setting?.key || ''} ${setting?.description || ''}`.toLowerCase()
  return text.includes('tenor')
}

function isCurrencyField(setting) {
  const text = `${setting?.key || ''} ${setting?.description || ''}`.toLowerCase()
  return text.includes('nominal') || text.includes('saldo') || text.includes('biaya')
}

function SectionBlock({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function FieldRow({
  sectionKey,
  setting,
  value,
  dirty,
  saving,
  onChange,
  onSave,
}) {
  const type = String(setting?.valueType || '').toUpperCase()
  const label = setting?.description?.trim() || prettifyKey(setting?.key)
  const useKelipatanPilihan = sectionKey === 'lainnya' && type !== 'BOOLEAN'

  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-500 flex items-center gap-2">
        {label}
        <span className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold ${getTypeBadgeClass(type)}`}>
          {type || 'TEXT'}
        </span>
      </label>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          {useKelipatanPilihan ? (
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <div className="flex flex-wrap gap-2">
                {['3', '6', '9', '12'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onChange(option)}
                    className={`h-7 rounded-full px-4 text-xs font-semibold transition-colors ${
                      String(value) === option
                        ? 'bg-[#0066FF] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : isTenorField(setting) ? (
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <div className="flex flex-wrap gap-2">
                {['3', '6', '12'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onChange(`${option}`)}
                    className={`h-7 rounded-full px-4 text-xs font-semibold transition-colors ${
                      String(value) === option
                        ? 'bg-[#0066FF] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option} Bulan
                  </button>
                ))}
              </div>
            </div>
          ) : type === 'BOOLEAN' ? (
            <select
              value={String(value ?? '')}
              onChange={(event) => onChange(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:ring-offset-2"
            >
              <option value="true">Iya</option>
              <option value="false">Tidak</option>
            </select>
          ) : (
            <div className="relative">
              {isCurrencyField(setting) ? (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">Rp</span>
              ) : null}
              <Input
                type={type === 'NUMBER' ? 'number' : 'text'}
                value={String(value ?? '')}
                onChange={(event) => onChange(event.target.value)}
                className={`h-11 border-gray-200 bg-white ${isCurrencyField(setting) ? 'pl-10' : ''}`}
              />
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving}
          className="h-11 bg-[#0066FF] text-white hover:bg-[#0052cc] sm:w-[124px]"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
          Simpan
        </Button>
      </div>

      <p className="text-xs text-gray-400">Terakhir diubah: {formatJakartaDate(setting?.updatedAt)}</p>
    </div>
  )
}

export default function Pengaturan() {
  const { authFetch } = useAuth()
  const { toasts, success, remove } = useToast()
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [draftValues, setDraftValues] = useState({})
  const [savingMap, setSavingMap] = useState({})

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authFetch('/api/settings')
      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(normalizeMessage(json?.message, 'Gagal mengambil daftar pengaturan'))
      }

      const rows = Array.isArray(json?.data) ? json.data : []
      setSettings(rows)
      const nextDraft = {}
      rows.forEach((item) => {
        nextDraft[item.key] = String(item?.value ?? '')
      })
      setDraftValues(nextDraft)
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat mengambil daftar pengaturan')
      setSettings([])
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateWithMethodFallback = useCallback(async (url, body) => {
    const request = async (method) => {
      const res = await authFetch(url, {
        method,
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => null)
      return { res, json }
    }

    let result = await request('PUT')
    if (!result.res.ok && (result.res.status === 404 || result.res.status === 405)) {
      result = await request('PATCH')
    }
    if (!result.res.ok && (result.res.status === 404 || result.res.status === 405)) {
      result = await request('POST')
    }
    return result
  }, [authFetch])

  const saveOne = useCallback(async (setting) => {
    const key = setting?.key
    if (!key) return

    setSavingMap((prev) => ({ ...prev, [key]: true }))

    try {
      const encodedKey = encodeURIComponent(key)
      const body = {
        value: parseSettingValue(setting, draftValues[key]),
      }

      const { res, json } = await updateWithMethodFallback(`/api/settings/${encodedKey}`, body)
      if (!res.ok) {
        throw new Error(normalizeMessage(json?.message, 'Gagal memperbarui pengaturan'))
      }

      const updated = json?.data ?? null
      if (updated) {
        setSettings((prev) => prev.map((item) => (item.key === updated.key ? updated : item)))
        setDraftValues((prev) => ({ ...prev, [updated.key]: String(updated?.value ?? '') }))
      }

      success(normalizeMessage(json?.message, 'Pengaturan berhasil diperbarui'))
    } catch (err) {
      setError(normalizeMessage(err?.message, 'Terjadi kesalahan saat memperbarui pengaturan'))
    } finally {
      setSavingMap((prev) => ({ ...prev, [key]: false }))
    }
  }, [draftValues, success, updateWithMethodFallback])

  const filteredSettings = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return settings
    return settings.filter((item) => {
      const haystack = [item.key, item.description, item.valueType, item.value]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(keyword)
    })
  }, [settings, search])

  const groupedSettings = useMemo(() => {
    const groups = {
      pinjaman: [],
      angsuran: [],
      simpanan: [],
      penarikan: [],
      anggota: [],
      koperasi: [],
      lainnya: [],
    }

    filteredSettings.forEach((item) => {
      const section = getSectionKey(item)
      groups[section].push(item)
    })

    return groups
  }, [filteredSettings])

  const sectionMeta = [
    { key: 'pinjaman', title: 'Pinjaman' },
    { key: 'angsuran', title: 'Angsuran' },
    { key: 'simpanan', title: 'Simpanan' },
    { key: 'penarikan', title: 'Penarikan' },
    { key: 'anggota', title: 'Anggota' },
    { key: 'koperasi', title: 'Koperasi' },
    { key: 'lainnya', title: 'Lainnya' },
  ]

  return (
    <div className="space-y-3 sm:space-y-4">
      <Toast toasts={toasts} remove={remove} />

      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pengaturan</h1>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama pengaturan atau nilainya..."
              className="h-10 border-gray-200 bg-white pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : filteredSettings.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">Pengaturan yang Anda cari tidak ditemukan.</div>
        ) : (
          <div className="space-y-8">
            {sectionMeta.map((section) => {
              const rows = groupedSettings[section.key]
              if (!rows?.length) return null

              return (
                <SectionBlock key={section.key} title={section.title}>
                  {rows.map((item) => {
                    const value = draftValues[item.key] ?? ''
                    const dirty = String(item?.value ?? '') !== String(value)
                    const isSaving = Boolean(savingMap[item.key])

                    return (
                      <FieldRow
                        key={item.id ?? item.key}
                        sectionKey={section.key}
                        setting={item}
                        value={value}
                        dirty={dirty}
                        saving={isSaving}
                        onChange={(nextValue) => {
                          setDraftValues((prev) => ({ ...prev, [item.key]: nextValue }))
                        }}
                        onSave={() => saveOne(item)}
                      />
                    )
                  })}
                </SectionBlock>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
