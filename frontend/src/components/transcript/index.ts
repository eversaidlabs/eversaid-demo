/**
 * Transcript Components - Shared between Demo and Dashboard
 *
 * This module re-exports components from the demo folder that are
 * shared between the demo flow and the authenticated dashboard.
 * This allows both pages to import from a common location.
 */

// Layout components
export { TranscriptComparisonLayout } from '../demo/transcript-comparison-layout'
export { TranscriptHeader } from '../demo/transcript-header'
export type { CleanupOptionsProps, TranscriptHeaderProps } from '../demo/transcript-header'

// Segment display components
export { RawSegmentList } from '../demo/raw-segment-list'
export type { RawSegmentListProps } from '../demo/raw-segment-list'
export { EditableSegmentList } from '../demo/editable-segment-list'
export type { EditableSegmentListProps } from '../demo/editable-segment-list'
export { EditableSegmentRow } from '../demo/editable-segment-row'
export type { EditableSegmentRowProps } from '../demo/editable-segment-row'
export { DiffSegmentDisplay } from '../demo/diff-segment-display'
export type { DiffSegmentDisplayProps } from '../demo/diff-segment-display'
export { HighlightedText } from '../demo/highlighted-text'
export type { HighlightedTextProps } from '../demo/highlighted-text'

// Audio components
export { AudioPlayer } from '../demo/audio-player'
export type { AudioPlayerProps } from '../demo/audio-player'

// Analysis components
export { AnalysisSection } from '../demo/analysis-section'
export type { AnalysisSectionProps, AnalysisProfile } from '../demo/analysis-section'
export { AnalysisField } from '../demo/analysis-field'
export type { AnalysisFieldProps } from '../demo/analysis-field'

// Feedback components
export { FloatingFeedbackWidget } from '../demo/floating-feedback-widget'
export type { FloatingFeedbackWidgetProps } from '../demo/floating-feedback-widget'
export { FeedbackCard } from '../demo/feedback-card'
export type { FeedbackCardProps, FeedbackCardRef } from '../demo/feedback-card'

// Shared types
export type {
  Segment,
  SpellcheckError,
  TextMoveSelection,
  ActiveSuggestion,
  HistoryEntry,
} from '../demo/types'

// Loading skeleton
export { TranscriptLoadingSkeleton } from '../demo/transcript-loading-skeleton'
