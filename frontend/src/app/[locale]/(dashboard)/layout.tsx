'use client'

import { useEffect, useMemo, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

import { AuthProvider } from '@/features/auth/context'
import { useAuth } from '@/features/auth/hooks'
import { Sidebar } from '@/components/dashboard/sidebar'
import { MobileSidebar } from '@/components/dashboard/mobile-sidebar'
import { TermsAcceptanceModal } from '@/components/dashboard/terms-acceptance-modal'
import { Logo } from '@/components/ui/logo'

/**
 * Check if the current path is an entry detail view (side-by-side).
 * These pages use full-screen layout and should hide the sidebar.
 */
function isEntryDetailPath(pathname: string): boolean {
  // Match /[locale]/audio/[id] or /[locale]/text/[id]
  // but not /[locale]/audio/new or /[locale]/text/new
  return /^\/(en|sl)\/(audio|text)\/(?!new)[^/]+$/.test(pathname)
}

/**
 * Dashboard layout wrapper that handles:
 * - Auth provider context
 * - Authentication check with redirect
 * - Sidebar navigation
 * - Mobile responsive layout
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  )
}

function DashboardContent({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, isAnonymous, user, termsAcceptanceRequired, refreshUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Extract locale from pathname
  const locale = useMemo(() => {
    const match = pathname.match(/^\/(en|sl)/)
    return match ? match[1] : 'en'
  }, [pathname])

  // Check if this is a terms update (user has accepted before but needs to re-accept)
  const isTermsUpdate = user?.terms_accepted_at !== null

  // Check if we're on an entry detail page (full-screen side-by-side view)
  const isFullscreenView = useMemo(() => isEntryDetailPath(pathname), [pathname])

  // Redirect to login if not authenticated, or to demo if anonymous user
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Extract locale from pathname
      const localeMatch = pathname.match(/^\/(en|sl)/)
      const locale = localeMatch ? localeMatch[1] : 'en'
      router.replace(`/${locale}/login`)
    } else if (!isLoading && isAnonymous) {
      // Anonymous users should use demo mode, not dashboard
      const localeMatch = pathname.match(/^\/(en|sl)/)
      const locale = localeMatch ? localeMatch[1] : 'en'
      router.replace(`/${locale}/demo`)
    }
  }, [isLoading, isAuthenticated, isAnonymous, pathname, router])

  // Redirect to change-password if password change required
  useEffect(() => {
    if (!isLoading && user?.password_change_required) {
      const localeMatch = pathname.match(/^\/(en|sl)/)
      const locale = localeMatch ? localeMatch[1] : 'en'
      router.replace(`/${locale}/change-password`)
    }
  }, [isLoading, user, pathname, router])

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6">
          <Logo size="lg" variant="dark" />
          <div className="size-6 animate-spin rounded-full border-3 border-slate-200 border-t-sky-500" />
        </div>
      </div>
    )
  }

  // Don't render if not authenticated or anonymous (will redirect)
  if (!isAuthenticated || isAnonymous) {
    return null
  }

  // Full-screen view: hide sidebar, no margins
  if (isFullscreenView) {
    return (
      <div className="min-h-screen bg-slate-50">
        {children}

        {/* Terms acceptance modal overlay */}
        <TermsAcceptanceModal
          isOpen={termsAcceptanceRequired}
          isTermsUpdate={isTermsUpdate}
          onAccept={refreshUser}
          locale={locale}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile sidebar */}
      <MobileSidebar />

      {/* Desktop sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Main content */}
      <main className="flex-1 md:ml-[260px]">
        <div className="p-6 pt-20 md:p-8 md:pt-8">{children}</div>
      </main>

      {/* Terms acceptance modal overlay */}
      <TermsAcceptanceModal
        isOpen={termsAcceptanceRequired}
        isTermsUpdate={isTermsUpdate}
        onAccept={refreshUser}
        locale={locale}
      />
    </div>
  )
}
