"use client"

import type React from "react"
import { FileAudio, FileText, FileUp, X } from "lucide-react"
import { useTranslations } from 'next-intl'
import { Link } from "@/i18n/routing"
import { useConfig } from '@/lib/config-context'
import type { ProcessingStage, StageId, CleanupType } from "@/features/transcription/types"
import { ProcessingStages } from "./processing-stages"
import { VISIBLE_CLEANUP_LEVELS, DISABLED_CLEANUP_LEVELS } from "@/lib/level-config"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** Input mode for the upload zone */
export type InputMode = 'audio' | 'text'

export interface UploadZoneProps {
  /** Selected speaker count, or null for auto-detection */
  selectedSpeakerCount: number | null
  isUploading: boolean
  uploadProgress: number
  hasFile: boolean
  selectedFile: File | null
  onFileSelect: (file: File) => void
  onRemoveFile: () => void
  /** Callback when speaker count changes. null means auto-detect */
  onSpeakerCountChange: (count: number | null) => void
  onTranscribeClick: () => void
  onRecordClick: () => void
  /** Processing stages for stage-based progress display */
  stages?: ProcessingStage[]
  /** Currently active stage ID */
  currentStageId?: StageId | null
  /** Currently selected audio language code */
  selectedAudioLanguage: string
  /** Callback when audio language changes */
  onAudioLanguageChange: (language: string) => void
  /** Current input mode: 'audio' or 'text' */
  inputMode?: InputMode
  /** Callback when input mode changes */
  onInputModeChange?: (mode: InputMode) => void
  /** Text content for text import mode */
  text?: string
  /** Callback when text changes */
  onTextChange?: (text: string) => void
  /** Selected cleanup type for text import */
  selectedCleanupType?: CleanupType
  /** Callback when cleanup type changes */
  onCleanupTypeChange?: (type: CleanupType) => void
  /** Callback when import text button is clicked */
  onImportTextClick?: () => void
  /** Whether text import is in progress */
  isImporting?: boolean
  /** Selected text file for text import */
  textFile?: File | null
  /** Callback when a text file is selected */
  onTextFileSelect?: (file: File) => void
  /** Callback when text file is removed */
  onTextFileRemove?: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadZone({
  selectedSpeakerCount,
  isUploading,
  uploadProgress,
  hasFile,
  selectedFile,
  onFileSelect,
  onRemoveFile,
  onSpeakerCountChange,
  onTranscribeClick,
  onRecordClick,
  stages,
  currentStageId,
  selectedAudioLanguage,
  onAudioLanguageChange,
  inputMode = 'audio',
  onInputModeChange,
  text = '',
  onTextChange,
  selectedCleanupType = 'clean',
  onCleanupTypeChange,
  onImportTextClick,
  isImporting = false,
  textFile = null,
  onTextFileSelect,
  onTextFileRemove,
}: UploadZoneProps) {
  const t = useTranslations('demo.upload')
  const tCommon = useTranslations('common')
  const { limits } = useConfig()

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) onFileSelect(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
  }

