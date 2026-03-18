'use client'

import { useState, use, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { importAndCleanup } from '@/features/transcription/api'

const MAX_TEXT_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_EXTENSIONS = ['.txt']
const ALLOWED_MIME_TYPES = ['text/plain']

function validateTextFile(
  file: File,
  t: ReturnType<typeof useTranslations>
): string | null {
  // Check extension
  const dotIndex = file.name.lastIndexOf('.')
  const ext = dotIndex === -1 ? '' : file.name.toLowerCase().slice(dotIndex)
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return t('import.invalidFileType')
  }

  // Check MIME type (can be spoofed, but good UX signal)
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return t('import.invalidFileType')
  }

  // Check size
  if (file.size > MAX_TEXT_FILE_SIZE_BYTES) {
    return t('import.fileTooLarge', { size: '2 MB' })
  }

  return null // Valid
}

export default function NewTextPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const t = useTranslations('dashboard')
  const router = useRouter()

  const [text, setText] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>(locale)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!text.trim()) {
      setError(t('import.emptyText'))
      return
    }

    setIsImporting(true)
    setError(null)

    try {
      const response = await importAndCleanup({
        text: text.trim(),
        language: selectedLanguage,
      })

      // Redirect to entry detail page immediately to show processing state
      router.push(`/${locale}/text/${response.entry_id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('import.failed')
      setError(message)
      setIsImporting(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate file
    const validationError = validateTextFile(file, t)
    if (validationError) {
      setError(validationError)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Read file contents
    try {
      const content = await file.text()
      setText(content)
      setLoadedFileName(file.name)
    } catch {
      setError(t('import.fileReadError'))
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    // Clear file reference when user manually edits
    if (loadedFileName) {
      setLoadedFileName(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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
        {/* Language selection */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            {t('import.language')}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedLanguage('sl')}
              className={`flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors ${
                selectedLanguage === 'sl'
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {t('upload.languageSlovenian')}
            </button>
            <button
              type="button"
              onClick={() => setSelectedLanguage('en')}
              className={`flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors ${
                selectedLanguage === 'en'
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {t('upload.languageEnglish')}
            </button>
          </div>
        </div>

        {/* File upload */}
        <div className="mb-4">
          <Label className="mb-2 block">{t('import.uploadFile')}</Label>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              aria-describedby="file-upload-hint"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
            >
              <UploadIcon />
              {t('import.selectFile')}
            </label>
            {loadedFileName && (
              <span className="text-sm text-slate-600">
                {t('import.fileLoaded', { filename: loadedFileName })}
              </span>
            )}
          </div>
          <p id="file-upload-hint" className="mt-2 text-xs text-slate-500">{t('import.fileHint')}</p>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-x-0 top-0 flex items-center">
            <div className="flex-1 border-t border-slate-200" />
            <span className="px-3 text-xs text-slate-400">{t('import.orPaste')}</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>
          <div className="pt-6">
            <Label htmlFor="text" className="mb-2 block">
              {t('import.label')}
            </Label>
            <textarea
              id="text"
              value={text}
              onChange={handleTextChange}
              placeholder={t('import.placeholder')}
              rows={12}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <p className="mt-2 text-xs text-slate-500">{t('import.hint')}</p>
          </div>
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

function UploadIcon() {
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
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  )
}
