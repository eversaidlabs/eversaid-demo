"use client"

import { Link } from "@/i18n/routing"
import { Shield, Mic } from "lucide-react"
import { useState, useCallback, useEffect } from "react"
import { useTranslations } from "next-intl"
import { WaitlistFlow } from "@/components/waitlist/waitlist-flow"
import { useWaitlist } from "@/features/transcription/useWaitlist"
import { CleanupHeroDiff } from "@/components/landing/cleanup/cleanup-hero-diff"
import { CleanupHowItWorks } from "@/components/landing/cleanup/cleanup-how-it-works"
import { CleanupFeatures } from "@/components/landing/cleanup/cleanup-features"
import { CleanupFAQ } from "@/components/landing/cleanup/cleanup-faq"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { MotionDiv } from "@/components/motion"
import { useAnimationVariants } from "@/lib/animation-variants"
import { useHashOnScroll } from "@/lib/useHashOnScroll"

export default function CleanupLandingPage() {
  const t = useTranslations('cleanupLanding')
  const tNav = useTranslations('navigation')
  const tRoot = useTranslations()

  // Animation variants (respects prefers-reduced-motion)
  const {
    heroTitle,
    heroSubtitle,
    heroCta,
    heroNote,
    fadeUp,
  } = useAnimationVariants()

  // Update URL hash based on visible section
  useHashOnScroll()

  // Header scroll state
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const mainElement = document.querySelector('main')
    if (!mainElement) return

    const handleScroll = () => {
      setIsScrolled(mainElement.scrollTop > 100)
    }

    mainElement.addEventListener('scroll', handleScroll, { passive: true })
    return () => mainElement.removeEventListener('scroll', handleScroll)
  }, [])

  // Waitlist modal state
  const [waitlistState, setWaitlistState] = useState<"hidden" | "toast" | "form" | "success">("hidden")
  const [waitlistType, setWaitlistType] = useState<"extended_usage" | "api_access" | "conversation_intelligence">("extended_usage")

  // Form fields
  const [useCase, setUseCase] = useState("")
  const [volume, setVolume] = useState("")
  const [source, setSource] = useState("")
  const [languagePreference, setLanguagePreference] = useState("")
  const [languagePreferenceOther, setLanguagePreferenceOther] = useState("")

  // Hook for API integration
  const waitlist = useWaitlist({
    waitlistType,
    sourcePage: '/cleanup'
  })

  const handleWaitlistClick = useCallback((type: "extended_usage" | "api_access" | "conversation_intelligence" = "extended_usage") => {
    setWaitlistType(type)
    setWaitlistState("form")
  }, [])

  const handleWaitlistSubmit = useCallback(async () => {
    const langPref = languagePreference === "other"
      ? `other: ${languagePreferenceOther}`
      : languagePreference
    await waitlist.submit({ useCase, volume, source, languagePreference: langPref })
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
            <Link href="/" className="text-white/80 hover:text-white text-[15px] font-medium transition-colors">
              {tNav('home')}
            </Link>
            <Link href="#features" className="text-white/80 hover:text-white text-[15px] font-medium transition-colors">
              {tNav('features')}
            </Link>
            <Link
              href="/api-docs"
              className="text-white/80 hover:text-white text-[15px] font-medium transition-colors"
            >
              {tNav('apiDocs')}
            </Link>
          </div>
          <div className="flex gap-10 items-center ml-12">
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
          <div className="flex-1 text-center lg:text-left">
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
              <h1 className="text-4xl md:text-5xl lg:text-[56px] font-extrabold text-white mb-6 leading-[1.1] tracking-[-0.03em]">
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
              <p className="text-[17px] text-white/75 mb-8 leading-[1.7] max-w-[540px] mx-auto lg:mx-0">
                {t('hero.subtitle')}
              </p>
            </MotionDiv>
            <MotionDiv
              variants={heroCta}
              initial="hidden"
              animate="visible"
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6"
            >
              <button
                onClick={() => handleWaitlistClick("extended_usage")}
                className="inline-block bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white px-8 py-4 rounded-xl font-semibold text-[17px] transition-all hover:-translate-y-0.5 shadow-[0_8px_32px_rgba(56,189,248,0.3)] hover:shadow-[0_12px_40px_rgba(56,189,248,0.4)]"
              >
                {t('hero.ctaSecondary')}
              </button>
              <Link
                href="/demo?tab=text"
                className="inline-block px-8 py-4 border border-transparent [background:linear-gradient(135deg,#0F172A,#1E3A5F)_padding-box,linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)_border-box] hover:[background:linear-gradient(135deg,#1a2744,#264a6e)_padding-box,linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)_border-box] text-white rounded-xl font-semibold text-[17px] transition-all text-center"
              >
                {t('hero.cta')}
              </Link>
            </MotionDiv>
            <MotionDiv
              variants={heroNote}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center lg:items-start gap-3"
            >
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Shield className="w-4 h-4 opacity-70" />
                {t('hero.noSignup')}
              </div>
              <Link
                href="/demo"
                className="flex items-center gap-2 text-sm text-white/50 hover:text-[#38BDF8] transition-colors"
              >
                <Mic className="w-4 h-4" />
                {t('hero.audioLink')}
              </Link>
            </MotionDiv>
          </div>

          {/* Right column - Diff example */}
          <div className="flex-[0_0_50%] max-w-full lg:max-w-[50%]">
            <MotionDiv
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <CleanupHeroDiff />
            </MotionDiv>
          </div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="px-8 md:px-16 py-10 bg-slate-50 border-b border-slate-200">
        <p className="max-w-[720px] mx-auto text-[17px] text-slate-700 leading-[1.7] text-center">
          {t('intro.text')}
        </p>
      </section>

      {/* How It Works Section */}
      <CleanupHowItWorks />

      {/* Features Section */}
      <CleanupFeatures />

      {/* FAQ Section */}
      <CleanupFAQ onWaitlistClick={() => handleWaitlistClick("extended_usage")} />

      {/* Final CTA Section */}
      <section className="snap-start snap-always px-8 md:px-16 py-24 bg-[linear-gradient(135deg,#0F172A_0%,#1E3A5F_100%)] relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute top-[-50%] right-[-20%] w-[60%] h-[200%] bg-[radial-gradient(ellipse,rgba(56,189,248,0.1)_0%,transparent_60%)] pointer-events-none" />

        <MotionDiv
          className="max-w-[600px] mx-auto text-center relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <MotionDiv variants={fadeUp}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <h2 className="text-3xl md:text-[40px] font-extrabold text-white">
                {t('finalCta.title')}
              </h2>
              <span className="hidden sm:block text-white/20 text-3xl font-light">|</span>
              <span className="text-base text-white/70 text-center sm:text-left">
                <strong className="font-semibold text-white">{t('finalCta.foundingPricingLine1Bold')}</strong> {t('finalCta.foundingPricingLine1Suffix')}<br />
                <strong className="font-semibold text-white">{t('finalCta.foundingPricingLine2Bold')}</strong> {t('finalCta.foundingPricingLine2Suffix')}
              </span>
            </div>
          </MotionDiv>

          <MotionDiv variants={fadeUp}>
            <p className="text-lg text-white/70 mb-8">
              {t('finalCta.subtitle')}
            </p>
          </MotionDiv>

          <MotionDiv variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={() => handleWaitlistClick("extended_usage")}
              className="inline-block bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] text-white px-8 py-4 rounded-xl font-semibold text-[17px] transition-all hover:-translate-y-0.5 shadow-[0_8px_32px_rgba(56,189,248,0.3)] hover:shadow-[0_12px_40px_rgba(56,189,248,0.4)]"
            >
              {t('finalCta.ctaSecondary')}
            </button>
            <Link
              href="/demo?tab=text"
              className="inline-block px-8 py-4 border border-transparent [background:linear-gradient(135deg,#0F172A,#1E3A5F)_padding-box,linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)_border-box] hover:[background:linear-gradient(135deg,#1a2744,#264a6e)_padding-box,linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)_border-box] text-white rounded-xl font-semibold text-[17px] transition-all text-center"
            >
              {t('finalCta.cta')}
            </Link>
          </MotionDiv>

          <MotionDiv
            variants={fadeUp}
            className="flex flex-wrap justify-center gap-6 text-[13px] text-white/50"
          >
            <span>{t('finalCta.trustBadges.gdpr')}</span>
            <span>{t('finalCta.trustBadges.encrypted')}</span>
            <span>{t('finalCta.trustBadges.noTraining')}</span>
          </MotionDiv>
        </MotionDiv>
      </section>

      {/* Footer */}
      <footer className="px-8 md:px-16 py-8 bg-[#0F172A] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="text-sm text-white/50">{t('footer.copyright', { year: new Date().getFullYear() })}</span>
          <span className="text-[13px] text-white/40">{t('footer.builtIn')}</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          <Link href="/" className="text-sm text-white/50 hover:text-white/90 transition-colors">
            {tNav('home')}
          </Link>
          <Link href="/privacy" className="text-sm text-white/50 hover:text-white/90 transition-colors">
            {t('footer.privacy')}
          </Link>
          <Link href="/terms" className="text-sm text-white/50 hover:text-white/90 transition-colors">
            {t('footer.terms')}
          </Link>
          <Link href="/api-docs" className="text-sm text-white/50 hover:text-white/90 transition-colors">
            {tNav('apiDocs')}
          </Link>
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