  const handleTextFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && onTextFileSelect) onTextFileSelect(file)
  }

  const handleTextFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onTextFileSelect) onTextFileSelect(file)
  }

  // Check if mode switching is enabled
  const showModeToggle = onInputModeChange !== undefined

  return (
    <div className="bg-white rounded-[20px] border border-[#E2E8F0] overflow-hidden">
      {/* Mode Toggle */}
      {showModeToggle && (
        <div className="px-4 py-3 border-b border-[#E2E8F0]">
          <div className="inline-flex bg-[#F1F5F9] rounded-lg p-0.5">
            <button
              onClick={() => onInputModeChange?.('audio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                inputMode === 'audio'
                  ? 'bg-white shadow-sm text-[#0F172A]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <FileAudio className="w-4 h-4" />
              {t('audioFile')}
            </button>
            <button
              onClick={() => onInputModeChange?.('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                inputMode === 'text'
                  ? 'bg-white shadow-sm text-[#0F172A]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <FileText className="w-4 h-4" />
              {t('text')}
            </button>
          </div>
        </div>
      )}

      {/* Audio Mode Content */}
      {inputMode === 'audio' && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="p-4 m-4 border-2 border-dashed border-[#E2E8F0] rounded-2xl text-center hover:border-[#38BDF8] hover:bg-[rgba(56,189,248,0.02)] transition-all cursor-pointer"
          >
            <div className="w-14 h-14 bg-[linear-gradient(135deg,rgba(56,189,248,0.1)_0%,rgba(168,85,247,0.1)_100%)] rounded-[16px] flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 stroke-[#38BDF8]" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h3 className="text-[18px] font-bold text-[#0F172A] mb-1">{t('dropTitle')}</h3>
            <p className="text-[14px] text-[#64748B] mb-3">{t('formats', {
              maxSizeMb: limits?.maxAudioFileSizeMb ?? 50,
              maxDurationMin: Math.floor((limits?.maxAudioDurationSeconds ?? 180) / 60),
            })}</p>
            <label className="px-5 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-sm font-semibold rounded-[10px] transition-colors cursor-pointer inline-block">
              {t('browse')}
              <input type="file" accept="audio/*" onChange={handleFileInput} className="hidden" />
            </label>
          </div>

          <div className="flex items-center gap-4 px-4 text-[13px] font-medium text-[#94A3B8]">
            <div className="flex-1 h-px bg-[#E2E8F0]" />
            {tCommon('or')}
            <div className="flex-1 h-px bg-[#E2E8F0]" />
          </div>

          <div className="p-4 flex items-center justify-center">
            <button
              onClick={onRecordClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-[#FEF2F2] border-2 border-[#E2E8F0] hover:border-[#EF4444] rounded-xl text-[14px] font-semibold text-[#0F172A] transition-all"
            >
              <div className="w-2.5 h-2.5 bg-[#EF4444] rounded-full" />
              {t('record')}
            </button>
          </div>
        </>
      )}

      {/* Text Mode Content */}
      {inputMode === 'text' && (
        <div className="p-4">
          {/* File upload zone - shown when no file is selected */}
          {!textFile && onTextFileSelect && (
            <>
              <div
                onDrop={handleTextFileDrop}
                onDragOver={(e) => e.preventDefault()}
                className="p-4 border-2 border-dashed border-[#E2E8F0] rounded-xl text-center hover:border-[#38BDF8] hover:bg-[rgba(56,189,248,0.02)] transition-all cursor-pointer mb-3"
              >
                <div className="w-10 h-10 bg-[linear-gradient(135deg,rgba(56,189,248,0.1)_0%,rgba(168,85,247,0.1)_100%)] rounded-lg flex items-center justify-center mx-auto mb-2">
                  <FileUp className="w-5 h-5 text-[#38BDF8]" />
                </div>
                <h4 className="text-[14px] font-semibold text-[#0F172A] mb-1">{t('dropTextFile')}</h4>
                <p className="text-[12px] text-[#64748B] mb-2">{t('textFileHint')}</p>
                <label className="px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] text-sm font-semibold rounded-lg transition-colors cursor-pointer inline-block">
                  {t('browseTextFile')}
                  <input
                    type="file"
                    accept=".txt,text/plain"
                    onChange={handleTextFileInput}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center gap-4 text-[12px] font-medium text-[#94A3B8] mb-3">
                <div className="flex-1 h-px bg-[#E2E8F0]" />
                {t('orPasteText')}
                <div className="flex-1 h-px bg-[#E2E8F0]" />
              </div>
            </>
          )}

          {/* Selected file preview */}
          {textFile && onTextFileRemove && (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3 mb-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-[#E2E8F0]">
                <FileText className="w-5 h-5 text-[#38BDF8]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[#0F172A] truncate">{textFile.name}</div>
                <div className="text-[12px] text-[#64748B]">
                  {formatFileSize(textFile.size)}
                </div>
              </div>
              <button
                onClick={onTextFileRemove}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#FEE2E2] text-[#64748B] hover:text-[#EF4444] transition-all flex-shrink-0"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => onTextChange?.(e.target.value)}
            placeholder={t('textPlaceholder')}
            className="w-full h-36 p-3 border-2 border-[#E2E8F0] rounded-xl text-[14px] text-[#0F172A] placeholder-[#94A3B8] resize-none focus:outline-none focus:border-[#38BDF8] transition-colors"
          />
          <p className="text-[11px] text-[#94A3B8] mt-1.5 mb-3">{t('textHint')}</p>
        </div>
      )}

      {/* Audio mode: show selected file */}
      {inputMode === 'audio' && selectedFile && (
        <div className="px-4 pb-4">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-[#E2E8F0]">
              <FileAudio className="w-5 h-5 text-[#38BDF8]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[#0F172A] truncate">{selectedFile.name}</div>
              <div className="text-[12px] text-[#64748B]">
                {formatFileSize(selectedFile.size)} · {selectedFile.type || t('audioFile')}
              </div>
            </div>
            <button
              onClick={onRemoveFile}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#FEE2E2] text-[#64748B] hover:text-[#EF4444] transition-all flex-shrink-0"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pb-4">
        {/* Language selection (both modes) */}
        <div className="text-[12px] font-semibold text-[#64748B] mb-2">
          {inputMode === 'audio' ? t('audioLanguage') : t('textLanguage')}
        </div>
        <div className="flex gap-2 mb-3">
          {[
            { code: 'sl', label: t('languageSlovenian') },
            { code: 'en', label: t('languageEnglish') },
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => onAudioLanguageChange(lang.code)}
              className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all ${
                selectedAudioLanguage === lang.code
                  ? "bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white"
                  : "bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Audio mode: speaker count */}
        {inputMode === 'audio' && (
          <>
            <div className="text-[12px] font-semibold text-[#64748B] mb-2">{t('speakerCount')}</div>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {/* Auto option */}
              <button
                onClick={() => onSpeakerCountChange(null)}
                className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all ${
                  selectedSpeakerCount === null
                    ? "bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white"
                    : "bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {t('speakerCountAuto')}
              </button>
              {/* Numeric options */}
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => onSpeakerCountChange(num)}
                  className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all ${
                    selectedSpeakerCount === num
                      ? "bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white"
                      : "bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#94A3B8] mb-3">{t('speakerCountHint')}</p>
          </>
        )}

        {/* Text mode: cleanup type */}
        {inputMode === 'text' && onCleanupTypeChange && (
          <>
            <div className="text-[12px] font-semibold text-[#64748B] mb-2">{t('cleanupType')}</div>
            <div className="flex gap-2 mb-3">
              <TooltipProvider delayDuration={300}>
                {VISIBLE_CLEANUP_LEVELS.map((levelType) => {
                  const isDisabled = DISABLED_CLEANUP_LEVELS.includes(levelType)
                  const label = levelType === 'minimal' ? t('cleanupMinimal')
                    : levelType === 'clean' ? t('cleanupClean')
                    : t('cleanupEdited')

                  const button = (
                    <button
                      key={levelType}
                      onClick={() => !isDisabled && onCleanupTypeChange(levelType)}
                      disabled={isDisabled}
                      className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all ${
                        isDisabled
                          ? "opacity-60 cursor-not-allowed border border-dashed border-[#94A3B8]/30 bg-[#F8FAFC] text-[#94A3B8]"
                          : selectedCleanupType === levelType
                            ? "bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white"
                            : "bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      {label}
                    </button>
                  )

                  if (isDisabled) {
                    return (
                      <Tooltip key={levelType}>
                        <TooltipTrigger asChild>
                          {button}
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {tCommon('comingSoon')}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return button
                })}
              </TooltipProvider>
            </div>
          </>
        )}

        {/* Audio mode: upload/transcribe button */}
        {inputMode === 'audio' && (
          isUploading ? (
            stages && stages.length > 0 ? (
              <div className="w-full bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <ProcessingStages
                  stages={stages}
                  currentStageId={currentStageId ?? null}
                />
              </div>
            ) : (
              <div className="w-full py-3 bg-[#F1F5F9] rounded-xl">
                <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden mx-4">
                  <div
                    className="h-full bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[12px] text-[#64748B] text-center mt-1.5">
                  {t('uploading', { progress: uploadProgress })}
                </p>
              </div>
            )
          ) : (
            <button
              disabled={!hasFile}
              onClick={onTranscribeClick}
              className={`w-full py-3 bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white text-[15px] font-bold rounded-xl transition-all ${
                !hasFile ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
              }`}
            >
              {hasFile ? t('transcribeNow') : t('selectFile')}
            </button>
          )
        )}

        {/* Text mode: cleanup button */}
        {inputMode === 'text' && (
          isImporting ? (
            stages && stages.length > 0 ? (
              <div className="w-full bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                <ProcessingStages
                  stages={stages}
                  currentStageId={currentStageId ?? null}
                />
              </div>
            ) : (
              <div className="w-full py-3 bg-[#F1F5F9] rounded-xl">
                <p className="text-[12px] text-[#64748B] text-center">
                  {t('importing')}
                </p>
              </div>
            )
          ) : (
            <button
              disabled={!text.trim()}
              onClick={onImportTextClick}
              className={`w-full py-3 bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white text-[15px] font-bold rounded-xl transition-all ${
                !text.trim() ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
              }`}
            >
              {text.trim() ? t('cleanupNow') : t('enterText')}
            </button>
          )
        )}

        {/* Consent message */}
        <p className="text-[10px] text-[#94A3B8] text-center mt-3">
          {t.rich('consent', {
            terms: (chunks) => (
              <Link href="/terms" className="text-[#64748B] hover:text-[#0F172A] underline transition-colors">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" className="text-[#64748B] hover:text-[#0F172A] underline transition-colors">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  )
}
