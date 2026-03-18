import type { Segment } from '@/components/demo/types'

interface ExportOptions {
  includeTimestamps: boolean
}

/**
 * Check if multiple speakers exist in segments
 */
export function hasMultipleSpeakers(segments: Segment[]): boolean {
  const speakers = new Set(segments.map(s => s.speaker))
  return speakers.size > 1
}

/**
 * Extract start time from segment time range
 * Handles various dash formats: " - ", " – " (en-dash), " — " (em-dash)
 * e.g., "0:00 - 0:18" -> "0:00"
 */
function extractStartTime(time: string): string {
  // Match space + any dash type + space
  const match = time.match(/^([^\s–—-]+)[\s]*[–—-]/)
  if (match) {
    return match[1]
  }
  return time
}

/**
 * Format a single segment for export
 */
export function formatSegmentForExport(
  segment: Segment,
  textKey: 'rawText' | 'cleanedText',
  multipleSpeakers: boolean,
  options: ExportOptions
): string {
  const parts: string[] = []

  // Speaker labels always included when multiple speakers
  if (multipleSpeakers) {
    parts.push(`[Speaker ${segment.speaker + 1}]`)
  }

  if (options.includeTimestamps && segment.time) {
    const startTime = extractStartTime(segment.time)
    parts.push(startTime)
  }

  const text = segment[textKey]

  if (parts.length > 0) {
    return `${parts.join(' ')}\n${text}`
  }
  return text
}

/**
 * Format all segments for export
 */
export function formatTranscriptForExport(
  segments: Segment[],
  textKey: 'rawText' | 'cleanedText',
  options: ExportOptions
): string {
  const multipleSpeakers = hasMultipleSpeakers(segments)
  return segments
    .map(seg => formatSegmentForExport(seg, textKey, multipleSpeakers, options))
    .join('\n\n')
}

/**
 * Generate safe filename from entry title
 */
export function generateExportFilename(
  entryTitle: string | undefined,
  textKey: 'rawText' | 'cleanedText'
): string {
  const suffix = textKey === 'rawText' ? 'raw' : 'cleaned'

  if (!entryTitle) {
    return `transcript-${suffix}.txt`
  }

  // Remove file extension if present, sanitize for filename
  const baseName = entryTitle
    .replace(/\.[^/.]+$/, '')  // Remove extension
    .replace(/[^a-zA-Z0-9\-_\s]/g, '')  // Remove special chars
    .replace(/\s+/g, '-')  // Spaces to dashes
    .replace(/^-+|-+$/g, '')  // Remove leading/trailing dashes
    .toLowerCase()
    .slice(0, 50)  // Limit length

  // If no valid characters remain, use default
  if (!baseName) {
    return `transcript-${suffix}.txt`
  }

  return `${baseName}-${suffix}.txt`
}

/**
 * Trigger file download in browser
 */
export function downloadAsTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
