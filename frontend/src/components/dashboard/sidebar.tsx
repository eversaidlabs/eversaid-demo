'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/logo'
import { SidebarNav } from './sidebar-nav'
import { SidebarQuota } from './sidebar-quota'
import { SidebarUserCard } from './sidebar-user-card'

interface SidebarProps {
  className?: string
  onClose?: () => void
}

export function Sidebar({ className, onClose }: SidebarProps) {
  const pathname = usePathname()

  // Extract locale from pathname
  const localeMatch = pathname.match(/^\/(en|sl)/)
  const locale = localeMatch ? localeMatch[1] : 'en'

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-slate-900',
        className
      )}
    >
      {/* Header with logo */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <Link href={`/${locale}`}>
          <Logo size="md" variant="light" />
        </Link>
        {/* Close button for mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white md:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <SidebarNav onItemClick={onClose} />
      </nav>

      {/* New upload button */}
      <div className="px-3">
        <NewUploadButton locale={locale} onClose={onClose} />
      </div>

      {/* Footer with quota and user */}
      <div className="border-t border-white/10 p-4">
        <SidebarQuota />
        <SidebarUserCard />
      </div>
    </aside>
  )
}

function NewUploadButton({
  locale,
  onClose,
}: {
  locale: string
  onClose?: () => void
}) {
  const t = useTranslations('dashboard')
  const pathname = usePathname()

  // Determine which "new" page to link to based on current view
  const isTextView = pathname.includes('/text')
  const newHref = isTextView ? `/${locale}/text/new` : `/${locale}/audio/new`

  return (
    <Link
      href={newHref}
      onClick={onClose}
      className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-400 to-purple-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-400/40"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="size-[18px]"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      {isTextView ? t('sidebar.newText') : t('sidebar.newUpload')}
    </Link>
  )
}
