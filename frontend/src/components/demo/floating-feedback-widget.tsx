"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, X, Star } from "lucide-react"
import { useTranslations } from "next-intl"
import { m, AnimatePresence } from "@/components/motion"

export interface FloatingFeedbackWidgetProps {
  rating: number
  feedback: string
  onRatingChange: (rating: number) => void
  onFeedbackChange: (text: string) => void
  onSubmit: () => void
  isLoading?: boolean
  isSubmitting?: boolean
  isSubmitted?: boolean
  hasExisting?: boolean
  disabled?: boolean
}

export function FloatingFeedbackWidget({
  rating,
  feedback,
  onRatingChange,
  onFeedbackChange,
  onSubmit,
  isLoading,
  isSubmitting,
  isSubmitted,
  hasExisting,
  disabled,
}: FloatingFeedbackWidgetProps) {
  const t = useTranslations("demo.feedback")
  const tWidget = useTranslations("demo.feedbackWidget")
  const [isExpanded, setIsExpanded] = useState(false)
  const widgetRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isExpanded])

  // Focus textarea when expanded
  useEffect(() => {
    if (isExpanded && !isSubmitted && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isExpanded, isSubmitted])

  // Auto-collapse after successful submission
  useEffect(() => {
    if (isSubmitted && isExpanded) {
      const timer = setTimeout(() => setIsExpanded(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [isSubmitted, isExpanded])

  const isDisabled = disabled || isSubmitted

  // Different placeholder based on rating sentiment
  const placeholder = rating >= 4 ? t("placeholderPositive") : t("placeholder")

  return (
    <div ref={widgetRef} className="fixed bottom-6 right-6 z-50">
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <m.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-background rounded-2xl border border-border shadow-xl w-[350px] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label={tWidget("close")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-5">
              {isLoading ? (
                <div>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <div key={star} className="w-8 h-8 bg-secondary rounded-lg animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Star rating */}
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => onRatingChange(star)}
                        disabled={isDisabled}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                          rating >= star ? "bg-amber-100" : "bg-secondary hover:bg-amber-100"
                        } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <Sparkles className={`w-5 h-5 ${rating >= star ? "fill-amber-500" : "fill-muted"}`} />
                      </button>
                    ))}
                  </div>

                  {isSubmitted ? (
                    <m.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-green-600 font-medium text-center py-2"
                    >
                      {t("thanks")}
                    </m.p>
                  ) : (
                    <>
                      {/* Textarea */}
                      <textarea
                        ref={textareaRef}
                        placeholder={placeholder}
                        value={feedback}
                        onChange={(e) => onFeedbackChange(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isSubmitting && rating > 0) {
                            e.preventDefault()
                            onSubmit()
                          }
                        }}
                        disabled={isDisabled}
                        className="w-full px-3 py-2.5 bg-secondary border border-border focus:border-primary focus:outline-none rounded-[10px] text-[13px] resize-none mb-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        rows={3}
                      />

                      {/* Submit button */}
                      <button
                        onClick={onSubmit}
                        disabled={isSubmitting || isDisabled || rating === 0}
                        className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? t("submitting") : hasExisting ? t("update") : t("submit")}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </m.div>
        ) : (
          <m.button
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={() => setIsExpanded(true)}
            disabled={disabled}
            className={`flex flex-col items-center justify-center w-[220px] h-[85px] bg-white rounded-2xl border-2 border-blue-500 transition-all hover:scale-105 ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
          >
            {/* Gold stars with glow */}
            <div className="flex gap-1 mb-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="w-5 h-5 fill-yellow-500 text-yellow-500"
                  style={{ filter: "drop-shadow(0 0 2px rgba(234, 179, 8, 0.4))" }}
                />
              ))}
            </div>
            {/* Question text */}
            <span className="text-sm text-gray-500">{tWidget("collapsed")}</span>
          </m.button>
        )}
      </AnimatePresence>
    </div>
  )
}
