'use client'

import { useState, useEffect, use } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/ui/logo'
import { login, AuthError, getMe, refreshTokens } from '@/features/auth/api'
import { ANONYMOUS_TENANT_ID } from '@/features/auth/types'
import { getAccessToken, getRefreshToken, isTokenExpired } from '@/lib/auth'

export default function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const t = useTranslations('auth')
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Check if user is already authenticated and redirect
  useEffect(() => {
    async function checkExistingAuth() {
      let token = getAccessToken()

      // No token at all - show login form
      if (!token) {
        setIsCheckingAuth(false)
        return
      }

      // If token is expired, try to refresh it
      if (isTokenExpired(token)) {
        const refreshToken = getRefreshToken()
        if (!refreshToken) {
          setIsCheckingAuth(false)
          return
        }

        const refreshed = await refreshTokens()
        if (!refreshed) {
          setIsCheckingAuth(false)
          return
        }

        // Get the new token
        token = getAccessToken()
        if (!token) {
          setIsCheckingAuth(false)
          return
        }
      }

      try {
        const me = await getMe()

        // Anonymous users should see the login form, not be redirected
        // They can enter real credentials to upgrade to a real account
        if (me.user.tenant_id === ANONYMOUS_TENANT_ID) {
          setIsCheckingAuth(false)
          return
        }

        if (me.user.password_change_required) {
          router.replace(`/${locale}/change-password`)
        } else {
          router.replace(`/${locale}/audio`)
        }
      } catch {
        // Token invalid, stay on login page
        setIsCheckingAuth(false)
      }
    }
    checkExistingAuth()
  }, [locale, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await login({ email, password })

      if (result.password_change_required) {
        router.push(`/${locale}/change-password`)
      } else {
        // Go to dashboard - terms acceptance is handled by overlay modal if needed
        router.push(`/${locale}/audio`)
      }
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message)
      } else {
        setError(t('login.error'))
      }
      setIsLoading(false)
    }
  }

  // Show loading state while checking existing auth
  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6">
          <Logo size="lg" variant="dark" />
          <div className="size-6 animate-spin rounded-full border-3 border-slate-200 border-t-sky-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          {/* Logo */}
          <Link href={`/${locale}`} className="mx-auto mb-4">
            <Logo size="md" variant="dark" />
          </Link>
          <CardTitle className="text-xl">{t('login.title')}</CardTitle>
          <CardDescription>{t('login.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
