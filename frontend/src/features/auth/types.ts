/**
 * Authentication types for dashboard users.
 */

export type UserRole = 'platform_admin' | 'tenant_admin' | 'tenant_user'

/**
 * Tenant (organization) information
 */
export interface Tenant {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Quota limits (2147483647 = effectively unlimited)
  transcription_seconds_limit: number
  text_cleanup_words_limit: number
  analysis_count_limit: number
}

/**
 * User information
 */
export interface User {
  id: string
  tenant_id: string
  email: string
  is_active: boolean
  role: UserRole
  password_change_required: boolean
  password_changed_at: string | null
  terms_accepted_at: string | null
  terms_version: string | null
  created_at: string
  updated_at: string
  // User-level quota limits (2147483647 = effectively unlimited)
  transcription_seconds_limit: number
  text_cleanup_words_limit: number
  analysis_count_limit: number
}

/**
 * Response from /api/auth/me
 */
export interface MeResponse {
  user: User
  tenant: Tenant
  terms_acceptance_required: boolean
}

/**
 * Token response from login/refresh
 */
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  password_change_required: boolean
  terms_acceptance_required: boolean
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * Change password request payload
 */
export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

/**
 * Anonymous tenant ID - matches backend ANONYMOUS_TENANT_ID
 */
export const ANONYMOUS_TENANT_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Auth context state
 */
export interface AuthState {
  user: User | null
  tenant: Tenant | null
  isLoading: boolean
  isAuthenticated: boolean
  /** True if user is an anonymous demo user (should not access dashboard) */
  isAnonymous: boolean
  /** True if user needs to accept (or re-accept) terms before using the app */
  termsAcceptanceRequired: boolean
  error: string | null
}
