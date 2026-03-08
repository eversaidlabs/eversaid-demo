'use client'

import { useState, useCallback } from 'react'

import { getAccessToken } from '@/lib/auth'
import { deleteEntry, getEntryAudioUrl, getEntry } from '@/features/transcription/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface UseEntryActionsResult {
  // Rename
  renameEntry: (entryId: string, newName: string) => Promise<void>
  isRenaming: boolean
  renameError: string | null

  // Download
  downloadTranscript: (entryId: string, filename: string) => Promise<void>
  downloadAudio: (entryId: string, filename: string) => void
  isDownloading: boolean

  // Delete
  removeEntry: (entryId: string) => Promise<void>
  isDeleting: boolean
  deleteError: string | null
}

/**
 * Hook for entry actions: rename, download, delete.
 */
export function useEntryActions(): UseEntryActionsResult {
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Rename entry
  const renameEntry = useCallback(async (entryId: string, newName: string) => {
    setIsRenaming(true)
    setRenameError(null)

    try {
      const token = getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const response = await fetch(`${API_BASE_URL}/api/entries/${entryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ original_filename: newName }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || 'Failed to rename entry')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rename'
      setRenameError(message)
      throw err
    } finally {
      setIsRenaming(false)
    }
  }, [])

  // Download transcript as .txt file
  const downloadTranscript = useCallback(
    async (entryId: string, filename: string) => {
      setIsDownloading(true)

      try {
        // Fetch entry details to get cleaned text
        const { data: entry } = await getEntry(entryId)

        // Get cleaned text or raw text
        const text =
          entry.cleanup?.cleaned_text ||
          entry.primary_transcription?.text ||
          entry.primary_transcription?.transcribed_text ||
          ''

        // Create and download file
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename.replace(/\.[^.]+$/, '.txt') // Replace extension with .txt
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } finally {
        setIsDownloading(false)
      }
    },
    []
  )

  // Download audio file
  const downloadAudio = useCallback((entryId: string, filename: string) => {
    const token = getAccessToken()
    if (!token) return

    // Create link to audio endpoint
    const audioUrl = getEntryAudioUrl(entryId)

    // For authenticated download, we need to fetch with auth header
    // then create blob URL
    fetch(audioUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
  }, [])

  // Delete entry
  const removeEntry = useCallback(async (entryId: string) => {
    setIsDeleting(true)
    setDeleteError(null)

    try {
      await deleteEntry(entryId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      setDeleteError(message)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return {
    renameEntry,
    isRenaming,
    renameError,
    downloadTranscript,
    downloadAudio,
    isDownloading,
    removeEntry,
    isDeleting,
    deleteError,
  }
}
