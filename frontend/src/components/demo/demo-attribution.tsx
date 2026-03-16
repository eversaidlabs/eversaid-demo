"use client"

import { ExternalLink } from "lucide-react"
import { useTranslations } from "next-intl"
import { m } from "@/components/motion"
import { useState } from "react"
import type { DemoConfig } from "@/lib/app-config"

/**
 * Get source attribution for a demo entry by filename.
 * Returns null if no attribution is configured or entry is not a demo.
 */
function getDemoSource(
  filename: string | undefined,
  demoConfig: DemoConfig
): { url: string; displayName: string } | null {
  if (!filename) return null

  // Match demo-sl.mp3, demo-en.mp3, etc.
  const match = filename.match(/^(demo-\w+)\./)
  if (!match) return null

  const demoSources: Record<string, { url: string; displayName: string }> = {
    "demo-sl": {
      url: demoConfig.sl.sourceUrl,
      displayName: demoConfig.sl.displayName,
    },
    "demo-en": {
      url: demoConfig.en.sourceUrl,
      displayName: demoConfig.en.displayName,
    },
  }

  const source = demoSources[match[1]]
  if (!source?.url || !source?.displayName) return null

  return source
}

export interface DemoAttributionProps {
  /** Original filename of the entry (e.g., "demo-sl.mp3") */
  filename?: string
  /** Whether the entry is a demo entry */
  isDemo?: boolean
  /** Demo configuration from server */
  demoConfig: DemoConfig
}

/**
 * Attribution card for demo content sources (e.g., YouTube podcasts).
 * Only renders when the entry is a demo with configured source attribution.
 */
export function DemoAttribution({ filename, isDemo, demoConfig }: DemoAttributionProps) {
  const t = useTranslations("demo.attribution")
  const [isHovered, setIsHovered] = useState(false)

  // Only show for demo entries with configured source
  if (!isDemo) return null

  const source = getDemoSource(filename, demoConfig)
  if (!source) return null

  return (
    <div className="px-6 py-4 border-t border-border">
      <m.a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 rounded-xl border border-border/50 hover:border-red-200 hover:shadow-sm transition-all cursor-pointer relative overflow-hidden"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        {/* Static Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-muted/50 to-red-50/50" />

        {/* Animated Gradient Overlay (Right to Left flow) */}
        {isHovered && (
          <m.div
            key="gradient-flow"
            className="absolute inset-0"
            initial={{ x: "100%" }}
            animate={{ x: "-100%" }}
            transition={{
              duration: 1.875,
              ease: "easeInOut",
              repeat: Infinity,
            }}
            style={{
              background: "linear-gradient(to right, transparent 0%, rgba(254, 215, 215, 0.45) 50%, transparent 100%)",
              width: "100%"
            }}
          />
        )}

        <div className="flex items-center gap-4 relative z-10">
          {/* YouTube Icon */}
          <div className="w-12 h-12 bg-background rounded-lg shadow-sm flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>

          {/* Source Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{t("label")}</p>
            <p className="text-sm font-medium text-foreground truncate">{source.displayName}</p>
          </div>

          {/* Watch Label */}
          <span className="px-4 py-2 text-sm font-medium text-red-600 flex items-center gap-1.5 flex-shrink-0">
            {t("watchButton")}
            <ExternalLink className="w-3.5 h-3.5" />
          </span>
        </div>
      </m.a>
    </div>
  )
}
