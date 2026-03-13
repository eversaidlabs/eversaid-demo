/**
 * Platform admin user management module.
 */

// Types
export type {
  AdminUser,
  PlatformUsersResponse,
  QuotaStatus,
  UpdateUserQuotaRequest,
  UserFilters,
  UserStats,
} from './types'

// API
export { AdminApiError, getPlatformUsers, getUserStats, updateUserQuota } from './api'

// Hooks
export {
  formatDuration,
  formatNumber,
  getOverallQuotaStatus,
  isUnlimited,
  UNLIMITED_LIMIT,
  useAdminUsers,
  useUserStats,
} from './useAdminUsers'
export { useAdminUserActions } from './useAdminUserActions'
