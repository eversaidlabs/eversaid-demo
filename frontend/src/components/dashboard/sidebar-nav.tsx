'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

interface SidebarNavProps {
  onItemClick?: () => void
}

export function SidebarNav({ onItemClick }: SidebarNavProps) {
  const t = useTranslations('dashboard')
  const pathname = usePathname()

  // Extract locale from pathname
  const localeMatch = pathname.match(/^\/(en|sl)/)
  const locale = localeMatch ? localeMatch[1] : 'en'

  // Determine active section
  const isAudioActive = pathname.includes('/audio')
  const isTextActive = pathname.includes('/text')

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          {t('sidebar.content')}
        </div>
        <div className="space-y-1">
          <NavItem
            href={`/${locale}/audio`}
            icon={<MicrophoneIcon />}
            label={t('sidebar.audioTranscriptions')}
            isActive={isAudioActive}
            onClick={onItemClick}
          />
          <NavItem
            href={`/${locale}/text`}
            icon={<DocumentIcon />}
            label={t('sidebar.textCleanups')}
            isActive={isTextActive}
            onClick={onItemClick}
          />
        </div>
      </div>
    </div>
  )
}

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  badge?: number
  isActive?: boolean
  onClick?: () => void
}

function NavItem({ href, icon, label, badge, isActive, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/5 hover:text-white',
        isActive &&
          'bg-gradient-to-r from-sky-400/15 to-purple-500/15 text-white'
      )}
    >
      <span className="size-5">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
          {badge}
        </span>
      )}
    </Link>
  )
}

function MicrophoneIcon() {
  return (
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
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  )
}

function DocumentIcon() {
  return (
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
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )
}
