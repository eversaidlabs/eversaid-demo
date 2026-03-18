/**
 * Types for platform admin user management.
 */

import type { UserRole } from '@/features/auth/types'

/**
 * Tenant (organization) for user creation dropdown.
 */
export interface AdminTenant {
  id: string
  name: string
}

/**
 * Request to create a new user.
 */
export interface CreateUserRequest {
  email: string
  tenant_id?: string // Required for platform_admin, auto-filled for tenant_admin
  role: UserRole
  password?: string // Generated if not provided
}

/**
 * Response from creating a user.
 */
export interface CreateUserResponse {
  user: AdminUser
  temporary_password: string
}

/**
 * Quota status indicator based on usage percentage.
 * - ok: >20% remaining
 * - warning: 5-20% remaining
 * - critical: <5% remaining
 */
export type QuotaStatus = 'ok' | 'warning' | 'critical'

/**
 * User with tenant information for platform admin view.
 * Includes usage data fetched in batch to avoid N+1 queries.
 */
export interface AdminUser {
  id: string
  email: string
  tenant_id: string
  tenant_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  password_change_required: boolean
  transcription_seconds_limit: number
  text_cleanup_words_limit: number
  analysis_count_limit: number
  // Usage fields (included in list response to avoid N+1 queries)
  transcription_seconds_used: number
  text_cleanup_words_used: number
  analysis_count_used: number
  overall_quota_status: QuotaStatus
}

/**
 * Paginated response for platform users list.
 */
export interface PlatformUsersResponse {
  users: AdminUser[]
  total: number
}

/**
 * User statistics including entry counts and quota usage.
 */
export interface UserStats {
  user_id: string
  // Entry counts
  transcript_count: number
  text_import_count: number
  // Quota usage
  transcription_seconds_used: number
  text_cleanup_words_used: number
  analysis_count_used: number
  // Effective limits
  transcription_seconds_limit: number
  text_cleanup_words_limit: number
  analysis_count_limit: number
  // Quota statuses
  transcription_quota_status: QuotaStatus
  text_cleanup_quota_status: QuotaStatus
  analysis_quota_status: QuotaStatus
  overall_quota_status: QuotaStatus
}

/**
 * Filters for the user list.
 */
export interface UserFilters {
  email?: string
  registeredAfter?: string // ISO date string
  registeredBefore?: string // ISO date string
  quotaStatus?: QuotaStatus
  showAnonymous?: boolean // Include anonymous demo users
}

/**
 * Request to update user quota limits.
 */
export interface UpdateUserQuotaRequest {
  transcription_seconds_limit?: number
  text_cleanup_words_limit?: number
  analysis_count_limit?: number
}
