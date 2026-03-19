"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { RawSegmentList } from "./raw-segment-list"
import { EditableSegmentList } from "./editable-segment-list"
import { TranscriptHeader, type CleanupOptionsProps } from "./transcript-header"
import type { Segment, TextMoveSelection, ActiveSuggestion, SpellcheckError } from "./types"

interface TranscriptComparisonLayoutProps {
  segments: Segment[]
  activeSegmentId: string | null
  editingSegmentId: string | null
  editedTexts: Map<string, string>
  revertedSegments: Map<string, string>
  spellcheckErrors: Map<string, SpellcheckError[]>
  showDiff: boolean
  showSpeakerLabels: boolean
  textMoveSelection: TextMoveSelection | null
  isSelectingMoveTarget: boolean
  activeSuggestion: ActiveSuggestion | null
  editingCount: number
  /** Index of the currently active word within the active segment */
  activeWordIndex?: number
  /** Whether audio is currently playing */
  isPlaying?: boolean
  onSegmentClick: (segmentId: string) => void
  /** Callback when a word is clicked in raw transcript - seeks to that time in audio */
  onWordSeek?: (timeSeconds: number) => void
  onRevert: (segmentId: string) => void
  onUndoRevert: (segmentId: string) => void
  onSave: (segmentId: string) => void
  onEditStart: (segmentId: string) => void
  onEditCancel: (segmentId: string) => void
  onTextChange: (segmentId: string, text: string) => void
  onWordClick: (segmentId: string, e: React.MouseEvent, error: SpellcheckError) => void
  onSuggestionSelect: (suggestion: string) => void
  onCloseSuggestions: () => void
  onUpdateAll: () => void
  onToggleDiff: () => void
  onRawTextSelect: (segmentId: string, text: string, startOffset: number, endOffset: number) => void
  onCleanedTextSelect: (segmentId: string, text: string, startOffset: number, endOffset: number) => void
  onRawMoveTargetClick: (segmentId: string) => void
  onCleanedMoveTargetClick: (segmentId: string) => void
  showRevertButton?: boolean
  showCopyButton?: boolean
  /** Cleanup options for AI CLEANED header (model/level selection) */
  cleanupOptions?: CleanupOptionsProps
  /** Entry title for export filename (e.g., original filename) */
  entryTitle?: string
  /** Whether this is an audio entry (shows download audio option) */
  isAudioEntry?: boolean
  /** Callback to download audio file */
  onDownloadAudio?: () => void
}

