'use client'

import type React from 'react'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'

import { useTranscription } from '@/features/transcription/useTranscription'
import { useAudioPlayer } from '@/features/transcription/useAudioPlayer'
import { useWordHighlight } from '@/features/transcription/useWordHighlight'
import { useAnalysis } from '@/features/transcription/useAnalysis'
import { useFeedback } from '@/features/transcription/useFeedback'
import { useProcessingStages } from '@/features/transcription/useProcessingStages'
import {
  getEntryAudioUrl,
  getOptions,
  getCleanedEntries,
  getCleanedEntry,
  triggerCleanup,
  fetchAudioBlob,
} from '@/features/transcription/api'
import type { SpellcheckError, TextMoveSelection, ActiveSuggestion } from '@/components/demo/types'
import type { ModelInfo, CleanupType, CleanupSummary } from '@/features/transcription/types'
import { getCleanupModels } from '@/lib/model-config'
import { DEFAULT_CLEANUP_LEVEL, getDefaultModelForLevel } from '@/lib/level-config'

import { ProcessingStages } from '@/components/demo/processing-stages'
import {
  TranscriptComparisonLayout,
  AudioPlayer,
  AnalysisSection,
  FloatingFeedbackWidget,
  TranscriptLoadingSkeleton,
} from '@/components/transcript'

export type EntryType = 'audio' | 'text'

export interface EntryDetailContainerProps {
  /** Entry ID to load */
  entryId: string
  /** Type of entry (audio or text) */
  entryType: EntryType
  /** Locale for date formatting and translations */
  locale: string
  /** Callback when close button is clicked */
  onClose?: () => void
}

/**
 * Container component for entry detail view in the dashboard.
 * Wires all hooks (transcription, audio player, analysis, feedback)
 * to the shared transcript comparison layout.
 *
 * This is the dashboard equivalent of DemoPageContent but without
 * demo-specific features like upload, recording, waitlist, etc.
 */
