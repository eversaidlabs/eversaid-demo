"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { MotionDiv } from "@/components/motion"
import { useAnimationVariants } from "@/lib/animation-variants"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Link } from "@/i18n/routing"

interface FAQItemProps {
  question: string
  answer: string
  linkText?: string
  linkHref?: string
  onLinkClick?: () => void
  isOpen: boolean
  onToggle: () => void
}

function FAQItem({ question, answer, linkText, linkHref, onLinkClick, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl px-7 py-6">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left group"
      >
        <span className="text-base font-bold text-[#0F172A] pr-4 group-hover:text-[#38BDF8] transition-colors">
          {question}
        </span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-[#64748B] shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          isOpen ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-[#475569] leading-relaxed">{answer}</p>
          {linkText && onLinkClick && (
            <p className="text-sm text-[#94A3B8] mt-3">
              <button onClick={onLinkClick} className="text-[#38BDF8] hover:underline">
                {linkText}
              </button>
            </p>
          )}
          {linkText && linkHref && !onLinkClick && (
            <p className="text-sm text-[#94A3B8] mt-3">
              <Link href={linkHref} className="text-[#38BDF8] hover:underline">
                {linkText}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const FAQ_KEYS = [
  "whatRemoves",
  "differentFromChatgpt",
  "formats",
  "account",
  "dataStorage",
  "audioToo",
] as const

interface CleanupFAQProps {
  onWaitlistClick?: () => void
}

export function CleanupFAQ({ onWaitlistClick }: CleanupFAQProps) {
  const t = useTranslations("cleanupLanding.faq")
  const { sectionHeader, fadeUp } = useAnimationVariants()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="snap-start snap-always px-8 md:px-16 py-24 bg-white" id="faq">
      <div className="max-w-[800px] mx-auto">
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
            <h2 className="text-[32px] md:text-[36px] font-extrabold text-[#0F172A] tracking-[-0.02em]">
              {t("title")}
            </h2>
          </MotionDiv>
        </MotionDiv>

        <MotionDiv
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          className="space-y-4"
        >
          {FAQ_KEYS.map((key, index) => (
            <FAQItem
              key={key}
              question={t(`questions.${key}.question`)}
              answer={t(`questions.${key}.answer`)}
              linkText={key === "formats" || key === "audioToo" ? t(`questions.${key}.linkText`) : undefined}
              linkHref={key === "audioToo" ? "/" : undefined}
              onLinkClick={key === "formats" ? onWaitlistClick : undefined}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </MotionDiv>
      </div>
    </section>
  )
}
