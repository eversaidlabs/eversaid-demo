'use client'

import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'
import { acceptTerms, getMe, AuthError } from '@/features/auth/api'
import { getAccessToken } from '@/lib/auth'

export default function AcceptTermsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const t = useTranslations('auth')
  const router = useRouter()

  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTermsUpdate, setIsTermsUpdate] = useState(false)

  // Check if user is authenticated and needs to accept terms
  useEffect(() => {
    async function checkAuth() {
      const token = getAccessToken()
      if (!token) {
        router.replace(`/${locale}/login`)
        return
      }

      try {
        const me = await getMe()

        // If password change is required, redirect there first
        if (me.user.password_change_required) {
          router.replace(`/${locale}/change-password`)
          return
        }

        // If terms already accepted (current version), redirect to dashboard
        if (!me.terms_acceptance_required) {
          router.replace(`/${locale}/audio`)
          return
        }

        // Check if this is a re-acceptance (user has accepted before)
        if (me.user.terms_accepted_at) {
          setIsTermsUpdate(true)
        }
      } catch {
        router.replace(`/${locale}/login`)
      }
    }

    checkAuth()
  }, [locale, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await acceptTerms()

      // Redirect to dashboard after successful acceptance
      router.push(`/${locale}/audio`)
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message)
      } else {
        setError(t('acceptTerms.error'))
      }
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Logo */}
          <Link href={`/${locale}`} className="mx-auto mb-4">
            <Logo size="md" variant="dark" />
          </Link>
          <CardTitle className="text-xl">
            {isTermsUpdate ? t('acceptTerms.updateTitle') : t('acceptTerms.title')}
          </CardTitle>
          <CardDescription>
            {isTermsUpdate ? t('acceptTerms.updateSubtitle') : t('acceptTerms.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                {isTermsUpdate ? t('acceptTerms.updateDescription') : t('acceptTerms.description')}
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

            <label className="flex cursor-pointer items-start gap-3">
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

            <Button
              type="submit"
              className="w-full"
              disabled={!accepted || isLoading}
            >
              {isLoading ? t('acceptTerms.accepting') : t('acceptTerms.accept')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
