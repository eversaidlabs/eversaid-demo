"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { MotionDiv } from "@/components/motion"
import { useAnimationVariants } from "@/lib/animation-variants"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface FAQItemProps {
  question: string
  answer: string
  importCta?: string
  isOpen: boolean
  onToggle: () => void
}

function FAQItem({ question, answer, importCta, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="border-b border-[#E2E8F0] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-5 flex items-center justify-between text-left group"
      >
        <span className="text-[15px] font-semibold text-[#0F172A] pr-4 group-hover:text-[#38BDF8] transition-colors">
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
          isOpen ? "grid-rows-[1fr] opacity-100 pb-5" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-[#64748B] leading-relaxed">{answer}</p>
          {importCta && (
            <p className="text-sm text-[#94A3B8] italic mt-3">{importCta}</p>
          )}
        </div>
      </div>
    </div>
  )
}

const FAQ_KEYS = [
  "whatIs",
  "whatIsCleanup",
  "existingTranscript",
  "howDifferent",
  "dataStorage",
  "pricing",
  "languages",
] as const

export function FAQSection() {
  const t = useTranslations("landing.faq")
  const { sectionHeader, fadeUp } = useAnimationVariants()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="snap-start snap-always px-8 md:px-16 py-20 bg-white" id="faq">
      <div className="max-w-[800px] mx-auto">
        <MotionDiv
          className="text-center mb-12"
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
        </MotionDiv>

        <MotionDiv
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          className="bg-[#F8FAFC] rounded-2xl p-6 md:p-8"
        >
          {FAQ_KEYS.map((key, index) => (
            <FAQItem
              key={key}
              question={t(`questions.${key}.question`)}
              answer={t(`questions.${key}.answer`)}
              importCta={key === "existingTranscript" ? t(`questions.${key}.importCta`) : undefined}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </MotionDiv>
      </div>
    </section>
  )
}
