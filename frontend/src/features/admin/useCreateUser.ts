'use client'

import { useState, useCallback } from 'react'

import { createUser } from './api'
import type { CreateUserRequest, CreateUserResponse } from './types'

interface UseCreateUserResult {
  isCreating: boolean
  createError: string | null
  create: (data: CreateUserRequest) => Promise<CreateUserResponse | null>
  clearError: () => void
}

/**
 * Hook for creating new users.
 */
export function useCreateUser(): UseCreateUserResult {
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const create = useCallback(
    async (data: CreateUserRequest): Promise<CreateUserResponse | null> => {
      setIsCreating(true)
      setCreateError(null)

      try {
        const response = await createUser(data)
        return response
      } catch (err) {
        setCreateError(
          err instanceof Error ? err.message : 'Failed to create user'
        )
        return null
      } finally {
        setIsCreating(false)
      }
    },
    []
  )

  const clearError = useCallback(() => {
    setCreateError(null)
  }, [])

  return {
    isCreating,
    createError,
    create,
    clearError,
  }
}
