/**
 * Centralized API client with automatic token refresh and 401 handling.
 *
 * Provides a fetch wrapper that:
 * - Proactively refreshes expired tokens before making requests
 * - Automatically retries on 401 after refreshing tokens
 * - Redirects to login if token refresh fails (dashboard mode)
 * - Creates anonymous sessions if needed (demo mode)
 */

import {
  API_BASE_URL,
  clearTokens,
  createAnonymousSession,
  getAccessToken,
  isTokenExpired,
  refreshTokens,
} from './auth'

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

/**
 * Error thrown when session expires and redirect to login happens.
 * Callers can catch this specifically to know not to show error UI.
 */
export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired - redirecting to login')
    this.name = 'SessionExpiredError'
  }
}

// Module-level state for singleton token refresh
let refreshPromise: Promise<boolean> | null = null

/**
 * Refresh tokens with singleton pattern to prevent race conditions.
 * Multiple concurrent calls will reuse the same in-flight refresh promise.
 */
async function refreshTokensOnce(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = refreshTokens().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

type AuthMode = 'dashboard' | 'anonymous'

interface AuthFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
  /**
   * How to handle auth failures:
   * - 'dashboard': Redirect to login if refresh fails
   * - 'anonymous': Create new anonymous session if refresh fails
   */
  authMode?: AuthMode
}

/**
 * Get the current locale from the URL path.
 */
function getCurrentLocale(): string {
  if (typeof window === 'undefined') return 'en'
  const match = window.location.pathname.match(/^\/(en|sl)/)
  return match ? match[1] : 'en'
}

/**
 * Redirect to login page with current locale.
 */
function redirectToLogin(): void {
  if (typeof window === 'undefined') return
  const locale = getCurrentLocale()
  window.location.href = `/${locale}/login`
}

/**
 * Ensure we have a valid access token, refreshing if needed.
 *
 * @param authMode How to handle if refresh fails
 * @returns Access token, or null if redirect happened
 */
async function ensureValidToken(authMode: AuthMode): Promise<string | null> {
  let token = getAccessToken()

  // No token
  if (!token) {
    if (authMode === 'anonymous') {
      const response = await createAnonymousSession()
      return response.access_token
    }
    // Dashboard mode - redirect to login
    redirectToLogin()
    return null
  }

  // Token exists but may be expired
  if (isTokenExpired(token)) {
    const refreshed = await refreshTokensOnce()
    if (refreshed) {
      token = getAccessToken()
      if (token) return token
    }

    // Refresh failed
    if (authMode === 'anonymous') {
      const response = await createAnonymousSession()
      return response.access_token
    }

    // Dashboard mode - redirect to login
    clearTokens()
    redirectToLogin()
    return null
  }

  return token
}

/**
 * Make an authenticated API request with automatic token refresh.
 *
 * Features:
 * - Proactively refreshes expired tokens before making requests
 * - On 401, refreshes token and retries once
 * - Dashboard mode: redirects to login if refresh fails
 * - Anonymous mode: creates new session if refresh fails
 *
 * @param endpoint API endpoint (relative to API_BASE_URL)
 * @param options Fetch options including authMode
 * @returns Fetch Response
 * @throws ApiClientError for non-auth errors
 */
export async function authFetch(
  endpoint: string,
  options: AuthFetchOptions = {},
  isRetry = false
): Promise<Response> {
  const { authMode = 'dashboard', headers = {}, ...fetchOptions } = options

  // Ensure we have a valid token
  const token = await ensureValidToken(authMode)
  if (!token) {
    // Redirect happened, throw to stop execution
    throw new SessionExpiredError()
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      ...headers,
      Authorization: `Bearer ${token}`,
    },
  })

  // Handle 401 - try to refresh and retry once
  if (response.status === 401 && !isRetry) {
    const refreshed = await refreshTokensOnce()

    if (refreshed) {
      // Retry with new token
      return authFetch(endpoint, options, true)
    }

    // Refresh failed
    if (authMode === 'anonymous') {
      // Create new anonymous session and retry
      await createAnonymousSession()
      return authFetch(endpoint, options, true)
    }

    // Dashboard mode - redirect to login
    clearTokens()
    redirectToLogin()
    throw new SessionExpiredError()
  }

  return response
}

/**
 * Parse error message from API response.
 */
export async function parseErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const errorBody = await response.json()
    return errorBody.detail || errorBody.message || fallback
  } catch {
    return response.statusText || fallback
  }
}

interface AuthJsonFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  authMode?: AuthMode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any
}

/**
 * Make an authenticated JSON API request.
 *
 * Convenience wrapper around authFetch that:
 * - Sets Content-Type to application/json for requests with body
 * - Parses JSON response (safely handles empty bodies)
 * - Throws ApiClientError with parsed error message on failure
 *
 * For endpoints that return no body, use Promise<void> as the type parameter.
 */
export async function authJsonFetch<T = void>(
  endpoint: string,
  options: AuthJsonFetchOptions = {}
): Promise<T> {
  const { body, headers = {}, ...rest } = options

  const fetchOptions: AuthFetchOptions = {
    ...rest,
    headers: {
      ...headers,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }

  const response = await authFetch(endpoint, fetchOptions)

  if (!response.ok) {
    const message = await parseErrorMessage(response, `Request failed with status ${response.status}`)
    throw new ApiClientError(response.status, message)
  }

  // Read as text first to safely handle empty responses (fixes JSON parse error on empty body)
  const text = await response.text()
  if (!text) {
    // Empty response - only safe when T = void
    return undefined as T
  }

  return JSON.parse(text) as T
}
