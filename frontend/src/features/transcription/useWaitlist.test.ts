import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWaitlist, type WaitlistFormData } from './useWaitlist'
import * as api from './api'
import { ApiError } from './types'
import { toast } from 'sonner'

// Mock the API module
vi.mock('./api', () => ({
  joinWaitlist: vi.fn(),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const defaultFormData: WaitlistFormData = {
  useCase: 'Meeting transcriptions',
  volume: '',
  source: '',
  notes: '',
  languagePreference: '',
}

describe('useWaitlist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe('initial state', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      expect(result.current.email).toBe('')
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.isSubmitted).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  // ===========================================================================
  // State Management
  // ===========================================================================

  describe('state management', () => {
    it('updates email when setEmail is called', () => {
      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      act(() => {
        result.current.setEmail('test@example.com')
      })

      expect(result.current.email).toBe('test@example.com')
    })

    it('resets all state when reset is called', () => {
      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      // Set some values
      act(() => {
        result.current.setEmail('test@example.com')
      })

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.email).toBe('')
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.isSubmitted).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  // ===========================================================================
  // Validation
  // ===========================================================================

  describe('validation', () => {
    it('requires email before submission', async () => {
      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      await act(async () => {
        await result.current.submit(defaultFormData)
      })

      expect(result.current.error).toBe('Please enter your email address')
      expect(api.joinWaitlist).not.toHaveBeenCalled()
    })

    it('trims whitespace from email', async () => {
      vi.mocked(api.joinWaitlist).mockResolvedValue({ message: 'Success' })

      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      act(() => {
        result.current.setEmail('  test@example.com  ')
      })

      await act(async () => {
        await result.current.submit(defaultFormData)
      })

      expect(api.joinWaitlist).toHaveBeenCalledWith({
        email: 'test@example.com',
        use_case: 'Meeting transcriptions',
        waitlist_type: 'extended_usage',
        source_page: undefined,
        language_preference: undefined,
      })
    })

    it('handles empty use case gracefully', async () => {
      vi.mocked(api.joinWaitlist).mockResolvedValue({ message: 'Success' })

      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      act(() => {
        result.current.setEmail('test@example.com')
      })

      await act(async () => {
        await result.current.submit({ useCase: '', volume: '', source: '', notes: '', languagePreference: '' })
      })

      expect(api.joinWaitlist).toHaveBeenCalledWith({
        email: 'test@example.com',
        use_case: undefined,
        waitlist_type: 'extended_usage',
        source_page: undefined,
        language_preference: undefined,
      })
    })
  })

  // ===========================================================================
  // Submission Flow
  // ===========================================================================

  describe('submission flow', () => {
    it('submits waitlist request successfully', async () => {
      vi.mocked(api.joinWaitlist).mockResolvedValue({ message: 'Success' })

      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      act(() => {
        result.current.setEmail('test@example.com')
      })

      await act(async () => {
        await result.current.submit(defaultFormData)
      })

      expect(api.joinWaitlist).toHaveBeenCalledWith({
        email: 'test@example.com',
        use_case: 'Meeting transcriptions',
        waitlist_type: 'extended_usage',
        source_page: undefined,
        language_preference: undefined,
      })
      expect(result.current.isSubmitted).toBe(true)
      expect(result.current.error).toBeNull()
      expect(toast.success).toHaveBeenCalledWith("You're on the waitlist!")
    })

    it('includes source_page when provided', async () => {
      vi.mocked(api.joinWaitlist).mockResolvedValue({ message: 'Success' })

      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'api_access', sourcePage: '/demo' })
      )

      act(() => {
        result.current.setEmail('test@example.com')
      })

      await act(async () => {
        await result.current.submit({ useCase: 'API integration', volume: '', source: '', notes: '', languagePreference: 'en' })
      })

      expect(api.joinWaitlist).toHaveBeenCalledWith({
        email: 'test@example.com',
        use_case: 'API integration',
        waitlist_type: 'api_access',
        source_page: '/demo',
        language_preference: 'en',
      })
    })

    it('sets isSubmitting during submission', async () => {
      let resolvePromise: () => void
      vi.mocked(api.joinWaitlist).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = () =>
              resolve({ message: 'Success' })
          })
      )

      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      act(() => {
        result.current.setEmail('test@example.com')
      })

      // Start submission
      act(() => {
        result.current.submit(defaultFormData)
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
    it('handles 409 duplicate email as success', async () => {
      vi.mocked(api.joinWaitlist).mockRejectedValue(
        new ApiError(409, 'Email already registered')
      )

      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      act(() => {
        result.current.setEmail('existing@example.com')
      })

      await act(async () => {
        await result.current.submit(defaultFormData)
      })

      // Should be treated as success
      expect(result.current.isSubmitted).toBe(true)
      expect(result.current.error).toBeNull()
      expect(toast.success).toHaveBeenCalledWith("You're already on the waitlist!")
    })

    it('handles 429 rate limit error', async () => {
      vi.mocked(api.joinWaitlist).mockRejectedValue(
        new ApiError(429, 'Rate limit exceeded')
      )

      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      act(() => {
        result.current.setEmail('test@example.com')
      })

      await act(async () => {
        await result.current.submit(defaultFormData)
      })

      expect(result.current.error).toBe('Too many requests. Please try again later.')
      expect(result.current.isSubmitted).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('Too many requests. Please try again later.')
    })

    it('handles 422 validation error', async () => {
      vi.mocked(api.joinWaitlist).mockRejectedValue(
        new ApiError(422, 'Invalid email format')
      )

      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      act(() => {
        result.current.setEmail('invalid-email')
      })

      await act(async () => {
        await result.current.submit(defaultFormData)
      })

      expect(result.current.error).toBe('Please check your email address and try again.')
      expect(result.current.isSubmitted).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('Please check your email address and try again.')
    })

    it('handles generic ApiError with custom message', async () => {
      vi.mocked(api.joinWaitlist).mockRejectedValue(
        new ApiError(500, 'Server error occurred')
      )

      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      act(() => {
        result.current.setEmail('test@example.com')
      })

      await act(async () => {
        await result.current.submit(defaultFormData)
      })

      expect(result.current.error).toBe('Server error occurred')
      expect(toast.error).toHaveBeenCalledWith('Server error occurred')
    })

    it('handles non-ApiError errors', async () => {
      vi.mocked(api.joinWaitlist).mockRejectedValue(new Error('Network failure'))

      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      act(() => {
        result.current.setEmail('test@example.com')
      })

      await act(async () => {
        await result.current.submit(defaultFormData)
      })

      expect(result.current.error).toBe('Failed to join waitlist. Please try again.')
      expect(toast.error).toHaveBeenCalledWith('Failed to join waitlist. Please try again.')
    })

    it('clears error on new submission attempt', async () => {
      vi.mocked(api.joinWaitlist)
        .mockRejectedValueOnce(new ApiError(500, 'Server error'))
        .mockResolvedValueOnce({ message: 'Success' })

      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      act(() => {
        result.current.setEmail('test@example.com')
      })

      // First attempt fails
      await act(async () => {
        await result.current.submit(defaultFormData)
      })

      expect(result.current.error).toBe('Server error')

      // Second attempt should clear error
      await act(async () => {
        await result.current.submit(defaultFormData)
      })

      expect(result.current.error).toBeNull()
      expect(result.current.isSubmitted).toBe(true)
    })
  })

  // ===========================================================================
  // Waitlist Types
  // ===========================================================================

  describe('waitlist types', () => {
    it.each(['extended_usage', 'api_access'] as const)(
      'submits %s waitlist type correctly',
      async (waitlistType) => {
        vi.mocked(api.joinWaitlist).mockResolvedValue({ message: 'Success' })

        const { result } = renderHook(() =>
          useWaitlist({ waitlistType })
        )

        act(() => {
          result.current.setEmail('test@example.com')
        })

        await act(async () => {
          await result.current.submit(defaultFormData)
        })

        expect(api.joinWaitlist).toHaveBeenCalledWith(
          expect.objectContaining({
            waitlist_type: waitlistType,
          })
        )
      }
    )
  })

  // ===========================================================================
  // Language Preference
  // ===========================================================================

  describe('language preference', () => {
    it('includes language_preference when provided in form data', async () => {
      vi.mocked(api.joinWaitlist).mockResolvedValue({ message: 'Success' })

      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      act(() => {
        result.current.setEmail('test@example.com')
      })

      await act(async () => {
        await result.current.submit({
          useCase: 'Testing',
          volume: '',
          source: '',
          notes: '',
          languagePreference: 'sl',
        })
      })

      expect(api.joinWaitlist).toHaveBeenCalledWith(
        expect.objectContaining({
          language_preference: 'sl',
        })
      )
    })

    it('omits language_preference when empty string', async () => {
      vi.mocked(api.joinWaitlist).mockResolvedValue({ message: 'Success' })

      const { result } = renderHook(() =>
        useWaitlist({ waitlistType: 'extended_usage' })
      )

      act(() => {
        result.current.setEmail('test@example.com')
      })

      await act(async () => {
        await result.current.submit({
          useCase: 'Testing',
          volume: '',
          source: '',
          notes: '',
          languagePreference: '',
        })
      })

      expect(api.joinWaitlist).toHaveBeenCalledWith(
        expect.objectContaining({
          language_preference: undefined,
        })
      )
    })
  })
})
