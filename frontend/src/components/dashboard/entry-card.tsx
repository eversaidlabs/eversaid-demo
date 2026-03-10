'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import type { EntrySummary } from '@/features/transcription/types'
import { EntryCardDropdown } from './entry-card-dropdown'

interface EntryCardProps {
  entry: EntrySummary
  onRename: (entryId: string, currentName: string) => void
  onDownloadTranscript: (entryId: string, filename: string) => void
  onDownloadAudio?: (entryId: string, filename: string) => void
  onDelete: (entryId: string) => void
}

export function EntryCard({
  entry,
  onRename,
  onDownloadTranscript,
  onDownloadAudio,
  onDelete,
}: EntryCardProps) {
  const t = useTranslations('dashboard')
  const pathname = usePathname()

  // Extract locale from pathname
  const localeMatch = pathname.match(/^\/(en|sl)/)
  const locale = localeMatch ? localeMatch[1] : 'en'

  const isAudio = entry.entry_type === 'audio'
  const status = getEntryStatus(entry)
  const displayName = entry.title || entry.original_filename

  // Format date
  const date = new Date(entry.uploaded_at)
  const formattedDate = date.toLocaleDateString(locale === 'sl' ? 'sl-SI' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // Format duration
  const formattedDuration = formatDuration(entry.duration_seconds)

  // Link to detail page
  const href = isAudio
    ? `/${locale}/audio/${entry.id}`
    : `/${locale}/text/${entry.id}`

  return (
    <Link
      href={href}
      className="group relative block rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
    >
      {/* Header with badges and menu */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {/* Type badge */}
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
              isAudio
                ? 'bg-sky-50 text-sky-700'
                : 'bg-purple-50 text-purple-700'
            )}
          >
            {isAudio ? <MicrophoneIcon /> : <DocumentIcon />}
            {isAudio ? t('card.audio') : t('card.text')}
          </div>

          {/* Status badge */}
          {status !== 'complete' && <StatusBadge status={status} />}
        </div>

        {/* Dropdown menu - stop propagation to prevent navigation */}
        <div onClick={(e) => e.preventDefault()}>
          <EntryCardDropdown
            entryId={entry.id}
            filename={displayName}
            isAudio={isAudio}
            onRename={() => onRename(entry.id, displayName)}
            onDownloadTranscript={() =>
              onDownloadTranscript(entry.id, displayName)
            }
            onDownloadAudio={
              isAudio && onDownloadAudio
                ? () => onDownloadAudio(entry.id, displayName)
                : undefined
            }
            onDelete={() => onDelete(entry.id)}
          />
        </div>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-base font-semibold text-slate-900 line-clamp-2 group-hover:text-sky-600">
        {displayName}
      </h3>

      {/* Meta info */}
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span className="flex items-center gap-1.5">
          <CalendarIcon />
          {formattedDate}
        </span>
        {entry.duration_seconds > 0 && (
          <span className="flex items-center gap-1.5">
            <ClockIcon />
            {formattedDuration}
          </span>
        )}
      </div>
    </Link>
  )
}

type EntryStatus = 'processing' | 'failed' | 'complete'

function getEntryStatus(entry: EntrySummary): EntryStatus {
  const transcriptionStatus = entry.primary_transcription?.status
  const cleanupStatus = entry.latest_cleaned_entry?.status

  if (transcriptionStatus === 'failed' || cleanupStatus === 'failed') {
    return 'failed'
  }

  if (
    transcriptionStatus === 'pending' ||
    transcriptionStatus === 'processing' ||
    cleanupStatus === 'pending' ||
    cleanupStatus === 'processing'
  ) {
    return 'processing'
  }

  return 'complete'
}

function StatusBadge({ status }: { status: EntryStatus }) {
  const t = useTranslations('dashboard')

  if (status === 'processing') {
    return (
      <div className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
        <SpinnerIcon />
        {t('card.processing')}
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
        <AlertIcon />
        {t('card.failed')}
      </div>
    )
  }

  return null
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.round(seconds)

  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }

  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60

  if (minutes < 60) {
    // Format as "2:30" for cleaner display
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  // Format as "1:23:45" for hour+ durations
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Icons
function MicrophoneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="size-3.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="size-3.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="size-3.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="size-3.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="size-3 animate-spin"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="size-3"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  )
}
