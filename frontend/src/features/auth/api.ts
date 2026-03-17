/**
 * Authentication API client for dashboard users.
 *
 * Unlike the demo's anonymous auth flow, this handles explicit login
 * with email/password for early access users.
 */

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/lib/auth'
import type {
  ChangePasswordRequest,
  LoginRequest,
  MeResponse,
  TokenResponse,
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * API error class for auth errors
 */
export class AuthError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Login with email and password.
 *
 * On success, stores tokens in localStorage and returns the token response.
 * If password_change_required is true, caller should redirect to change-password.
 */
export async function login(credentials: LoginRequest): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    let errorMessage = 'Login failed'
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.detail || errorMessage
    } catch {
      errorMessage = response.statusText || errorMessage
    }
    throw new AuthError(response.status, errorMessage)
  }

  const data: TokenResponse = await response.json()
  setTokens(data.access_token, data.refresh_token)
  return data
}

/**
 * Get current user information.
 *
 * Requires a valid access token. Returns user and tenant info.
 */
export async function getMe(): Promise<MeResponse> {
  const accessToken = getAccessToken()
  if (!accessToken) {
    throw new AuthError(401, 'Not authenticated')
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    let errorMessage = 'Failed to get user info'
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.detail || errorMessage
    } catch {
      errorMessage = response.statusText || errorMessage
    }
    throw new AuthError(response.status, errorMessage)
  }

  return response.json()
}

/**
 * Change password for the current user.
 *
 * After successful change, the password_change_required flag is cleared.
 */
export async function changePassword(
  request: ChangePasswordRequest
): Promise<void> {
  const accessToken = getAccessToken()
  if (!accessToken) {
    throw new AuthError(401, 'Not authenticated')
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    let errorMessage = 'Failed to change password'
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.detail || errorMessage
    } catch {
      errorMessage = response.statusText || errorMessage
    }
    throw new AuthError(response.status, errorMessage)
  }
}

/**
 * Accept terms of service for the current user.
 *
 * The server records which terms version was current at the time of acceptance.
 * After successful acceptance, the terms_acceptance_required flag is cleared.
 */
export async function acceptTerms(): Promise<void> {
  const accessToken = getAccessToken()
  if (!accessToken) {
    throw new AuthError(401, 'Not authenticated')
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/accept-terms`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    let errorMessage = 'Failed to accept terms'
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.detail || errorMessage
    } catch {
      errorMessage = response.statusText || errorMessage
    }
    throw new AuthError(response.status, errorMessage)
  }
}

/**
 * Logout the current user.
 *
 * Invalidates the refresh token on the server and clears local tokens.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken()

  // Clear local tokens first
  clearTokens()

  // Invalidate refresh token on server (best effort)
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

/**
 * Refresh tokens using the refresh token.
 *
 * @returns New token response, or null if refresh failed
 */
export async function refreshTokens(): Promise<TokenResponse | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return null
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
      clearTokens()
      return null
    }

    const data: TokenResponse = await response.json()
    setTokens(data.access_token, data.refresh_token)
    return data
  } catch {
    clearTokens()
    return null
  }
}
