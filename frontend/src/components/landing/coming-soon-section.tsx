"use client"

import { useTranslations } from "next-intl"
import { MotionDiv } from "@/components/motion"
import { fadeUp, sectionHeader, sectionSubtitle } from "@/lib/animation-variants"
import type { Variants } from "motion/react"

// ─── Animation Variants ─────────────────────────────────────────────────────

const chatStagger: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.4,
      staggerChildren: 0.4,
    },
  },
}

const chatItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
}

// Animation classes are defined in /src/app/landing-animations.css
// Using CSS file instead of dangerouslySetInnerHTML for better performance

// ─── Internal Sub-components ─────────────────────────────────────────────────

function TimelineEntry({
  name,
  duration,
  date,
  highlighted,
  isLast,
}: {
  name: string
  duration: string
  date: string
  highlighted?: boolean
  isLast?: boolean
}) {
  return (
    <div className={`relative ${isLast ? "" : "pb-[18px]"}`}>
      <div
        className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full ${
          highlighted
            ? "border-2 border-[#7C3AED] bg-[linear-gradient(135deg,rgba(56,189,248,0.2),rgba(168,85,247,0.2))]"
            : "border-2 border-[#CBD5E1] bg-white"
        }`}
      />
      <div
        className={`py-3 px-3.5 rounded-[10px] border transition-all cursor-pointer hover:border-[#CBD5E1] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
          highlighted
            ? "border-[rgba(168,85,247,0.25)] bg-[linear-gradient(135deg,rgba(56,189,248,0.03),rgba(168,85,247,0.03))]"
            : "border-[#E2E8F0] bg-[#FAFBFC]"
        }`}
      >
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[13px] font-semibold text-[#0F172A]">{name}</span>
          <span className="text-[10px] font-semibold px-[7px] py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]">
            {duration}
          </span>
        </div>
        <div className="text-[11px] text-[#94A3B8]">{date}</div>
      </div>
    </div>
  )
}

function RefPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[10px] font-semibold px-1.5 py-px rounded-[5px] bg-[#F1F5F9] text-[#64748B] ml-0.5 cursor-pointer transition-all hover:bg-[linear-gradient(135deg,rgba(56,189,248,0.15),rgba(168,85,247,0.15))] hover:text-[#7C3AED]">
      {children}
    </span>
  )
}

function AiCardHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[linear-gradient(135deg,rgba(56,189,248,0.04),rgba(168,85,247,0.04))] border-b border-[#F1F5F9]">
      <div className="w-[22px] h-[22px] rounded-md bg-[linear-gradient(135deg,#38BDF8,#A855F7)] flex items-center justify-center">
        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10h16V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z" />
        </svg>
      </div>
      <span className="text-xs font-semibold text-[#64748B]">{label}</span>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ComingSoonSection() {
  const t = useTranslations("landing.comingSoon")

  return (
    <section id="coming-soon" className="snap-start snap-always px-8 md:px-16 py-20">

      <div className="max-w-[960px] mx-auto w-full flex flex-col items-center">
        {/* ── Section Header ── */}
        <MotionDiv
          className="text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <MotionDiv variants={fadeUp}>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[20px] text-xs font-semibold bg-[linear-gradient(135deg,rgba(56,189,248,0.12),rgba(168,85,247,0.12))] text-[#7C3AED] border border-[rgba(168,85,247,0.2)] mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[linear-gradient(135deg,#38BDF8,#A855F7)]" />
              {t("badge")}
            </div>
          </MotionDiv>
          <MotionDiv variants={sectionHeader}>
            <div className="text-[13px] font-semibold uppercase tracking-[2px] bg-[linear-gradient(135deg,#38BDF8,#A855F7)] bg-clip-text text-transparent mb-4">
              {t("sectionLabel")}
            </div>
            <h2 className="text-[28px] md:text-[40px] font-extrabold text-[#0F172A] mb-3 tracking-[-0.02em]">
              {t("title")}
            </h2>
          </MotionDiv>
          <MotionDiv variants={sectionSubtitle}>
            <p className="text-lg text-[#64748B] mb-14 max-w-[600px] mx-auto leading-relaxed whitespace-pre-line">
              {t("subtitle")}
            </p>
          </MotionDiv>
        </MotionDiv>

        {/* ── Library Mockup ── */}
        <MotionDiv
          className="w-full mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={fadeUp}
        >
          <div className="bg-white rounded-[20px] border border-[#E2E8F0] shadow-[0_25px_80px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] min-h-[420px]">
              {/* Sidebar — hidden on mobile */}
              <div className="hidden md:block border-r border-[#F1F5F9] py-3.5">
                <div className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#94A3B8] px-3.5 mb-1.5">
                  {t("library.sidebarLabel")}
                </div>

                {/* Client 1 — active */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 bg-[linear-gradient(135deg,rgba(56,189,248,0.06),rgba(168,85,247,0.06))] border-r-2 border-[#7C3AED]">
                  <div className="w-7 h-7 rounded-full bg-[#3B82F6] text-[11px] font-bold text-white flex items-center justify-center shrink-0">
                    {t("library.client1Initials")}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-[#0F172A]">{t("library.client1Name")}</div>
                    <div className="text-[10px] text-[#94A3B8]">{t("library.client1Sessions")}</div>
                  </div>
                </div>

                {/* Client 2 */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#F8FAFC] transition-colors">
                  <div className="w-7 h-7 rounded-full bg-[#10B981] text-[11px] font-bold text-white flex items-center justify-center shrink-0">
                    {t("library.client2Initials")}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[#334155]">{t("library.client2Name")}</div>
                    <div className="text-[10px] text-[#94A3B8]">{t("library.client2Sessions")}</div>
                  </div>
                </div>

                {/* Client 3 */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#F8FAFC] transition-colors">
                  <div className="w-7 h-7 rounded-full bg-[#F59E0B] text-[11px] font-bold text-white flex items-center justify-center shrink-0">
                    {t("library.client3Initials")}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[#334155]">{t("library.client3Name")}</div>
                    <div className="text-[10px] text-[#94A3B8]">{t("library.client3Sessions")}</div>
                  </div>
                </div>
              </div>

              {/* Main: Timeline */}
              <div className="p-5 md:px-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-[10px] bg-[#3B82F6] text-[13px] font-bold text-white flex items-center justify-center shrink-0">
                    {t("library.client1Initials")}
                  </div>
                  <div>
                    <div className="text-base font-bold text-[#0F172A]">{t("library.mainTitle")}</div>
                    <div className="text-xs text-[#94A3B8]">{t("library.mainSubtitle")}</div>
                  </div>
                </div>

                <div className="relative pl-7">
                  {/* Vertical gradient line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-[linear-gradient(180deg,#38BDF8,#A855F7)] opacity-20 rounded-sm" />

                  <TimelineEntry
                    highlighted
                    name={t("library.session5Name")}
                    duration={t("library.session5Duration")}
                    date={t("library.session5Date")}
                  />
                  <TimelineEntry
                    name={t("library.session4Name")}
                    duration={t("library.session4Duration")}
                    date={t("library.session4Date")}
                  />
                  <TimelineEntry
                    name={t("library.session3Name")}
                    duration={t("library.session3Duration")}
                    date={t("library.session3Date")}
                  />
                  <TimelineEntry
                    name={t("library.session2Name")}
                    duration={t("library.session2Duration")}
                    date={t("library.session2Date")}
                  />
                  <TimelineEntry
                    name={t("library.session1Name")}
                    duration={t("library.session1Duration")}
                    date={t("library.session1Date")}
                    isLast
                  />
                </div>
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* ── Connector ── */}
        <MotionDiv
          className="flex flex-col items-center mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <div className="w-0.5 h-12 bg-[linear-gradient(180deg,#38BDF8,#A855F7)] opacity-30" />
          <div className="text-xs font-semibold text-[#94A3B8] tracking-[1px] uppercase px-4 py-2 border border-dashed border-[#CBD5E1] rounded-[20px]">
            {t("connector")}
          </div>
          <div className="w-0.5 h-12 bg-[linear-gradient(180deg,#38BDF8,#A855F7)] opacity-30" />
        </MotionDiv>

        {/* ── Chat Description ── */}
        <MotionDiv
          className="w-full mb-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <p className="text-[15px] text-[#64748B] leading-relaxed text-center mb-6">
            {t("chat.description")}
          </p>
        </MotionDiv>

        {/* ── Chat Mockup ── */}
        <MotionDiv
          className="w-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={fadeUp}
        >
          <div className="bg-white rounded-[20px] border border-[#E2E8F0] shadow-[0_25px_80px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex flex-col min-h-[420px]">
              {/* Context bar */}
              <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[#F1F5F9] bg-[linear-gradient(135deg,rgba(56,189,248,0.03),rgba(168,85,247,0.03))]">
                <svg className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
                <span className="text-xs font-semibold text-[#0F172A]">{t("chat.contextName")}</span>
                <span className="text-[11px] text-[#7C3AED] font-medium bg-[rgba(124,58,237,0.08)] px-2 py-0.5 rounded-full">
                  {t("chat.contextBadge")}
                </span>
              </div>

              {/* Messages — staggered animation */}
              <MotionDiv
                className="flex-1 p-5 flex flex-col gap-4 overflow-hidden"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={chatStagger}
              >
                {/* Q1 */}
                <MotionDiv variants={chatItem} className="text-sm font-medium text-[#0F172A] py-2.5 border-b border-[#F1F5F9]">
                  {t("chat.q1")}
                </MotionDiv>

                {/* A1 — structured response card */}
                <MotionDiv variants={chatItem} className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <AiCardHeader label={t("chat.aiLabel")} />
                  <div className="p-3.5 text-[13px] leading-relaxed text-[#334155]">
                    {t("chat.responseIntro")}
                    <ul className="mt-1.5 ml-4 list-disc">
                      <li className="mb-1.5">
                        <span className="bg-[linear-gradient(135deg,rgba(56,189,248,0.12),rgba(168,85,247,0.12))] px-1 py-px rounded">
                          {t("chat.theme1Label")}
                        </span>
                        {": "}
                        {t("chat.theme1Text")}{" "}
                        <RefPill>{t("chat.sessionRef", { number: 3 })}</RefPill>{" "}
                        <RefPill>{t("chat.sessionRef", { number: 5 })}</RefPill>
                      </li>
                      <li className="mb-1.5">
                        <span className="bg-[linear-gradient(135deg,rgba(56,189,248,0.12),rgba(168,85,247,0.12))] px-1 py-px rounded">
                          {t("chat.theme2Label")}
                        </span>
                        {": "}
                        {t("chat.theme2Text")}{" "}
                        <RefPill>{t("chat.sessionRef", { number: 4 })}</RefPill>{" "}
                        <RefPill>{t("chat.sessionRef", { number: 5 })}</RefPill>
                      </li>
                      <li className="mb-1.5">
                        <span className="bg-[linear-gradient(135deg,rgba(56,189,248,0.12),rgba(168,85,247,0.12))] px-1 py-px rounded">
                          {t("chat.theme3Label")}
                        </span>
                        {": "}
                        {t("chat.theme3Text")}{" "}
                        <RefPill>{t("chat.sessionRef", { number: 5 })}</RefPill>
                      </li>
                    </ul>
                  </div>
                  <div className="flex items-center gap-1.5 px-3.5 py-2 border-t border-[#F1F5F9] text-[11px] text-[#94A3B8] italic">
                    <svg className="w-3 h-3 text-[#94A3B8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {t("chat.responseFooter")}
                  </div>
                </MotionDiv>

                {/* Q2 */}
                <MotionDiv variants={chatItem} className="text-sm font-medium text-[#0F172A] py-2.5 border-b border-[#F1F5F9]">
                  {t("chat.q2")}
                </MotionDiv>

                {/* A2 — typing indicator */}
                <MotionDiv variants={chatItem} className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <AiCardHeader label={t("chat.aiLabel")} />
                  <div className="p-3.5">
                    <div className="flex gap-1 py-1">
                      <span className="landing-typing-dot" />
                      <span className="landing-typing-dot" />
                      <span className="landing-typing-dot" />
                    </div>
                  </div>
                </MotionDiv>
              </MotionDiv>

              {/* Chat input bar */}
              <div className="flex items-center gap-2 px-5 py-3 border-t border-[#F1F5F9] bg-[#FAFBFC]">
                <div className="flex-1 px-3.5 py-2.5 rounded-[10px] border border-[#E2E8F0] bg-white text-[13px] text-[#94A3B8]">
                  {t("chat.inputPlaceholder")}
                </div>
                <button
                  className="w-9 h-9 rounded-[10px] bg-[linear-gradient(135deg,#38BDF8,#A855F7)] flex items-center justify-center shrink-0"
                  aria-label="Send"
                  tabIndex={-1}
                >
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </MotionDiv>
      </div>
    </section>
  )
}
