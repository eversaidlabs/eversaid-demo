'use client'

import { useTranslations } from 'next-intl'

import { useAuth } from '@/features/auth/hooks'

/**
 * User card in sidebar footer.
 * Shows email and logout button.
 */
export function SidebarUserCard() {
  const t = useTranslations('dashboard')
  const { user, logout } = useAuth()

  if (!user) return null

  // Get initials from email
  const initials = user.email
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-purple-500 text-xs font-semibold text-white">
        {initials}
      </div>

      {/* Email */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">
          {user.email}
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={() => logout()}
        title={t('sidebar.logout')}
        className="flex size-8 items-center justify-center rounded-md text-white/50 transition-all hover:bg-white/10 hover:text-white"
      >
        <LogoutIcon />
      </button>
    </div>
  )
}

function LogoutIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="size-[18px]"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  )
}
