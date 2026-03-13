/**
 * API client for platform admin user management.
 */

import { getAccessToken } from '@/lib/auth'

import type {
  PlatformUsersResponse,
  UpdateUserQuotaRequest,
  UserFilters,
  UserStats,
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * API error for admin operations.
 */
export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'AdminApiError'
  }
}

/**
 * Get authorization headers with access token.
 */
function getAuthHeaders(): HeadersInit {
  const token = getAccessToken()
  if (!token) {
    throw new AdminApiError(401, 'Not authenticated')
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Fetch all users across tenants (platform admin only).
 */
export async function getPlatformUsers(
  filters: UserFilters = {},
  limit: number = 50,
  offset: number = 0
): Promise<PlatformUsersResponse> {
  const params = new URLSearchParams()

  if (filters.email) {
    params.set('email', filters.email)
  }
  if (filters.registeredAfter) {
    params.set('registered_after', filters.registeredAfter)
  }
  if (filters.registeredBefore) {
    params.set('registered_before', filters.registeredBefore)
  }
  if (filters.quotaStatus) {
    params.set('quota_status', filters.quotaStatus)
  }
  params.set('limit', limit.toString())
  params.set('offset', offset.toString())

  const response = await fetch(
    `${API_BASE_URL}/api/admin/platform/users?${params.toString()}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  )

  if (!response.ok) {
    let errorMessage = 'Failed to fetch users'
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.detail || errorMessage
    } catch {
      errorMessage = response.statusText || errorMessage
    }
    throw new AdminApiError(response.status, errorMessage)
  }

  return response.json()
}

/**
 * Get user statistics (entry counts and quota usage).
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/users/${userId}/stats`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  )

  if (!response.ok) {
    let errorMessage = 'Failed to fetch user stats'
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.detail || errorMessage
    } catch {
      errorMessage = response.statusText || errorMessage
    }
    throw new AdminApiError(response.status, errorMessage)
  }

  return response.json()
}

/**
 * Update user quota limits.
 */
export async function updateUserQuota(
  userId: string,
  quota: UpdateUserQuotaRequest
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/users/${userId}/quota`,
    {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(quota),
    }
  )

  if (!response.ok) {
    let errorMessage = 'Failed to update quota'
    try {
      const errorBody = await response.json()
      errorMessage = errorBody.detail || errorMessage
    } catch {
      errorMessage = response.statusText || errorMessage
    }
    throw new AdminApiError(response.status, errorMessage)
  }
}
