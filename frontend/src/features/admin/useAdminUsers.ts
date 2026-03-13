'use client'

import { useState, useEffect, useCallback } from 'react'

import { getPlatformUsers, getUserStats } from './api'
import type {
  AdminUser,
  QuotaStatus,
  UserFilters,
  UserStats,
} from './types'

interface UseAdminUsersOptions {
  limit?: number
  initialFilters?: UserFilters
}

interface UseAdminUsersResult {
  users: AdminUser[]
  total: number
  isLoading: boolean
  error: string | null
  filters: UserFilters
  setFilters: (filters: UserFilters) => void
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

/**
 * Hook to fetch and manage the platform admin user list.
 */
export function useAdminUsers({
  limit = 50,
  initialFilters = {},
}: UseAdminUsersOptions = {}): UseAdminUsersResult {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<UserFilters>(initialFilters)

  const fetchUsers = useCallback(
    async (newOffset: number, append: boolean = false) => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getPlatformUsers(filters, limit, newOffset)

        setUsers((prev) => (append ? [...prev, ...data.users] : data.users))
        setTotal(data.total)
        setOffset(newOffset)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch users')
      } finally {
        setIsLoading(false)
      }
    },
    [filters, limit]
  )

  // Initial load and filter changes
  useEffect(() => {
    fetchUsers(0, false)
  }, [fetchUsers])

  const refresh = useCallback(async () => {
    await fetchUsers(0, false)
  }, [fetchUsers])

  const loadMore = useCallback(async () => {
    const newOffset = offset + limit
    await fetchUsers(newOffset, true)
  }, [offset, limit, fetchUsers])

  const hasMore = offset + users.length < total

  return {
    users,
    total,
    isLoading,
    error,
    filters,
    setFilters,
    refresh,
    loadMore,
    hasMore,
  }
}

interface UseUserStatsOptions {
  userId: string
  enabled?: boolean
}

interface UseUserStatsResult {
  stats: UserStats | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook to fetch user statistics (lazy-loaded per row).
 */
export function useUserStats({
  userId,
  enabled = true,
}: UseUserStatsOptions): UseUserStatsResult {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!enabled || !userId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await getUserStats(userId)
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats')
    } finally {
      setIsLoading(false)
    }
  }, [userId, enabled])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const refresh = useCallback(async () => {
    await fetchStats()
  }, [fetchStats])

  return {
    stats,
    isLoading,
    error,
    refresh,
  }
}

/**
 * Get the worst quota status from a user's stats.
 */
export function getOverallQuotaStatus(stats: UserStats | null): QuotaStatus {
  if (!stats) return 'ok'
  return stats.overall_quota_status
}

/**
 * Format seconds as human readable duration.
 */
export function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  return `${seconds}s`
}

/**
 * Format large numbers with K/M suffix.
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * Check if a limit represents "unlimited" (INT_MAX).
 */
export const UNLIMITED_LIMIT = 2147483647

export function isUnlimited(limit: number): boolean {
  return limit >= UNLIMITED_LIMIT
}
