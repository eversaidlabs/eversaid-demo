"use client"

import { useTranslations } from "next-intl"

export function CleanupHeroDiff() {
  const t = useTranslations("cleanupLanding.heroDiff")

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-[10px]">
      {/* Tabs */}
      <div className="flex gap-0 mb-5 border-b border-white/10">
        <div className="px-4 py-2 text-[13px] font-semibold text-white/50">
          {t("tabs.original")}
        </div>
        <div className="px-4 py-2 text-[13px] font-semibold text-white border-b-2 border-[#38BDF8]">
          {t("tabs.cleaned")}
        </div>
      </div>

      {/* Diff lines */}
      <div className="space-y-4">
        {/* Line 1 */}
        <div className="text-sm leading-[1.8] text-white/85">
          <span className="text-xs font-semibold text-[#38BDF8] block mb-1">
            {t("speaker1")}
          </span>
          {t("line1.prefix")}{" "}
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line1.removed1")}
          </span>{" "}
          {t("line1.kept1")}{" "}
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line1.removed2")}
          </span>{" "}
          {t("line1.kept2")}{" "}
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line1.removed3")}
          </span>{" "}
          {t("line1.kept3")}{" "}
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line1.removed4")}
          </span>{" "}
          {t("line1.kept4")}{" "}
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line1.removed5")}
          </span>{" "}
          {t("line1.suffix")}
        </div>

        {/* Line 2 */}
        <div className="text-sm leading-[1.8] text-white/85">
          <span className="text-xs font-semibold text-[#10B981] block mb-1">
            {t("speaker2")}
          </span>
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line2.removed1")}
          </span>{" "}
          <span className="bg-green-600/25 text-green-300/90 px-1 rounded">
            {t("line2.added1")}
          </span>
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line2.removed2")}
          </span>
          {t("line2.kept1")}
          <span className="bg-green-600/25 text-green-300/90 px-1 rounded">
            {t("line2.added2")}
          </span>{" "}
          {t("line2.kept2")}{" "}
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line2.removed3")}
          </span>{" "}
          {t("line2.kept3")}{" "}
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line2.removed4")}
          </span>{" "}
          {t("line2.kept4")}
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line2.removed5")}
          </span>
          {t("line2.suffix")}
        </div>

        {/* Line 3 */}
        <div className="text-sm leading-[1.8] text-white/85">
          <span className="text-xs font-semibold text-[#38BDF8] block mb-1">
            {t("speaker1")}
          </span>
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line3.removed1")}
          </span>{" "}
          <span className="bg-green-600/25 text-green-300/90 px-1 rounded">
            {t("line3.added1")}
          </span>
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line3.removed2")}
          </span>
          {t("line3.kept1")}{" "}
          <span className="bg-green-600/25 text-green-300/90 px-1 rounded">
            {t("line3.added2")}
          </span>{" "}
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line3.removed3")}
          </span>{" "}
          {t("line3.kept2")}
          <span className="bg-green-600/25 text-green-300/90 px-1 rounded">
            {t("line3.added3")}
          </span>{" "}
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line3.removed4")}
          </span>{" "}
          {t("line3.kept3")}{" "}
          <span className="bg-red-600/25 text-red-300/90 line-through px-1 rounded">
            {t("line3.removed5")}
          </span>{" "}
          {t("line3.suffix")}
        </div>
      </div>
    </div>
  )
}