export function TranscriptComparisonLayout({
  segments,
  activeSegmentId,
  editingSegmentId,
  editedTexts,
  revertedSegments,
  spellcheckErrors,
  showDiff,
  showSpeakerLabels,
  textMoveSelection,
  isSelectingMoveTarget,
  activeSuggestion,
  editingCount,
  activeWordIndex = -1,
  isPlaying = false,
  onSegmentClick,
  onWordSeek,
  onRevert,
  onUndoRevert,
  onSave,
  onEditStart,
  onEditCancel,
  onTextChange,
  onWordClick,
  onSuggestionSelect,
  onCloseSuggestions,
  onUpdateAll,
  onToggleDiff,
  onRawTextSelect,
  onCleanedTextSelect,
  onRawMoveTargetClick,
  onCleanedMoveTargetClick,
  showRevertButton = true,
  showCopyButton = true,
  cleanupOptions,
  entryTitle,
  isAudioEntry = false,
  onDownloadAudio,
}: TranscriptComparisonLayoutProps) {
  const t = useTranslations('demo.transcript')
  const rawScrollRef = useRef<HTMLDivElement>(null)
  const cleanedScrollRef = useRef<HTMLDivElement>(null)
  const isSyncingScrollRef = useRef(false)

  // Collapse state with localStorage persistence
  // Initialize as false for SSR, then sync with localStorage after mount
  const [isRawCollapsed, setIsRawCollapsed] = useState(false)

  // Sync with localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem('eversaid_raw_column_collapsed')
    if (stored === 'true') {
      setIsRawCollapsed(true)
    }
  }, [])

  const handleCollapse = useCallback(() => {
    setIsRawCollapsed(true)
    localStorage.setItem('eversaid_raw_column_collapsed', 'true')
  }, [])

  const handleExpand = useCallback(() => {
    setIsRawCollapsed(false)
    localStorage.setItem('eversaid_raw_column_collapsed', 'false')
  }, [])

  const handleRawScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingScrollRef.current || isRawCollapsed) return

    const rawEl = e.currentTarget
    const cleanedEl = cleanedScrollRef.current
    if (!cleanedEl) return

    isSyncingScrollRef.current = true

    // Use percentage-based scrolling to handle different content heights
    const rawMaxScroll = rawEl.scrollHeight - rawEl.clientHeight
    const cleanedMaxScroll = cleanedEl.scrollHeight - cleanedEl.clientHeight

    if (rawMaxScroll > 0 && cleanedMaxScroll > 0) {
      const scrollPercentage = rawEl.scrollTop / rawMaxScroll
      cleanedEl.scrollTop = scrollPercentage * cleanedMaxScroll
    }

    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false
    })
  }

  const handleCleanedScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingScrollRef.current || isRawCollapsed) return

    const cleanedEl = e.currentTarget
    const rawEl = rawScrollRef.current
    if (!rawEl) return

    isSyncingScrollRef.current = true

    // Use percentage-based scrolling to handle different content heights
    const rawMaxScroll = rawEl.scrollHeight - rawEl.clientHeight
    const cleanedMaxScroll = cleanedEl.scrollHeight - cleanedEl.clientHeight

    if (rawMaxScroll > 0 && cleanedMaxScroll > 0) {
      const scrollPercentage = cleanedEl.scrollTop / cleanedMaxScroll
      rawEl.scrollTop = scrollPercentage * rawMaxScroll
    }

    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false
    })
  }

  // Sync heights of corresponding segments so they align horizontally
  useEffect(() => {
    // Skip height sync when raw column is collapsed
    if (isRawCollapsed) return

    const syncHeights = () => {
      segments.forEach((seg) => {
        const rawEl = rawScrollRef.current?.querySelector(`[data-segment-id="${seg.id}"]`) as HTMLElement | null
        const cleanedEl = cleanedScrollRef.current?.querySelector(`[data-segment-id="${seg.id}"]`) as HTMLElement | null

        if (rawEl && cleanedEl) {
          // Reset heights first to get natural heights
          rawEl.style.minHeight = ''
          cleanedEl.style.minHeight = ''

          // Get natural heights
          const rawHeight = rawEl.offsetHeight
          const cleanedHeight = cleanedEl.offsetHeight

          // Set both to the max height
          const maxHeight = Math.max(rawHeight, cleanedHeight)
          rawEl.style.minHeight = `${maxHeight}px`
          cleanedEl.style.minHeight = `${maxHeight}px`
        }
      })
    }

    // Run after render
    requestAnimationFrame(syncHeights)

    // Re-sync on window resize
    window.addEventListener('resize', syncHeights)
    return () => window.removeEventListener('resize', syncHeights)
  }, [segments, showDiff, editingSegmentId, isRawCollapsed])

  return (
    <div className="relative flex flex-col flex-1 min-h-0 h-full">
      <div className={`${isRawCollapsed ? '' : 'grid grid-cols-2'} border-b border-border flex-shrink-0`}>
        {!isRawCollapsed && (
          <TranscriptHeader
            title={t('rawTitle')}
            segments={segments}
            textKey="rawText"
            showCopyButton={showCopyButton}
            showCollapseButton
            onCollapse={handleCollapse}
            entryTitle={entryTitle}
            isAudioEntry={isAudioEntry}
            onDownloadAudio={onDownloadAudio}
          />
        )}
        <TranscriptHeader
          title={t('cleanedTitle')}
          segments={segments}
          textKey="cleanedText"
          showDiffToggle
          showDiff={showDiff}
          onToggleDiff={onToggleDiff}
          showCopyButton={showCopyButton}
          cleanupOptions={cleanupOptions}
          showExpandButton={isRawCollapsed}
          onExpand={handleExpand}
          entryTitle={entryTitle}
          isAudioEntry={isAudioEntry}
          onDownloadAudio={onDownloadAudio}
        />
      </div>

      <div className={`${isRawCollapsed ? '' : 'grid grid-cols-2'} overflow-hidden flex-1 min-h-0`}>
        {!isRawCollapsed && (
          <RawSegmentList
            ref={rawScrollRef}
            segments={segments}
            activeSegmentId={activeSegmentId}
            showSpeakerLabels={showSpeakerLabels}
            isSelectingMoveTarget={isSelectingMoveTarget && textMoveSelection?.sourceColumn === "raw"}
            moveSourceSegmentId={textMoveSelection?.sourceColumn === "raw" ? textMoveSelection.sourceSegmentId : null}
            activeWordIndex={activeWordIndex}
            isPlaying={isPlaying}
            onSegmentClick={
              isSelectingMoveTarget && textMoveSelection?.sourceColumn === "raw" ? onRawMoveTargetClick : onSegmentClick
            }
            onTextSelect={onRawTextSelect}
            onScroll={handleRawScroll}
            onWordSeek={onWordSeek}
          />
        )}
        <EditableSegmentList
          ref={cleanedScrollRef}
          segments={segments}
          activeSegmentId={activeSegmentId}
          editingSegmentId={editingSegmentId}
          editedTexts={editedTexts}
          revertedSegments={revertedSegments}
          spellcheckErrors={spellcheckErrors}
          showDiff={showDiff}
          showSpeakerLabels={showSpeakerLabels}
          textMoveSelection={textMoveSelection}
          isSelectingMoveTarget={isSelectingMoveTarget && textMoveSelection?.sourceColumn === "cleaned"}
          activeSuggestion={activeSuggestion}
          onRevert={onRevert}
          onUndoRevert={onUndoRevert}
          onSave={onSave}
          onEditStart={onEditStart}
          onEditCancel={onEditCancel}
          onTextChange={onTextChange}
          onWordClick={onWordClick}
          onSuggestionSelect={onSuggestionSelect}
          onCloseSuggestions={onCloseSuggestions}
          onUpdateAll={onUpdateAll}
          onToggleDiff={onToggleDiff}
          onTextSelect={onCleanedTextSelect}
          onMoveTargetClick={onCleanedMoveTargetClick}
          onSegmentClick={onSegmentClick}
          editingCount={editingCount}
          onScroll={handleCleanedScroll}
          showRevertButton={showRevertButton}
        />
      </div>
    </div>
  )
}
