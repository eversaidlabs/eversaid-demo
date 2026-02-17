import { useMemo } from 'react'
import type { ProcessingStatus, ProcessingStage, StageId } from './types'
import type { TextImportStatus } from './useTextImport'

/**
 * Options for the useProcessingStages hook
 */
export interface UseProcessingStagesOptions {
  /** Current processing status from useTranscription */
  status: ProcessingStatus
  /** Whether analysis is currently polling/processing */
  isAnalyzing?: boolean
  /** Whether there was an error (shows error state on current stage) */
  hasError?: boolean
  /** Text import status (overrides transcription stages when active) */
  textImportStatus?: TextImportStatus
}

/**
 * Return type for the useProcessingStages hook
 */
export interface UseProcessingStagesReturn {
  /** Array of processing stages with their current status */
  stages: ProcessingStage[]
  /** ID of the currently active stage (or null if idle/complete) */
  currentStageId: StageId | null
  /** Whether any stage is actively processing */
  isProcessing: boolean
  /** Whether all stages are complete */
  isComplete: boolean
}

/**
 * Time estimates in seconds for each stage
 */
const STAGE_ESTIMATES: Record<StageId, { min: number; max: number }> = {
  upload: { min: 2, max: 10 },
  transcribe: { min: 30, max: 60 },
  cleanup: { min: 5, max: 15 },
  analyze: { min: 5, max: 10 },
}

/**
 * Hook to compute processing stages from transcription status
 *
 * Maps the ProcessingStatus enum to a visual stage array for the stepper UI.
 * Combines transcription status with analysis polling state.
 *
 * @example
 * ```tsx
 * const { stages, currentStageId, isProcessing } = useProcessingStages({
 *   status: transcription.status,
 *   isAnalyzing: analysisHook.isPolling,
 * })
 * ```
 */
export function useProcessingStages({
  status,
  isAnalyzing = false,
  hasError = false,
  textImportStatus,
}: UseProcessingStagesOptions): UseProcessingStagesReturn {
  const result = useMemo(() => {
    // Check if text import is active (overrides transcription flow)
    const isTextImportActive = textImportStatus && textImportStatus !== 'idle' && textImportStatus !== 'complete' && textImportStatus !== 'error'

    // Determine the status of each stage based on the overall processing status
    const getStageStatus = (stageId: StageId): ProcessingStage['status'] => {
      // Text import flow: skip upload/transcribe, show cleanup progress
      if (isTextImportActive) {
        switch (stageId) {
          case 'upload':
            // Upload is skipped for text import (completed/skipped)
            return 'completed'
          case 'transcribe':
            // Transcription is skipped for text import (completed/skipped)
            return 'completed'
          case 'cleanup':
            if (textImportStatus === 'importing') return 'active'
            if (textImportStatus === 'cleaning') return 'active'
            return 'pending'
          case 'analyze':
            return 'pending'
          default:
            return 'pending'
        }
      }

      // Error handling - mark current stage as error
      if (hasError && status === 'error') {
        // Infer which stage failed based on typical flow
        // This is a simplification - in practice, we'd track which stage failed
        return 'pending'
      }

      switch (stageId) {
        case 'upload':
          if (status === 'uploading') return 'active'
          if (['transcribing', 'cleaning', 'complete'].includes(status)) return 'completed'
          return 'pending'

        case 'transcribe':
          if (status === 'transcribing') return 'active'
          if (['cleaning', 'complete'].includes(status)) return 'completed'
          return 'pending'

        case 'cleanup':
          if (status === 'cleaning') return 'active'
          if (status === 'complete') return 'completed'
          return 'pending'

        case 'analyze':
          // Analysis runs after cleanup completes
          if (status === 'complete' && isAnalyzing) return 'active'
          if (status === 'complete' && !isAnalyzing) return 'completed'
          return 'pending'

        default:
          return 'pending'
      }
    }

    // Build stages array
    const stageIds: StageId[] = ['upload', 'transcribe', 'cleanup', 'analyze']
    const stages: ProcessingStage[] = stageIds.map((id) => ({
      id,
      status: getStageStatus(id),
      estimatedSeconds: STAGE_ESTIMATES[id],
    }))

    // Find current active stage
    const activeStage = stages.find((s) => s.status === 'active')
    const currentStageId = activeStage?.id ?? null

    // Determine if processing is happening
    const isProcessing = ['uploading', 'transcribing', 'cleaning'].includes(status) ||
      (status === 'complete' && isAnalyzing) ||
      !!isTextImportActive

    // All complete when status is complete and not analyzing
    const isComplete = (status === 'complete' && !isAnalyzing) ||
      (textImportStatus === 'complete')

    return {
      stages,
      currentStageId,
      isProcessing,
      isComplete,
    }
  }, [status, isAnalyzing, hasError, textImportStatus])

  return result
}
