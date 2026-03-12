'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'

import { TranscriptProvider, DASHBOARD_FEATURES } from '@/features/transcript/context'
import { EntryDetailContainer } from '@/features/dashboard/EntryDetailContainer'

export default function TextDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = use(params)
  const router = useRouter()

  const handleClose = () => {
    router.push(`/${locale}/text`)
  }

  return (
    <TranscriptProvider features={DASHBOARD_FEATURES}>
      <EntryDetailContainer
        entryId={id}
        entryType="text"
        locale={locale}
        onClose={handleClose}
      />
    </TranscriptProvider>
  )
}
