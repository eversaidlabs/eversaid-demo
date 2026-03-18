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
  const tCommon = useTranslations('common')
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
        <div className="flex flex-col items-center gap-8">
          <Logo size="lg" variant="dark" />
          <div className="flex flex-col items-center gap-4">
            <svg
              className="h-16 w-16 animate-spin text-slate-200"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                className="fill-sky-500"
              />
            </svg>
            <span className="text-sm font-medium text-slate-500">
              {tCommon('loading')}
            </span>
          </div>
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
