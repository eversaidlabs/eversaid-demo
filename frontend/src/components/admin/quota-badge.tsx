'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { QuotaStatus } from '@/features/admin/types'

interface QuotaBadgeProps {
  status: QuotaStatus
  className?: string
}

/**
 * Badge component for quota status.
 * - OK (green): >20% remaining
 * - Warning (amber): 5-20% remaining
 * - Critical (red): <5% remaining
 */
export function QuotaBadge({ status, className }: QuotaBadgeProps) {
  const t = useTranslations('admin.users')

  const statusStyles = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium capitalize',
        statusStyles[status],
        className
      )}
    >
      {t(`quotaStatus.${status}`)}
    </Badge>
  )
}
