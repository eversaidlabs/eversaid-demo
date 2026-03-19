"use client"

import { useTranslations } from "next-intl"
import { MotionDiv } from "@/components/motion"
import { useAnimationVariants } from "@/lib/animation-variants"

export function SocialProofBar() {
  const t = useTranslations("landing.socialProof")
  const { fadeUp } = useAnimationVariants()

  return (
    <section className="px-8 md:px-16 py-12 bg-[#F8FAFC]">
      <MotionDiv
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={fadeUp}
        className="max-w-[800px] mx-auto text-center"
      >
        <p className="text-sm text-[#64748B] mb-3">{t("intro")}</p>
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-[48px] md:text-[56px] font-extrabold bg-gradient-to-br from-red-500 to-red-700 bg-clip-text text-transparent leading-none">
            {t("stat")}
          </span>
          <span className="text-[15px] text-[#475569] text-left max-w-[320px]">
            {t("text")}
          </span>
        </div>
        <p className="text-[11px] text-[#94A3B8] italic">{t("source")}</p>
      </MotionDiv>
    </section>
  )
}
