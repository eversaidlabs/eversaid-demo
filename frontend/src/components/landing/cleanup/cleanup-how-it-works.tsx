"use client"

import { useTranslations } from "next-intl"
import { MotionDiv } from "@/components/motion"
import { useAnimationVariants } from "@/lib/animation-variants"

// Step icons matching the HTML design
function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-white fill-none stroke-2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-white fill-none stroke-2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
    </svg>
  )
}

function ColumnsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-white fill-none stroke-2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h5"/>
      <path d="M13 5h5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-5"/>
      <line x1="12" y1="4" x2="12" y2="20"/>
      <path d="M7 9h2"/>
      <path d="M7 13h2"/>
      <path d="M15 9h2"/>
      <path d="M15 13h2"/>
    </svg>
  )
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-white fill-none stroke-2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      <line x1="8" y1="7" x2="16" y2="7"/>
      <line x1="8" y1="11" x2="13" y2="11"/>
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-white fill-none stroke-2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <path d="M8 10h.01"/>
      <path d="M12 10h.01"/>
      <path d="M16 10h.01"/>
    </svg>
  )
}

export function CleanupHowItWorks() {
  const t = useTranslations("cleanupLanding.howItWorks")
  const { sectionHeader, staggerContainer, stepItem } = useAnimationVariants()

  const steps = [
    { Icon: ClipboardIcon, key: "paste" },
    { Icon: SparkleIcon, key: "clean" },
    { Icon: ColumnsIcon, key: "review" },
    { Icon: BookIcon, key: "library" },
  ]

  return (
    <section className="snap-start snap-always px-6 md:px-16 py-[100px] bg-white" id="how-it-works">
      <div className="max-w-[1400px] mx-auto">
        <MotionDiv
          className="max-w-[700px] mx-auto text-center mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <MotionDiv variants={sectionHeader}>
            <div className="text-[13px] font-semibold text-[#38BDF8] uppercase tracking-[2px] mb-2">
              {t("sectionLabel")}
            </div>
            <h2 className="text-[36px] font-extrabold text-[#0F172A] tracking-[-0.02em]">
              {t("title")}
            </h2>
          </MotionDiv>
        </MotionDiv>

        <MotionDiv
          className="grid grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          {steps.map(({ Icon, key }) => (
            <MotionDiv key={key} variants={stepItem} className="text-center px-3 py-9">
              <div className="w-[72px] h-[72px] bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] rounded-[20px] flex items-center justify-center mx-auto mb-7">
                <Icon />
              </div>
              <h3 className="text-[22px] font-bold text-[#0F172A] mb-3">
                {t(`steps.${key}.title`)}
              </h3>
              <p className="text-base text-[#64748B] leading-relaxed">
                {t(`steps.${key}.description`)}
              </p>
            </MotionDiv>
          ))}

          {/* Coming soon step */}
          <MotionDiv
            variants={stepItem}
            className="text-center px-5 py-9 bg-[linear-gradient(135deg,rgba(56,189,248,0.06)_0%,rgba(168,85,247,0.06)_100%)] border border-[rgba(168,85,247,0.15)] rounded-[24px]"
          >
            <div className="w-[72px] h-[72px] bg-[linear-gradient(135deg,rgba(56,189,248,0.3)_0%,rgba(168,85,247,0.3)_100%)] rounded-[20px] flex items-center justify-center mx-auto mb-4">
              <ChatIcon />
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#A855F7] uppercase tracking-[1.5px] mb-3">
              <span className="w-2 h-2 rounded-full bg-[#A855F7]" />
              {t("steps.chat.comingSoon")}
            </div>
            <h3 className="text-[22px] font-bold text-[#0F172A] mb-3">
              {t("steps.chat.title")}
            </h3>
            <p className="text-base text-[#64748B] leading-relaxed">
              {t("steps.chat.description")}
            </p>
          </MotionDiv>
        </MotionDiv>
      </div>
    </section>
  )
}
