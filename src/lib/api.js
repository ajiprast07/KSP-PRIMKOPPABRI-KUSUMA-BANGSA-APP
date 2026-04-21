const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * POST /api/refresh
 * @param {string} refreshToken
 * @returns {Promise<{ message, accessToken }>}
 */
export async function refreshAccessToken(refreshToken) {
  const response = await fetch(`${BASE_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Sesi habis, silakan login kembali.')
  return data // { message, accessToken }
}
/**
 * POST /api/logout
 * @param {string} accessToken
 */
export async function logoutUser(accessToken) {
  await fetch(`${BASE_URL}/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  // Ignore response — always clear local state regardless
}

/**
 * POST /api/login
 * @param {{ usernameOrEmail: string, password: string }} credentials
 * @returns {Promise<{ message, user, accessToken, refreshToken }>}
 */
export async function loginUser({ usernameOrEmail, password }) {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrEmail, password }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Login gagal. Periksa kembali email dan password Anda.')
  }

  return data
}
