"use client"

import { useTranslations } from "next-intl"
import { Check, Eye } from "lucide-react"

function Removed({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-red-400 line-through decoration-red-400/70">
      {children}
    </span>
  )
}

export function CleanupHeroDiff() {
  const t = useTranslations("cleanupLanding.heroDiff")

  return (
    <div className="relative" style={{ perspective: "1200px" }}>
      {/* Ambient glow behind the card */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.15)_0%,transparent_70%)] blur-3xl scale-150" />

      {/* 3D Floating App Mock - Dark theme */}
      <div
        className="relative bg-[#1E293B]/95 rounded-xl overflow-hidden shadow-[0_25px_80px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-sm"
        style={{
          transform: "rotateY(-2deg) rotateX(1deg)",
          transformStyle: "preserve-3d",
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
