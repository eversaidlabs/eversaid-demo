'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

import { getEntries } from '@/features/transcription/api'
import type { EntrySummary } from '@/features/transcription/types'

export type EntryType = 'audio' | 'text'

interface UseEntryListOptions {
  entryType: EntryType
  limit?: number
}

interface UseEntryListResult {
  entries: EntrySummary[]
  total: number
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

/**
 * Hook to fetch and manage entry list with pagination.
 *
 * Filters entries by type (audio or text) client-side using is_transcript_only field:
 * - audio: is_transcript_only=false (has audio file)
 * - text: is_transcript_only=true (text-only import, no audio)
 */
export function useEntryList({
  entryType,
  limit = 20,
}: UseEntryListOptions): UseEntryListResult {
  const [allEntries, setAllEntries] = useState<EntrySummary[]>([])
  const [offset, setOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiTotal, setApiTotal] = useState(0)

  // Filter entries client-side based on is_transcript_only
  // audio: is_transcript_only=false (has audio file)
  // text: is_transcript_only=true (no audio file, text import)
  const filteredEntries = useMemo(() => {
    return allEntries.filter((entry) => {
      if (entryType === 'audio') {
        return entry.is_transcript_only === false
      } else {
        return entry.is_transcript_only === true
      }
    })
  }, [allEntries, entryType])

  // Check if any entry is still processing (for auto-polling)
  const hasProcessingEntries = useMemo(() => {
    return filteredEntries.some((entry) => {
      const transcriptionStatus = entry.primary_transcription?.status
      const cleanupStatus = entry.latest_cleaned_entry?.status
      return (
        ['pending', 'processing'].includes(transcriptionStatus || '') ||
        ['pending', 'processing'].includes(cleanupStatus || '')
      )
    })
  }, [filteredEntries])

  // Fetch entries (no server-side filtering, filter client-side)
  const fetchEntries = useCallback(
    async (newOffset: number, append: boolean = false) => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch more entries than needed to account for client-side filtering
        // We need enough entries to fill the requested limit after filtering
        const { data } = await getEntries({
          limit: limit * 3, // Fetch extra to ensure we have enough after filtering
          offset: newOffset,
        })

        setAllEntries((prev) =>
          append ? [...prev, ...data.entries] : data.entries
        )
        setApiTotal(data.total)
        setOffset(newOffset)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch entries')
      } finally {
        setIsLoading(false)
      }
    },
    [limit]
  )

  // Initial load
  useEffect(() => {
    fetchEntries(0, false)
  }, [fetchEntries])

  // Poll for updates when entries are processing
  useEffect(() => {
    if (!hasProcessingEntries) return

    const interval = setInterval(() => {
      fetchEntries(0, false)
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [hasProcessingEntries, fetchEntries])

  // Refresh entries
  const refresh = useCallback(async () => {
    await fetchEntries(0, false)
  }, [fetchEntries])

  // Load more entries
  const loadMore = useCallback(async () => {
    const newOffset = offset + limit * 3
    await fetchEntries(newOffset, true)
  }, [offset, limit, fetchEntries])

  // Calculate if there are more entries to load
  // We have more if the API returned more entries than our current offset
  const hasMore = offset + allEntries.length < apiTotal

  return {
    entries: filteredEntries,
    total: filteredEntries.length,
    isLoading,
    error,
    refresh,
    loadMore,
    hasMore,
  }
}
