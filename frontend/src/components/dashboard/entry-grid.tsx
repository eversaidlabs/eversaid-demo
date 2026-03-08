'use client'

import type { ReactNode } from 'react'

interface EntryGridProps {
  children: ReactNode
}

/**
 * Responsive grid layout for entry cards.
 * Uses auto-fill with minmax(300px, 1fr) for responsive columns.
 */
export function EntryGrid({ children }: EntryGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  )
}
