'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import type { EntrySummary } from '@/features/transcription/types'
import { EntryCardDropdown } from './entry-card-dropdown'

interface EntryRowProps {
  entry: EntrySummary
  onRename: (entryId: string, currentName: string) => void
  onDownloadTranscript: (entryId: string, filename: string) => void
  onDownloadAudio?: (entryId: string, filename: string) => void
  onDelete: (entryId: string) => void
}

export function EntryRow({
  entry,
  onRename,
  onDownloadTranscript,
  onDownloadAudio,
  onDelete,
}: EntryRowProps) {
  const t = useTranslations('dashboard')
  const pathname = usePathname()
  const router = useRouter()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Extract locale from pathname
  const localeMatch = pathname.match(/^\/(en|sl)/)
  const locale = localeMatch ? localeMatch[1] : 'en'

  const isAudio = !entry.is_transcript_only
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
  const formattedDuration = entry.duration_seconds > 0
    ? formatDuration(entry.duration_seconds)
    : '-'

  // Link to detail page
  const href = isAudio
    ? `/${locale}/audio/${entry.id}`
    : `/${locale}/text/${entry.id}`

  const handleRowClick = () => {
    if (!isDropdownOpen) {
      router.push(href)
    }
  }

  return (
    <tr
      onClick={handleRowClick}
      className={cn(
        'group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50',
        isDropdownOpen && 'bg-slate-50'
      )}
    >
      {/* Type cell */}
      <td className="whitespace-nowrap py-3 pl-4 pr-2">
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
            isAudio
              ? 'bg-sky-50 text-sky-700'
              : 'bg-purple-50 text-purple-700'
          )}
        >
          {isAudio ? <MicrophoneIcon /> : <DocumentIcon />}
          <span className="hidden sm:inline">
            {isAudio ? t('card.audio') : t('card.text')}
          </span>
        </div>
      </td>

      {/* Title cell */}
      <td className="max-w-[200px] py-3 pr-2 sm:max-w-xs lg:max-w-md">
        <span className="block truncate font-medium text-slate-900 group-hover:text-sky-600">
          {displayName}
        </span>
      </td>

      {/* Status cell */}
      <td className="whitespace-nowrap py-3 pr-2">
        <StatusBadge status={status} />
      </td>

      {/* Date cell */}
      <td className="hidden whitespace-nowrap py-3 pr-2 text-sm text-slate-500 sm:table-cell">
        {formattedDate}
      </td>

      {/* Duration cell - hidden on small screens */}
      <td className="hidden whitespace-nowrap py-3 pr-2 text-sm text-slate-500 md:table-cell">
        {formattedDuration}
      </td>

      {/* Actions cell */}
      <td className="relative whitespace-nowrap py-3 pl-2 pr-4 text-right">
        <div
          className="relative inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          <EntryCardDropdown
            entryId={entry.id}
            filename={displayName}
            isAudio={isAudio}
            isOpen={isDropdownOpen}
            onOpenChange={setIsDropdownOpen}
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
      </td>
    </tr>
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
      <div className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
        <SpinnerIcon />
        <span className="hidden xs:inline">{t('card.processing')}</span>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
        <AlertIcon />
        <span className="hidden xs:inline">{t('card.failed')}</span>
      </div>
    )
  }

  // Complete status
  return (
    <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
      <CheckIcon />
      <span className="hidden xs:inline">{t('table.complete')}</span>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.round(seconds)

  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }

  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60

  if (minutes < 60) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

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

function CheckIcon() {
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
        d="M5 13l4 4L19 7"
      />
    </svg>
  )
}
