'use client'

import { useState, useCallback } from 'react'

import { updateUserQuota } from './api'
import type { UpdateUserQuotaRequest } from './types'

interface UseAdminUserActionsResult {
  isUpdating: boolean
  updateError: string | null
  updateQuota: (
    userId: string,
    quota: UpdateUserQuotaRequest
  ) => Promise<boolean>
  clearError: () => void
}

/**
 * Hook for admin user actions (edit quota, etc.).
 */
export function useAdminUserActions(): UseAdminUserActionsResult {
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const updateQuotaAction = useCallback(
    async (
      userId: string,
      quota: UpdateUserQuotaRequest
    ): Promise<boolean> => {
      setIsUpdating(true)
      setUpdateError(null)

      try {
        await updateUserQuota(userId, quota)
        return true
      } catch (err) {
        setUpdateError(
          err instanceof Error ? err.message : 'Failed to update quota'
        )
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    []
  )

  const clearError = useCallback(() => {
    setUpdateError(null)
  }, [])

  return {
    isUpdating,
    updateError,
    updateQuota: updateQuotaAction,
    clearError,
  }
}
