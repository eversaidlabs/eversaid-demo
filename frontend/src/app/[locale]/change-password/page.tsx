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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changePassword, getMe, AuthError } from '@/features/auth/api'
import { getAccessToken } from '@/lib/auth'

export default function ChangePasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const t = useTranslations('auth')
  const router = useRouter()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Check if user is authenticated and needs password change
  useEffect(() => {
    async function checkAuth() {
      const token = getAccessToken()
      if (!token) {
        router.replace(`/${locale}/login`)
        return
      }

      try {
        const me = await getMe()
        setUserEmail(me.user.email)

        // If password change not required, redirect to dashboard
        if (!me.user.password_change_required) {
          router.replace(`/${locale}/audio`)
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

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError(t('changePassword.passwordMismatch'))
      return
    }

    // Validate password length
    if (newPassword.length < 8) {
      setError(t('changePassword.passwordTooShort'))
      return
    }

    setIsLoading(true)

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })

      // Redirect to dashboard after successful password change
      router.push(`/${locale}/audio`)
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message)
      } else {
        setError(t('changePassword.error'))
      }
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          {/* Logo */}
          <Link href={`/${locale}`} className="mx-auto mb-4 flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-to-br from-sky-400 to-purple-500" />
            <span className="font-logo text-xl font-bold text-slate-900">
              EverSaid
            </span>
          </Link>
          <CardTitle className="text-xl">{t('changePassword.title')}</CardTitle>
          <CardDescription>
            {t('changePassword.subtitle')}
            {userEmail && (
              <span className="mt-1 block font-medium text-slate-900">
                {userEmail}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">
                {t('changePassword.currentPassword')}
              </Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder={t('changePassword.currentPasswordPlaceholder')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">
                {t('changePassword.newPassword')}
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder={t('changePassword.newPasswordPlaceholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t('changePassword.confirmPassword')}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('changePassword.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? t('changePassword.submitting')
                : t('changePassword.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
