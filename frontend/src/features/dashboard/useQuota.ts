'use client'

import { useState, useEffect } from 'react'

import { getAccessToken } from '@/lib/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * Quota limits for a user or tenant.
 */
export interface QuotaLimits {
  transcription_seconds_limit: number
  text_cleanup_words_limit: number
  analysis_count_limit: number
}

/**
 * Current usage against quota limits.
 */
export interface QuotaUsage {
  transcription_seconds_used: number
  text_cleanup_words_used: number
  analysis_count_used: number
}

/**
 * Complete quota response.
 */
export interface QuotaResponse {
  user_limits: QuotaLimits
  tenant_limits: QuotaLimits
  effective_limits: QuotaLimits
  usage: QuotaUsage
}

/**
 * Formatted quota data for display.
 */
export interface FormattedQuota {
  audio: {
    used: number // seconds
    limit: number // seconds
  }
  text: {
    used: number // words
    limit: number // words
  }
  analysis: {
    used: number
    limit: number
  }
}

/**
 * Hook to fetch and format quota data.
 */
export function useQuota() {
  const [quota, setQuota] = useState<FormattedQuota | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchQuota() {
      const token = getAccessToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/quota`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch quota')
        }

        const data: QuotaResponse = await response.json()

        if (mounted) {
          setQuota({
            audio: {
              used: data.usage.transcription_seconds_used,
              limit: data.effective_limits.transcription_seconds_limit,
            },
            text: {
              used: data.usage.text_cleanup_words_used,
              limit: data.effective_limits.text_cleanup_words_limit,
            },
            analysis: {
              used: data.usage.analysis_count_used,
              limit: data.effective_limits.analysis_count_limit,
            },
          })
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchQuota()

    return () => {
      mounted = false
    }
  }, [])

  return { quota, isLoading, error }
}
