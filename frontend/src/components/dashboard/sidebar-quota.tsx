'use client'

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { useQuota } from '@/features/dashboard/useQuota'

/**
 * Context-aware quota display.
 * Shows audio hours on /audio views, text words on /text views.
 */
export function SidebarQuota() {
  const t = useTranslations('dashboard')
  const pathname = usePathname()
  const { quota, isLoading } = useQuota()

  const isTextView = pathname.includes('/text')

  if (isLoading || !quota) {
    return (
      <div className="mb-4 animate-pulse rounded-xl bg-white/5 p-4">
        <div className="mb-2 h-4 w-24 rounded bg-white/10" />
        <div className="mb-2 h-6 w-16 rounded bg-white/10" />
        <div className="h-1 w-full rounded bg-white/10" />
      </div>
    )
  }

  // Determine which quota to show based on current view
  const quotaData = isTextView ? quota.text : quota.audio
  const percentage = Math.min(
    100,
    Math.round((quotaData.used / quotaData.limit) * 100)
  )
  const remaining = quotaData.limit - quotaData.used
  const isWarning = percentage >= 80

  // Format display value
  const formatValue = (value: number, type: 'audio' | 'text') => {
    if (type === 'audio') {
      // Convert seconds to hours
      const hours = value / 3600
      if (hours >= 1) {
        return `${hours.toFixed(1)} ${t('quota.hours')}`
      }
      const minutes = value / 60
      return `${Math.round(minutes)} ${t('quota.minutes')}`
    } else {
      // Words
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k ${t('quota.words')}`
      }
      return `${value} ${t('quota.words')}`
    }
  }

  return (
    <div className="mb-4 rounded-xl bg-white/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        {isTextView ? (
          <DocumentIcon className="size-4 text-white/50" />
        ) : (
          <MicrophoneIcon className="size-4 text-white/50" />
        )}
        <span className="text-xs text-white/50">
          {isTextView ? t('quota.textRemaining') : t('quota.audioRemaining')}
        </span>
      </div>
      <div className="mb-2 text-xl font-bold text-white">
        {formatValue(remaining, isTextView ? 'text' : 'audio')}
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isWarning
              ? 'bg-gradient-to-r from-amber-500 to-red-500'
              : 'bg-gradient-to-r from-sky-400 to-purple-500'
          )}
          style={{ width: `${100 - percentage}%` }}
        />
      </div>
    </div>
  )
}

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  )
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}
