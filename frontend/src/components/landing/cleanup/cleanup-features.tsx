"use client"

import { useTranslations } from "next-intl"
import { MotionDiv } from "@/components/motion"
import { useAnimationVariants } from "@/lib/animation-variants"

const FEATURES = [
  { key: "cleanup", icon: "✨", highlighted: true },
  { key: "diff", icon: "🔍", highlighted: true },
  { key: "analysis", icon: "📊", highlighted: false },
  { key: "speakers", icon: "👥", highlighted: false },
  { key: "privacy", icon: "🔒", highlighted: false },
  { key: "languages", icon: "🌍", highlighted: false },
] as const

export function CleanupFeatures() {
  const t = useTranslations("cleanupLanding.features")
  const { sectionHeader, sectionSubtitle, staggerContainer, cardItem } = useAnimationVariants()

  return (
    <section className="snap-start snap-always px-8 md:px-16 py-24 bg-[#F8FAFC]" id="features">
      <div className="max-w-[1200px] mx-auto">
        <MotionDiv
          className="text-center mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <MotionDiv variants={sectionHeader}>
            <div className="text-[13px] font-semibold text-[#38BDF8] uppercase tracking-[2px] mb-2">
              {t("sectionLabel")}
            </div>
            <h2 className="text-[32px] md:text-[36px] font-extrabold text-[#0F172A] mb-3 tracking-[-0.02em]">
              {t("title")}
            </h2>
          </MotionDiv>
          <MotionDiv variants={sectionSubtitle}>
            <p className="text-[17px] text-[#64748B] leading-relaxed">
              {t("subtitle")}
            </p>
          </MotionDiv>
        </MotionDiv>

        <MotionDiv
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          {FEATURES.map(({ key, icon, highlighted }) => (
            <MotionDiv
              key={key}
              variants={cardItem}
              whileHover={{ y: -4 }}
              className={`rounded-[20px] p-7 transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] ${
                highlighted
                  ? "bg-[linear-gradient(135deg,rgba(56,189,248,0.08)_0%,rgba(168,85,247,0.08)_100%)] border border-purple-200/70"
                  : "bg-white border border-[#E2E8F0]"
              }`}
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] shrink-0">
                  {icon}
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] leading-snug">
                  {t(`items.${key}.title`)}
                </h3>
              </div>
              <p className="text-[15px] text-[#64748B] leading-relaxed">
                {t(`items.${key}.description`)}
              </p>
            </MotionDiv>
          ))}
        </MotionDiv>
      </div>
    </section>
  )
}
