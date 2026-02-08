import posthog from 'posthog-js'

/**
 * Type map for all tracked analytics events.
 * Each key is an event name, and its value defines the expected properties.
 */
interface AnalyticsEventMap {
  sample_audio_clicked: Record<string, never>
  file_selected: { file_format: string }
  record_audio_clicked: Record<string, never>
  text_import_clicked: Record<string, never>
  cleanup_completed: { language: string; source: 'demo' | 'upload' | 'recording' }
  cleanup_failed: { error_type: string; source: 'demo' | 'upload' | 'recording' }
  diff_view_opened: Record<string, never>
  quality_rated: { rating: number }
  copy_clicked: { side: 'raw' | 'cleaned' }
  waitlist_form_opened: Record<string, never>
  waitlist_joined: { user_role: string }
  share_feedback_clicked: Record<string, never>
}

type EventName = keyof AnalyticsEventMap

const isDev = process.env.NODE_ENV === 'development'

export function capture<E extends EventName>(
  event: E,
  ...args: AnalyticsEventMap[E] extends Record<string, never> ? [] : [AnalyticsEventMap[E]]
): void {
  const properties = args[0] as AnalyticsEventMap[E] | undefined

  if (isDev) {
    console.log('[analytics]', event, properties ?? '')
  }

  try {
    if (posthog.__loaded) {
      posthog.capture(event, properties)
    }
  } catch {
    // Analytics must never break the app
  }
}
