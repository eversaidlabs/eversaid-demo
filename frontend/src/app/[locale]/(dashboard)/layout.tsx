'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

import { AuthProvider } from '@/features/auth/context'
import { useAuth } from '@/features/auth/hooks'
import { Sidebar } from '@/components/dashboard/sidebar'
import { MobileSidebar } from '@/components/dashboard/mobile-sidebar'

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
  const { isLoading, isAuthenticated, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Extract locale from pathname
      const localeMatch = pathname.match(/^\/(en|sl)/)
      const locale = localeMatch ? localeMatch[1] : 'en'
      router.replace(`/${locale}/login`)
    }
  }, [isLoading, isAuthenticated, pathname, router])

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
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
          <span className="text-sm text-slate-500">Loading...</span>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
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
    </div>
  )
}
