import type { CleanupType } from '@/features/transcription/types'

// All cleanup levels (keep for backend compatibility)
export const CLEANUP_LEVELS: CleanupType[] = [
  'minimal',
  'clean',
  'edited',
]

// Presets visible in UI (hidden presets are commented out)
export const VISIBLE_CLEANUP_LEVELS: CleanupType[] = [
  // 'minimal',  // PRESET-HIDDEN: uncomment to restore
  'clean',
  'edited',
]

// Presets that are disabled (shown but not selectable)
export const DISABLED_CLEANUP_LEVELS: CleanupType[] = ['edited']

// Default cleanup level for new entries
export const DEFAULT_CLEANUP_LEVEL: CleanupType = 'clean'

// Default LLM model for each cleanup level
export const CLEANUP_LEVEL_DEFAULT_MODELS: Partial<Record<CleanupType, string>> = {
  'minimal': 'llama-3.3-70b-versatile',
  'clean': 'llama-3.3-70b-versatile',
  'edited': 'llama-3.3-70b-versatile',
}

// Get default model for a cleanup level
export function getDefaultModelForLevel(level: CleanupType): string | undefined {
  return CLEANUP_LEVEL_DEFAULT_MODELS[level]
}

// Temperature options for cleanup (null = API default, which is typically 0)
export const CLEANUP_TEMPERATURES: (number | null)[] = [
  null, 0, 0.05, 0.1, 0.3, 0.5, 0.8, 1.0
]

// Default temperature (null = not specified, API decides)
export const DEFAULT_CLEANUP_TEMPERATURE: number | null = null

/** Compare temperatures - null and 0 are equivalent (both mean API default) */
export function temperaturesMatch(a: number | null | undefined, b: number | null | undefined): boolean {
  const normalizeTemp = (t: number | null | undefined) => (t === null || t === undefined) ? 0 : t
  return normalizeTemp(a) === normalizeTemp(b)
}
