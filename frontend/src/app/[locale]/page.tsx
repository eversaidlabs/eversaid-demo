"use client"

import { Link } from "@/i18n/routing"
import { Shield } from "lucide-react"
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
    fadeUp,
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
              <p className="text-lg md:text-xl text-white/75 mb-10 leading-relaxed font-normal">
                {t('hero.subtitle')}
              </p>
            </MotionDiv>
            <MotionDiv
              variants={heroCta}
              initial="hidden"
              animate="visible"
            >
              <Link
                href="/demo"
                className="inline-block bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white px-10 py-[18px] rounded-xl font-bold text-[17px] transition-all hover:-translate-y-0.5 shadow-[0_8px_32px_rgba(56,189,248,0.3)] hover:shadow-[0_12px_40px_rgba(56,189,248,0.4)]"
              >
                {t('hero.cta')}
              </Link>
            </MotionDiv>
            <MotionDiv
              variants={heroNote}
              initial="hidden"
              animate="visible"
              className="mt-6 flex items-center justify-center gap-2 text-sm text-white/60"
            >
              <Shield className="w-4 h-4 opacity-70" />
              {t('hero.noSignup')}
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

      {/* Divider: Hero → Problem */}
      <SectionDivider fillColor={DIVIDER_COLORS.light} />

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

      {/* Features Section - Combined "What You Get" */}
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
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
          >
            {/* Transparent Editing */}
            <MotionDiv variants={cardItem} whileHover={{ y: -4 }} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] p-8 transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
              <div className="w-[72px] h-[72px] bg-white rounded-[20px] flex items-center justify-center text-[32px] mb-6 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                🔍
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-4">{t('features.transparentEditing.title')}</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs mt-0.5 shrink-0">✓</span>
                  <span className="text-[15px] text-[#64748B]">{t('features.transparentEditing.item1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs mt-0.5 shrink-0">✓</span>
                  <span className="text-[15px] text-[#64748B]">{t('features.transparentEditing.item2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs mt-0.5 shrink-0">✓</span>
                  <span className="text-[15px] text-[#64748B]">{t('features.transparentEditing.item3')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs mt-0.5 shrink-0">✓</span>
                  <span className="text-[15px] text-[#64748B]">{t('features.transparentEditing.item4')}</span>
                </li>
              </ul>
            </MotionDiv>

            {/* AI Analysis (highlighted) */}
            <MotionDiv variants={cardItem} whileHover={{ y: -4 }} className="bg-[linear-gradient(135deg,rgba(56,189,248,0.08)_0%,rgba(168,85,247,0.08)_100%)] border border-purple-200 rounded-[20px] p-8 transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
              <div className="w-[72px] h-[72px] bg-white rounded-[20px] flex items-center justify-center text-[32px] mb-6 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                ✨
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-4">{t('features.aiAnalysis.title')}</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs mt-0.5 shrink-0">✓</span>
                  <span className="text-[15px] text-[#64748B]">{t('features.aiAnalysis.item1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs mt-0.5 shrink-0">✓</span>
                  <span className="text-[15px] text-[#64748B]">{t('features.aiAnalysis.item2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs mt-0.5 shrink-0">✓</span>
                  <span className="text-[15px] text-[#64748B]">{t('features.aiAnalysis.item3')}</span>
                </li>
              </ul>
            </MotionDiv>

            {/* Privacy & Security */}
            <MotionDiv variants={cardItem} whileHover={{ y: -4 }} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] p-8 transition-shadow duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
              <div className="w-[72px] h-[72px] bg-white rounded-[20px] flex items-center justify-center text-[32px] mb-6 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                🔒
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-4">{t('features.privateSecure.title')}</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs mt-0.5 shrink-0">✓</span>
                  <span className="text-[15px] text-[#64748B]">{t('features.privateSecure.item1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs mt-0.5 shrink-0">✓</span>
                  <span className="text-[15px] text-[#64748B]">{t('features.privateSecure.item2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs mt-0.5 shrink-0">✓</span>
                  <span className="text-[15px] text-[#64748B]">{t('features.privateSecure.item3')}</span>
                </li>
              </ul>
            </MotionDiv>
          </MotionDiv>

          <MotionDiv
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <p className="text-center text-sm text-[#64748B] mt-8 italic">
              {t('features.disclaimerDemo')}
            </p>
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
      <section className="snap-start snap-always min-h-screen flex items-center px-8 md:px-16 py-20 bg-[#F8FAFC]" id="how-it-works">
        <div className="max-w-[1000px] mx-auto w-full">
          <MotionDiv
            className="text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <MotionDiv variants={sectionHeader}>
              <div className="text-[13px] font-semibold text-[#38BDF8] uppercase tracking-[2px] mb-4">
                {t('howItWorks.sectionLabel')}
              </div>
              <h2 className="text-[32px] md:text-[40px] font-extrabold text-[#0F172A] mb-4 tracking-[-0.02em]">
                {t('howItWorks.title')}
              </h2>
            </MotionDiv>
            <MotionDiv variants={sectionSubtitle}>
              <p className="text-lg text-[#64748B] mb-12 max-w-[600px] mx-auto">
                {t('howItWorks.subtitle')}
              </p>
            </MotionDiv>
          </MotionDiv>

          <MotionDiv
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stepsContainer}
          >
            <MotionDiv variants={stepItem} className="text-center relative">
              <div className="hidden lg:block absolute top-8 right-[-16px] w-8 h-0.5 bg-[linear-gradient(90deg,#38BDF8,#A855F7)] opacity-30" />
              <div className="w-16 h-16 bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-5">
                1
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-3">{t('howItWorks.step1.title')}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                {t('howItWorks.step1.description')}
              </p>
            </MotionDiv>

            <MotionDiv variants={stepItem} className="text-center relative">
              <div className="hidden lg:block absolute top-8 right-[-16px] w-8 h-0.5 bg-[linear-gradient(90deg,#38BDF8,#A855F7)] opacity-30" />
              <div className="w-16 h-16 bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-5">
                2
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-3">{t('howItWorks.step2.title')}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{t('howItWorks.step2.description')}</p>
            </MotionDiv>

            <MotionDiv variants={stepItem} className="text-center relative">
              <div className="hidden lg:block absolute top-8 right-[-16px] w-8 h-0.5 bg-[linear-gradient(90deg,#38BDF8,#A855F7)] opacity-30" />
              <div className="w-16 h-16 bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-5">
                3
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-3">{t('howItWorks.step3.title')}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                {t('howItWorks.step3.description')}
              </p>
            </MotionDiv>

            <MotionDiv variants={stepItem} className="text-center">
              <div className="w-16 h-16 bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-5">
                4
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-3">{t('howItWorks.step4.title')}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                {t('howItWorks.step4.description')}
              </p>
            </MotionDiv>
          </MotionDiv>
        </div>
      </section>

      {/* Divider: How It Works → What's Next */}
      <SectionDivider fillColor={DIVIDER_COLORS.dark} />

      {/* What's Next Section */}
      <section className="snap-start snap-always px-8 md:px-16 py-24 bg-[linear-gradient(135deg,#0F172A_0%,#1E3A5F_100%)] relative overflow-hidden">
        <div className="absolute top-[-50%] right-[-20%] w-[60%] h-[200%] bg-[radial-gradient(ellipse,rgba(56,189,248,0.1)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute bottom-[-50%] left-[-20%] w-[50%] h-[150%] bg-[radial-gradient(ellipse,rgba(168,85,247,0.08)_0%,transparent_60%)] pointer-events-none" />

        <MotionDiv
          className="max-w-[600px] mx-auto text-center relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
        >
          <MotionDiv variants={fadeUp}>
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              {t('whatsNext.badge')}
            </div>
          </MotionDiv>

          <MotionDiv variants={sectionHeader}>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-[-0.02em]">
              {t('whatsNext.title')}
            </h2>
          </MotionDiv>

          <MotionDiv variants={sectionSubtitle}>
            <p className="text-lg text-white/70 mb-10 leading-relaxed">
              {t('whatsNext.subtitle')}
            </p>
          </MotionDiv>

          <MotionDiv variants={scaleFade}>
            <button
              onClick={() => handleWaitlistClick("conversation_intelligence")}
              className="inline-block bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white px-8 py-4 rounded-xl font-bold text-[17px] transition-all hover:-translate-y-0.5 shadow-[0_8px_32px_rgba(56,189,248,0.3)] hover:shadow-[0_12px_40px_rgba(56,189,248,0.4)]"
            >
              {t('whatsNext.cta')}
            </button>
          </MotionDiv>
        </MotionDiv>
      </section>

      {/* Footer */}
      <footer className="px-8 md:px-16 py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-t border-[#E2E8F0]">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <span className="text-sm text-[#64748B]">{t('footer.copyright', { year: new Date().getFullYear() })}</span>
          <span className="flex items-center gap-1.5 text-[13px] text-[#94A3B8] px-3 py-1.5 bg-[#F8FAFC] rounded-lg">
            🇸🇮 {t('footer.builtIn')}
          </span>
        </div>
        <div className="flex gap-8 items-center">
          <Link href="#" className="text-sm text-[#64748B] hover:text-[#0F172A] font-medium transition-colors">
            {t('footer.privacy')}
          </Link>
          <Link href="#" className="text-sm text-[#64748B] hover:text-[#0F172A] font-medium transition-colors">
            {t('footer.terms')}
          </Link>
          <a href="mailto:hello@eversaid.ai" className="text-sm text-[#64748B] hover:text-[#0F172A] font-medium transition-colors">
            hello@eversaid.ai
          </a>
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
