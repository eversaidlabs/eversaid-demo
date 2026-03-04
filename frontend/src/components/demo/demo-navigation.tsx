'use client'

import { Link } from "@/i18n/routing"
import { useTranslations } from 'next-intl'
import { Bell } from "lucide-react"
import { LanguageSwitcher } from "@/components/ui/language-switcher"

export interface DemoNavigationProps {
  currentPage?: "demo" | "features" | "api"
  onWaitlistClick?: () => void
}

export function DemoNavigation({ currentPage = "demo", onWaitlistClick }: DemoNavigationProps) {
  const t = useTranslations('navigation')

  return (
    <nav className="sticky top-0 z-[100] flex justify-between items-center px-8 md:px-12 py-4 bg-[linear-gradient(135deg,#0F172A_0%,#1E3A5F_50%,#0F172A_100%)]">
      <Link href="/" className="flex items-center gap-2.5">
        <img src="/logo.svg" alt="EverSaid logo" className="h-8 w-auto" />
        <span className="font-[family-name:var(--font-comfortaa)] font-bold text-[22px] text-white tracking-[0.01em]">
          EverSaid
        </span>
      </Link>

      <div className="hidden md:flex gap-8 items-center">
        <Link
          href="/demo"
          className={`text-sm font-medium transition-colors ${
            currentPage === "demo"
              ? "text-white relative pb-2 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] after:rounded-[1px]"
              : "text-white/70 hover:text-white"
          }`}
        >
          {t('demo')}
        </Link>
        <Link
          href="/#features"
          className={`text-sm font-medium transition-colors ${
            currentPage === "features" ? "text-white" : "text-white/70 hover:text-white"
          }`}
        >
          {t('features')}
        </Link>
        <Link
          href="/api-docs"
          className={`text-sm font-medium transition-colors ${
            currentPage === "api"
              ? "text-white relative pb-2 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)] after:rounded-[1px]"
              : "text-white/70 hover:text-white"
          }`}
        >
          {t('apiDocs')}
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {onWaitlistClick && (
          <button
            onClick={onWaitlistClick}
            className="p-2.5 md:px-4 md:py-2 border border-transparent [background:linear-gradient(135deg,#0F172A,#1E3A5F)_padding-box,linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)_border-box] hover:[background:linear-gradient(135deg,#1a2744,#264a6e)_padding-box,linear-gradient(135deg,#38BDF8_0%,#A855F7_100%)_border-box] text-white rounded-lg text-[13px] font-semibold transition-all"
            aria-label={t('getEarlyAccess')}
          >
            <Bell className="w-5 h-5 md:hidden" />
            <span className="hidden md:inline">{t('getEarlyAccess')}</span>
          </button>
        )}
        <LanguageSwitcher />
      </div>
    </nav>
  )
}
