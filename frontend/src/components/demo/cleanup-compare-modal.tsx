"use client"
import { useTranslations } from "next-intl"
import { X, Check } from "lucide-react"
import { DEFAULT_CLEANUP_LEVEL, VISIBLE_CLEANUP_LEVELS, DISABLED_CLEANUP_LEVELS } from "@/lib/level-config"
import type { CleanupType } from "@/features/transcription/types"

// Wrapper to use parent translations
function useCleanupTranslations() {
  const tCompare = useTranslations("demo.cleanup.compare")
  const tLevels = useTranslations("demo.cleanup.levels")
  const tCleanup = useTranslations("demo.cleanup")
  return { tCompare, tLevels, tCleanup }
}

interface CleanupCompareModalProps {
  isOpen: boolean
  onClose: () => void
}

// Feature comparison matrix: which features are enabled for each level
const FEATURE_MATRIX: Record<string, Record<CleanupType, boolean>> = {
  punctuation: { minimal: true, clean: true, edited: true },
  fillers: { minimal: false, clean: true, edited: true },
  discourseMarkers: { minimal: false, clean: true, edited: true },
  stutters: { minimal: false, clean: true, edited: true },
  grammar: { minimal: false, clean: false, edited: true },
  sentences: { minimal: false, clean: false, edited: true },
}

const FEATURE_KEYS = ['punctuation', 'fillers', 'discourseMarkers', 'stutters', 'grammar', 'sentences'] as const

export function CleanupCompareModal({ isOpen, onClose }: CleanupCompareModalProps) {
  const { tCompare: t, tLevels, tCleanup } = useCleanupTranslations()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 py-16 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background rounded-xl shadow-xl max-w-2xl w-full max-h-[calc(100vh-8rem)] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-foreground">{t("title")}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Feature comparison table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-foreground">Feature</th>
                {VISIBLE_CLEANUP_LEVELS.map((level) => {
                  const isLevelDisabled = DISABLED_CLEANUP_LEVELS.includes(level)
                  return (
                    <th
                      key={level}
                      className={`text-center py-2 font-medium ${
                        isLevelDisabled
                          ? "text-muted-foreground"
                          : level === DEFAULT_CLEANUP_LEVEL
                            ? "text-primary"
                            : "text-foreground"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{tLevels(level)}</span>
                        {isLevelDisabled && (
                          <span className="text-[9px] text-muted-foreground/70 font-normal">
                            ({tCleanup("comingSoon")})
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {FEATURE_KEYS.map((featureKey) => (
                <tr key={featureKey} className="border-b last:border-b-0">
                  <td className="py-2 text-foreground/80">{t(`features.${featureKey}`)}</td>
                  {VISIBLE_CLEANUP_LEVELS.map((level) => {
                    const isLevelDisabled = DISABLED_CLEANUP_LEVELS.includes(level)
                    return (
                      <td key={level} className={`text-center py-2 ${isLevelDisabled ? "opacity-50" : ""}`}>
                        {FEATURE_MATRIX[featureKey][level] ? (
                          <Check className={`w-4 h-4 mx-auto ${isLevelDisabled ? "text-green-500/50" : "text-green-500"}`} />
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Example */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-3 text-foreground">{t("example.title")}</h4>
            <div className="space-y-2 text-sm">
              {/* Raw */}
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase">{t("example.raw")}</span>
                <p className="font-mono text-foreground/80 bg-background p-2 rounded mt-1 text-xs">
                  {t("example.rawText")}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{t("example.rawNote")}</p>
              </div>

              {/* Minimal - HIDDEN
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase">{tLevels("minimal")}</span>
                <p className="font-mono text-foreground/80 bg-background p-2 rounded mt-1 text-xs">
                  {t("example.minimalText")}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{t("example.minimalNote")}</p>
              </div>
              */}

              {/* Clean */}
              <div>
                <span className="text-xs font-medium text-primary uppercase">
                  {tLevels("clean")} ({tCleanup("temperatureDefault")})
                </span>
                <p className="font-mono text-foreground/80 bg-primary/5 p-2 rounded border border-primary/20 mt-1 text-xs">
                  {t("example.cleanText")}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{t("example.cleanNote")}</p>
              </div>

              {/* Edited - Coming Soon */}
              <div className="opacity-60">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {tLevels("edited")} <span className="text-[9px] font-normal">({tCleanup("comingSoon")})</span>
                </span>
                <p className="font-mono text-foreground/80 bg-background p-2 rounded mt-1 text-xs border border-dashed border-muted-foreground/30">
                  {t("example.editedText")}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{t("example.editedNote")}</p>
              </div>
            </div>
          </div>

          {/* Use case hints */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {VISIBLE_CLEANUP_LEVELS.map((level) => {
              const isLevelDisabled = DISABLED_CLEANUP_LEVELS.includes(level)
              return (
                <div
                  key={level}
                  className={`rounded-lg p-3 ${
                    isLevelDisabled
                      ? "bg-muted/50 border border-dashed border-muted-foreground/30 opacity-60"
                      : level === DEFAULT_CLEANUP_LEVEL
                        ? "bg-primary/5 border border-primary/20"
                        : "bg-muted"
                  }`}
                >
                  <span className={`font-semibold block mb-1 ${isLevelDisabled ? "text-muted-foreground" : "text-foreground"}`}>
                    {tLevels(level)}
                    {isLevelDisabled && (
                      <span className="text-[9px] font-normal ml-1">({tCleanup("comingSoon")})</span>
                    )}
                  </span>
                  <span className="text-muted-foreground">{t(`useCases.${level}`)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {t("gotIt")}
          </button>
        </div>
      </div>
    </div>
  )
}
