/**
 * useTextImport - Hook for importing text and running cleanup (skip transcription)
 *
 * Allows users to paste existing transcripts for cleanup + analysis.
 * Similar to the audio upload flow but starts directly at cleanup stage.
 */

import { useState, useCallback, useRef, useEffect } from "react"
import { importAndCleanup, getCleanedEntry } from "./api"
import type { ImportTextOptions, RateLimitInfo } from "./types"

const POLL_INTERVAL_MS = 2000

export type TextImportStatus =
  | 'idle'
  | 'importing'
  | 'cleaning'
  | 'complete'
  | 'error'

export interface UseTextImportReturn {
  /** Current status of the import flow */
  status: TextImportStatus
  /** Error message if status is 'error' */
  error: string | null
  /** Entry ID after successful import */
  entryId: string | null
  /** Cleanup ID for the imported entry */
  cleanupId: string | null
  /** Start the import flow */
  importText: (options: ImportTextOptions) => Promise<void>
  /** Reset state to idle */
  reset: () => void
  /** Rate limit info from the last API call */
  rateLimitInfo: RateLimitInfo | null
}

export interface UseTextImportOptions {
  /** Callback when import + cleanup completes successfully */
  onComplete?: (entryId: string, cleanupId: string) => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
  /** Rate limit update callback */
  onRateLimitUpdate?: (info: RateLimitInfo) => void
}

/**
 * Hook for importing text and running AI cleanup.
 *
 * Flow:
 * 1. Call importText() with text content and options
 * 2. POST to /api/import-text (status: 'importing')
 * 3. Poll cleanup status until complete (status: 'cleaning')
 * 4. On complete, call onComplete with entry/cleanup IDs (status: 'complete')
 */
export function useTextImport(options: UseTextImportOptions = {}): UseTextImportReturn {
  const { onComplete, onError, onRateLimitUpdate } = options

  const [status, setStatus] = useState<TextImportStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [entryId, setEntryId] = useState<string | null>(null)
  const [cleanupId, setCleanupId] = useState<string | null>(null)
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)

  // Polling interval ref
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  // Poll cleanup status
  const pollCleanupStatus = useCallback(
    async (id: string, entryIdValue: string) => {
      const poll = async () => {
        try {
          const { data: cleanedEntry, rateLimitInfo: limitInfo } = await getCleanedEntry(id)

          if (limitInfo) {
            setRateLimitInfo(limitInfo)
            onRateLimitUpdate?.(limitInfo)
          }

          if (cleanedEntry.status === 'completed') {
            stopPolling()
            setStatus('complete')
            onComplete?.(entryIdValue, id)
          } else if (cleanedEntry.status === 'failed') {
            stopPolling()
            const errorMsg = cleanedEntry.error_message || 'Cleanup failed'
            setError(errorMsg)
            setStatus('error')
            onError?.(new Error(errorMsg))
          } else {
            // Still processing, continue polling
            pollIntervalRef.current = setTimeout(poll, POLL_INTERVAL_MS)
          }
        } catch (err) {
          stopPolling()
          const errorMsg = err instanceof Error ? err.message : 'Failed to check cleanup status'
          setError(errorMsg)
          setStatus('error')
          onError?.(err instanceof Error ? err : new Error(errorMsg))
        }
      }

      // Start polling
      pollIntervalRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    },
    [stopPolling, onComplete, onError, onRateLimitUpdate]
  )

  // Import text and start cleanup
  const importText = useCallback(
    async (importOptions: ImportTextOptions) => {
      // Validate input
      if (!importOptions.text.trim()) {
        const errorMsg = 'Text cannot be empty'
        setError(errorMsg)
        setStatus('error')
        onError?.(new Error(errorMsg))
        return
      }

      // Reset state
      setStatus('importing')
      setError(null)
      setEntryId(null)
      setCleanupId(null)
      stopPolling()

      try {
        // Call API to import text
        const { data, rateLimitInfo: limitInfo } = await importAndCleanup(importOptions)

        if (limitInfo) {
          setRateLimitInfo(limitInfo)
          onRateLimitUpdate?.(limitInfo)
        }

        setEntryId(data.entry_id)
        setCleanupId(data.cleanup_id)

        // Check if cleanup is already complete
        if (data.cleanup_status === 'completed') {
          setStatus('complete')
          onComplete?.(data.entry_id, data.cleanup_id)
        } else if (data.cleanup_status === 'failed') {
          setError('Cleanup failed')
          setStatus('error')
          onError?.(new Error('Cleanup failed'))
        } else {
          // Start polling for cleanup completion
          setStatus('cleaning')
          pollCleanupStatus(data.cleanup_id, data.entry_id)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Import failed'
        setError(errorMsg)
        setStatus('error')
        onError?.(err instanceof Error ? err : new Error(errorMsg))
      }
    },
    [stopPolling, pollCleanupStatus, onComplete, onError, onRateLimitUpdate]
  )

  // Reset state
  const reset = useCallback(() => {
    stopPolling()
    setStatus('idle')
    setError(null)
    setEntryId(null)
    setCleanupId(null)
  }, [stopPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  return {
    status,
    error,
    entryId,
    cleanupId,
    importText,
    reset,
    rateLimitInfo,
  }
}
