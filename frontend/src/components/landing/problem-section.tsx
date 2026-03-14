"use client"

import { useTranslations } from "next-intl"
import { MotionDiv } from "@/components/motion"
import { useAnimationVariants } from "@/lib/animation-variants"
import type { Variants } from "motion/react"

// ─── Comparison Item Component ────────────────────────────────────────────────

interface ComparisonItemProps {
  emoji: string
  title: string
  description: string
  variant: "without" | "with"
  itemVariants: Variants
}

function ComparisonItem({ emoji, title, description, variant, itemVariants }: ComparisonItemProps) {
  const isWithout = variant === "without"

  return (
    <MotionDiv variants={itemVariants} className="flex gap-4 items-start">
      <span
        className={`w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl shrink-0 ${
          isWithout ? "bg-red-600/10" : "bg-green-600/10"
        }`}
      >
        {emoji}
      </span>
      <div>
        <h3
          className={`text-base font-bold mb-1 ${
            isWithout ? "text-red-900" : "text-green-900"
          }`}
        >
          {title}
        </h3>
        <p
          className={`text-sm leading-relaxed ${
            isWithout ? "text-red-700" : "text-green-700"
          }`}
        >
          {description}
        </p>
      </div>
    </MotionDiv>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ProblemSection() {
  const t = useTranslations("landing.problem")
  const { fadeUp, sectionHeader, sectionSubtitle, staggerContainer, staggerItem } = useAnimationVariants()

  return (
    <section className="snap-start snap-always min-h-screen flex items-center px-8 md:px-16 pt-24 pb-16 bg-[#F8FAFC]">
      <div className="max-w-[1100px] mx-auto w-full">
        {/* Header */}
        <MotionDiv
          className="text-center mb-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <MotionDiv variants={sectionHeader}>
            <div className="text-[13px] font-semibold text-[#38BDF8] uppercase tracking-[2px] mb-4">
              {t("sectionLabel")}
            </div>
            <h2 className="text-[32px] md:text-[40px] font-extrabold text-[#0F172A] mb-4 tracking-[-0.02em]">
              {t("title")}
            </h2>
          </MotionDiv>
          <MotionDiv variants={sectionSubtitle}>
            <p className="text-lg text-[#64748B] max-w-[700px] mx-auto leading-relaxed">
              {t("subtitle")}
            </p>
          </MotionDiv>
        </MotionDiv>

        {/* Split Comparison */}
        <MotionDiv
          className="grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-[0_4px_32px_rgba(0,0,0,0.08)]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {/* Without Side */}
          <MotionDiv
            className="bg-gradient-to-br from-red-50 to-red-100 p-10 md:p-12 relative"
            variants={staggerContainer}
          >
            {/* Divider line (desktop) */}
            <div className="hidden md:block absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-red-200 to-transparent" />

            <div className="flex items-center gap-3 mb-8">
              <span className="w-10 h-10 rounded-xl bg-red-300 text-red-600 flex items-center justify-center text-lg font-bold">
                ✕
              </span>
              <h2 className="text-sm font-bold text-red-600 uppercase tracking-[1.5px]">
                {t("without.header")}
              </h2>
            </div>

            <div className="flex flex-col gap-6">
              <ComparisonItem
                emoji="📝"
                title={t("without.item1.title")}
                description={t("without.item1.description")}
                variant="without"
                itemVariants={staggerItem}
              />
              <ComparisonItem
                emoji="⏰"
                title={t("without.item2.title")}
                description={t("without.item2.description")}
                variant="without"
                itemVariants={staggerItem}
              />
              <ComparisonItem
                emoji="🤷"
                title={t("without.item3.title")}
                description={t("without.item3.description")}
                variant="without"
                itemVariants={staggerItem}
              />
              <ComparisonItem
                emoji="🔓"
                title={t("without.item4.title")}
                description={t("without.item4.description")}
                variant="without"
                itemVariants={staggerItem}
              />
            </div>
          </MotionDiv>

          {/* Mobile VS Divider */}
          <div className="flex md:hidden justify-center py-4 bg-[#F8FAFC]">
            <span className="bg-[#E2E8F0] text-[#64748B] text-xs font-bold px-4 py-2 rounded-full">
              VS
            </span>
          </div>

          {/* With Side */}
          <MotionDiv
            className="bg-gradient-to-br from-green-50 to-green-100 p-10 md:p-12"
            variants={staggerContainer}
          >
            <div className="flex items-center gap-3 mb-8">
              <span className="w-10 h-10 rounded-xl bg-green-300 text-green-600 flex items-center justify-center text-lg font-bold">
                ✓
              </span>
              <h2 className="text-sm font-bold text-green-600 uppercase tracking-[1.5px]">
                {t("with.header")}
              </h2>
            </div>

            <div className="flex flex-col gap-6">
              <ComparisonItem
                emoji="✨"
                title={t("with.item1.title")}
                description={t("with.item1.description")}
                variant="with"
                itemVariants={staggerItem}
              />
              <ComparisonItem
                emoji="⚡"
                title={t("with.item2.title")}
                description={t("with.item2.description")}
                variant="with"
                itemVariants={staggerItem}
              />
              <ComparisonItem
                emoji="👁️"
                title={t("with.item3.title")}
                description={t("with.item3.description")}
                variant="with"
                itemVariants={staggerItem}
              />
              <ComparisonItem
                emoji="🔒"
                title={t("with.item4.title")}
                description={t("with.item4.description")}
                variant="with"
                itemVariants={staggerItem}
              />
            </div>
          </MotionDiv>
        </MotionDiv>

        {/* Stat Section */}
        <MotionDiv
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="text-center mt-10 p-8 bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] max-w-[640px] mx-auto"
        >
          <p className="text-sm text-[#64748B] mb-4">{t("stat.intro")}</p>
          <div className="text-[56px] font-extrabold bg-gradient-to-br from-red-500 to-red-700 bg-clip-text text-transparent leading-none mb-2">
            76%
          </div>
          <p className="text-[15px] text-[#475569] mb-3 max-w-[520px] mx-auto">
            {t("stat.text")}
          </p>
          <p className="text-[11px] text-[#94A3B8] italic">{t("stat.source")}</p>
        </MotionDiv>

        {/* CTA */}
        <MotionDiv
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          className="text-center mt-8"
        >
          <p className="text-lg text-[#0F172A]">
            <span className="bg-gradient-to-r from-[#38BDF8] to-[#A855F7] bg-clip-text text-transparent font-bold">
              EverSaid
            </span>{" "}
            {t("cta.tagline")}
          </p>
        </MotionDiv>
      </div>
    </section>
  )
}
