'use client'

import { Link } from '@/i18n/routing'
import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { WaitlistFlow } from '@/components/waitlist/waitlist-flow'
import { useWaitlist } from '@/features/transcription/useWaitlist'
import { ScalarEmbed } from './components/ScalarEmbed'

export default function ApiDocsPage() {
  const tNav = useTranslations('navigation')
  const tRoot = useTranslations()

  // Waitlist modal state
  const [waitlistState, setWaitlistState] = useState<'hidden' | 'toast' | 'form' | 'success'>('hidden')

  // Form fields (not managed by hook)
  const [useCase, setUseCase] = useState('')
  const [volume, setVolume] = useState('')
  const [source, setSource] = useState('')
  const [languagePreference, setLanguagePreference] = useState('')
  const [languagePreferenceOther, setLanguagePreferenceOther] = useState('')

  // Hook for API integration (always api_access for this page)
  const waitlist = useWaitlist({
    waitlistType: 'api_access',
    sourcePage: '/api-docs',
  })

  const handleWaitlistSubmit = useCallback(async () => {
    const langPref =
      languagePreference === 'other' ? `other: ${languagePreferenceOther}` : languagePreference
    await waitlist.submit({ useCase, volume, source, languagePreference: langPref })
    // Transition to success state - the hook handles errors internally with toasts
    setWaitlistState('success')
  }, [waitlist, useCase, volume, source, languagePreference, languagePreferenceOther])

  const handleWaitlistClose = useCallback(() => {
    setWaitlistState('hidden')
    setUseCase('')
    setVolume('')
    setSource('')
    setLanguagePreference('')
    setLanguagePreferenceOther('')
    waitlist.reset()
  }, [waitlist])

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <WaitlistFlow
        state={waitlistState}
        type="api_access"
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

      {/* Navigation */}
      <nav className="sticky top-0 z-50 flex justify-between items-center px-8 md:px-12 py-4 bg-[linear-gradient(135deg,#0F172A_0%,#1E3A5F_50%,#0F172A_100%)]">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="EverSaid logo" className="h-8 w-auto" />
          <span className="font-[family-name:var(--font-comfortaa)] font-bold text-[22px] text-white tracking-[0.01em]">
            eversaid
          </span>
        </Link>

        <div className="hidden md:flex gap-8 items-center">
          <Link
            href="/"
            className="text-white/70 hover:text-white text-sm font-medium transition-colors"
          >
            {tNav('home')}
          </Link>
          <Link
            href="/demo"
            className="text-white/70 hover:text-white text-sm font-medium transition-colors"
          >
            {tNav('demo')}
          </Link>
          <Link
            href="/api-docs"
            className="text-white text-sm font-medium relative pb-2 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] after:rounded-[1px]"
          >
            {tNav('apiDocs')}
          </Link>
        </div>

        <button
          onClick={() => setWaitlistState('form')}
          className="px-5 py-2.5 bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] hover:shadow-[0_4px_12px_rgba(56,189,248,0.3)] hover:-translate-y-px text-white text-sm font-semibold rounded-lg transition-all"
        >
          {tNav('joinWaitlist')}
        </button>
      </nav>

      {/* API Reference Section */}
      <section id="api-reference" className="bg-[#0F172A] min-h-[800px]">
        <ScalarEmbed />
      </section>

      {/* Footer CTA */}
      <div className="max-w-[1200px] mx-auto px-8 md:px-12 py-12">
        <div className="bg-[linear-gradient(135deg,#0F172A_0%,#1E3A5F_100%)] rounded-[20px] p-12 text-center">
          <h3 className="text-[28px] font-extrabold text-white mb-3">Ready to integrate?</h3>
          <p className="text-base text-white/70 mb-6">
            Join the waitlist to get API access and start building.
          </p>
          <button
            onClick={() => setWaitlistState('form')}
            className="inline-block px-8 py-4 bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] hover:shadow-[0_8px_24px_rgba(56,189,248,0.4)] hover:-translate-y-0.5 text-white text-base font-bold rounded-xl transition-all shadow-[0_4px_16px_rgba(56,189,248,0.3)]"
          >
            Join Waitlist
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0F172A] px-8 md:px-12 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <span className="text-[13px] text-white/60">© 2025 eversaid</span>
          <span className="text-[12px] text-white/40">Built in Slovenia · Independent & bootstrapped</span>
        </div>
        <div className="flex gap-6">
          <Link href="#" className="text-[13px] text-white/60 hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="#" className="text-[13px] text-white/60 hover:text-white transition-colors">
            Terms
          </Link>
          <Link href="#" className="text-[13px] text-white/60 hover:text-white transition-colors">
            Contact
          </Link>
        </div>
      </footer>
    </div>
  )
}
