'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { importAndCleanup } from '@/features/transcription/api'

export default function NewTextPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const t = useTranslations('dashboard')
  const router = useRouter()

  const [text, setText] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!text.trim()) {
      setError(t('import.emptyText'))
      return
    }

    setIsImporting(true)
    setError(null)

    try {
      const { data } = await importAndCleanup({
        text: text.trim(),
        language: locale,
      })

      toast.success(t('import.success'))
      router.push(`/${locale}/text`)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('import.failed')
      setError(message)
      setIsImporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back link */}
      <Link
        href={`/${locale}/text`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeftIcon />
        {t('import.backToList')}
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {t('import.title')}
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <Label htmlFor="text" className="mb-2 block">
            {t('import.label')}
          </Label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('import.placeholder')}
            rows={12}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          <p className="mt-2 text-xs text-slate-500">{t('import.hint')}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Submit button */}
        <Button type="submit" disabled={isImporting || !text.trim()} className="w-full">
          {isImporting ? t('import.importing') : t('import.submit')}
        </Button>
      </form>
    </div>
  )
}

function ArrowLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="size-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
      />
    </svg>
  )
}
