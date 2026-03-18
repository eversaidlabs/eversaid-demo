/**
 * API client for platform admin user management.
 *
 * Uses centralized authJsonFetch for automatic token refresh
 * and redirect to login on session expiry.
 */

import { authJsonFetch, ApiClientError } from '@/lib/api-client'

import type {
  AdminTenant,
  CreateUserRequest,
  CreateUserResponse,
  PlatformUsersResponse,
  UpdateUserQuotaRequest,
  UserFilters,
  UserStats,
} from './types'

// Re-export ApiClientError as AdminApiError for backwards compatibility
export { ApiClientError as AdminApiError }

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
  if (filters.showAnonymous) {
    params.set('show_anonymous', 'true')
  }
  params.set('limit', limit.toString())
  params.set('offset', offset.toString())

  return authJsonFetch<PlatformUsersResponse>(
    `/api/admin/platform/users?${params.toString()}`
  )
}

/**
 * Get user statistics (entry counts and quota usage).
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  return authJsonFetch<UserStats>(`/api/admin/users/${userId}/stats`)
}

/**
 * Update user quota limits.
 */
export async function updateUserQuota(
  userId: string,
  quota: UpdateUserQuotaRequest
): Promise<void> {
  await authJsonFetch(`/api/admin/users/${userId}/quota`, {
    method: 'PUT',
    body: quota,
  })
}

/**
 * Fetch all tenants (platform admin only).
 */
export async function getTenants(): Promise<AdminTenant[]> {
  return authJsonFetch<AdminTenant[]>('/api/admin/tenants')
}

/**
 * Create a new user.
 */
export async function createUser(
  data: CreateUserRequest
): Promise<CreateUserResponse> {
  return authJsonFetch<CreateUserResponse>('/api/admin/users', {
    method: 'POST',
    body: data,
  })
}
