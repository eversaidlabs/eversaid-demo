"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { MotionDiv } from "@/components/motion"
import { useAnimationVariants } from "@/lib/animation-variants"
import { Shield, Lock, Brain } from "lucide-react"

interface FinalCtaSectionProps {
  onWaitlistClick: () => void
}

export function FinalCtaSection({ onWaitlistClick }: FinalCtaSectionProps) {
  const t = useTranslations("landing.finalCta")
  const { fadeUp, scaleFade } = useAnimationVariants()

  return (
    <section className="snap-start snap-always px-8 md:px-16 py-24 bg-white">
      <MotionDiv
        className="max-w-[700px] mx-auto text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <MotionDiv variants={fadeUp}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0F172A] tracking-[-0.02em]">
              {t("title")}
            </h2>
            <span className="hidden sm:block text-[#E2E8F0] text-3xl font-light">|</span>
            <span className="text-base text-[#64748B] text-center sm:text-left">
              <strong className="font-semibold text-[#0F172A]">{t("foundingPricingLine1Bold")}</strong> {t("foundingPricingLine1Suffix")}<br />
              <strong className="font-semibold text-[#0F172A]">{t("foundingPricingLine2Bold")}</strong> {t("foundingPricingLine2Suffix")}
            </span>
          </div>
        </MotionDiv>

        <MotionDiv variants={fadeUp}>
          <p className="text-lg text-[#64748B] mb-10 leading-relaxed">
            {t("subtitle")}
          </p>
        </MotionDiv>

        <MotionDiv variants={scaleFade} className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onWaitlistClick}
            className="inline-block bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white px-10 py-[18px] rounded-xl font-bold text-[17px] transition-all hover:-translate-y-0.5 shadow-[0_8px_32px_rgba(56,189,248,0.3)] hover:shadow-[0_12px_40px_rgba(56,189,248,0.4)]"
          >
            {t("ctaSecondary")}
          </button>
          <Link
            href="/demo"
            className="inline-block px-10 py-[18px] border-2 border-[#E2E8F0] hover:border-[#38BDF8] text-[#0F172A] rounded-xl font-bold text-[17px] transition-all hover:-translate-y-0.5 text-center"
          >
            {t("cta")}
          </Link>
        </MotionDiv>

        <MotionDiv
          variants={fadeUp}
          className="flex flex-wrap justify-center gap-6 mt-8"
        >
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <Shield className="w-4 h-4 text-[#38BDF8]" />
            {t("trustBadges.gdpr")}
          </div>
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <Lock className="w-4 h-4 text-[#38BDF8]" />
            {t("trustBadges.encrypted")}
          </div>
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <Brain className="w-4 h-4 text-[#38BDF8]" />
            {t("trustBadges.noTraining")}
          </div>
        </MotionDiv>
      </MotionDiv>
    </section>
  )
}
