'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UNLIMITED_LIMIT, isUnlimited } from '@/features/admin'
import type { AdminUser, UpdateUserQuotaRequest } from '@/features/admin/types'

interface EditQuotaDialogProps {
  isOpen: boolean
  user: AdminUser | null
  onClose: () => void
  onSave: (userId: string, quota: UpdateUserQuotaRequest) => Promise<boolean>
  isLoading?: boolean
  error?: string | null
}

interface FormState {
  transcriptionSeconds: string
  textCleanupWords: string
  analysisCount: string
  transcriptionUnlimited: boolean
  textCleanupUnlimited: boolean
  analysisUnlimited: boolean
}

/**
 * Compute initial form state from user props.
 */
function getInitialState(user: AdminUser): FormState {
  const transUnlimited = isUnlimited(user.transcription_seconds_limit)
  const textUnlimited = isUnlimited(user.text_cleanup_words_limit)
  const analysisUnlimitedVal = isUnlimited(user.analysis_count_limit)

  return {
    transcriptionSeconds: transUnlimited
      ? ''
      : String(user.transcription_seconds_limit),
    textCleanupWords: textUnlimited
      ? ''
      : String(user.text_cleanup_words_limit),
    analysisCount: analysisUnlimitedVal
      ? ''
      : String(user.analysis_count_limit),
    transcriptionUnlimited: transUnlimited,
    textCleanupUnlimited: textUnlimited,
    analysisUnlimited: analysisUnlimitedVal,
  }
}

/**
 * Dialog for editing user quota limits.
 * Uses a separate inner component that remounts when user changes,
 * ensuring form state is reset for each user.
 */
export function EditQuotaDialog({
  isOpen,
  user,
  onClose,
  onSave,
  isLoading,
  error,
}: EditQuotaDialogProps) {
  // Handle escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isLoading, onClose])

  if (!isOpen || !user) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => !isLoading && onClose()}
      />

      {/* Dialog - inner component remounts when user.id changes, resetting form state */}
      <EditQuotaDialogContent
        key={user.id}
        user={user}
        onClose={onClose}
        onSave={onSave}
        isLoading={isLoading}
        error={error}
      />
    </>
  )
}

interface EditQuotaDialogContentProps {
  user: AdminUser
  onClose: () => void
  onSave: (userId: string, quota: UpdateUserQuotaRequest) => Promise<boolean>
  isLoading?: boolean
  error?: string | null
}

/**
 * Inner dialog content component.
 * State is initialized from user prop on mount and reset when component remounts.
 */
function EditQuotaDialogContent({
  user,
  onClose,
  onSave,
  isLoading,
  error,
}: EditQuotaDialogContentProps) {
  const t = useTranslations('admin.users')

  // Initialize state from user prop - component remounts when user changes
  const [formState, setFormState] = useState<FormState>(() =>
    getInitialState(user)
  )

  // Destructure for easier access in JSX
  const {
    transcriptionSeconds,
    textCleanupWords,
    analysisCount,
    transcriptionUnlimited,
    textCleanupUnlimited,
    analysisUnlimited,
  } = formState

  // Helper to update a single field
  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const quota: UpdateUserQuotaRequest = {}

      // Only include fields that have changed
      const newTranscriptionLimit = transcriptionUnlimited
        ? UNLIMITED_LIMIT
        : parseInt(transcriptionSeconds, 10)
      if (
        !isNaN(newTranscriptionLimit) &&
        newTranscriptionLimit !== user.transcription_seconds_limit
      ) {
        quota.transcription_seconds_limit = newTranscriptionLimit
      }

      const newTextLimit = textCleanupUnlimited
        ? UNLIMITED_LIMIT
        : parseInt(textCleanupWords, 10)
      if (
        !isNaN(newTextLimit) &&
        newTextLimit !== user.text_cleanup_words_limit
      ) {
        quota.text_cleanup_words_limit = newTextLimit
      }

      const newAnalysisLimit = analysisUnlimited
        ? UNLIMITED_LIMIT
        : parseInt(analysisCount, 10)
      if (
        !isNaN(newAnalysisLimit) &&
        newAnalysisLimit !== user.analysis_count_limit
      ) {
        quota.analysis_count_limit = newAnalysisLimit
      }

      // Only save if there are changes
      if (Object.keys(quota).length > 0) {
        const success = await onSave(user.id, quota)
        if (success) {
          onClose()
        }
      } else {
        onClose()
      }
    },
    [
      user,
      transcriptionUnlimited,
      transcriptionSeconds,
      textCleanupUnlimited,
      textCleanupWords,
      analysisUnlimited,
      analysisCount,
      onSave,
      onClose,
    ]
  )

  return (
    <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
      <h2 className="mb-2 text-lg font-semibold text-slate-900">
        {t('editQuotaDialog.title')}
      </h2>
      <p className="mb-6 text-sm text-slate-500">
        {t('editQuotaDialog.description', { email: user.email })}
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Transcription seconds */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="transcription-seconds">
                {t('editQuotaDialog.transcriptionSeconds')}
              </Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={transcriptionUnlimited}
                  onChange={(e) =>
                    updateField('transcriptionUnlimited', e.target.checked)
                  }
                  className="rounded border-slate-300"
                />
                {t('editQuotaDialog.unlimited')}
              </label>
            </div>
            <Input
              id="transcription-seconds"
              type="number"
              min={1}
              placeholder={t('editQuotaDialog.secondsPlaceholder')}
              value={transcriptionSeconds}
              onChange={(e) =>
                updateField('transcriptionSeconds', e.target.value)
              }
              disabled={isLoading || transcriptionUnlimited}
            />
            <p className="mt-1 text-xs text-slate-500">
              {t('editQuotaDialog.transcriptionHint')}
            </p>
          </div>

          {/* Text cleanup words */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="text-cleanup-words">
                {t('editQuotaDialog.textCleanupWords')}
              </Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={textCleanupUnlimited}
                  onChange={(e) =>
                    updateField('textCleanupUnlimited', e.target.checked)
                  }
                  className="rounded border-slate-300"
                />
                {t('editQuotaDialog.unlimited')}
              </label>
            </div>
            <Input
              id="text-cleanup-words"
              type="number"
              min={1}
              placeholder={t('editQuotaDialog.wordsPlaceholder')}
              value={textCleanupWords}
              onChange={(e) => updateField('textCleanupWords', e.target.value)}
              disabled={isLoading || textCleanupUnlimited}
            />
          </div>

          {/* Analysis count */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="analysis-count">
                {t('editQuotaDialog.analysisCount')}
              </Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={analysisUnlimited}
                  onChange={(e) =>
                    updateField('analysisUnlimited', e.target.checked)
                  }
                  className="rounded border-slate-300"
                />
                {t('editQuotaDialog.unlimited')}
              </label>
            </div>
            <Input
              id="analysis-count"
              type="number"
              min={1}
              placeholder={t('editQuotaDialog.countPlaceholder')}
              value={analysisCount}
              onChange={(e) => updateField('analysisCount', e.target.value)}
              disabled={isLoading || analysisUnlimited}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {t('editQuotaDialog.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? t('editQuotaDialog.saving')
              : t('editQuotaDialog.save')}
          </Button>
        </div>
      </form>
    </div>
  )
}
