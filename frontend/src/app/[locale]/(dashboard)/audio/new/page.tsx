'use client'

import { useState, use, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { uploadAndTranscribe } from '@/features/transcription/api'

const MAX_FILE_SIZE_MB = 100
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export default function NewAudioPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const t = useTranslations('dashboard')
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null)
  const [speakerCount, setSpeakerCount] = useState(2)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange = useCallback(
    (selectedFile: File | null) => {
      if (!selectedFile) return

      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/flac']
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(mp3|wav|m4a|flac)$/i)) {
        setError(t('upload.invalidType'))
        return
      }

      // Validate file size
      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        setError(t('upload.tooLarge', { maxSize: MAX_FILE_SIZE_MB }))
        return
      }

      setFile(selectedFile)
      setError(null)
    },
    [t]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const droppedFile = e.dataTransfer.files[0]
      handleFileChange(droppedFile)
    },
    [handleFileChange]
  )

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const { data } = await uploadAndTranscribe(file, {
        language: locale,
        speakerCount,
        enableDiarization: speakerCount > 1,
      })

      toast.success(t('upload.success'))
      router.push(`/${locale}/audio`)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('upload.failed')
      setError(message)
      setIsUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back link */}
      <Link
        href={`/${locale}/audio`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeftIcon />
        {t('upload.backToList')}
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {t('upload.title')}
      </h1>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-sky-400 bg-sky-50'
            : file
              ? 'border-green-400 bg-green-50'
              : 'border-slate-300 bg-white'
        }`}
      >
        {file ? (
          <div>
            <div className="mb-2 flex items-center justify-center gap-2 text-green-600">
              <CheckIcon />
              <span className="font-medium">{file.name}</span>
            </div>
            <p className="text-sm text-slate-500">
              {(file.size / (1024 * 1024)).toFixed(1)} MB
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFile(null)}
              className="mt-2"
            >
              {t('upload.changeFile')}
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex justify-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-50 to-purple-50">
                <UploadIcon className="size-8 text-sky-500" />
              </div>
            </div>
            <p className="mb-2 text-slate-700">{t('upload.dropHere')}</p>
            <p className="mb-4 text-sm text-slate-500">{t('upload.or')}</p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".mp3,.wav,.m4a,.flac,audio/*"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                {t('upload.browse')}
              </span>
            </label>
            <p className="mt-4 text-xs text-slate-400">
              {t('upload.formats')}
            </p>
          </div>
        )}
      </div>

      {/* Speaker count */}
      {file && (
        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            {t('upload.speakerCount')}
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((count) => (
              <button
                key={count}
                onClick={() => setSpeakerCount(count)}
                className={`flex size-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                  speakerCount === count
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {count === 5 ? '5+' : count}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Upload button */}
      {file && (
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          className="mt-6 w-full"
        >
          {isUploading ? t('upload.uploading') : t('upload.submit')}
        </Button>
      )}
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

function UploadIcon({ className }: { className?: string }) {
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
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
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
      className="size-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}
