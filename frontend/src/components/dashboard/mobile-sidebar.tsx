'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

import { cn, getLandingUrl } from '@/lib/utils'
import { Logo } from '@/components/ui/logo'
import { Sidebar } from './sidebar'

/**
 * Mobile sidebar with hamburger menu.
 * Shows hamburger button at top-left, slides in sidebar on click.
 */
export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Extract locale from pathname
  const localeMatch = pathname.match(/^\/(en|sl)/)
  const locale = localeMatch ? localeMatch[1] : 'en'

  return (
    <>
      {/* Mobile header with hamburger and logo */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center gap-3 bg-slate-50 px-4 py-3 md:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="flex size-10 items-center justify-center rounded-lg bg-slate-900 text-white shadow-lg"
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
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <a href={`${getLandingUrl()}/${locale}`}>
          <Logo size="sm" variant="dark" />
        </a>
      </div>

      {/* Overlay */}
      <div
        onClick={() => setIsOpen(false)}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar onClose={() => setIsOpen(false)} />
      </div>
    </>
  )
}
