'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { acceptTerms, AuthError } from '@/features/auth/api'

export interface TermsAcceptanceModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Whether this is a terms update (user has accepted before) */
  isTermsUpdate?: boolean
  /** Called after successful acceptance */
  onAccept: () => void
  /** Current locale for links */
  locale: string
}

/**
 * Modal overlay for accepting terms of service.
 *
 * Displays over the dashboard with a blurred backdrop. Cannot be dismissed
 * without accepting terms (enforced by backend 403 on API calls).
 */
export function TermsAcceptanceModal({
  isOpen,
  isTermsUpdate = false,
  onAccept,
  locale,
}: TermsAcceptanceModalProps) {
  const t = useTranslations('auth')
  const shouldReduceMotion = useReducedMotion()

  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await acceptTerms()
      onAccept()
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message)
      } else {
        setError(t('acceptTerms.error'))
      }
      setIsLoading(false)
    }
  }

  // Animation variants - use inline props instead of variants for simpler typing

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop with blur */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? undefined : { duration: 0.2 }}
          />

          {/* Modal card */}
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white/95 shadow-2xl backdrop-blur-sm"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={shouldReduceMotion ? undefined : { duration: 0.2, ease: "easeOut" }}
          >
            <form onSubmit={handleSubmit} className="p-6">
              {/* Logo */}
              <div className="mb-6 text-center">
                <Logo size="md" variant="dark" />
              </div>

              {/* Title */}
              <h2
                id="terms-modal-title"
                className="mb-2 text-center text-xl font-semibold text-slate-900"
              >
                {isTermsUpdate
                  ? t('acceptTerms.updateTitle')
                  : t('acceptTerms.title')}
              </h2>

              {/* Subtitle */}
              <p className="mb-6 text-center text-sm text-slate-600">
                {isTermsUpdate
                  ? t('acceptTerms.updateSubtitle')
                  : t('acceptTerms.subtitle')}
              </p>

              {/* Error message */}
              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Description and links */}
              <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  {isTermsUpdate
                    ? t('acceptTerms.updateDescription')
                    : t('acceptTerms.description')}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <Link
                    href={`/${locale}/terms`}
                    target="_blank"
                    className="text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline"
                  >
                    {t('acceptTerms.terms')} &rarr;
                  </Link>
                  <Link
                    href={`/${locale}/privacy`}
                    target="_blank"
                    className="text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline"
                  >
                    {t('acceptTerms.privacy')} &rarr;
                  </Link>
                </div>
              </div>

              {/* Checkbox */}
              <label className="mb-6 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm text-slate-700">
                  {t('acceptTerms.checkbox')}
                </span>
              </label>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full"
                disabled={!accepted || isLoading}
              >
                {isLoading ? t('acceptTerms.accepting') : t('acceptTerms.accept')}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
