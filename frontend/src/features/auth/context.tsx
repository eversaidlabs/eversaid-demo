'use client'

/**
 * Authentication context for dashboard users.
 *
 * Provides:
 * - User/tenant state
 * - Login/logout functions
 * - Auto-redirect on password_change_required
 * - Token refresh on mount
 */

import { useRouter, usePathname } from 'next/navigation'
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { getAccessToken, isTokenExpired } from '@/lib/auth'

import {
  getMe,
  login as apiLogin,
  logout as apiLogout,
  refreshTokens,
  AuthError,
} from './api'
import {
  ANONYMOUS_TENANT_ID,
  type AuthState,
  type LoginRequest,
  type Tenant,
  type User,
} from './types'

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/change-password']

// Check if a path is public (doesn't need auth)
function isPublicPath(pathname: string): boolean {
  // Remove locale prefix for comparison
  const pathWithoutLocale = pathname.replace(/^\/(en|sl)/, '')
  return PUBLIC_PATHS.some((p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(p + '/'))
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<{ passwordChangeRequired: boolean }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<User | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAuthenticated = user !== null
  const isAnonymous = user?.tenant_id === ANONYMOUS_TENANT_ID

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true

    async function initAuth() {
      const token = getAccessToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      // Check if token is expired and try to refresh
      if (isTokenExpired(token)) {
        const refreshed = await refreshTokens()
        if (!refreshed) {
          setIsLoading(false)
          return
        }
      }

      // Fetch user info
      try {
        const me = await getMe()
        if (mounted) {
          setUser(me.user)
          setTenant(me.tenant)

          // If password change required, redirect to change-password
          if (me.user.password_change_required && !isPublicPath(pathname)) {
            // Extract locale from pathname
            const localeMatch = pathname.match(/^\/(en|sl)/)
            const locale = localeMatch ? localeMatch[1] : 'en'
            router.replace(`/${locale}/change-password`)
          }
        }
      } catch (_err) {
        if (mounted) {
          // Token invalid or expired
          setUser(null)
          setTenant(null)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initAuth()

    return () => {
      mounted = false
    }
  }, [pathname, router])

  // Login handler
  const login = useCallback(
    async (credentials: LoginRequest): Promise<{ passwordChangeRequired: boolean }> => {
      setError(null)
      setIsLoading(true)

      try {
        const tokenResponse = await apiLogin(credentials)

        // Fetch user info after login
        const me = await getMe()
        setUser(me.user)
        setTenant(me.tenant)

        return { passwordChangeRequired: tokenResponse.password_change_required }
      } catch (err) {
        const message = err instanceof AuthError ? err.message : 'Login failed'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // Logout handler
  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await apiLogout()
    } finally {
      setUser(null)
      setTenant(null)
      setIsLoading(false)

      // Extract locale and redirect to login
      const localeMatch = pathname.match(/^\/(en|sl)/)
      const locale = localeMatch ? localeMatch[1] : 'en'
      router.replace(`/${locale}/login`)
    }
  }, [pathname, router])

  // Refresh user info
  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe()
      setUser(me.user)
      setTenant(me.tenant)
    } catch (_err) {
      // If refresh fails, user might be logged out
      setUser(null)
      setTenant(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      tenant,
      isLoading,
      isAuthenticated,
      isAnonymous,
      error,
      login,
      logout,
      refreshUser,
    }),
    [user, tenant, isLoading, isAuthenticated, isAnonymous, error, login, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
