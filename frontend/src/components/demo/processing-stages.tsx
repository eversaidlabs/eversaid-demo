"use client"

import { Check, Upload, Mic, Sparkles, BarChart3, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ProcessingStage, StageId } from "@/features/transcription/types"

/**
 * Props for the ProcessingStages component
 */
export interface ProcessingStagesProps {
  /** Array of processing stages with their current status */
  stages: ProcessingStage[]
  /** ID of the currently active stage */
  currentStageId: StageId | null
  /** Custom status message to display (optional, uses default based on stage) */
  statusMessage?: string
}

/** Map stage IDs to their icons */
const stageIcons: Record<StageId, typeof Upload> = {
  upload: Upload,
  transcribe: Mic,
  cleanup: Sparkles,
  analyze: BarChart3,
}

/**
 * ProcessingStages - Visual stepper showing pipeline progress
 *
 * Modern design with a bottom progress line, animated dots, and stage icons
 * that activate with glow effects.
 *
 * Architecture: Presentation component only (no logic, no useState)
 */
export function ProcessingStages({
  stages,
  currentStageId,
  statusMessage,
}: ProcessingStagesProps) {
  const t = useTranslations("demo.processing")

  // Get the default status message based on current stage
  const defaultMessage = currentStageId
    ? t(`messages.${currentStageId}`)
    : null

  // Get estimate text for current stage
  const estimateText = currentStageId
    ? t(`estimates.${currentStageId}`)
    : null

  // Calculate progress percentage (0 to 1)
  const completedCount = stages.filter(s => s.status === "completed").length
  const activeIndex = stages.findIndex(s => s.status === "active")
  const progressSteps = activeIndex >= 0 ? activeIndex : completedCount
  const progress = stages.length > 1 ? progressSteps / (stages.length - 1) : 0

  return (
    <div className="w-full py-10 px-6 sm:px-10">
      {/* Icons and labels row */}
      <div className="flex justify-between items-start mb-6">
        {stages.map((stage) => {
          const Icon = stageIcons[stage.id] || Upload
          const isCompleted = stage.status === "completed"
          const isActive = stage.status === "active"
          const isError = stage.status === "error"

          return (
            <div key={stage.id} className="flex flex-col items-center flex-1">
              {/* Icon container */}
              <div
                className={`
                  w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center
                  transition-all duration-300 ease-out
                  ${isCompleted
                    ? "bg-navy shadow-lg shadow-navy/30"
                    : isActive
                      ? "bg-white border-[3px] border-coral animate-pulse-glow"
                      : isError
                        ? "bg-red-500 shadow-lg shadow-red-500/30"
                        : "bg-slate-100 border-[3px] border-slate-200"
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2.5} />
                ) : isActive ? (
                  <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-coral animate-spin" />
                ) : isError ? (
                  <span className="text-white font-bold text-xl">!</span>
                ) : (
                  <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400" />
                )}
              </div>

              {/* Label */}
              <span
                className={`
                  mt-4 text-sm sm:text-base font-medium whitespace-nowrap transition-colors duration-300
                  ${isCompleted
                    ? "text-navy"
                    : isActive
                      ? "text-coral font-semibold"
                      : isError
                        ? "text-red-500"
                        : "text-slate-400"
                  }
                `}
              >
                {t(`stages.${stage.id}`)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Progress line with dots */}
      <div className="relative mx-[12.5%]">
        {/* Background line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 rounded-full -translate-y-1/2" />

        {/* Filled gradient line */}
        <div
          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-navy to-coral rounded-full -translate-y-1/2 transition-all duration-500 ease-out"
          style={{
            width: `${progress * 100}%`,
            boxShadow: progress > 0 ? "0 0 12px rgba(232, 93, 4, 0.4)" : "none",
          }}
        />

        {/* Dots */}
        <div className="relative flex justify-between">
          {stages.map((stage) => {
            const isCompleted = stage.status === "completed"
            const isActive = stage.status === "active"
            const isError = stage.status === "error"

            return (
              <div
                key={stage.id}
                className={`
                  w-5 h-5 rounded-full border-[3px] border-white
                  transition-all duration-300 ease-out
                  ${isCompleted
                    ? "bg-navy scale-110"
                    : isActive
                      ? "bg-coral animate-dot-pulse"
                      : isError
                        ? "bg-red-500"
                        : "bg-slate-200"
                  }
                `}
                style={{
                  boxShadow: isCompleted
                    ? "0 2px 8px rgba(29, 53, 87, 0.3)"
                    : isActive
                      ? undefined // handled by animation
                      : isError
                        ? "0 2px 8px rgba(239, 68, 68, 0.3)"
                        : "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Status message */}
      {(statusMessage || defaultMessage) && (
        <div className="text-center mt-8 pt-6 border-t border-slate-100">
          <p className="text-slate-900 font-medium text-lg sm:text-xl mb-1">
            {statusMessage || defaultMessage}
          </p>
          {estimateText && (
            <p className="text-slate-500 text-base sm:text-lg">
              {t("estimated")}: {estimateText}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
