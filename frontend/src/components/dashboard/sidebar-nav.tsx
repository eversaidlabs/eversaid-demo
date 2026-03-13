'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { useAuth } from '@/features/auth/hooks'
import { cn } from '@/lib/utils'

interface SidebarNavProps {
  onItemClick?: () => void
}

export function SidebarNav({ onItemClick }: SidebarNavProps) {
  const t = useTranslations('dashboard')
  const tAdmin = useTranslations('admin')
  const pathname = usePathname()
  const { user } = useAuth()

  // Extract locale from pathname
  const localeMatch = pathname.match(/^\/(en|sl)/)
  const locale = localeMatch ? localeMatch[1] : 'en'

  // Determine active section
  const isAudioActive = pathname.includes('/audio')
  const isTextActive = pathname.includes('/text')
  const isAdminUsersActive = pathname.includes('/admin/users')

  const isPlatformAdmin = user?.role === 'platform_admin'

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

      {/* Admin section - only for platform admins */}
      {isPlatformAdmin && (
        <div>
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            {tAdmin('sidebar.admin')}
          </div>
          <div className="space-y-1">
            <NavItem
              href={`/${locale}/admin/users`}
              icon={<UsersIcon />}
              label={tAdmin('sidebar.users')}
              isActive={isAdminUsersActive}
              onClick={onItemClick}
            />
          </div>
        </div>
      )}
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

function UsersIcon() {
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
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  )
}
