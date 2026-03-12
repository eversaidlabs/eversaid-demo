"use client"
import { useState, useRef } from "react"
import type { Segment } from "@/components/demo/types"
import type { ModelInfo, CleanupType, CleanupSummary } from "@/features/transcription/types"
import { Eye, EyeOff, Copy, Loader2, Check, Info } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { capture } from "@/lib/analytics"
import { CLEANUP_LEVELS, CLEANUP_TEMPERATURES, getDefaultModelForLevel, temperaturesMatch, DEFAULT_CLEANUP_LEVEL, VISIBLE_CLEANUP_LEVELS, DISABLED_CLEANUP_LEVELS } from "@/lib/level-config"
import { CleanupCompareModal } from "./cleanup-compare-modal"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** Renders example text with removed parts shown as red strikethrough */
function ExampleDiff({ levelId }: { levelId: CleanupType }) {
  // Base: "So I I think you know um we're gonna im-improve user experience"
  // Each level shows what gets removed/added
  const examples: Record<CleanupType, { parts: Array<{ text: string; removed: boolean; added?: boolean }> }> = {
    minimal: {
      // Fixes ASR artifacts + adds punctuation. Keeps fillers, stutters, discourse markers, informal grammar.
      parts: [
        { text: "So", removed: false },
        { text: "§", removed: true },
        { text: " I, I think, you know, um", removed: false },
        { text: "...,...", removed: true },
        { text: ",", removed: false, added: true },
        { text: " we're gonna im-improve user experience", removed: false },
        { text: ".", removed: false, added: true },
      ]
    },
    clean: {
      // Removes: fillers (um), discourse markers (you know), stutters (I I, im-). Keeps grammar as-is.
      parts: [
        { text: "So I", removed: false },
        { text: " I", removed: true },
        { text: " think", removed: false },
        { text: " you know", removed: true },
        { text: " um", removed: true },
        { text: " we're gonna", removed: false },
        { text: " im-", removed: true },
        { text: "improve user experience.", removed: false },
      ]
    },
    edited: {
      // Clean + removes leading "So", fixes grammar (gonna → going to)
      parts: [
        { text: "So", removed: true },
        { text: " I", removed: false },
        { text: " I", removed: true },
        { text: " think", removed: false },
        { text: " you know", removed: true },
        { text: " um", removed: true },
        { text: " we're", removed: false },
        { text: " gonna", removed: true },
        { text: " going to", removed: false, added: true },
        { text: " im-", removed: true },
        { text: "improve user experience.", removed: false },
      ]
    }
  }

  const { parts } = examples[levelId]

  return (
    <span className="text-[11px] leading-relaxed">
      {parts.map((part, i) => (
        part.removed ? (
          <span key={i} className="text-red-500 line-through decoration-red-500/70">{part.text}</span>
        ) : part.added ? (
          <span key={i} className="text-green-600 font-medium">{part.text}</span>
        ) : (
          <span key={i} className="text-foreground">{part.text}</span>
        )
      ))}
    </span>
  )
}

export interface CleanupOptionsProps {
  /** Available LLM models */
  models: ModelInfo[]
  /** Currently selected model ID */
  selectedModel: string
  /** Currently selected cleanup level */
  selectedLevel: CleanupType
  /** Whether cleanup is currently processing */
  isProcessing?: boolean
  /** Callback when model changes */
  onModelChange: (modelId: string) => void
  /** Callback when level changes (forceRerun bypasses cache - non-production only) */
  onLevelChange: (level: CleanupType, forceRerun?: boolean) => void
  /** Array of existing cleanups for cache indicator */
  cachedCleanups?: CleanupSummary[]
  /** Whether user has manually selected a model (vs using defaults) */
  hasManualSelection?: boolean
  /** Currently selected temperature (optional - only when temperature selection is enabled) */
  selectedTemperature?: number | null
  /** Callback when temperature changes (optional - only when temperature selection is enabled) */
  onTemperatureChange?: (temp: number | null, forceRerun?: boolean) => void
  /** Prompt name of the currently displayed cleanup (for copy metadata) */
  currentPromptName?: string | null
  /** Temperature of the currently displayed cleanup (for copy metadata) */
  currentTemperature?: number | null
  /** Callback when user clicks "Share feedback" link (exits fullscreen and focuses feedback textarea) */
  onShareFeedback?: () => void
  /** Environment (enables long-press re-cleanup when not production) */
  environment?: string
}

export interface TranscriptHeaderProps {
  title: string
  segments: Segment[]
  textKey: "rawText" | "cleanedText"
  showDiffToggle?: boolean
  showDiff?: boolean
  onToggleDiff?: () => void
  showCopyButton?: boolean
  /** Cleanup options (only for AI CLEANED header) */
  cleanupOptions?: CleanupOptionsProps
}