export function EntryDetailContainer({
  entryId,
  entryType,
  locale,
  onClose,
}: EntryDetailContainerProps) {
  const t = useTranslations('dashboard')

  // Transcription hook - loads entry data and manages segments
  const transcription = useTranscription()

  // Load entry on mount
  useEffect(() => {
    if (entryId && transcription.status === 'idle') {
      transcription.loadEntry(entryId)
    }
  }, [entryId, transcription.status, transcription.loadEntry])

  // Audio playback hook (only for audio entries) with authenticated audio
  const audioUrl = entryType === 'audio' && transcription.entryId
    ? getEntryAudioUrl(transcription.entryId)
    : null

  const audioPlayer = useAudioPlayer({
    segments: transcription.segments,
    audioUrl,
    onSegmentChange: (segmentId) => setActiveSegmentId(segmentId),
    fallbackDuration: transcription.durationSeconds,
    requiresAuth: true,
    fetchAudioBlob,
  })

  // Word highlighting hook for playback
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null)
  const wordHighlight = useWordHighlight({
    segments: transcription.segments,
    currentTime: audioPlayer.currentTime,
    isPlaying: audioPlayer.isPlaying,
    activeSegmentId,
  })

  // Analysis hook
  const analysisHook = useAnalysis({
    cleanupId: transcription.cleanupId,
    analysisId: transcription.analysisId,
  })

  // Processing stages hook for visual stepper during processing
  const processingStages = useProcessingStages({
    status: transcription.status,
    isAnalyzing: analysisHook.isLoading,
    hasError: transcription.status === 'error',
  })

  // Feedback hook
  const feedbackHook = useFeedback({
    entryId: transcription.entryId ?? '',
    feedbackType: 'transcription',
  })

  // Cleanup options state
  const [cleanupModels, setCleanupModels] = useState<ModelInfo[]>([])
  const [selectedCleanupModel, setSelectedCleanupModel] = useState<string>('')
  const [selectedCleanupLevel, setSelectedCleanupLevel] = useState<CleanupType>(DEFAULT_CLEANUP_LEVEL)
  const [cleanupCache, setCleanupCache] = useState<CleanupSummary[]>([])
  const [hasManualCleanupModelSelection, setHasManualCleanupModelSelection] = useState(false)
  const [isReprocessingCleanup, setIsReprocessingCleanup] = useState(false)

  // Load analysis profiles on mount
  useEffect(() => {
    analysisHook.loadProfiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Populate analysis cache when analyses are loaded from entry
  useEffect(() => {
    if (transcription.analyses && transcription.analyses.length > 0) {
      analysisHook.populateCache(transcription.analyses)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcription.analyses])

  // Fetch cleanup models on mount
  useEffect(() => {
    getOptions()
      .then((options) => {
        const models = getCleanupModels(options.llm.models)
        setCleanupModels(models)
        if (models.length > 0 && !selectedCleanupModel) {
          const defaultModel = getDefaultModelForLevel(selectedCleanupLevel)
          if (defaultModel) {
            setSelectedCleanupModel(defaultModel)
          }
        }
      })
      .catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch cleanup cache when entry changes
  useEffect(() => {
    if (!transcription.entryId) return

    getCleanedEntries(transcription.entryId)
      .then((cache) => {
        setCleanupCache(cache)
      })
      .catch(console.error)
  }, [transcription.entryId])

  // Sync selected cleanup level with current entry's cleanup type
  useEffect(() => {
    if (transcription.cleanupTypeName) {
      setSelectedCleanupLevel(transcription.cleanupTypeName as CleanupType)
    }
  }, [transcription.cleanupTypeName])

  // UI State
  const [activeTab, setActiveTab] = useState<'transcript' | 'analysis'>('transcript')
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null)
  const [editedTexts, setEditedTexts] = useState<Map<string, string>>(new Map())
  const [revertedSegments, setRevertedSegments] = useState<Map<string, string>>(new Map())
  const [spellcheckErrors] = useState<Map<string, SpellcheckError[]>>(new Map())
  const [activeSuggestion, setActiveSuggestion] = useState<ActiveSuggestion | null>(null)
  const [showDiff, setShowDiff] = useState(true)
  const [showAnalysisMenu, setShowAnalysisMenu] = useState(false)
  const [textMoveSelection, setTextMoveSelection] = useState<TextMoveSelection | null>(null)
  const [isSelectingMoveTarget, setIsSelectingMoveTarget] = useState(false)

  // Computed values
  const showSpeakerLabels = useMemo(() => {
    const uniqueSpeakers = new Set(transcription.segments.map((seg) => seg.speaker))
    return uniqueSpeakers.size > 1
  }, [transcription.segments])

  const editingCount = Array.from(editedTexts.entries()).filter(([id, text]) => {
    const segment = transcription.segments.find((s) => s.id === id)
    return segment && text !== segment.cleanedText
  }).length

  // Segment handlers
  const handleRevertSegment = useCallback(
    async (segmentId: string) => {
      const originalCleaned = await transcription.revertSegmentToRaw(segmentId)
      if (originalCleaned) {
        setRevertedSegments((prev) => new Map(prev).set(segmentId, originalCleaned))
      }
    },
    [transcription]
  )

  const handleUndoRevert = useCallback(
    (segmentId: string) => {
      const originalCleanedText = revertedSegments.get(segmentId)
      if (originalCleanedText) {
        transcription.undoRevert(segmentId, originalCleanedText)
        setRevertedSegments((prev) => {
          const newMap = new Map(prev)
          newMap.delete(segmentId)
          return newMap
        })
      }
    },
    [revertedSegments, transcription]
  )

  const handleSaveSegment = useCallback(
    async (segmentId: string) => {
      const newText = editedTexts.get(segmentId)
      if (newText !== undefined) {
        await transcription.updateSegmentCleanedText(segmentId, newText)
      }
      setEditingSegmentId(null)
      setEditedTexts((prev) => {
        const newMap = new Map(prev)
        newMap.delete(segmentId)
        return newMap
      })
      setRevertedSegments((prev) => {
        const newMap = new Map(prev)
        newMap.delete(segmentId)
        return newMap
      })
    },
    [editedTexts, transcription]
  )

  const handleSegmentEditStart = useCallback(
    (segmentId: string) => {
      const segment = transcription.segments.find((s) => s.id === segmentId)
      if (segment) {
        setEditingSegmentId(segmentId)
        if (!editedTexts.has(segmentId)) {
          setEditedTexts((prev) => new Map(prev).set(segmentId, segment.cleanedText))
        }
      }
    },
    [transcription.segments, editedTexts]
  )

  const handleSegmentEditCancel = useCallback((segmentId: string) => {
    setEditingSegmentId(null)
    setEditedTexts((prev) => {
      const newMap = new Map(prev)
      newMap.delete(segmentId)
      return newMap
    })
    setActiveSuggestion(null)
  }, [])

  const handleTextChange = useCallback((segmentId: string, text: string) => {
    setEditedTexts((prev) => new Map(prev).set(segmentId, text))
  }, [])

  const handleWordClick = useCallback(
    (segmentId: string, e: React.MouseEvent, error: SpellcheckError) => {
      e.stopPropagation()
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      setActiveSuggestion({
        segmentId,
        word: error.word,
        position: { x: rect.left, y: rect.bottom + 5 },
        suggestions: error.suggestions,
      })
    },
    []
  )

  const handleSuggestionSelect = useCallback(
    (suggestion: string) => {
      if (!activeSuggestion) return

      const segmentId = activeSuggestion.segmentId
      const currentText = editedTexts.get(segmentId) || ''
      const errors = spellcheckErrors.get(segmentId) || []
      const error = errors.find((e) => e.word === activeSuggestion.word)

      if (error) {
        const newText = currentText.substring(0, error.start) + suggestion + currentText.substring(error.end)
        setEditedTexts((prev) => new Map(prev).set(segmentId, newText))
      }
      setActiveSuggestion(null)
    },
    [activeSuggestion, editedTexts, spellcheckErrors]
  )

  const handleCloseSuggestions = useCallback(() => {
    setActiveSuggestion(null)
  }, [])

  const handleUpdateAllSegments = useCallback(async () => {
    for (const [segmentId, text] of editedTexts.entries()) {
      await transcription.updateSegmentCleanedText(segmentId, text)
    }
    setEditingSegmentId(null)
    setEditedTexts(new Map())
  }, [editedTexts, transcription])

  const handleToggleDiff = useCallback(() => {
    setShowDiff((prev) => !prev)
  }, [])

  const handleToggleAnalysisMenu = useCallback(() => {
    setShowAnalysisMenu((prev) => !prev)
  }, [])

  const handleRawTextSelect = useCallback(
    (segmentId: string, text: string, startOffset: number, endOffset: number) => {
      setTextMoveSelection({
        text,
        sourceSegmentId: segmentId,
        sourceColumn: 'raw',
        startOffset,
        endOffset,
      })
      setIsSelectingMoveTarget(false)
    },
    []
  )

  const handleCleanedTextSelect = useCallback(
    (segmentId: string, text: string, startOffset: number, endOffset: number) => {
      setTextMoveSelection({
        text,
        sourceSegmentId: segmentId,
        sourceColumn: 'cleaned',
        startOffset,
        endOffset,
      })
      setIsSelectingMoveTarget(false)
    },
    []
  )

  const handleCleanedMoveTargetClick = useCallback(
    async (targetSegmentId: string) => {
      if (!textMoveSelection || textMoveSelection.sourceColumn !== 'cleaned') {
        setTextMoveSelection(null)
        setIsSelectingMoveTarget(false)
        window.getSelection()?.removeAllRanges()
        return
      }

      const { sourceSegmentId, text: selectedText } = textMoveSelection

      if (sourceSegmentId === targetSegmentId) {
        setTextMoveSelection(null)
        setIsSelectingMoveTarget(false)
        window.getSelection()?.removeAllRanges()
        return
      }

      const sourceSegment = transcription.segments.find((s) => s.id === sourceSegmentId)
      const targetSegment = transcription.segments.find((s) => s.id === targetSegmentId)

      if (!sourceSegment || !targetSegment) {
        setTextMoveSelection(null)
        setIsSelectingMoveTarget(false)
        window.getSelection()?.removeAllRanges()
        return
      }

      const sourceCurrentText = editedTexts.get(sourceSegmentId) ?? sourceSegment.cleanedText
      const targetCurrentText = editedTexts.get(targetSegmentId) ?? targetSegment.cleanedText

      const selectedTextTrimmed = selectedText.trim()
      const textIndex = sourceCurrentText.indexOf(selectedTextTrimmed)

      if (textIndex === -1) {
        setTextMoveSelection(null)
        setIsSelectingMoveTarget(false)
        window.getSelection()?.removeAllRanges()
        return
      }

      const newSourceText =
        sourceCurrentText.slice(0, textIndex) + sourceCurrentText.slice(textIndex + selectedTextTrimmed.length)
      const needsSpace = targetCurrentText.length > 0 && !targetCurrentText.endsWith(' ')
      const newTargetText = targetCurrentText + (needsSpace ? ' ' : '') + selectedTextTrimmed

      const updates = new Map<string, string>()
      updates.set(sourceSegmentId, newSourceText.trim())
      updates.set(targetSegmentId, newTargetText)

      await transcription.updateMultipleSegments(updates)

      setEditedTexts((prev) => {
        const newMap = new Map(prev)
        newMap.delete(sourceSegmentId)
        newMap.delete(targetSegmentId)
        return newMap
      })

      setTextMoveSelection(null)
      setIsSelectingMoveTarget(false)
      window.getSelection()?.removeAllRanges()
    },
    [textMoveSelection, transcription, editedTexts]
  )

  const handleRawMoveTargetClick = useCallback(
    (targetSegmentId: string) => {
      if (textMoveSelection?.sourceColumn === 'cleaned') {
        handleCleanedMoveTargetClick(targetSegmentId)
        return
      }
      setTextMoveSelection(null)
      setIsSelectingMoveTarget(false)
      window.getSelection()?.removeAllRanges()
    },
    [textMoveSelection, handleCleanedMoveTargetClick]
  )

  const handleSegmentClick = useCallback(
    (id: string) => {
      setActiveSegmentId(id)
      if (entryType === 'audio') {
        audioPlayer.seekToSegment(id)
      }
    },
    [audioPlayer, entryType]
  )

  const handlePlayPause = useCallback(() => {
    audioPlayer.togglePlayPause()
  }, [audioPlayer])

  const handleSeek = useCallback(
    (time: number) => {
      audioPlayer.seek(time)
    },
    [audioPlayer]
  )

  const handleSpeedChange = useCallback(
    (speed: number) => {
      audioPlayer.setPlaybackSpeed(speed as typeof audioPlayer.playbackSpeed)
    },
    [audioPlayer]
  )

  const handleDownload = useCallback(() => {
    if (!audioUrl || !transcription.entryId) return

    const link = document.createElement('a')
    link.href = audioUrl
    link.download = `eversaid-${transcription.entryId}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [audioUrl, transcription.entryId])

  const handleSelectProfile = useCallback(
    (profileId: string) => {
      analysisHook.selectProfile(profileId)
    },
    [analysisHook]
  )

  // Cleanup level change handler
  const handleCleanupLevelChange = useCallback(
    async (level: CleanupType, forceRerun?: boolean) => {
      setSelectedCleanupLevel(level)

      // Get the model to use (default for this level if no manual selection)
      const defaultModel = getDefaultModelForLevel(level)
      const modelToUse = hasManualCleanupModelSelection
        ? selectedCleanupModel
        : (defaultModel || selectedCleanupModel)

      if (!hasManualCleanupModelSelection && defaultModel) {
        setSelectedCleanupModel(defaultModel)
      }

      // Check if we have a cached cleanup for this level/model combination
      const cachedCleanup = cleanupCache.find(c =>
        c.llm_model === modelToUse &&
        c.cleanup_type === level &&
        c.status === 'completed'
      )

      if (cachedCleanup && !forceRerun) {
        // Load the cached cleanup
        try {
          const cleanedEntry = await getCleanedEntry(cachedCleanup.id)
          transcription.loadCleanupData(cleanedEntry)
        } catch (error) {
          console.error('Failed to load cached cleanup:', error)
        }
      } else if (transcription.transcriptionId) {
        // Trigger new cleanup
        setIsReprocessingCleanup(true)
        try {
          await triggerCleanup(transcription.transcriptionId, {
            cleanupType: level,
            llmModel: modelToUse,
          })
          // Reload entry to get updated status
          await transcription.loadEntry(entryId)
          // Refresh cleanup cache
          if (transcription.entryId) {
            const cache = await getCleanedEntries(transcription.entryId)
            setCleanupCache(cache)
          }
        } catch (error) {
          console.error('Failed to trigger cleanup:', error)
        } finally {
          setIsReprocessingCleanup(false)
        }
      }
    },
    [
      hasManualCleanupModelSelection,
      selectedCleanupModel,
      cleanupCache,
      transcription,
      entryId,
    ]
  )

  // Cleanup model change handler
  const handleCleanupModelChange = useCallback(
    (modelId: string) => {
      setSelectedCleanupModel(modelId)
      setHasManualCleanupModelSelection(true)
    },
    []
  )

  // Close handler
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose()
    }
  }, [onClose])

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  // Loading state
  if (transcription.status === 'loading' || transcription.status === 'idle') {
    return (
      <div className="bg-card border-b border-border overflow-hidden flex flex-col fixed inset-0 z-30">
        <div className="flex-1 flex items-center justify-center">
          <TranscriptLoadingSkeleton />
        </div>
      </div>
    )
  }

  // Processing state (check BEFORE error state to handle empty segments during processing)
  if (transcription.status === 'transcribing' || transcription.status === 'cleaning') {
    return (
      <div className="bg-card border-b border-border overflow-hidden flex flex-col fixed inset-0 z-30">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-[65%] h-[40%] bg-white rounded-xl border border-[#E2E8F0] shadow-lg flex items-center justify-center">
            <ProcessingStages
              stages={processingStages.stages}
              currentStageId={processingStages.currentStageId}
            />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (transcription.status === 'error') {
    return (
      <div className="bg-card border-b border-border overflow-hidden flex flex-col fixed inset-0 z-30">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 max-w-md">
            {transcription.error || t('detail.notFound')}
          </div>
        </div>
      </div>
    )
  }

  // No segments after loading completed
  if (!transcription.segments.length) {
    return (
      <div className="bg-card border-b border-border overflow-hidden flex flex-col fixed inset-0 z-30">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 max-w-md">
            {t('detail.notFound')}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border-b border-border overflow-hidden flex flex-col fixed inset-0 z-30">

      {/* Audio Player (only for audio entries) */}
      {entryType === 'audio' && audioPlayer.effectiveAudioUrl && (
        <>
          <audio
            src={audioPlayer.effectiveAudioUrl}
            {...audioPlayer.audioProps}
            preload="metadata"
            className="hidden"
          />
          <div className="flex-shrink-0">
            <AudioPlayer
              isPlaying={audioPlayer.isPlaying}
              currentTime={audioPlayer.currentTime}
              duration={audioPlayer.duration}
              playbackSpeed={audioPlayer.playbackSpeed}
              isFullscreen={true}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onSpeedChange={handleSpeedChange}
              onDownload={handleDownload}
            />
          </div>
        </>
      )}

      {/* Audio loading state */}
      {entryType === 'audio' && audioPlayer.isLoadingAudio && (
        <div className="flex-shrink-0 px-6 py-2 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            {t('detail.loadingAudio')}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-border flex-shrink-0">
        <button
          onClick={() => setActiveTab('transcript')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'transcript'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('detail.transcript')}
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'analysis'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('detail.analysis')}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden bg-background">
        {activeTab === 'transcript' ? (
          <TranscriptComparisonLayout
            segments={transcription.segments}
            activeSegmentId={activeSegmentId}
            editingSegmentId={editingSegmentId}
            editedTexts={editedTexts}
            revertedSegments={revertedSegments}
            spellcheckErrors={spellcheckErrors}
            showDiff={showDiff}
            showSpeakerLabels={showSpeakerLabels}
            textMoveSelection={textMoveSelection}
            isSelectingMoveTarget={isSelectingMoveTarget}
            activeSuggestion={activeSuggestion}
            editingCount={editingCount}
            activeWordIndex={wordHighlight.activeWordIndex}
            isPlaying={audioPlayer.isPlaying}
            onSegmentClick={handleSegmentClick}
            onRevert={handleRevertSegment}
            onUndoRevert={handleUndoRevert}
            onSave={handleSaveSegment}
            onEditStart={handleSegmentEditStart}
            onEditCancel={handleSegmentEditCancel}
            onTextChange={handleTextChange}
            onWordClick={handleWordClick}
            onSuggestionSelect={handleSuggestionSelect}
            onCloseSuggestions={handleCloseSuggestions}
            onUpdateAll={handleUpdateAllSegments}
            onToggleDiff={handleToggleDiff}
            onRawTextSelect={handleRawTextSelect}
            onCleanedTextSelect={handleCleanedTextSelect}
            onRawMoveTargetClick={handleRawMoveTargetClick}
            onCleanedMoveTargetClick={handleCleanedMoveTargetClick}
            cleanupOptions={{
              models: cleanupModels,
              selectedModel: selectedCleanupModel,
              selectedLevel: selectedCleanupLevel,
              isProcessing: isReprocessingCleanup,
              onModelChange: handleCleanupModelChange,
              onLevelChange: handleCleanupLevelChange,
              cachedCleanups: cleanupCache,
              hasManualSelection: hasManualCleanupModelSelection,
              currentPromptName: transcription.cleanupPromptName,
              currentTemperature: transcription.cleanupTemperature,
            }}
          />
        ) : (
          <div className="h-full overflow-y-auto p-6">
            <AnalysisSection
              analysisType="summary"
              analysisData={analysisHook.data}
              showAnalysisMenu={showAnalysisMenu}
              isLoading={analysisHook.isLoading}
              error={analysisHook.error}
              profiles={analysisHook.profiles}
              currentProfileId={analysisHook.currentProfileId}
              currentProfileLabel={analysisHook.currentProfileLabel}
              currentProfileIntent={analysisHook.currentProfileIntent}
              onAnalysisTypeChange={() => {}}
              onToggleAnalysisMenu={handleToggleAnalysisMenu}
              onSelectProfile={handleSelectProfile}
            />
          </div>
        )}
      </div>

      {/* Floating Feedback Widget */}
      <FloatingFeedbackWidget
        rating={feedbackHook.rating}
        feedback={feedbackHook.feedbackText}
        onRatingChange={feedbackHook.setRating}
        onFeedbackChange={feedbackHook.setFeedbackText}
        onSubmit={feedbackHook.submit}
        isLoading={feedbackHook.isLoading}
        isSubmitting={feedbackHook.isSubmitting}
        isSubmitted={feedbackHook.isSubmitted}
        hasExisting={feedbackHook.hasExisting}
        disabled={!transcription.entryId}
      />
    </div>
  )
}
