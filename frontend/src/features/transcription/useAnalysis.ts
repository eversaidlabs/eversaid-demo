import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { getAnalysis, getAnalyses, triggerAnalysis, getAnalysisProfiles } from './api'
import type { AnalysisProfile, AnalysisResult } from './types'
import { ApiError } from './types'

/**
 * Field value can be a string or array of strings
 */
export type AnalysisFieldValue = string | string[]

/**
 * Dynamic analysis data structure that works with any profile
 */
export interface DynamicAnalysisData {
  /** Ordered field names from profile.outputs */
  fieldOrder: string[]
  /** Field values keyed by field name */
  fields: Record<string, AnalysisFieldValue>
  /** Profile ID for context */
  profileId: string
}

/**
 * @deprecated Use DynamicAnalysisData instead
 * Kept for backward compatibility during transition
 */
export interface ParsedAnalysisData {
  summary: string
  topics: string[]
  keyPoints: string[]
}

/**
 * Options for the useAnalysis hook
 */
export interface UseAnalysisOptions {
  /** Entry cleanup ID to analyze */
  cleanupId: string | null
  /** Analysis ID from transcribe response - if provided, polls for existing results */
  analysisId?: string | null
  /** Default profile to use for manual re-analysis */
  defaultProfile?: string
}

/**
 * Return type for the useAnalysis hook
 */
export interface UseAnalysisReturn {
  /** Parsed analysis data */
  data: DynamicAnalysisData | null
  /** Whether analysis is loading */
  isLoading: boolean
  /** Whether polling for results */
  isPolling: boolean
  /** Error message if analysis failed */
  error: string | null
  /** Available analysis profiles */
  profiles: AnalysisProfile[]
  /** Whether profiles are loading */
  isLoadingProfiles: boolean
  /** Current analysis job ID */
  analysisId: string | null
  /** Currently selected profile ID */
  currentProfileId: string | null
  /** Label of currently selected profile (for dropdown button text) */
  currentProfileLabel: string | null
  /** Intent of currently selected profile (for subtitle display) */
  currentProfileIntent: string | null
  /** Model name used for the current analysis result */
  currentAnalysisModelName: string | null
  /** Select a profile - checks cache, then API, then triggers LLM if needed */
  selectProfile: (profileId: string) => Promise<void>
  /** Trigger analysis with a specific profile (always triggers new LLM call) */
  analyze: (profileId?: string, llmModel?: string) => Promise<void>
  /** Alias for analyze with clearer semantics */
  runAnalysis: (profileId?: string, llmModel?: string) => Promise<void>
  /** Load profiles */
  loadProfiles: () => Promise<void>
  /** Populate cache from initial analyses (called when loading entry) */
  populateCache: (analyses: AnalysisResult[]) => void
  /** Reset analysis state */
  reset: () => void
}

/**
 * Parse raw analysis result into dynamic structure based on profile outputs
 * @param result - Raw result from API
 * @param profile - Profile with outputs array defining field order
 * @returns DynamicAnalysisData or null if no usable data
 */
function parseAnalysisResult(
  result: Record<string, unknown> | null | undefined,
  profile: AnalysisProfile | null | undefined
): DynamicAnalysisData | null {
  if (!result || !profile) return null

  const fieldOrder = profile.outputs || []
  const fields: Record<string, AnalysisFieldValue> = {}
  let hasData = false

  for (const fieldName of fieldOrder) {
    const value = result[fieldName]

    if (typeof value === 'string' && value.trim()) {
      fields[fieldName] = value
      hasData = true
    } else if (Array.isArray(value)) {
      const filtered = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      if (filtered.length > 0) {
        fields[fieldName] = filtered
        hasData = true
      }
    }
  }

  if (!hasData) {
    return null
  }

  return {
    fieldOrder,
    fields,
    profileId: profile.id,
  }
}

