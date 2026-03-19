"use client"

import { Link } from "@/i18n/routing"
import { Shield, FileText } from "lucide-react"
import { useState, useCallback, useEffect } from "react"
import { useTranslations } from "next-intl"
import { WaitlistFlow } from "@/components/waitlist/waitlist-flow"
import { useWaitlist } from "@/features/transcription/useWaitlist"
import { DemoVideo } from "@/components/landing/demo-video"
import { HeroTranscript } from "@/components/landing/hero-transcript"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { MotionDiv } from "@/components/motion"
import { SectionDivider, DIVIDER_COLORS } from "@/components/landing/section-divider"
import { ProblemSection } from "@/components/landing/problem-section"
import { SocialProofBar } from "@/components/landing/social-proof-bar"
import { KnowledgeBridgeSection } from "@/components/landing/knowledge-bridge-section"
import { FAQSection } from "@/components/landing/faq-section"
import { FinalCtaSection } from "@/components/landing/final-cta-section"
import { useAnimationVariants } from "@/lib/animation-variants"

export default function HomePage() {
  const t = useTranslations('landing')
  const tNav = useTranslations('navigation')
  const tRoot = useTranslations()

  // Animation variants (respects prefers-reduced-motion)
  const {
    heroTitle,
    heroSubtitle,
    heroCta,
    heroNote,
    sectionHeader,
    sectionSubtitle,
    staggerContainer,
    cardItem,
    scaleFade,
    stepsContainer,
    stepItem,
  } = useAnimationVariants()

  // Header scroll state
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    // The main element has overflow-y-scroll, so we need to listen on it
    const mainElement = document.querySelector('main')
    if (!mainElement) return

    const handleScroll = () => {
      // Add background after scrolling past 100px
      setIsScrolled(mainElement.scrollTop > 100)
    }

    mainElement.addEventListener('scroll', handleScroll, { passive: true })
    return () => mainElement.removeEventListener('scroll', handleScroll)
  }, [])

  // Waitlist modal state
  const [waitlistState, setWaitlistState] = useState<"hidden" | "toast" | "form" | "success">("hidden")
  const [waitlistType, setWaitlistType] = useState<"extended_usage" | "api_access" | "conversation_intelligence">("extended_usage")

  // Form fields (not managed by hook)
  const [useCase, setUseCase] = useState("")
  const [volume, setVolume] = useState("")
  const [source, setSource] = useState("")
  const [languagePreference, setLanguagePreference] = useState("")
  const [languagePreferenceOther, setLanguagePreferenceOther] = useState("")

  // Hook for API integration
  const waitlist = useWaitlist({
    waitlistType,
    sourcePage: '/'
  })

  const handleWaitlistClick = useCallback((type: "extended_usage" | "api_access" | "conversation_intelligence") => {
    setWaitlistType(type)
    setWaitlistState("form")
  }, [])

  const handleWaitlistSubmit = useCallback(async () => {
    const langPref = languagePreference === "other"
      ? `other: ${languagePreferenceOther}`
      : languagePreference
    await waitlist.submit({ useCase, volume, source, languagePreference: langPref })
    // Transition to success state - the hook handles errors internally with toasts
    setWaitlistState("success")
  }, [waitlist, useCase, volume, source, languagePreference, languagePreferenceOther])

  const handleWaitlistClose = useCallback(() => {
    setWaitlistState("hidden")
    setUseCase("")
    setVolume("")
    setSource("")
    setLanguagePreference("")
    setLanguagePreferenceOther("")
    waitlist.reset()
  }, [waitlist])

  return (
    <main className="h-screen overflow-y-scroll snap-y snap-proximity">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 md:px-16 py-5 transition-all duration-300 ${isScrolled ? 'bg-[#0F172A]/95 backdrop-blur-md shadow-lg' : 'bg-transparent'}`}>
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="EverSaid logo" className="h-[39px] w-auto" />
          <span className="font-[family-name:var(--font-comfortaa)] font-bold text-[27px] text-white tracking-[0.01em]">
            EverSaid
          </span>
        </Link>
        <div className="hidden md:flex items-center">
          <div className="flex gap-6 items-center">
            <Link href="#features" className="text-white/80 hover:text-white text-[15px] font-medium transition-colors">
              {tNav('features')}
            </Link>
            <Link href="#use-cases" className="text-white/80 hover:text-white text-[15px] font-medium transition-colors">
              {tNav('useCases')}
            </Link>
            <Link
              href="#how-it-works"
              className="text-white/80 hover:text-white text-[15px] font-medium transition-colors"
            >
              {tNav('howItWorks')}
            </Link>
          </div>
          <div className="flex gap-10 items-center ml-12">
            <Link
              href="/api-docs"
              className="text-white/80 hover:text-white text-[15px] font-medium transition-colors"
            >
              {tNav('apiDocs')}
            </Link>
            <Link
              href="/demo"
              className="text-white/80 hover:text-white text-[15px] font-bold transition-colors"
            >
              {tNav('tryFreeDemo')}
            </Link>
          </div>
          <div className="flex gap-3 items-center ml-10">
            <button
              onClick={() => handleWaitlistClick("extended_usage")}
              className="px-4 py-2 bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-0.5 shadow-[0_4px_16px_rgba(56,189,248,0.3)] hover:shadow-[0_6px_20px_rgba(56,189,248,0.4)]"
            >
              {tNav('getEarlyAccess')}
            </button>
            <Link
              href="/login"
              className="px-4 py-2 border border-transparent [background:linear-gradient(135deg,#0F172A,#1E3A5F)_padding-box,linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)_border-box] hover:[background:linear-gradient(135deg,#1a2744,#264a6e)_padding-box,linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)_border-box] text-white rounded-lg text-[13px] font-semibold transition-all"
            >
              {tNav('login')}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="snap-start snap-always relative min-h-screen flex items-center px-8 md:px-16 pt-[120px] pb-20 overflow-hidden bg-[linear-gradient(135deg,#0F172A_0%,#1E3A5F_50%,#0F172A_100%)]">
        {/* Background gradients */}
        <div className="absolute top-[-50%] right-[-20%] w-[80%] h-[200%] bg-[radial-gradient(ellipse,rgba(56,189,248,0.12)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute bottom-[-50%] left-[-20%] w-[60%] h-[150%] bg-[radial-gradient(ellipse,rgba(168,85,247,0.1)_0%,transparent_60%)] pointer-events-none" />

        <div className="relative z-10 max-w-[1400px] mx-auto w-full flex flex-col lg:flex-row items-center gap-[60px]">
          {/* Left column - Text */}
          <div className="flex-1 text-center">
            <MotionDiv
              variants={heroNote}
              initial="hidden"
              animate="visible"
              className="mb-4"
            >
              <span className="text-[13px] font-semibold text-[#38BDF8] uppercase tracking-[2px]">
                {t('hero.eyebrow')}
              </span>
            </MotionDiv>
            <MotionDiv
              variants={heroTitle}
              initial="hidden"
              animate="visible"
            >
              <h1 className="text-4xl md:text-5xl lg:text-[64px] font-extrabold text-white mb-6 leading-[1.05] tracking-[-0.03em]">
                {t('hero.title')}
                <br />
                <span className="bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] bg-clip-text text-transparent">
                  {t('hero.titleAccent')}
                </span>
              </h1>
            </MotionDiv>
            <MotionDiv
              variants={heroSubtitle}
              initial="hidden"
              animate="visible"
            >
              <p className="text-lg md:text-xl text-white/75 mb-10 leading-relaxed font-normal max-w-[600px] mx-auto">
                {t('hero.subtitle')}
              </p>
            </MotionDiv>
            <MotionDiv
              variants={heroCta}
              initial="hidden"
              animate="visible"
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <button
                onClick={() => handleWaitlistClick("extended_usage")}
                className="inline-block bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white px-10 py-[18px] rounded-xl font-bold text-[17px] transition-all hover:-translate-y-0.5 shadow-[0_8px_32px_rgba(56,189,248,0.3)] hover:shadow-[0_12px_40px_rgba(56,189,248,0.4)]"
              >
                {t('hero.ctaSecondary')}
              </button>
              <Link
                href="/demo"
                className="inline-block px-10 py-[18px] border border-transparent [background:linear-gradient(135deg,#0F172A,#1E3A5F)_padding-box,linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)_border-box] hover:[background:linear-gradient(135deg,#1a2744,#264a6e)_padding-box,linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)_border-box] text-white rounded-xl font-bold text-[17px] transition-all hover:-translate-y-0.5 text-center"
              >
                {t('hero.cta')}
              </Link>
            </MotionDiv>
            <MotionDiv
              variants={heroNote}
              initial="hidden"
              animate="visible"
              className="mt-6 flex flex-col items-center gap-3"
            >
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Shield className="w-4 h-4 opacity-70" />
                {t('hero.noSignup')}
              </div>
              <Link
                href="/demo?tab=text"
                className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
              >
                <FileText className="w-4 h-4" />
                {t('hero.importLink')}
              </Link>
            </MotionDiv>
          </div>

          {/* Right column - Animated transcript */}
          <div className="flex-[0_0_50%] max-w-full lg:max-w-[50%]">
            <MotionDiv
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <HeroTranscript />
            </MotionDiv>
          </div>
        </div>
      </section>

      {/* Divider: Hero → Social Proof */}
      <SectionDivider fillColor={DIVIDER_COLORS.light} />

      {/* Social Proof Bar */}
      <SocialProofBar />

      {/* Problem Section */}
      <ProblemSection />

      {/* Divider: Problem → Proof Visual */}
      <SectionDivider fillColor={DIVIDER_COLORS.light} flip />

      {/* Proof Visual Section */}
      <section className="snap-start snap-always min-h-screen flex items-center px-8 md:px-16 py-20 bg-[#F8FAFC]">
        <div className="max-w-[1100px] mx-auto w-full">
          <MotionDiv
            className="text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <MotionDiv variants={sectionHeader}>
              <div className="text-[13px] font-semibold text-[#38BDF8] uppercase tracking-[2px] mb-4">
                {t('proofVisual.sectionLabel')}
              </div>
              <h2 className="text-[32px] md:text-[40px] font-extrabold text-[#0F172A] mb-4 tracking-[-0.02em]">
                {t('proofVisual.title')}
              </h2>
            </MotionDiv>
            <MotionDiv variants={sectionSubtitle}>
              <p className="text-lg text-[#64748B] mb-10 max-w-[750px] mx-auto">
                {t('proofVisual.subtitle')}
              </p>
            </MotionDiv>
          </MotionDiv>

          <MotionDiv
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={scaleFade}
          >
            <DemoVideo
              src="/videos/demo.mp4"
              waveformStart={2}
              waveformEnd={5}
            />
          </MotionDiv>
        </div>
      </section>

      {/* Divider: Proof Visual → Features */}
      <SectionDivider fillColor={DIVIDER_COLORS.white} />

      {/* Features Section - 6-card layout */}
      <section className="snap-start snap-always min-h-screen flex items-center px-8 md:px-16 py-20" id="features">
        <div className="max-w-[1200px] mx-auto w-full">
          <MotionDiv
            className="text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <MotionDiv variants={sectionHeader}>
              <div className="text-[13px] font-semibold text-[#38BDF8] uppercase tracking-[2px] mb-4">
                {t('features.sectionLabel')}
              </div>
              <h2 className="text-[32px] md:text-[40px] font-extrabold text-[#0F172A] mb-4 tracking-[-0.02em]">
                {t('features.title')}
              </h2>
            </MotionDiv>
            <MotionDiv variants={sectionSubtitle}>
              <p className="text-lg text-[#64748B] mb-12 max-w-[600px] mx-auto">
                {t('features.subtitle')}
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
            {/* Transcription */}
            <MotionDiv variants={cardItem} whileHover={{ y: -4 }} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] p-6 transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
              <div className="w-[56px] h-[56px] bg-white rounded-[16px] flex items-center justify-center text-[28px] mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                🎙️
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">{t('features.transcription.title')}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{t('features.transcription.description')}</p>
            </MotionDiv>

            {/* Speaker Editing (coming soon) */}
            <MotionDiv variants={cardItem} whileHover={{ y: -4 }} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] p-6 transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] relative">
              <div className="absolute top-4 right-4 px-2 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                {t('features.speakerEditing.comingSoon')}
              </div>
              <div className="w-[56px] h-[56px] bg-white rounded-[16px] flex items-center justify-center text-[28px] mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                👥
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">{t('features.speakerEditing.title')}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{t('features.speakerEditing.description')}</p>
            </MotionDiv>

            {/* AI Cleanup (highlighted) */}
            <MotionDiv variants={cardItem} whileHover={{ y: -4 }} className="bg-[linear-gradient(135deg,rgba(56,189,248,0.08)_0%,rgba(168,85,247,0.08)_100%)] border border-purple-200 rounded-[20px] p-6 transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
              <div className="w-[56px] h-[56px] bg-white rounded-[16px] flex items-center justify-center text-[28px] mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                ✨
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">{t('features.cleanup.title')}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{t('features.cleanup.description')}</p>
            </MotionDiv>

            {/* Verification (highlighted) */}
            <MotionDiv variants={cardItem} whileHover={{ y: -4 }} className="bg-[linear-gradient(135deg,rgba(56,189,248,0.08)_0%,rgba(168,85,247,0.08)_100%)] border border-purple-200 rounded-[20px] p-6 transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
              <div className="w-[56px] h-[56px] bg-white rounded-[16px] flex items-center justify-center text-[28px] mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                🔍
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">{t('features.verification.title')}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{t('features.verification.description')}</p>
            </MotionDiv>

            {/* Analysis */}
            <MotionDiv variants={cardItem} whileHover={{ y: -4 }} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] p-6 transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
              <div className="w-[56px] h-[56px] bg-white rounded-[16px] flex items-center justify-center text-[28px] mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                📊
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">{t('features.analysis.title')}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{t('features.analysis.description')}</p>
            </MotionDiv>

            {/* Privacy */}
            <MotionDiv variants={cardItem} whileHover={{ y: -4 }} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] p-6 transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
              <div className="w-[56px] h-[56px] bg-white rounded-[16px] flex items-center justify-center text-[28px] mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                🔒
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">{t('features.privacy.title')}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{t('features.privacy.description')}</p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="snap-start snap-always min-h-screen flex items-center px-8 md:px-16 py-20" id="use-cases">
        <div className="max-w-[1200px] mx-auto w-full">
          <MotionDiv
            className="text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <MotionDiv variants={sectionHeader}>
              <div className="text-[13px] font-semibold text-[#38BDF8] uppercase tracking-[2px] mb-4">
                {t('useCases.sectionLabel')}
              </div>
              <h2 className="text-[32px] md:text-[40px] font-extrabold text-[#0F172A] mb-4 tracking-[-0.02em]">
                {t('useCases.title')}
              </h2>
            </MotionDiv>
            <MotionDiv variants={sectionSubtitle}>
              <p className="text-lg text-[#64748B] mb-12 max-w-[850px] mx-auto">
                {t('useCases.subtitle')}
              </p>
            </MotionDiv>
          </MotionDiv>

          <MotionDiv
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
          >
            {([
              { icon: '🧠', key: 'therapists' },
              { icon: '🔬', key: 'researchers' },
              { icon: '🎤', key: 'journalists' },
              { icon: '🎙️', key: 'podcasters' },
            ] as const).map(({ icon, key }) => (
              <MotionDiv
                key={key}
                variants={cardItem}
                whileHover={{ y: -4 }}
                className="bg-white border border-[#E2E8F0] rounded-[20px] p-8 text-center transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
              >
                <div className="w-[100px] h-[100px] bg-[linear-gradient(135deg,rgba(56,189,248,0.1)_0%,rgba(168,85,247,0.1)_100%)] rounded-[24px] flex items-center justify-center text-[44px] mx-auto mb-5">
                  {icon}
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] mb-3">{t(`useCases.${key}.title`)}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{t(`useCases.${key}.description`)}</p>
              </MotionDiv>
            ))}
          </MotionDiv>
        </div>
      </section>

      {/* Divider: Use Cases → How It Works */}
      <SectionDivider fillColor={DIVIDER_COLORS.light} />

      {/* How It Works Section */}
      <section className="snap-start snap-always px-6 md:px-16 py-[100px] bg-white" id="how-it-works">
        <div className="max-w-[1400px] mx-auto w-full">
          <MotionDiv
            className="max-w-[700px] mx-auto text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <MotionDiv variants={sectionHeader}>
              <div className="text-[13px] font-semibold text-[#38BDF8] uppercase tracking-[2px] mb-2">
                {t('howItWorks.sectionLabel')}
              </div>
              <h2 className="text-[36px] font-extrabold text-[#0F172A] tracking-[-0.02em] mb-3">
                {t('howItWorks.title')}
              </h2>
            </MotionDiv>
            <MotionDiv variants={sectionSubtitle}>
              <p className="text-[17px] text-[#64748B]">
                {t('howItWorks.subtitle')}
              </p>
            </MotionDiv>
          </MotionDiv>

          {/* Main 4 steps + 2 future steps in 6-column grid */}
          <MotionDiv
            className="grid grid-cols-2 lg:grid-cols-6 gap-6 lg:gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stepsContainer}
          >
            {/* Step 1: Upload or record */}
            <MotionDiv variants={stepItem} className="text-center px-3 py-9">
              <div className="w-[72px] h-[72px] bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] rounded-[20px] flex items-center justify-center mx-auto mb-7">
                <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-white fill-none stroke-2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <h3 className="text-[22px] font-bold text-[#0F172A] mb-3">{t('howItWorks.step1.title')}</h3>
              <p className="text-base text-[#64748B] leading-relaxed">
                {t('howItWorks.step1.description')}
              </p>
            </MotionDiv>

            {/* Step 2: Transcribed with speakers */}
            <MotionDiv variants={stepItem} className="text-center px-3 py-9">
              <div className="w-[72px] h-[72px] bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] rounded-[20px] flex items-center justify-center mx-auto mb-7">
                <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-white fill-none stroke-2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 className="text-[22px] font-bold text-[#0F172A] mb-3">{t('howItWorks.step2.title')}</h3>
              <p className="text-base text-[#64748B] leading-relaxed">{t('howItWorks.step2.description')}</p>
            </MotionDiv>

            {/* Step 3: AI cleans it up */}
            <MotionDiv variants={stepItem} className="text-center px-3 py-9">
              <div className="w-[72px] h-[72px] bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] rounded-[20px] flex items-center justify-center mx-auto mb-7">
                <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-white fill-none stroke-2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>
                </svg>
              </div>
              <h3 className="text-[22px] font-bold text-[#0F172A] mb-3">{t('howItWorks.step3.title')}</h3>
              <p className="text-base text-[#64748B] leading-relaxed">
                {t('howItWorks.step3.description')}
              </p>
            </MotionDiv>

            {/* Step 4: Review and verify */}
            <MotionDiv variants={stepItem} className="text-center px-3 py-9">
              <div className="w-[72px] h-[72px] bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] rounded-[20px] flex items-center justify-center mx-auto mb-7">
                <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-white fill-none stroke-2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h5"/>
                  <path d="M13 5h5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-5"/>
                  <line x1="12" y1="4" x2="12" y2="20"/>
                  <path d="M7 9h2"/>
                  <path d="M7 13h2"/>
                  <path d="M15 9h2"/>
                  <path d="M15 13h2"/>
                </svg>
              </div>
              <h3 className="text-[22px] font-bold text-[#0F172A] mb-3">{t('howItWorks.step4.title')}</h3>
              <p className="text-base text-[#64748B] leading-relaxed">
                {t('howItWorks.step4.description')}
              </p>
            </MotionDiv>

            {/* Step 5: Saved to your library */}
            <MotionDiv variants={stepItem} className="text-center px-3 py-9">
              <div className="w-[72px] h-[72px] bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] rounded-[20px] flex items-center justify-center mx-auto mb-7">
                <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-white fill-none stroke-2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  <line x1="8" y1="7" x2="16" y2="7"/>
                  <line x1="8" y1="11" x2="13" y2="11"/>
                </svg>
              </div>
              <h3 className="text-[22px] font-bold text-[#0F172A] mb-3">{t('howItWorks.library.title')}</h3>
              <p className="text-base text-[#64748B] leading-relaxed">{t('howItWorks.library.description')}</p>
            </MotionDiv>

            {/* Step 6: Talk to your library (Coming soon) */}
            <MotionDiv
              variants={stepItem}
              className="text-center px-5 py-9 bg-[linear-gradient(135deg,rgba(56,189,248,0.06)_0%,rgba(168,85,247,0.06)_100%)] border border-[rgba(168,85,247,0.15)] rounded-[24px]"
            >
              <div className="w-[72px] h-[72px] bg-[linear-gradient(135deg,rgba(56,189,248,0.3)_0%,rgba(168,85,247,0.3)_100%)] rounded-[20px] flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-white fill-none stroke-2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  <path d="M8 10h.01"/>
                  <path d="M12 10h.01"/>
                  <path d="M16 10h.01"/>
                </svg>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#A855F7] uppercase tracking-[1.5px] mb-3">
                <span className="w-2 h-2 rounded-full bg-[#A855F7]" />
                {t('howItWorks.aiChat.comingSoon')}
              </div>
              <h3 className="text-[22px] font-bold text-[#0F172A] mb-3">{t('howItWorks.aiChat.title')}</h3>
              <p className="text-base text-[#64748B] leading-relaxed">{t('howItWorks.aiChat.description')}</p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </section>

      {/* Divider: How It Works → Knowledge Bridge */}
      <SectionDivider fillColor={DIVIDER_COLORS.dark} />

      {/* Knowledge Bridge Section */}
      <KnowledgeBridgeSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Final CTA Section */}
      <FinalCtaSection onWaitlistClick={() => handleWaitlistClick("extended_usage")} />

      {/* Footer */}
      <footer className="px-8 md:px-16 py-10 border-t border-[#E2E8F0]">
        <div className="max-w-[1200px] mx-auto">
          {/* Product description */}
          <p className="text-xs text-[#94A3B8] mb-6 max-w-[800px] leading-relaxed">
            {t('footer.description')}
          </p>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <span className="text-sm text-[#64748B]">{t('footer.copyright', { year: new Date().getFullYear() })}</span>
              <span className="flex items-center gap-1.5 text-[13px] text-[#94A3B8] px-3 py-1.5 bg-[#F8FAFC] rounded-lg">
                🇸🇮 {t('footer.builtIn')}
              </span>
            </div>
            <div className="flex flex-wrap gap-6 md:gap-8 items-center">
              <Link href="/privacy" className="text-sm text-[#64748B] hover:text-[#0F172A] font-medium transition-colors">
                {t('footer.privacy')}
              </Link>
              <Link href="/terms" className="text-sm text-[#64748B] hover:text-[#0F172A] font-medium transition-colors">
                {t('footer.terms')}
              </Link>
              <Link href="/api-docs" className="text-sm text-[#64748B] hover:text-[#0F172A] font-medium transition-colors">
                {t('footer.apiDocs')}
              </Link>
              <a href="mailto:hello@eversaid.ai" className="text-sm text-[#64748B] hover:text-[#0F172A] font-medium transition-colors">
                hello@eversaid.ai
              </a>
            </div>
          </div>
        </div>
      </footer>

      <WaitlistFlow
        state={waitlistState}
        type={waitlistType}
        email={waitlist.email}
        useCase={useCase}
        volume={volume}
        source={source}
        languagePreference={languagePreference}
        languagePreferenceOther={languagePreferenceOther}
        isSubmitting={waitlist.isSubmitting}
        onEmailChange={waitlist.setEmail}
        onUseCaseChange={setUseCase}
        onVolumeChange={setVolume}
        onSourceChange={setSource}
        onLanguagePreferenceChange={setLanguagePreference}
        onLanguagePreferenceOtherChange={setLanguagePreferenceOther}
        onSubmit={handleWaitlistSubmit}
        onClose={handleWaitlistClose}
        t={tRoot}
      />
    </main>
  )
}
