import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFeedback } from './useFeedback'
import * as api from './api'
import { ApiError } from './types'
import { toast } from 'sonner'

// Mock the API module
vi.mock('./api', () => ({
  submitFeedback: vi.fn(),
  getFeedback: vi.fn(),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no existing feedback
    vi.mocked(api.getFeedback).mockResolvedValue([])
  })

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe('initial state', () => {
    it('initializes with default values after loading', async () => {
      const { result } = renderHook(() =>
        useFeedback({ entryId: 'entry-123', feedbackType: 'transcription' })
      )

      // Wait for loading to complete
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.rating).toBe(0)
      expect(result.current.feedbackText).toBe('')
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.isSubmitted).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.hasExisting).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('loads existing feedback when entryId has feedback', async () => {
      vi.mocked(api.getFeedback).mockResolvedValue([
        {
          id: 'feedback-1',
          entry_id: 'entry-123',
          feedback_type: 'transcription',
          rating: 4,
          feedback_text: 'Great quality!',
          created_at: '2024-01-01T00:00:00Z',
        },
      ])

      const { result } = renderHook(() =>
        useFeedback({ entryId: 'entry-123', feedbackType: 'transcription' })
      )

      // Wait for loading to complete
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.rating).toBe(4)
      expect(result.current.feedbackText).toBe('Great quality!')
      expect(result.current.hasExisting).toBe(true)
      expect(result.current.isSubmitted).toBe(false)
    })

    it('handles empty entryId without calling API', async () => {
      const { result } = renderHook(() =>
        useFeedback({ entryId: '', feedbackType: 'transcription' })
      )

      expect(api.getFeedback).not.toHaveBeenCalled()
      expect(result.current.rating).toBe(0)
      expect(result.current.isLoading).toBe(false)
    })
  })

  // ===========================================================================
  // State Management
  // ===========================================================================

  describe('state management', () => {
    it('updates rating when setRating is called', async () => {
      const { result } = renderHook(() =>
        useFeedback({ entryId: 'entry-123', feedbackType: 'transcription' })
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setRating(4)
      })

      expect(result.current.rating).toBe(4)
    })

    it('updates feedbackText when setFeedbackText is called', async () => {
      const { result } = renderHook(() =>
        useFeedback({ entryId: 'entry-123', feedbackType: 'transcription' })
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setFeedbackText('Great transcription!')
      })

      expect(result.current.feedbackText).toBe('Great transcription!')
    })

    it('resets all state when reset is called', async () => {
      const { result } = renderHook(() =>
        useFeedback({ entryId: 'entry-123', feedbackType: 'transcription' })
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Set some values first
      act(() => {
        result.current.setRating(5)
        result.current.setFeedbackText('Some feedback')
      })

      // Now reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.rating).toBe(0)
      expect(result.current.feedbackText).toBe('')
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.isSubmitted).toBe(false)
      expect(result.current.hasExisting).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  // ===========================================================================
  // Submission Flow
  // ===========================================================================

  describe('submission flow', () => {
    it('validates rating before submission', async () => {
      const { result } = renderHook(() =>
        useFeedback({ entryId: 'entry-123', feedbackType: 'transcription' })
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Try to submit without rating
      await act(async () => {
        await result.current.submit()
      })

      expect(result.current.error).toBe('Please select a rating between 1 and 5')
      expect(api.submitFeedback).not.toHaveBeenCalled()
    })

    it('submits feedback successfully', async () => {
      vi.mocked(api.submitFeedback).mockResolvedValue({
        id: 'feedback-123',
        entry_id: 'entry-123',
        feedback_type: 'transcription',
        rating: 4,
        created_at: '2024-01-01T00:00:00Z',
      })

      const { result } = renderHook(() =>
        useFeedback({ entryId: 'entry-123', feedbackType: 'transcription' })
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Set rating and text
      act(() => {
        result.current.setRating(4)
        result.current.setFeedbackText('Great quality!')
      })

      // Submit
      await act(async () => {
        await result.current.submit()
      })

      expect(api.submitFeedback).toHaveBeenCalledWith('entry-123', {
        feedback_type: 'transcription',
        rating: 4,
        feedback_text: 'Great quality!',
      })
      expect(result.current.isSubmitted).toBe(true)
      expect(result.current.error).toBeNull()
      expect(toast.success).toHaveBeenCalledWith('Feedback submitted. Thank you!')
    })

    it('submits feedback without text when empty', async () => {
      vi.mocked(api.submitFeedback).mockResolvedValue({
        id: 'feedback-123',
        entry_id: 'entry-123',
        feedback_type: 'cleanup',
        rating: 5,
        created_at: '2024-01-01T00:00:00Z',
      })

      const { result } = renderHook(() =>
        useFeedback({ entryId: 'entry-123', feedbackType: 'cleanup' })
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setRating(5)
      })

      await act(async () => {
        await result.current.submit()
      })

      expect(api.submitFeedback).toHaveBeenCalledWith('entry-123', {
        feedback_type: 'cleanup',
        rating: 5,
        feedback_text: undefined,
      })
      expect(result.current.isSubmitted).toBe(true)
    })

    it('sets isSubmitting during submission', async () => {
      let resolvePromise: () => void
      vi.mocked(api.submitFeedback).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = () =>
              resolve({
                id: 'feedback-123',
                entry_id: 'entry-123',
                feedback_type: 'transcription',
                rating: 4,
                created_at: '2024-01-01T00:00:00Z',
              })
          })
      )

      const { result } = renderHook(() =>
        useFeedback({ entryId: 'entry-123', feedbackType: 'transcription' })
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setRating(4)
      })

      // Start submission (don't await)
      act(() => {
        result.current.submit()
      })

      expect(result.current.isSubmitting).toBe(true)

      // Complete submission
      await act(async () => {
        resolvePromise!()
      })

      expect(result.current.isSubmitting).toBe(false)
    })
  })

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('handles 404 error gracefully', async () => {
      vi.mocked(api.submitFeedback).mockRejectedValue(
        new ApiError(404, 'Entry not found')
      )

      const { result } = renderHook(() =>
        useFeedback({ entryId: 'entry-123', feedbackType: 'transcription' })
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setRating(3)
      })

      await act(async () => {
        await result.current.submit()
      })

      expect(result.current.error).toBe('Entry not found. It may have been deleted.')
      expect(result.current.isSubmitted).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('Entry not found. It may have been deleted.')
    })

    it('handles 429 rate limit error', async () => {
      vi.mocked(api.submitFeedback).mockRejectedValue(
        new ApiError(429, 'Rate limit exceeded')
      )

      const { result } = renderHook(() =>
        useFeedback({ entryId: 'entry-123', feedbackType: 'transcription' })
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setRating(2)
      })

      await act(async () => {
        await result.current.submit()
      })

      expect(result.current.error).toBe('Too many requests. Please try again later.')
      expect(toast.error).toHaveBeenCalledWith('Too many requests. Please try again later.')
    })

    it('handles generic ApiError with custom message', async () => {
      vi.mocked(api.submitFeedback).mockRejectedValue(
        new ApiError(500, 'Server error occurred')
      )

      const { result } = renderHook(() =>
        useFeedback({ entryId: 'entry-123', feedbackType: 'transcription' })
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setRating(1)
      })

      await act(async () => {
        await result.current.submit()
      })

      expect(result.current.error).toBe('Server error occurred')
      expect(toast.error).toHaveBeenCalledWith('Server error occurred')
    })

    it('handles non-ApiError errors', async () => {
      vi.mocked(api.submitFeedback).mockRejectedValue(new Error('Network failure'))

      const { result } = renderHook(() =>
        useFeedback({ entryId: 'entry-123', feedbackType: 'analysis' })
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setRating(3)
      })

      await act(async () => {
        await result.current.submit()
      })

      expect(result.current.error).toBe('Failed to submit feedback. Please try again.')
      expect(toast.error).toHaveBeenCalledWith('Failed to submit feedback. Please try again.')
    })

    it('clears error on new submission attempt', async () => {
      vi.mocked(api.submitFeedback)
        .mockRejectedValueOnce(new ApiError(500, 'Server error'))
        .mockResolvedValueOnce({
          id: 'feedback-123',
          entry_id: 'entry-123',
          feedback_type: 'transcription',
          rating: 4,
          created_at: '2024-01-01T00:00:00Z',
        })

      const { result } = renderHook(() =>
        useFeedback({ entryId: 'entry-123', feedbackType: 'transcription' })
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      act(() => {
        result.current.setRating(4)
      })

      // First attempt fails
      await act(async () => {
        await result.current.submit()
      })

      expect(result.current.error).toBe('Server error')

      // Second attempt should clear error
      await act(async () => {
        await result.current.submit()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.isSubmitted).toBe(true)
    })
  })

  // ===========================================================================
  // Different Feedback Types
  // ===========================================================================

  describe('feedback types', () => {
    it.each(['transcription', 'cleanup', 'analysis'] as const)(
      'submits %s feedback type correctly',
      async (feedbackType) => {
        vi.mocked(api.submitFeedback).mockResolvedValue({
          id: 'feedback-123',
          entry_id: 'entry-123',
          feedback_type: feedbackType,
          rating: 5,
          created_at: '2024-01-01T00:00:00Z',
        })

        const { result } = renderHook(() =>
          useFeedback({ entryId: 'entry-123', feedbackType })
        )

        await waitFor(() => expect(result.current.isLoading).toBe(false))

        act(() => {
          result.current.setRating(5)
        })

        await act(async () => {
          await result.current.submit()
        })

        expect(api.submitFeedback).toHaveBeenCalledWith('entry-123', {
          feedback_type: feedbackType,
          rating: 5,
          feedback_text: undefined,
        })
      }
    )
  })
})
