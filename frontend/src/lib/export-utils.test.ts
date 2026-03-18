import { describe, it, expect } from 'vitest'
import type { Segment } from '@/components/demo/types'
import {
  hasMultipleSpeakers,
  formatSegmentForExport,
  formatTranscriptForExport,
  generateExportFilename,
} from './export-utils'

// Helper to create test segments
function createSegment(
  id: string,
  speaker: number,
  rawText: string,
  cleanedText: string,
  time = '0:00 - 0:30'
): Segment {
  return {
    id,
    speaker,
    time,
    rawText,
    cleanedText,
    originalRawText: rawText,
  }
}

describe('hasMultipleSpeakers', () => {
  it('returns false for single speaker', () => {
    const segments = [
      createSegment('1', 0, 'Hello', 'Hello'),
      createSegment('2', 0, 'World', 'World'),
    ]
    expect(hasMultipleSpeakers(segments)).toBe(false)
  })

  it('returns true for multiple speakers', () => {
    const segments = [
      createSegment('1', 0, 'Hello', 'Hello'),
      createSegment('2', 1, 'World', 'World'),
    ]
    expect(hasMultipleSpeakers(segments)).toBe(true)
  })

  it('returns false for empty array', () => {
    expect(hasMultipleSpeakers([])).toBe(false)
  })

  it('handles more than two speakers', () => {
    const segments = [
      createSegment('1', 0, 'Hello', 'Hello'),
      createSegment('2', 1, 'World', 'World'),
      createSegment('3', 2, 'Test', 'Test'),
    ]
    expect(hasMultipleSpeakers(segments)).toBe(true)
  })
})

describe('formatSegmentForExport', () => {
  const segment = createSegment('1', 0, 'Um hello there', 'Hello there', '0:00 - 0:18')

  it('formats plain text without speaker or timestamps', () => {
    const result = formatSegmentForExport(segment, 'cleanedText', false, { includeTimestamps: false })
    expect(result).toBe('Hello there')
  })

  it('includes speaker label when multiple speakers', () => {
    const result = formatSegmentForExport(segment, 'cleanedText', true, { includeTimestamps: false })
    expect(result).toBe('[Speaker 1]\nHello there')
  })

  it('includes timestamps when enabled (start time only, no brackets)', () => {
    const result = formatSegmentForExport(segment, 'cleanedText', true, { includeTimestamps: true })
    expect(result).toBe('[Speaker 1] 0:00\nHello there')
  })

  it('uses rawText key correctly', () => {
    const result = formatSegmentForExport(segment, 'rawText', false, { includeTimestamps: false })
    expect(result).toBe('Um hello there')
  })

  it('handles speaker index offset (0 becomes Speaker 1)', () => {
    const seg2 = createSegment('2', 3, 'Test', 'Test')
    const result = formatSegmentForExport(seg2, 'cleanedText', true, { includeTimestamps: false })
    expect(result).toBe('[Speaker 4]\nTest')
  })
})

describe('formatTranscriptForExport', () => {
  it('formats single speaker without labels', () => {
    const segments = [
      createSegment('1', 0, 'First', 'First cleaned'),
      createSegment('2', 0, 'Second', 'Second cleaned'),
    ]
    const result = formatTranscriptForExport(segments, 'cleanedText', { includeTimestamps: false })
    expect(result).toBe('First cleaned\n\nSecond cleaned')
  })

  it('formats multiple speakers with labels', () => {
    const segments = [
      createSegment('1', 0, 'First', 'First cleaned'),
      createSegment('2', 1, 'Second', 'Second cleaned'),
    ]
    const result = formatTranscriptForExport(segments, 'cleanedText', { includeTimestamps: false })
    expect(result).toBe('[Speaker 1]\nFirst cleaned\n\n[Speaker 2]\nSecond cleaned')
  })

  it('includes timestamps when enabled with multiple speakers (start time only, no brackets)', () => {
    const segments = [
      createSegment('1', 0, 'First', 'First cleaned', '0:00 - 0:18'),
      createSegment('2', 1, 'Second', 'Second cleaned', '0:19 - 0:45'),
    ]
    const result = formatTranscriptForExport(segments, 'cleanedText', { includeTimestamps: true })
    expect(result).toBe('[Speaker 1] 0:00\nFirst cleaned\n\n[Speaker 2] 0:19\nSecond cleaned')
  })

  it('handles empty array', () => {
    const result = formatTranscriptForExport([], 'cleanedText', { includeTimestamps: false })
    expect(result).toBe('')
  })
})

describe('generateExportFilename', () => {
  it('generates default filename when title is undefined', () => {
    expect(generateExportFilename(undefined, 'cleanedText')).toBe('transcript-cleaned.txt')
    expect(generateExportFilename(undefined, 'rawText')).toBe('transcript-raw.txt')
  })

  it('generates filename from title with extension removed', () => {
    expect(generateExportFilename('meeting-notes.mp3', 'cleanedText')).toBe('meeting-notes-cleaned.txt')
  })

  it('sanitizes special characters', () => {
    expect(generateExportFilename('Meeting @work! (2024)', 'cleanedText')).toBe('meeting-work-2024-cleaned.txt')
  })

  it('converts spaces to dashes', () => {
    expect(generateExportFilename('My Meeting Notes', 'cleanedText')).toBe('my-meeting-notes-cleaned.txt')
  })

  it('converts to lowercase', () => {
    expect(generateExportFilename('IMPORTANT MEETING', 'cleanedText')).toBe('important-meeting-cleaned.txt')
  })

  it('truncates long titles', () => {
    const longTitle = 'A'.repeat(100) + '.mp3'
    const result = generateExportFilename(longTitle, 'cleanedText')
    expect(result.length).toBeLessThanOrEqual(63) // 50 chars + '-cleaned.txt' = 62
    expect(result).toBe('a'.repeat(50) + '-cleaned.txt')
  })

  it('handles empty string as title', () => {
    expect(generateExportFilename('', 'cleanedText')).toBe('transcript-cleaned.txt')
  })

  it('handles title with only special chars', () => {
    expect(generateExportFilename('!!!@@@###', 'cleanedText')).toBe('transcript-cleaned.txt')
  })
})
