'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Plus } from 'lucide-react'

import { useAuth } from '@/features/auth/hooks'
import { useAdminUsers, useAdminUserActions, useCreateUser } from '@/features/admin'
import type { AdminUser, UserFilters } from '@/features/admin/types'
import { UserTable } from '@/components/admin/user-table'
import { UserFiltersComponent } from '@/components/admin/user-filters'
import { EditQuotaDialog } from '@/components/admin/edit-quota-dialog'
import { CreateUserDialog } from '@/components/admin/create-user-dialog'
import { Button } from '@/components/ui/button'

export default function AdminUsersPage() {
  const t = useTranslations('admin.users')
  const { user: currentUser, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Check if user is platform admin
  useEffect(() => {
    if (!authLoading && currentUser?.role !== 'platform_admin') {
      // Extract locale from pathname
      const localeMatch = pathname.match(/^\/(en|sl)/)
      const locale = localeMatch ? localeMatch[1] : 'en'
      router.replace(`/${locale}/audio`)
    }
  }, [authLoading, currentUser, pathname, router])

  const {
    users,
    total,
    isLoading,
    error,
    filters,
    setFilters,
    refresh,
    loadMore,
    hasMore,
  } = useAdminUsers()

  const { isUpdating, updateError, updateQuota, clearError } =
    useAdminUserActions()

  const {
    isCreating,
    createError,
    create,
    clearError: clearCreateError,
  } = useCreateUser()

  // Edit quota dialog state
  const [editQuotaOpen, setEditQuotaOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)

  // Create user dialog state
  const [createUserOpen, setCreateUserOpen] = useState(false)

  const handleOpenEditQuota = useCallback((user: AdminUser) => {
    setEditTarget(user)
    setEditQuotaOpen(true)
    clearError()
  }, [clearError])

  const handleCloseEditQuota = useCallback(() => {
    setEditQuotaOpen(false)
    setEditTarget(null)
  }, [])

  const handleSaveQuota = useCallback(
    async (userId: string, quota: Parameters<typeof updateQuota>[1]) => {
      const success = await updateQuota(userId, quota)
      if (success) {
        toast.success(t('toast.quotaUpdated'))
        refresh()
      }
      return success
    },
    [updateQuota, refresh, t]
  )

  const handleFiltersChange = useCallback(
    (newFilters: UserFilters) => {
      setFilters(newFilters)
    },
    [setFilters]
  )

  const handleOpenCreateUser = useCallback(() => {
    setCreateUserOpen(true)
    clearCreateError()
  }, [clearCreateError])

  const handleCloseCreateUser = useCallback(() => {
    setCreateUserOpen(false)
    // Refresh list after dialog closes (user may have been created)
    refresh()
  }, [refresh])

  const handleCreateUser = useCallback(
    async (data: Parameters<typeof create>[0]) => {
      const response = await create(data)
      if (response) {
        toast.success(t('toast.userCreated'))
      }
      return response
    },
    [create, t]
  )

  // Don't render if not platform admin
  if (authLoading || currentUser?.role !== 'platform_admin') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
      </div>
    )
  }

  // Loading state
  if (isLoading && users.length === 0) {
    return (
      <div>
        <PageHeader title={t('title')} />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" />
            <span className="text-sm text-slate-500">{t('loading')}</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div>
        <PageHeader title={t('title')} />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle', { count: total })} />

      {/* Add User button */}
      <div className="mb-6">
        <Button onClick={handleOpenCreateUser}>
          <Plus className="mr-2 size-4" />
          {t('addUser')}
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <UserFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </div>

      {/* User table */}
      <UserTable users={users} onEditQuota={handleOpenEditQuota} />

      {/* Load more button */}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? t('loadingMore') : t('loadMore')}
          </Button>
        </div>
      )}

      {/* Edit quota dialog */}
      <EditQuotaDialog
        isOpen={editQuotaOpen}
        user={editTarget}
        onClose={handleCloseEditQuota}
        onSave={handleSaveQuota}
        isLoading={isUpdating}
        error={updateError}
      />

      {/* Create user dialog */}
      <CreateUserDialog
        isOpen={createUserOpen}
        onClose={handleCloseCreateUser}
        onCreate={handleCreateUser}
        isLoading={isCreating}
        error={createError}
      />
    </div>
  )
}

function PageHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  )
}
