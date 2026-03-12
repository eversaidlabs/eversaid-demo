import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { submitFeedback, getFeedback } from './api'
import type { FeedbackType } from './types'
import { ApiError } from './types'

/**
 * Options for the useFeedback hook
 */
export interface UseFeedbackOptions {
  entryId: string
  feedbackType: FeedbackType
}

/**
 * Return type for the useFeedback hook
 */
export interface UseFeedbackReturn {
  /** Current rating (1-5, 0 means not set) */
  rating: number
  /** Optional feedback text */
  feedbackText: string
  /** Whether existing feedback is being loaded */
  isLoading: boolean
  /** Whether submission is in progress */
  isSubmitting: boolean
  /** Whether feedback has been successfully submitted */
  isSubmitted: boolean
  /** Whether feedback was loaded from the backend (vs fresh) */
  hasExisting: boolean
  /** Error message if submission failed */
  error: string | null
  /** Set the rating value */
  setRating: (rating: number) => void
  /** Set the feedback text */
  setFeedbackText: (text: string) => void
  /** Submit the feedback */
  submit: () => Promise<void>
  /** Reset the form state */
  reset: () => void
}

/**
 * Hook for managing feedback submission for entries
 *
 * @example
 * ```tsx
 * const { rating, setRating, submit, isSubmitting } = useFeedback({
 *   entryId: 'entry-123',
 *   feedbackType: 'transcription'
 * })
 *
 * return (
 *   <div>
 *     <StarRating value={rating} onChange={setRating} />
 *     <button onClick={submit} disabled={isSubmitting}>
 *       Submit Feedback
 *     </button>
 *   </div>
 * )
 * ```
 */
export function useFeedback(options: UseFeedbackOptions): UseFeedbackReturn {
  const { entryId, feedbackType } = options

  const [rating, setRating] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load existing feedback when entryId changes
  useEffect(() => {
    if (!entryId) {
      setRating(0)
      setFeedbackText('')
      setIsSubmitted(false)
      setHasExisting(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setIsSubmitted(false)
    setHasExisting(false)
    setError(null)

    getFeedback(entryId)
      .then((data) => {
        const existing = data.find((f) => f.feedback_type === feedbackType)
        if (existing) {
          setRating(existing.rating)
          setFeedbackText(existing.feedback_text || '')
          setHasExisting(true)
        } else {
          setRating(0)
          setFeedbackText('')
        }
      })
      .catch(() => {
        // Silently fail, user can still submit fresh
        setRating(0)
        setFeedbackText('')
      })
      .finally(() => setIsLoading(false))
  }, [entryId, feedbackType])

  const submit = useCallback(async () => {
    // Validate rating
    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await submitFeedback(entryId, {
        feedback_type: feedbackType,
        rating,
        feedback_text: feedbackText || undefined,
      })

      setIsSubmitted(true)
      toast.success('Feedback submitted. Thank you!')
    } catch (err) {
      let errorMessage = 'Failed to submit feedback. Please try again.'

      if (err instanceof ApiError) {
        if (err.status === 404) {
          errorMessage = 'Entry not found. It may have been deleted.'
        } else if (err.status === 429) {
          errorMessage = 'Too many requests. Please try again later.'
        } else if (err.message) {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [entryId, feedbackType, rating, feedbackText])

  const reset = useCallback(() => {
    setRating(0)
    setFeedbackText('')
    setIsSubmitting(false)
    setIsSubmitted(false)
    setHasExisting(false)
    setError(null)
  }, [])

  return {
    rating,
    feedbackText,
    isLoading,
    isSubmitting,
    isSubmitted,
    hasExisting,
    error,
    setRating,
    setFeedbackText,
    submit,
    reset,
  }
}
