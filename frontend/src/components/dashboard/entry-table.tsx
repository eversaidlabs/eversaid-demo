'use client'

import { useTranslations } from 'next-intl'

import type { EntrySummary } from '@/features/transcription/types'
import { EntryRow } from './entry-row'

interface EntryTableProps {
  entries: EntrySummary[]
  onRename: (entryId: string, currentName: string) => void
  onDownloadTranscript: (entryId: string, filename: string) => void
  onDownloadAudio?: (entryId: string, filename: string) => void
  onDelete: (entryId: string) => void
}

/**
 * Table layout for entry list.
 * Responsive: hides Duration on sm, hides Date on xs.
 */
export function EntryTable({
  entries,
  onRename,
  onDownloadTranscript,
  onDownloadAudio,
  onDelete,
}: EntryTableProps) {
  const t = useTranslations('dashboard')

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="whitespace-nowrap py-3 pl-4 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('table.type')}
              </th>
              <th className="py-3 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('table.title')}
              </th>
              <th className="whitespace-nowrap py-3 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('table.status')}
              </th>
              <th className="hidden whitespace-nowrap py-3 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">
                {t('table.date')}
              </th>
              <th className="hidden whitespace-nowrap py-3 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">
                {t('table.duration')}
              </th>
              <th className="whitespace-nowrap py-3 pl-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="sr-only">{t('table.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onRename={onRename}
                onDownloadTranscript={onDownloadTranscript}
                onDownloadAudio={onDownloadAudio}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
