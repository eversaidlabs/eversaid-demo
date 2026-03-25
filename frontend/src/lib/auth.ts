/**
 * Authentication utilities for token management.
 *
 * Handles:
 * - Token storage in localStorage
 * - Automatic anonymous session creation
 * - Token refresh
 * - 401 handling with automatic session recovery
 */

// Token storage keys
const ACCESS_TOKEN_KEY = 'eversaid_access_token'
const REFRESH_TOKEN_KEY = 'eversaid_refresh_token'

// Mutex for session creation to prevent race conditions
// When multiple API calls fire simultaneously on page load, only the first
// should create a session; others should wait for it to complete
let sessionCreationPromise: Promise<TokenResponse> | null = null

// API base URL - exported for use by api-client.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * Create an anonymous session with mutex protection.
 *
 * Prevents race conditions when multiple API calls fire simultaneously -
 * only one session creation will occur, others wait for it to complete.
 *
 * @returns Access token from the created session
 */
async function createSessionWithMutex(): Promise<string> {
  // If session creation is already in progress, wait for it
  if (sessionCreationPromise) {
    const response = await sessionCreationPromise
    return response.access_token
  }

  // Start session creation and store the promise so concurrent calls can wait
  sessionCreationPromise = createAnonymousSession()
  try {
    const response = await sessionCreationPromise
    return response.access_token
  } finally {
    // Clear the promise after completion (success or failure)
    sessionCreationPromise = null
  }
}

/**
 * Token response from auth endpoints
 */
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  password_change_required?: boolean
}

/**
 * Get the stored access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

/**
 * Get the stored refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * Store tokens in localStorage
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

/**
 * Clear stored tokens
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/**
 * Check if user is authenticated (has tokens)
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null
}

/**
 * Check if an access token is expired or about to expire.
 *
 * Decodes the JWT payload (without verification) to check the exp claim.
 * Returns true if token is expired or will expire within 60 seconds.
 */
export function isTokenExpired(token: string): boolean {
  try {
    // JWT structure: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) return true

    // Decode the payload (base64url)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

    if (!payload.exp) return true

    // Check if expired or will expire within 60 seconds
    const expiresAt = payload.exp * 1000 // Convert to milliseconds
    const now = Date.now()
    const bufferMs = 60 * 1000 // 60 second buffer

    return now >= expiresAt - bufferMs
  } catch {
    // If we can't parse the token, consider it expired
    return true
  }
}

/**
 * Create a new anonymous session
 *
 * @returns TokenResponse with access and refresh tokens
 * @throws Error if session creation fails
 */
export async function createAnonymousSession(): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/anonymous`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to create anonymous session: ${response.status}`)
  }

  const data: TokenResponse = await response.json()
  setTokens(data.access_token, data.refresh_token)
  return data
}

/**
 * Refresh tokens using the refresh token
 *
 * @returns true if refresh succeeded, false if failed
 */
export async function refreshTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
      // Refresh failed - clear tokens
      clearTokens()
      return false
    }

    const data: TokenResponse = await response.json()
    setTokens(data.access_token, data.refresh_token)
    return true
  } catch {
    clearTokens()
    return false
  }
}

/**
 * Ensure the user is authenticated.
 *
 * If no token exists or token is expired, attempts to refresh or create new session.
 * Returns the access token for use in API requests.
 *
 * Uses a mutex to prevent race conditions when multiple API calls fire simultaneously
 * on page load - only one session creation will occur, others wait for it.
 *
 * @returns Access token
 * @throws Error if authentication fails
 */
export async function ensureAuthenticated(): Promise<string> {
  let token = getAccessToken()

  if (!token) {
    // No token - create anonymous session
    return createSessionWithMutex()
  }

  // Check if token is expired or about to expire
  if (isTokenExpired(token)) {
    // Try to refresh the token
    const refreshed = await refreshTokens()
    if (refreshed) {
      token = getAccessToken()
      if (token) return token
    }

    // Refresh failed - create new anonymous session
    return createSessionWithMutex()
  }

  return token
}

/**
 * Handle 401 response by clearing tokens and creating new session
 *
 * @returns New access token after recovery
 * @throws Error if recovery fails
 */
export async function handleUnauthorized(): Promise<string> {
  // Clear existing tokens
  clearTokens()

  // Create new anonymous session
  return createSessionWithMutex()
}

/**
 * Logout by clearing tokens
 *
 * Optionally calls the server logout endpoint to invalidate the refresh token.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()

  // Clear local tokens first
  clearTokens()

  // Optionally invalidate refresh token on server
  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {
      // Ignore logout errors - tokens are already cleared locally
    }
  }
}