/**
 * Hook for managing analysis workflow
 *
 * Features:
 * - Load available analysis profiles
 * - Trigger analysis on cleaned entries
 * - Poll for completion (2s interval)
 * - Parse results into typed structure
 * - Auto-trigger when cleanup completes (optional)
 *
 * @example
 * ```tsx
 * // analysisId comes from the transcribe response - backend already triggered analysis
 * const { data, isLoading, analyze, profiles } = useAnalysis({
 *   cleanupId: transcription.cleanupId,
 *   analysisId: transcription.analysisId,  // Auto-polls for results
 * })
 *
 * return (
 *   <div>
 *     {isLoading && <Spinner />}
 *     {data && <AnalysisSection data={data} profiles={profiles} />}
 *     <button onClick={() => analyze('action-items')}>Re-analyze with different profile</button>
 *   </div>
 * )
 * ```
 */
export function useAnalysis(options: UseAnalysisOptions): UseAnalysisReturn {
  const { cleanupId, analysisId: initialAnalysisId, defaultProfile: defaultProfileOverride } = options

  const [data, setData] = useState<DynamicAnalysisData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<AnalysisProfile[]>([])
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  // Default profile ID from API (or override from options)
  const [defaultProfileId, setDefaultProfileId] = useState<string>(defaultProfileOverride ?? 'generic-summary')

  // Cache of analyses by profile_id
  const [analysisCache, setAnalysisCache] = useState<Map<string, AnalysisResult>>(new Map())
  // Currently selected profile ID
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)

  // Computed current profile label for dropdown button text
  const currentProfileLabel = useMemo(() => {
    if (!currentProfileId) return null
    const profile = profiles.find(p => p.id === currentProfileId)
    return profile?.label ?? null
  }, [currentProfileId, profiles])

  // Computed current profile intent for subtitle display
  const currentProfileIntent = useMemo(() => {
    if (!currentProfileId) return null
    const profile = profiles.find(p => p.id === currentProfileId)
    return profile?.intent ?? null
  }, [currentProfileId, profiles])

  // Computed model name from current analysis result
  const currentAnalysisModelName = useMemo(() => {
    if (!currentProfileId) return null
    const cached = analysisCache.get(currentProfileId)
    return cached?.llm_model ?? null
  }, [currentProfileId, analysisCache])

  // Polling interval ref
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Clear polling interval
   */
  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  /**
   * Poll for analysis completion
   */
  const pollAnalysis = useCallback(async (id: string) => {
    try {
      const result = await getAnalysis(id)

      if (result.status === 'completed') {
        clearPolling()
        setIsPolling(false)
        setIsLoading(false)

        // Add to cache by profile_id and sync currentProfileId
        if (result.profile_id) {
          setAnalysisCache(prev => new Map(prev).set(result.profile_id, result))
          // Sync currentProfileId with the actual analysis result to avoid UI mismatch
          setCurrentProfileId(result.profile_id)
        }

        // Find the profile to get outputs for parsing
        const profile = profiles.find(p => p.id === result.profile_id)
        const parsed = parseAnalysisResult(result.result, profile)
        if (parsed) {
          setData(parsed)
        } else {
          setError('Analysis completed but returned no usable data')
        }
      } else if (result.status === 'failed') {
        clearPolling()
        setIsPolling(false)
        setIsLoading(false)
        setError(result.error_message || 'Analysis failed')
        toast.error('Analysis failed')
      }
      // If still pending/processing, keep polling
    } catch (err) {
      clearPolling()
      setIsPolling(false)
      setIsLoading(false)

      let errorMessage = 'Failed to fetch analysis results'
      if (err instanceof ApiError) {
        if (err.status === 404) {
          errorMessage = 'Analysis not found'
        } else if (err.message) {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      toast.error(errorMessage)
    }
  }, [clearPolling, profiles])

  /**
   * Start polling for analysis results
   */
  const startPolling = useCallback((id: string) => {
    // Clear any existing interval first to prevent orphaned intervals
    // (can happen if startPolling is called from multiple sources)
    clearPolling()
    setIsPolling(true)
    // Poll immediately
    pollAnalysis(id)
    // Then poll every 2 seconds
    pollIntervalRef.current = setInterval(() => pollAnalysis(id), 2000)
  }, [pollAnalysis, clearPolling])

  /**
   * Trigger analysis (always triggers new LLM call)
   * @param profileId - Profile ID to use (defaults to defaultProfileId)
   * @param llmModel - Optional LLM model override
   */
  const analyze = useCallback(async (profileId?: string, llmModel?: string) => {
    const profile = profileId ?? defaultProfileId
    if (!cleanupId) {
      setError('No cleanup ID available')
      return
    }

    setIsLoading(true)
    setError(null)
    setCurrentProfileId(profile)

    try {
      const job = await triggerAnalysis(cleanupId, {
        profileId: profile,
        llmModel,
      })
      setAnalysisId(job.id)

      // Start polling for results
      startPolling(job.id)
    } catch (err) {
      setIsLoading(false)

      let errorMessage = 'Failed to trigger analysis'
      if (err instanceof ApiError) {
        if (err.status === 404) {
          errorMessage = 'Cleaned entry not found'
        } else if (err.status === 429) {
          errorMessage = 'Too many requests. Please try again later.'
        } else if (err.message) {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      toast.error(errorMessage)
    }
  }, [cleanupId, defaultProfileId, startPolling])

  /**
   * Initialize from analyses list (called when loading entry)
   * Note: List endpoint doesn't include `result`, so we fetch individually if needed
   * Prioritizes the API default profile, then falls back to first analysis
   */
  const populateCache = useCallback((analyses: AnalysisResult[]) => {
    // Clear cache - list doesn't have results, cache only stores individual fetches
    setAnalysisCache(new Map())

    if (analyses.length === 0) return

    // Prioritize API default profile, fall back to first (most recent) analysis
    const defaultAnalysis = analyses.find(a => a.profile_id === defaultProfileId) || analyses[0]

    setCurrentProfileId(defaultAnalysis.profile_id)
    setAnalysisId(defaultAnalysis.id)

    // If completed, fetch individual analysis to get the result
    if (defaultAnalysis.status === 'completed') {
      setIsLoading(true)
      getAnalysis(defaultAnalysis.id).then((fullAnalysis) => {
        // Add to cache and sync currentProfileId to ensure UI consistency
        if (fullAnalysis.profile_id) {
          setAnalysisCache(prev => new Map(prev).set(fullAnalysis.profile_id, fullAnalysis))
          setCurrentProfileId(fullAnalysis.profile_id)
        }
        // Find the profile to get outputs for parsing
        const profile = profiles.find(p => p.id === fullAnalysis.profile_id)
        const parsed = parseAnalysisResult(fullAnalysis.result, profile)
        if (parsed) {
          setData(parsed)
          setError(null)
        }
        setIsLoading(false)
      }).catch(err => {
        console.error('Failed to fetch analysis:', err)
        setIsLoading(false)
      })
    } else if (defaultAnalysis.status === 'pending' || defaultAnalysis.status === 'processing') {
      // Still processing - start polling
      startPolling(defaultAnalysis.id)
    }
  }, [defaultProfileId, startPolling, profiles])

  /**
   * Select a profile - checks cache, then API, then triggers LLM if needed
   */
  const selectProfile = useCallback(async (profileId: string) => {
    // Find the profile for parsing
    const profile = profiles.find(p => p.id === profileId)

    // 1. Check memory cache first (cache has full results from individual fetches)
    const cached = analysisCache.get(profileId)
    if (cached && cached.status === 'completed') {
      setCurrentProfileId(profileId)
      setAnalysisId(cached.id)
      const parsed = parseAnalysisResult(cached.result, profile)
      if (parsed) {
        setData(parsed)
        setError(null)
      }
      return
    }

    // 2. Cache miss - fetch analyses list to check if analysis EXISTS for this profile
    if (cleanupId) {
      setIsLoading(true)
      try {
        const analyses = await getAnalyses(cleanupId)

        // Check if analysis exists for the requested profile
        const existing = analyses.find(a => a.profile_id === profileId)

        if (existing?.status === 'completed') {
          // Found completed analysis - fetch individual to get full result (no LLM call!)
          setCurrentProfileId(profileId)
          setAnalysisId(existing.id)

          const fullAnalysis = await getAnalysis(existing.id)

          // Add to cache
          if (fullAnalysis.profile_id) {
            setAnalysisCache(prev => new Map(prev).set(fullAnalysis.profile_id, fullAnalysis))
          }

          const parsed = parseAnalysisResult(fullAnalysis.result, profile)
          if (parsed) {
            setData(parsed)
            setError(null)
          }
          setIsLoading(false)
          return
        }

        if (existing?.status === 'pending' || existing?.status === 'processing') {
          // Analysis in progress - poll it
          setCurrentProfileId(profileId)
          setAnalysisId(existing.id)
          startPolling(existing.id)
          return
        }
      } catch (err) {
        console.error('Failed to fetch analyses:', err)
      }
      setIsLoading(false)
    }

    // 3. Not found in API - trigger new LLM analysis
    setCurrentProfileId(profileId)
    await analyze(profileId)
  }, [analysisCache, cleanupId, analyze, startPolling, profiles])

  /**
   * Load available profiles
   */
  const loadProfiles = useCallback(async () => {
    setIsLoadingProfiles(true)
    try {
      const { profiles: profileList, defaultProfileId: apiDefault } = await getAnalysisProfiles()
      setProfiles(profileList)
      // Use API default unless overridden in options
      if (!defaultProfileOverride) {
        setDefaultProfileId(apiDefault)
      }
    } catch (err) {
      console.error('Failed to load analysis profiles:', err)
      // Don't show error toast for profile loading - not critical
    } finally {
      setIsLoadingProfiles(false)
    }
  }, [defaultProfileOverride])

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setData(null)
    setIsLoading(false)
    setIsPolling(false)
    setError(null)
    setAnalysisId(null)
    setAnalysisCache(new Map())
    setCurrentProfileId(null)
    clearPolling()
  }, [clearPolling])

  // Track previous analysisId to detect changes
  const prevAnalysisIdRef = useRef<string | null | undefined>(undefined)

  /**
   * Auto-fetch existing analysis when analysisId is provided or changes
   * (Backend already triggered analysis during transcribe, we just poll for results)
   */
  useEffect(() => {
    // Detect if analysisId changed (including from null to a value or from one value to another)
    const analysisIdChanged = prevAnalysisIdRef.current !== initialAnalysisId
    prevAnalysisIdRef.current = initialAnalysisId

    if (analysisIdChanged) {
      // Reset state when switching to a new analysis
      clearPolling()
      setData(null)
      setError(null)
      setIsPolling(false)

      if (initialAnalysisId) {
        // Start polling for the new analysis
        setAnalysisId(initialAnalysisId)
        setIsLoading(true)
        startPolling(initialAnalysisId)
      } else {
        // No analysis ID - just reset
        setAnalysisId(null)
        setIsLoading(false)
      }
    }
  }, [initialAnalysisId, startPolling, clearPolling])

  /**
   * Cleanup polling on unmount
   */
  useEffect(() => {
    return () => {
      clearPolling()
    }
  }, [clearPolling])

  return {
    data,
    isLoading,
    isPolling,
    error,
    profiles,
    isLoadingProfiles,
    analysisId,
    currentProfileId,
    currentProfileLabel,
    currentProfileIntent,
    currentAnalysisModelName,
    selectProfile,
    analyze,
    runAnalysis: analyze,  // Alias for analyze with clearer semantics
    loadProfiles,
    populateCache,
    reset,
  }
}
