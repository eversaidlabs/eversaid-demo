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
const BREATHE_AMPLITUDE = 3 // pixels of vertical movement
const BREATHE_SPEED = 0.0012 // breathing speed

export function CleanupHeroDiff() {
  const t = useTranslations("cleanupLanding.heroDiff")
  const containerRef = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const [translateY, setTranslateY] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  // Breathing animation - runs continuously
  useEffect(() => {
    if (prefersReducedMotion) return

    let animationId: number
    const startTime = performance.now()

    const animate = (time: number) => {
      const elapsed = time - startTime
      const breatheY = Math.sin(elapsed * BREATHE_SPEED) * BREATHE_AMPLITUDE
      setTranslateY(breatheY)
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [prefersReducedMotion])

  // Window-level mouse tracking - follows mouse anywhere on screen
  useEffect(() => {
    if (prefersReducedMotion) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      // Calculate offset using viewport dimensions for full-screen tracking
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Normalize to -1 to 1 based on viewport, centered on component
      const offsetX = (e.clientX - centerX) / (viewportWidth / 2)
      const offsetY = (e.clientY - centerY) / (viewportHeight / 2)

      // Clamp values to prevent extreme rotation
      const clampedX = Math.max(-1, Math.min(1, offsetX))
      const clampedY = Math.max(-1, Math.min(1, offsetY))

      setRotation({
        x: -clampedY * MAX_ROTATION,
        y: clampedX * MAX_ROTATION,
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [prefersReducedMotion])

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ perspective: "1200px" }}
    >
      {/* Ambient glow behind the card */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.15)_0%,transparent_70%)] blur-3xl scale-150" />

      {/* 3D Floating App Mock - Dark theme */}
      <div
        className="relative bg-[#1E293B]/95 rounded-xl overflow-hidden shadow-[0_25px_80px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-sm"
        style={{
          transform: `translateY(${translateY}px) rotateY(${rotation.y}deg) rotateX(${rotation.x}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 0.15s ease-out",
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
                  <span className="text-[11px] text-white/40">0:00 – 0:06</span>
                </div>
                <p className="text-[14px] leading-[1.7] text-white/85">
                  <Removed>So w</Removed>
                  <span className="text-emerald-400 underline decoration-emerald-400/60 decoration-dotted underline-offset-2">W</span>
                  hen your team first{" "}
                  <Removed>like first </Removed>
                  switched to the new system,{" "}
                  <Removed>um </Removed>
                  how did people actually react?
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
                  <span className="text-[11px] text-white/40">0:06 – 0:18</span>
                </div>
                <p className="text-[14px] leading-[1.7] text-white/85">
                  I mean honestly{" "}
                  <Removed>it was </Removed>
                  it was a mess.{" "}
                  <Removed>Like h</Removed>
                  <span className="text-emerald-400 underline decoration-emerald-400/60 decoration-dotted underline-offset-2">H</span>
                  alf the team{" "}
                  <Removed>just they </Removed>
                  just kept using{" "}
                  <Removed>the old </Removed>
                  the old spreadsheets because{" "}
                  <Removed>you know </Removed>
                  nobody really explained why we were even switching in the first place.
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
                  <span className="text-[11px] text-white/40">0:18 – 0:22</span>
                </div>
                <p className="text-[14px] leading-[1.7] text-white/85">
                  <Removed>Right. </Removed>
                  And{" "}
                  <Removed>so </Removed>
                  did that{" "}
                  <Removed>kind of </Removed>
                  change over time{" "}
                  <Removed>or </Removed>
                  or was it?
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