export function TranscriptHeader({
  title,
  segments,
  textKey,
  showDiffToggle = false,
  showDiff = false,
  onToggleDiff,
  showCopyButton = true,
  cleanupOptions,
}: TranscriptHeaderProps) {
  const t = useTranslations("demo.cleanup")
  const [showCompareModal, setShowCompareModal] = useState(false)
  // Long-press state for temperature chips
  const [holdingTemp, setHoldingTemp] = useState<number | null | 'none'>('none')
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null)
  const didFireRef = useRef(false)
  // Long-press state for level cards (non-production only)
  const [holdingLevel, setHoldingLevel] = useState<CleanupType | 'none'>('none')
  const levelHoldTimerRef = useRef<NodeJS.Timeout | null>(null)
  const levelDidFireRef = useRef(false)
  const allowLevelLongPress = cleanupOptions?.environment && cleanupOptions.environment !== 'production'

  const handleCopy = () => {
    capture('copy_clicked', { side: textKey === 'rawText' ? 'raw' : 'cleaned' })
    const text = segments.map((s) => s[textKey]).join("\n\n")

    // Feature flag: add metadata header when copying cleaned text
    const isCopyMetadataEnabled = process.env.NEXT_PUBLIC_ENABLE_COPY_METADATA === 'true'

    if (isCopyMetadataEnabled && textKey === 'cleanedText' && cleanupOptions?.currentPromptName) {
      // Get model display name
      const modelName = cleanupOptions.models.find(m => m.id === cleanupOptions.selectedModel)?.name
        || cleanupOptions.selectedModel

      // Format temperature from the actual cleanup
      const tempStr = cleanupOptions.currentTemperature === null || cleanupOptions.currentTemperature === undefined
        ? 'default'
        : cleanupOptions.currentTemperature.toString()

      const header = `[${modelName} | ${cleanupOptions.currentPromptName} | temp=${tempStr}]`
      navigator.clipboard.writeText(`${header}\n\n${text}`)
      toast.success(t("copySuccess"))
      return
    }

    navigator.clipboard.writeText(text)
    toast.success(t("copySuccess"))
  }

  return (
    <div className={`px-6 py-4 border-r border-border last:border-r-0 ${cleanupOptions ? 'flex flex-col gap-2' : 'flex justify-between items-center'}`}>
      {/* Beta notice banner - shown when cleanup options are available */}
      {cleanupOptions && (
        <div className="text-[11px] pl-3 py-1.5 border-l-2 border-l-violet-400 bg-gradient-to-r from-violet-50/50 to-transparent rounded-r">
          <span className="text-muted-foreground">
            <span className="font-medium text-violet-600">{t("betaLabel")}</span>
            <span className="mx-1.5">·</span>
            {t("betaNotice")}
            <button
              onClick={cleanupOptions.onShareFeedback}
              className="text-violet-600 hover:text-violet-700 font-medium ml-1.5 hover:underline"
            >
              {t("shareFeedback")}
            </button>
          </span>
        </div>
      )}

      {/* Main row: Title, Style cards, and action buttons */}
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[1px]">{title}</span>

          {/* Cleanup options */}
          {cleanupOptions && (
            <>
            {/* Vertical divider */}
            <div className="h-4 w-px bg-border mx-2" />
            <div className="flex items-center gap-3">
            {/* Processing spinner */}
            {cleanupOptions.isProcessing && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            )}

            {/* Style card selection */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground/70">{t("style")}</span>
              <TooltipProvider delayDuration={300}>
                <div className="flex gap-2">
                  {VISIBLE_CLEANUP_LEVELS.map((levelId) => {
                    const isLevelDisabled = DISABLED_CLEANUP_LEVELS.includes(levelId)
                    const modelToCheck = cleanupOptions.hasManualSelection
                      ? cleanupOptions.selectedModel
                      : getDefaultModelForLevel(levelId)
                    const isCached = cleanupOptions.cachedCleanups?.some(c =>
                      c.llm_model === modelToCheck &&
                      c.cleanup_type === levelId &&
                      (cleanupOptions.onTemperatureChange === undefined || temperaturesMatch(c.temperature, cleanupOptions.selectedTemperature)) &&
                      c.status === 'completed'
                    )
                    const isSelected = cleanupOptions.selectedLevel === levelId
                    const isDefault = levelId === DEFAULT_CLEANUP_LEVEL
                    const isHolding = holdingLevel === levelId
                    return (
                      <Tooltip key={levelId}>
                        <TooltipTrigger asChild>
                          <button
                            onPointerDown={() => {
                              if (cleanupOptions.isProcessing || isLevelDisabled) return
                              levelDidFireRef.current = false
                              if (allowLevelLongPress) {
                                setHoldingLevel(levelId)
                                levelHoldTimerRef.current = setTimeout(() => {
                                  levelDidFireRef.current = true
                                  cleanupOptions.onLevelChange(levelId, true)
                                  setHoldingLevel('none')
                                }, 500)
                              }
                            }}
                            onPointerUp={() => {
                              if (levelHoldTimerRef.current) clearTimeout(levelHoldTimerRef.current)
                              levelHoldTimerRef.current = null
                              if (!levelDidFireRef.current && !cleanupOptions.isProcessing && !isLevelDisabled) {
                                cleanupOptions.onLevelChange(levelId)
                              }
                              setHoldingLevel('none')
                            }}
                            onPointerLeave={() => {
                              if (levelHoldTimerRef.current) clearTimeout(levelHoldTimerRef.current)
                              levelHoldTimerRef.current = null
                              setHoldingLevel('none')
                            }}
                            disabled={cleanupOptions.isProcessing || isLevelDisabled}
                            className={`px-3 py-2 rounded-lg text-left transition-all ${
                              isLevelDisabled
                                ? "opacity-60 cursor-not-allowed border border-dashed border-muted-foreground/30"
                                : cleanupOptions.isProcessing
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                            } ${
                              isLevelDisabled
                                ? ""
                                : isHolding
                                  ? "ring-2 ring-primary bg-primary/20"
                                  : isSelected
                                    ? "border-2 border-primary bg-primary/5"
                                    : "border border-border hover:border-muted-foreground/30"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[11px] font-medium ${isLevelDisabled ? "text-muted-foreground" : isSelected ? "text-primary" : "text-foreground"}`}>
                                {t(`levels.${levelId}`)}
                              </span>
                              {isDefault && !isLevelDisabled && (
                                <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                              )}
                              {isCached && !isLevelDisabled && <Check className="w-3 h-3 text-green-500 flex-shrink-0" />}
                            </div>
                            <span className={`text-[9px] block mt-0.5 ${isLevelDisabled ? "text-muted-foreground/70" : isSelected ? "text-primary/70" : "text-muted-foreground"}`}>
                              {t(`hints.${levelId}`)}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[280px] p-3">
                          {isLevelDisabled ? (
                            <p className="text-[10px] font-medium text-muted-foreground">{t("comingSoon")}</p>
                          ) : (
                            <>
                              <p className="text-[10px] font-medium text-muted-foreground mb-1.5">{t("examples.label")}</p>
                              <ExampleDiff levelId={levelId} />
                            </>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </TooltipProvider>
              {/* Compare all link */}
              <button
                onClick={() => setShowCompareModal(true)}
                className="p-1 rounded hover:bg-muted transition-colors ml-1"
                aria-label={t("compareAll")}
              >
                <Info className="w-4 h-4 text-muted-foreground hover:text-primary" strokeWidth={2.5} />
              </button>
            </div>

          </div>
          </>
        )}
        </div>

        <div className="flex gap-2 items-center">
        {showDiffToggle && onToggleDiff && (
          <button
            onClick={onToggleDiff}
            aria-label={showDiff ? "Hide changes" : "Show changes"}
            aria-pressed={showDiff}
            className={`flex items-center justify-center p-1.5 rounded-md transition-all ${
              showDiff
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-background text-muted-foreground border border-border hover:bg-secondary hover:text-foreground"
            }`}
          >
            {showDiff ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        )}
        {showCopyButton && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary hover:bg-muted rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
            {t("copy")}
          </button>
        )}
        </div>
      </div>

      {/* Second row: Creativity/Temperature selector - only shown when temperature selection is enabled */}
      {cleanupOptions?.onTemperatureChange && (
        <div className="flex items-center gap-2 pl-0">
          <span className="text-xs font-semibold text-foreground/70">{t("creativity")}</span>
          <span className="text-[10px] text-muted-foreground">{t("creativityFocused")}</span>
          <div className="flex gap-1 flex-wrap">
            {CLEANUP_TEMPERATURES.map((temp) => {
              const isCached = cleanupOptions.cachedCleanups?.some(c =>
                c.llm_model === cleanupOptions.selectedModel &&
                c.cleanup_type === cleanupOptions.selectedLevel &&
                temperaturesMatch(c.temperature, temp) &&
                c.status === 'completed'
              )
              const isSelected = cleanupOptions.selectedTemperature === temp
              const isHolding = holdingTemp === temp
              return (
                <button
                  key={temp ?? 'null'}
                  onPointerDown={() => {
                    if (cleanupOptions.isProcessing) return
                    didFireRef.current = false
                    setHoldingTemp(temp)
                    holdTimerRef.current = setTimeout(() => {
                      didFireRef.current = true
                      cleanupOptions.onTemperatureChange!(temp, true)
                      setHoldingTemp('none')
                    }, 2000)
                  }}
                  onPointerUp={() => {
                    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
                    holdTimerRef.current = null
                    if (!didFireRef.current && !cleanupOptions.isProcessing) {
                      cleanupOptions.onTemperatureChange!(temp)
                    }
                    setHoldingTemp('none')
                  }}
                  onPointerLeave={() => {
                    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
                    holdTimerRef.current = null
                    setHoldingTemp('none')
                  }}
                  disabled={cleanupOptions.isProcessing}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 whitespace-nowrap transition-all ${
                    cleanupOptions.isProcessing ? "opacity-50 cursor-not-allowed" : ""
                  } ${
                    isHolding
                      ? "ring-2 ring-primary bg-primary/20"
                      : isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {temp === null ? t("temperatureDefault") : temp}
                  {isCached && !isHolding && <Check className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
          <span className="text-[10px] text-muted-foreground">{t("creativityCreative")}</span>
        </div>
      )}

      {/* Cleanup comparison modal */}
      {cleanupOptions && (
        <CleanupCompareModal
          isOpen={showCompareModal}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  )
}
