'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface EmptyStateProps {
  type: 'audio' | 'text'
}

/**
 * Empty state component for entry lists.
 * Shows different content based on whether it's audio or text view.
 */
export function EmptyState({ type }: EmptyStateProps) {
  const t = useTranslations('dashboard')
  const pathname = usePathname()

  // Extract locale from pathname
  const localeMatch = pathname.match(/^\/(en|sl)/)
  const locale = localeMatch ? localeMatch[1] : 'en'

  const isAudio = type === 'audio'
  const href = isAudio ? `/${locale}/audio/new` : `/${locale}/text/new`

  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-8 py-16 text-center">
      {/* Icon */}
      <div className="mb-5 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-purple-50">
        {isAudio ? (
          <MicrophoneIcon className="size-9 text-sky-500" />
        ) : (
          <DocumentIcon className="size-9 text-purple-500" />
        )}
      </div>

      {/* Title */}
      <h3 className="mb-2 text-lg font-semibold text-slate-900">
        {isAudio ? t('empty.audioTitle') : t('empty.textTitle')}
      </h3>

      {/* Description */}
      <p className="mb-6 max-w-sm text-sm text-slate-500">
        {isAudio ? t('empty.audioDescription') : t('empty.textDescription')}
      </p>

      {/* CTA */}
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-400 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-400/40"
      >
        <PlusIcon />
        {isAudio ? t('empty.uploadAudio') : t('empty.importText')}
      </Link>
    </div>
  )
}

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
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
      strokeWidth={1.5}
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

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="size-4"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
