'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  formatDuration,
  formatNumber,
  isUnlimited,
  useUserStats,
} from '@/features/admin'
import type { AdminUser } from '@/features/admin/types'

import { QuotaBadge } from './quota-badge'

interface UserRowProps {
  user: AdminUser
  onEditQuota: (user: AdminUser) => void
}

/**
 * Table row for a user with lazy-loaded stats.
 */
export function UserRow({ user, onEditQuota }: UserRowProps) {
  const t = useTranslations('admin.users')
  const [showStats, setShowStats] = useState(false)

  // Lazy load stats when row is expanded
  const { stats, isLoading: statsLoading } = useUserStats({
    userId: user.id,
    enabled: showStats,
  })

  const formattedDate = new Date(user.created_at).toLocaleDateString()

  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50/50">
        {/* Email + Password Flag */}
        <td className="py-3 pl-4 pr-2">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-slate-900">{user.email}</span>
            {user.password_change_required && (
              <Badge
                variant="outline"
                className="w-fit border-amber-200 bg-amber-50 text-xs text-amber-700"
              >
                {t('passwordResetRequired')}
              </Badge>
            )}
          </div>
        </td>

        {/* Tenant */}
        <td className="py-3 pr-2">
          <span className="text-slate-600">{user.tenant_name}</span>
        </td>

        {/* Role */}
        <td className="hidden py-3 pr-2 md:table-cell">
          <Badge variant="secondary" className="capitalize">
            {user.role.replace('_', ' ')}
          </Badge>
        </td>

        {/* Registered */}
        <td className="hidden py-3 pr-2 sm:table-cell">
          <span className="text-sm text-slate-500">{formattedDate}</span>
        </td>

        {/* Quota Status */}
        <td className="py-3 pr-2">
          {stats ? (
            <QuotaBadge status={stats.overall_quota_status} />
          ) : showStats && statsLoading ? (
            <span className="text-sm text-slate-400">{t('loading')}</span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-slate-500"
              onClick={() => setShowStats(true)}
            >
              {t('loadStats')}
            </Button>
          )}
        </td>

        {/* Actions */}
        <td className="py-3 pl-2 pr-4 text-right">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditQuota(user)}
          >
            {t('editQuota')}
          </Button>
        </td>
      </tr>

      {/* Expanded stats row */}
      {showStats && stats && (
        <tr className="border-b border-slate-100 bg-slate-50/30">
          <td colSpan={6} className="px-4 py-3">
            <div className="flex flex-wrap gap-6 text-sm">
              {/* Entry counts */}
              <div>
                <span className="text-slate-500">{t('entries')}: </span>
                <span className="font-medium">
                  {stats.transcript_count} {t('transcripts')}, {stats.text_import_count} {t('textImports')}
                </span>
              </div>

              {/* Audio quota */}
              <div>
                <span className="text-slate-500">{t('audio')}: </span>
                <span className="font-medium">
                  {formatDuration(stats.transcription_seconds_used)} /{' '}
                  {isUnlimited(stats.transcription_seconds_limit)
                    ? t('unlimited')
                    : formatDuration(stats.transcription_seconds_limit)}
                </span>
              </div>

              {/* Text quota */}
              <div>
                <span className="text-slate-500">{t('text')}: </span>
                <span className="font-medium">
                  {formatNumber(stats.text_cleanup_words_used)} /{' '}
                  {isUnlimited(stats.text_cleanup_words_limit)
                    ? t('unlimited')
                    : formatNumber(stats.text_cleanup_words_limit)}{' '}
                  {t('words')}
                </span>
              </div>

              {/* Analysis quota */}
              <div>
                <span className="text-slate-500">{t('analyses')}: </span>
                <span className="font-medium">
                  {stats.analysis_count_used} /{' '}
                  {isUnlimited(stats.analysis_count_limit)
                    ? t('unlimited')
                    : stats.analysis_count_limit}
                </span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
