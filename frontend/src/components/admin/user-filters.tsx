'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { QuotaStatus, UserFilters } from '@/features/admin/types'

interface UserFiltersComponentProps {
  filters: UserFilters
  onFiltersChange: (filters: UserFilters) => void
}

/**
 * Filters for the user list: email search, date range, quota status.
 */
export function UserFiltersComponent({
  filters,
  onFiltersChange,
}: UserFiltersComponentProps) {
  const t = useTranslations('admin.users')
  const [email, setEmail] = useState(filters.email || '')
  const [registeredAfter, setRegisteredAfter] = useState(
    filters.registeredAfter || ''
  )
  const [registeredBefore, setRegisteredBefore] = useState(
    filters.registeredBefore || ''
  )
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | ''>(
    filters.quotaStatus || ''
  )
  const [showAnonymous, setShowAnonymous] = useState(
    filters.showAnonymous || false
  )

  const handleApply = useCallback(() => {
    const newFilters: UserFilters = {}
    if (email) newFilters.email = email
    if (registeredAfter) newFilters.registeredAfter = registeredAfter
    if (registeredBefore) newFilters.registeredBefore = registeredBefore
    if (quotaStatus) newFilters.quotaStatus = quotaStatus
    if (showAnonymous) newFilters.showAnonymous = showAnonymous
    onFiltersChange(newFilters)
  }, [email, registeredAfter, registeredBefore, quotaStatus, showAnonymous, onFiltersChange])

  const handleClear = useCallback(() => {
    setEmail('')
    setRegisteredAfter('')
    setRegisteredBefore('')
    setQuotaStatus('')
    setShowAnonymous(false)
    onFiltersChange({})
  }, [onFiltersChange])

  const hasFilters =
    email || registeredAfter || registeredBefore || quotaStatus || showAnonymous

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-4">
        {/* Email search */}
        <div className="min-w-[200px] flex-1">
          <Label htmlFor="email-search" className="mb-1.5 block text-sm">
            {t('filters.email')}
          </Label>
          <Input
            id="email-search"
            type="text"
            placeholder={t('filters.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          />
        </div>

        {/* Date range */}
        <div className="min-w-[150px]">
          <Label htmlFor="date-after" className="mb-1.5 block text-sm">
            {t('filters.registeredAfter')}
          </Label>
          <Input
            id="date-after"
            type="date"
            value={registeredAfter}
            onChange={(e) => setRegisteredAfter(e.target.value)}
          />
        </div>

        <div className="min-w-[150px]">
          <Label htmlFor="date-before" className="mb-1.5 block text-sm">
            {t('filters.registeredBefore')}
          </Label>
          <Input
            id="date-before"
            type="date"
            value={registeredBefore}
            onChange={(e) => setRegisteredBefore(e.target.value)}
          />
        </div>

        {/* Quota status - Note: Client-side filtering only for MVP */}
        <div className="min-w-[140px]">
          <Label htmlFor="quota-status" className="mb-1.5 block text-sm">
            {t('filters.quotaStatus')}
          </Label>
          <select
            id="quota-status"
            value={quotaStatus}
            onChange={(e) => setQuotaStatus(e.target.value as QuotaStatus | '')}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{t('filters.allStatuses')}</option>
            <option value="ok">{t('quotaStatus.ok')}</option>
            <option value="warning">{t('quotaStatus.warning')}</option>
            <option value="critical">{t('quotaStatus.critical')}</option>
          </select>
        </div>

        {/* Show anonymous users checkbox */}
        <div className="flex h-9 items-center gap-2">
          <input
            type="checkbox"
            id="show-anonymous"
            checked={showAnonymous}
            onChange={(e) => setShowAnonymous(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <Label htmlFor="show-anonymous" className="text-sm font-normal">
            {t('filters.showAnonymous')}
          </Label>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={handleApply}>{t('filters.apply')}</Button>
          {hasFilters && (
            <Button variant="outline" onClick={handleClear}>
              {t('filters.clear')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
