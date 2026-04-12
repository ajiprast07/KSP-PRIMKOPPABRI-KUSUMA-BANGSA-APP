import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { logoutUser } from '@/lib/api'

const AuthContext = createContext(null)

const STORAGE_KEY = 'auth_data'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveToStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
}

function normalizeAuthData(data) {
  const source = data?.data ?? data ?? {}
  const user = source.user ?? data?.user ?? null
  const accessToken =
    source.accessToken ??
    source.token ??
    source.access_token ??
    data?.accessToken ??
    data?.token ??
    data?.access_token ??
    null
  const refreshToken =
    source.refreshToken ??
    source.refresh_token ??
    data?.refreshToken ??
    data?.refresh_token ??
    null

  if (process.env.NODE_ENV === 'development') {
    console.log('[Auth] normalizeAuthData:', {
      hasData: !!data,
      accessTokenSource: accessToken ? (
        source.accessToken ? 'source.accessToken' :
        source.token ? 'source.token' :
        source.access_token ? 'source.access_token' :
        data?.accessToken ? 'data.accessToken' :
        data?.token ? 'data.token' :
        'data.access_token'
      ) : 'none',
      refreshTokenSource: refreshToken ? (
        source.refreshToken ? 'source.refreshToken' :
        source.refresh_token ? 'source.refresh_token' :
        data?.refreshToken ? 'data.refreshToken' :
        'data.refresh_token'
      ) : 'none',
    })
  }

  return {
    ...data,
    ...source,
    user,
    accessToken,
    refreshToken,
  }
}

function hasContentTypeHeader(headers = {}) {
  return Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')
}

