"use client"

import type React from "react"
import { forwardRef } from "react"
import { EditableSegmentRow } from "./editable-segment-row"
import type { SpellcheckError, TextMoveSelection } from "./types"

export interface EditableSegmentListProps {
  segments: Array<{
    id: string
    speaker: number
    time: string
    rawText: string
    cleanedText: string
    originalRawText: string
    paragraphs?: string[]
  }>
  activeSegmentId: string | null
  editingSegmentId: string | null
  editedTexts: Map<string, string>
  revertedSegments: Map<string, string>
  spellcheckErrors: Map<string, SpellcheckError[]>
  showDiff: boolean
  showSpeakerLabels?: boolean
  showRevertButton?: boolean
  textMoveSelection: TextMoveSelection | null
  isSelectingMoveTarget: boolean
  activeSuggestion: {
    segmentId: string
    word: string
    position: { x: number; y: number }
    suggestions: string[]
  } | null
  onRevert: (id: string) => void
  onUndoRevert: (id: string) => void
  onSave: (id: string) => void
  onEditStart: (id: string) => void
  onEditCancel: (id: string) => void
  onTextChange: (id: string, text: string) => void
  onWordClick: (segmentId: string, e: React.MouseEvent, error: SpellcheckError) => void
  onSuggestionSelect: (suggestion: string) => void
  onCloseSuggestions: () => void
  onUpdateAll: () => void
  onToggleDiff: () => void
  onTextSelect: (segmentId: string, text: string, startOffset: number, endOffset: number) => void
  onMoveTargetClick: (targetSegmentId: string) => void
  onSegmentClick?: (segmentId: string) => void
  editingCount: number
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
}

export const EditableSegmentList = forwardRef<HTMLDivElement, EditableSegmentListProps>(
  (
    {
      segments,
      activeSegmentId,
      editingSegmentId,
      editedTexts,
      revertedSegments,
      spellcheckErrors,
      showDiff,
      showSpeakerLabels = true,
      showRevertButton = true,
      textMoveSelection,
      isSelectingMoveTarget,
      activeSuggestion,
      onRevert,
      onUndoRevert,
      onSave,
      onEditStart,
      onEditCancel,
      onTextChange,
      onWordClick,
      onSuggestionSelect,
      onCloseSuggestions,
      onUpdateAll: _onUpdateAll,
      onToggleDiff: _onToggleDiff,
      onTextSelect,
      onMoveTargetClick,
      onSegmentClick,
      editingCount: _editingCount,
      onScroll,
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        data-column="cleaned"
        className="p-5 pb-16 overflow-y-auto bg-[linear-gradient(180deg,rgba(56,189,248,0.02)_0%,transparent_100%)]"
        onScroll={onScroll}
      >
        <div className="space-y-0 pb-12">
          {segments.map((seg) => {
            const hasUnsavedEdits = editedTexts.has(seg.id) && editedTexts.get(seg.id) !== seg.cleanedText
            const isMoveSource =
              textMoveSelection?.sourceSegmentId === seg.id && textMoveSelection?.sourceColumn === "cleaned"
            const isValidMoveTarget =
              isSelectingMoveTarget && textMoveSelection?.sourceColumn === "cleaned" && !isMoveSource

            return (
              <EditableSegmentRow
                key={seg.id}
                id={seg.id}
                speaker={seg.speaker}
                time={seg.time}
                text={seg.cleanedText}
                rawText={seg.rawText}
                originalRawText={seg.originalRawText}
                paragraphs={seg.paragraphs}
                isActive={seg.id === activeSegmentId}
                isReverted={revertedSegments.has(seg.id)}
                isEditing={editingSegmentId === seg.id}
                editedText={editedTexts.has(seg.id) ? editedTexts.get(seg.id)! : seg.cleanedText}
                hasUnsavedEdits={hasUnsavedEdits}
                showDiff={showDiff}
                showSpeakerLabels={showSpeakerLabels}
                showRevertButton={showRevertButton}
                isSelectingMoveTarget={isSelectingMoveTarget}
                isValidMoveTarget={isValidMoveTarget}
                isMoveSource={isMoveSource}
                spellcheckErrors={spellcheckErrors.get(seg.id) || []}
                activeSuggestion={
                  activeSuggestion?.segmentId === seg.id
                    ? {
                        word: activeSuggestion.word,
                        position: activeSuggestion.position,
                        suggestions: activeSuggestion.suggestions,
                      }
                    : null
                }
                onRevert={() => onRevert(seg.id)}
                onUndoRevert={() => onUndoRevert(seg.id)}
                onSave={() => onSave(seg.id)}
                onEditStart={() => onEditStart(seg.id)}
                onEditCancel={() => onEditCancel(seg.id)}
                onTextChange={(text) => onTextChange(seg.id, text)}
                onWordClick={(e, error) => onWordClick(seg.id, e, error)}
                onSuggestionSelect={onSuggestionSelect}
                onCloseSuggestions={onCloseSuggestions}
                onTextSelect={(text, start, end) => onTextSelect(seg.id, text, start, end)}
                onMoveTargetClick={() => onMoveTargetClick(seg.id)}
                onSegmentClick={onSegmentClick ? () => onSegmentClick(seg.id) : undefined}
              />
            )
          })}
        </div>
      </div>
    )
  },
)

EditableSegmentList.displayName = "EditableSegmentList"
