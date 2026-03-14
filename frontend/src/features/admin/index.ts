/**
 * Platform admin user management module.
 */

// Types
export type {
  AdminTenant,
  AdminUser,
  CreateUserRequest,
  CreateUserResponse,
  PlatformUsersResponse,
  QuotaStatus,
  UpdateUserQuotaRequest,
  UserFilters,
  UserStats,
} from './types'

// API
export {
  AdminApiError,
  createUser,
  getPlatformUsers,
  getTenants,
  getUserStats,
  updateUserQuota,
} from './api'

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
export { useCreateUser } from './useCreateUser'
