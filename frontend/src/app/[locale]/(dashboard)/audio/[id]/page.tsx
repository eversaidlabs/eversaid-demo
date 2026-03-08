'use client'

import { use } from 'react'

import { TranscriptProvider, DASHBOARD_FEATURES } from '@/features/transcript/context'
import { EntryDetailContainer } from '@/features/dashboard/EntryDetailContainer'

export default function AudioDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = use(params)

  return (
    <TranscriptProvider features={DASHBOARD_FEATURES}>
      <EntryDetailContainer entryId={id} entryType="audio" locale={locale} />
    </TranscriptProvider>
  )
}
