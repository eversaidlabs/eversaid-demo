"use client"

import { useTranslations } from "next-intl"
import { Check, Eye } from "lucide-react"
import { useState, useRef, useCallback, useEffect } from "react"

function Removed({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-red-400 line-through decoration-red-400/70">
      {children}
    </span>
  )
}

const MAX_ROTATION = 2 // degrees
const DEFAULT_ROTATION = { x: 1, y: -2 }
const RETURN_TRANSITION_MS = 900

export function CleanupHeroDiff() {
  const t = useTranslations("cleanupLanding.heroDiff")
  const containerRef = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState(DEFAULT_ROTATION)
  const [isHovering, setIsHovering] = useState(false)
  const [isFloating, setIsFloating] = useState(true)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const floatTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (floatTimeoutRef.current) {
        clearTimeout(floatTimeoutRef.current)
      }
    }
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      // Calculate offset from center (-1 to 1)
      const offsetX = (e.clientX - centerX) / (rect.width / 2)
      const offsetY = (e.clientY - centerY) / (rect.height / 2)

      // Apply rotation (inverted for natural feel)
      setRotation({
        x: -offsetY * MAX_ROTATION,
        y: offsetX * MAX_ROTATION,
      })
    },
    [prefersReducedMotion]
  )

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
    setRotation(DEFAULT_ROTATION)
    // Re-enable float animation after transition completes
    floatTimeoutRef.current = setTimeout(() => {
      setIsFloating(true)
    }, RETURN_TRANSITION_MS)
  }, [])

  const handleMouseEnter = useCallback(() => {
    // Cancel any pending float re-enable
    if (floatTimeoutRef.current) {
      clearTimeout(floatTimeoutRef.current)
      floatTimeoutRef.current = null
    }
    setIsHovering(true)
    setIsFloating(false)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ perspective: "1200px" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Ambient glow behind the card */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.15)_0%,transparent_70%)] blur-3xl scale-150" />

      {/* 3D Floating App Mock - Dark theme */}
      <div
        className={`relative bg-[#1E293B]/95 rounded-xl overflow-hidden shadow-[0_25px_80px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-sm ${
          isFloating && !prefersReducedMotion ? "animate-float" : ""
        }`}
        style={{
          transform: `rotateY(${rotation.y}deg) rotateX(${rotation.x}deg)`,
          transformStyle: "preserve-3d",
          transition: isHovering
            ? "transform 0.1s ease-out"
            : "transform 0.9s cubic-bezier(0.05, 0.8, 0.15, 1)",
        }}
      >
        {/* App toolbar */}
        <div className="bg-[#1E293B] border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-white/50">{t("toolbar.style")}</span>
            <div className="flex rounded-md border border-white/15 overflow-hidden">
              <div className="px-2.5 py-1 bg-white/5 border-r border-white/10 flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-white/80">{t("toolbar.clean")}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="px-2.5 py-1 bg-transparent">
                <span className="text-[11px] text-white/30">{t("toolbar.edited")}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-md hover:bg-white/5">
              <Eye className="w-4 h-4 text-white/40" />
            </button>
            <button className="px-2.5 py-1 text-[11px] font-medium text-white/60 border border-white/15 rounded-md hover:bg-white/5">
              {t("toolbar.export")}
            </button>
          </div>
        </div>

        {/* Segment cards */}
        <div className="p-4 space-y-3">
          {/* Segment 1 - Speaker 1 */}
          <div className="bg-white/5 rounded-lg border border-white/8 overflow-hidden">
            <div className="flex">
              <div className="w-1 bg-blue-400 flex-shrink-0" />
              <div className="p-4 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] font-semibold text-blue-400">
                    {t("speaker1")}
                  </span>
                  <span className="text-[11px] text-white/40">0:00 – 0:08</span>
                </div>
                <p className="text-[14px] leading-[1.7] text-white/85">
                  <Removed>So </Removed>
                  I think{" "}
                  <Removed>you know um </Removed>
                  the main point here is{" "}
                  <Removed>basically </Removed>
                  we need to{" "}
                  <Removed>im-</Removed>
                  improve the user experience significantly.
                </p>
              </div>
            </div>
          </div>

          {/* Segment 2 - Speaker 2 */}
          <div className="bg-white/5 rounded-lg border border-white/8 overflow-hidden">
            <div className="flex">
              <div className="w-1 bg-emerald-400 flex-shrink-0" />
              <div className="p-4 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] font-semibold text-emerald-400">
                    {t("speaker2")}
                  </span>
                  <span className="text-[11px] text-white/40">0:08 – 0:15</span>
                </div>
                <p className="text-[14px] leading-[1.7] text-white/85">
                  Right and I was actually thinking{" "}
                  <Removed>um </Removed>
                  what if we{" "}
                  <Removed>foc-</Removed>
                  focused on making{" "}
                  <Removed>the </Removed>
                  the onboarding{" "}
                  <Removed>liek </Removed>
                  way more intuitive?
                </p>
              </div>
            </div>
          </div>

          {/* Segment 3 - Speaker 1 */}
          <div className="bg-white/5 rounded-lg border border-white/8 overflow-hidden">
            <div className="flex">
              <div className="w-1 bg-blue-400 flex-shrink-0" />
              <div className="p-4 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] font-semibold text-blue-400">
                    {t("speaker1")}
                  </span>
                  <span className="text-[11px] text-white/40">0:15 – 0:21</span>
                </div>
                <p className="text-[14px] leading-[1.7] text-white/85">
                  Yes exactly! That&apos;s{" "}
                  <Removed>uh that&apos;s </Removed>
                  what I mean.{" "}
                  <Removed>Like t</Removed>
                  <span className="text-emerald-400 underline decoration-emerald-400/60 decoration-dotted underline-offset-2">T</span>
                  he current flow is just{" "}
                  <Removed>it&apos;s just </Removed>
                  too complicated for new users.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
