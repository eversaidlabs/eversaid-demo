'use client'

import { useTranslations } from 'next-intl'

import type { AdminUser } from '@/features/admin/types'

import { UserRow } from './user-row'

interface UserTableProps {
  users: AdminUser[]
  onEditQuota: (user: AdminUser) => void
}

/**
 * Table displaying all users for platform admin.
 */
export function UserTable({ users, onEditQuota }: UserTableProps) {
  const t = useTranslations('admin.users')

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-500">{t('noUsers')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="whitespace-nowrap py-3 pl-4 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('table.email')}
              </th>
              <th className="whitespace-nowrap py-3 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('table.tenant')}
              </th>
              <th className="hidden whitespace-nowrap py-3 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">
                {t('table.role')}
              </th>
              <th className="hidden whitespace-nowrap py-3 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">
                {t('table.registered')}
              </th>
              <th className="whitespace-nowrap py-3 pr-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('table.quota')}
              </th>
              <th className="whitespace-nowrap py-3 pl-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="sr-only">{t('table.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onEditQuota={onEditQuota}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
