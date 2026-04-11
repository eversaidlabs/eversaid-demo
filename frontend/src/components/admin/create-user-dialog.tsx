'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getTenants } from '@/features/admin/api'
import type {
  AdminTenant,
  CreateUserRequest,
  CreateUserResponse,
} from '@/features/admin/types'
import type { UserRole } from '@/features/auth/types'

interface CreateUserDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: CreateUserRequest) => Promise<CreateUserResponse | null>
  isLoading?: boolean
  error?: string | null
}

const ROLES: { value: UserRole; labelKey: string }[] = [
  { value: 'tenant_user', labelKey: 'tenantUser' },
  { value: 'tenant_admin', labelKey: 'tenantAdmin' },
  { value: 'platform_admin', labelKey: 'platformAdmin' },
]

/**
 * Dialog for creating a new user.
 * Uses a separate inner component that unmounts when dialog closes,
 * ensuring form state is reset on each open.
 */
export function CreateUserDialog({
  isOpen,
  onClose,
  onCreate,
  isLoading,
  error,
}: CreateUserDialogProps) {
  // Handle escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => !isLoading && onClose()}
      />

      {/* Dialog - inner component resets state on each mount */}
      <CreateUserDialogContent
        onClose={onClose}
        onCreate={onCreate}
        isLoading={isLoading}
        error={error}
      />
    </>
  )
}

interface CreateUserDialogContentProps {
  onClose: () => void
  onCreate: (data: CreateUserRequest) => Promise<CreateUserResponse | null>
  isLoading?: boolean
  error?: string | null
}

type DialogView = 'form' | 'success'

/**
 * Inner dialog content component.
 * State is reset when this component unmounts (when dialog closes).
 */
function CreateUserDialogContent({
  onClose,
  onCreate,
  isLoading,
  error,
}: CreateUserDialogContentProps) {
  const t = useTranslations('admin.users')

  // Dialog view state
  const [view, setView] = useState<DialogView>('form')
  const [createdResponse, setCreatedResponse] =
    useState<CreateUserResponse | null>(null)

  // Form state
  const [email, setEmail] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [role, setRole] = useState<UserRole>('tenant_user')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Tenants state
  const [tenants, setTenants] = useState<AdminTenant[]>([])
  const [tenantsLoading, setTenantsLoading] = useState(true)

  // Copy state
  const [copied, setCopied] = useState(false)

  // Fetch tenants on mount
  useEffect(() => {
    getTenants()
      .then((data) => {
        setTenants(data)
        if (data.length > 0) {
          setTenantId(data[0].id)
        }
      })
      .catch(() => {
        // Tenants will be empty, backend will use default
      })
      .finally(() => setTenantsLoading(false))
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const data: CreateUserRequest = {
        email,
        role,
        ...(password && { password }),
        ...(tenantId && { tenant_id: tenantId }),
      }

      const response = await onCreate(data)
      if (response) {
        setCreatedResponse(response)
        setView('success')
      }
    },
    [email, role, password, tenantId, onCreate]
  )

  const handleCopyPassword = useCallback(async () => {
    if (createdResponse?.temporary_password) {
      await navigator.clipboard.writeText(createdResponse.temporary_password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [createdResponse])

  const isFormValid = email.trim()

  return (
    <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
      {view === 'form' ? (
        <>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            {t('createUserDialog.title')}
          </h2>
          <p className="mb-6 text-sm text-slate-500">
            {t('createUserDialog.description')}
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Email */}
              <div>
                <Label htmlFor="create-email">
                  {t('createUserDialog.email')}
                </Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder={t('createUserDialog.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="mt-1.5"
                  autoFocus
                  autoComplete="off"
                />
              </div>

              {/* Tenant dropdown */}
              <div>
                <Label htmlFor="create-tenant">
                  {t('createUserDialog.tenant')}
                </Label>
                <select
                  id="create-tenant"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  disabled={isLoading || tenantsLoading}
                  className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tenantsLoading ? (
                    <option>{t('createUserDialog.loadingTenants')}</option>
                  ) : (
                    tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Role dropdown */}
              <div>
                <Label htmlFor="create-role">
                  {t('createUserDialog.role')}
                </Label>
                <select
                  id="create-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  disabled={isLoading}
                  className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {t(`createUserDialog.roles.${r.labelKey}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Password (optional) */}
              <div>
                <Label htmlFor="create-password">
                  {t('createUserDialog.password')}
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    ({t('createUserDialog.optional')})
                  </span>
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="create-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('createUserDialog.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {t('createUserDialog.passwordHint')}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                {t('createUserDialog.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading || !isFormValid}>
                {isLoading
                  ? t('createUserDialog.creating')
                  : t('createUserDialog.create')}
              </Button>
            </div>
          </form>
        </>
      ) : (
        /* Success view */
        <>
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-green-100">
            <Check className="size-6 text-green-600" />
          </div>

          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            {t('createUserDialog.successTitle')}
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            {t('createUserDialog.successDescription', {
              email: createdResponse?.user.email ?? '',
            })}
          </p>

          {/* Temporary password display */}
          <div className="mb-6 rounded-lg bg-amber-50 p-4">
            <p className="mb-2 text-sm font-medium text-amber-800">
              {t('createUserDialog.temporaryPassword')}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm text-slate-900">
                {createdResponse?.temporary_password}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPassword}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="mr-1 size-4" />
                    {t('createUserDialog.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 size-4" />
                    {t('createUserDialog.copy')}
                  </>
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-amber-700">
              {t('createUserDialog.passwordWarning')}
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>{t('createUserDialog.done')}</Button>
          </div>
        </>
      )}
    </div>
  )
}