export function AuthProvider({ children }) {
  const [authData, setAuthData] = useState(() => {
    const stored = loadFromStorage()
    return stored ? normalizeAuthData(stored) : null
  })
  const [dataVersion, setDataVersion] = useState(0)
  // Keep a ref so authFetch always reads the latest tokens without stale closure
  const authDataRef = useRef(authData)
  authDataRef.current = authData
  const refreshPromiseRef = useRef(null)
  const inFlightGetRequestsRef = useRef(new Map())

  /**
   * Called after a successful API login response.
   * @param {{ user, accessToken, refreshToken }} data
   */
  const login = useCallback((data) => {
    const normalized = normalizeAuthData(data)
    console.log('[Auth] Login data:', { 
      user: normalized.user?.username || normalized.user?.email || 'unknown',
      hasAccessToken: !!normalized.accessToken,
      hasRefreshToken: !!normalized.refreshToken,
      refreshTokenLength: normalized.refreshToken?.length || 0,
    })
    saveToStorage(normalized)
    setAuthData(normalized)
  }, [])

  /**
   * Call /api/logout then clear all auth state and storage.
   */
  const logout = useCallback(async () => {
    const token = loadFromStorage()?.accessToken
    if (token) {
      try { await logoutUser(token) } catch { /* ignore network errors */ }
    }
    clearStorage()
    setAuthData(null)
  }, [])

  /**
   * fetch() wrapper that automatically refreshes the accessToken on 401.
   * Usage: authFetch('/api/some-endpoint', { method, headers, body })
   */
  const authFetch = useCallback(async (url, options = {}) => {
    const current = authDataRef.current
    const isFormData = options.body instanceof FormData
    const method = String(options.method || 'GET').toUpperCase()
    const isGetWithoutBody = method === 'GET' && !options.body
    const makeHeaders = (token) => {
      const baseHeaders = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      }

      if (!isFormData && !hasContentTypeHeader(baseHeaders)) {
        baseHeaders['Content-Type'] = 'application/json'
      }

      return baseHeaders
    }

    // Deduplicate concurrent GET requests (same URL + headers) to avoid duplicate hits from StrictMode / repeated effects.
    const getRequestKey = () => {
      if (!isGetWithoutBody) return null
      const sortedHeaderEntries = Object.entries(options.headers || {}).sort(([a], [b]) => a.localeCompare(b))
      const headerSignature = JSON.stringify(sortedHeaderEntries)
      return `${method}:${url}:${headerSignature}`
    }

    const requestKey = getRequestKey()

    if (requestKey && inFlightGetRequestsRef.current.has(requestKey)) {
      const sharedPromise = inFlightGetRequestsRef.current.get(requestKey)
      return sharedPromise.then((response) => response.clone())
    }

    const runRequest = async () => {
      const shouldBumpDataVersion =
        method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'

      // First attempt
      let res = await fetch(url, { ...options, method, headers: makeHeaders(current?.accessToken) })

      if (res.status !== 401) {
        if (res.ok && shouldBumpDataVersion) {
          setDataVersion((prev) => prev + 1)
        }
        return res
      }

      console.log('[Auth] Got 401 on', url, '- attempting refresh')

      // Token expired — only try refresh if we actually have a refresh token
      if (!current?.refreshToken) {
        console.error('[Auth] No refresh token available, logging out')
        clearStorage()
        setAuthData(null)
        throw new Error('Sesi habis, silakan login kembali.')
      }

      const refreshAccessTokenOnce = async () => {
        if (!refreshPromiseRef.current) {
          refreshPromiseRef.current = (async () => {
            let refreshRes
            try {
              // Debug: log refresh token details
              console.log('[Auth] Refresh token details:', {
                hasToken: !!current.refreshToken,
                tokenLength: current.refreshToken?.length || 0,
                tokenPrefix: current.refreshToken ? current.refreshToken.substring(0, 20) + '...' : 'none',
              })

              const refreshPayload = { refreshToken: current.refreshToken }
              console.log('[Auth] Attempting token refresh...')

              refreshRes = await fetch('/api/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(refreshPayload),
              })

              console.log('[Auth] Refresh response status:', refreshRes.status)
            } catch (err) {
              console.error('[Auth] Refresh network error:', err)
              throw new Error('Gagal terhubung ke server. Periksa koneksi internet Anda.')
            }

            if (!refreshRes.ok) {
              let errorDetails = null
              try {
                errorDetails = await refreshRes.json()
                console.error('[Auth] Refresh failed with response:', {
                  status: refreshRes.status,
                  statusText: refreshRes.statusText,
                  error: errorDetails,
                })
              } catch {
                const errorText = await refreshRes.text()
                console.error('[Auth] Refresh failed:', {
                  status: refreshRes.status,
                  statusText: refreshRes.statusText,
                  body: errorText,
                })
              }
              clearStorage()
              setAuthData(null)
              throw new Error('Sesi habis, silakan login kembali.')
            }

            const refreshData = await refreshRes.json().catch(() => null)
            console.log('[Auth] Refresh response data:', {
              hasData: !!refreshData,
              keys: refreshData ? Object.keys(refreshData) : [],
            })

            const normalizedRefresh = normalizeAuthData(refreshData)
            const newToken = normalizedRefresh.accessToken

            console.log('[Auth] Token refreshed:', {
              hasNewAccessToken: !!newToken,
              hasNewRefreshToken: !!normalizedRefresh.refreshToken,
              refreshTokenUpdated: normalizedRefresh.refreshToken !== current.refreshToken,
            })

            if (!newToken) {
              console.error('[Auth] No new access token in refresh response:', refreshData)
              clearStorage()
              setAuthData(null)
              throw new Error('Sesi habis, silakan login kembali.')
            }

            const newAuthData = {
              ...current,
              accessToken: newToken,
              refreshToken: normalizedRefresh.refreshToken || current.refreshToken,
            }
            saveToStorage(newAuthData)
            setAuthData(newAuthData)
            return newToken
          })().finally(() => {
            refreshPromiseRef.current = null
          })
        }

        return refreshPromiseRef.current
      }

      const newToken = await refreshAccessTokenOnce()

      // Retry original request with new token
      res = await fetch(url, { ...options, method, headers: makeHeaders(newToken) })
      if (res.ok && shouldBumpDataVersion) {
        setDataVersion((prev) => prev + 1)
      }
      return res
    }

    if (requestKey) {
      const sharedPromise = runRequest().finally(() => {
        inFlightGetRequestsRef.current.delete(requestKey)
      })

      inFlightGetRequestsRef.current.set(requestKey, sharedPromise)
      return sharedPromise.then((response) => response.clone())
    }
    return runRequest()
  }, [])

  const value = {
    user: authData?.user ?? null,
    accessToken: authData?.accessToken ?? null,
    refreshToken: authData?.refreshToken ?? null,
    isAuthenticated: !!authData?.accessToken,
    dataVersion,
    login,
    logout,
    authFetch,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
