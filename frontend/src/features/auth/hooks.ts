'use client'

/**
 * Authentication hooks for dashboard users.
 */

import { useContext } from 'react'

import { AuthContext, type AuthContextValue } from './context'

/**
 * Hook to access authentication context.
 *
 * Must be used within an AuthProvider.
 *
 * @example
 * ```tsx
 * function ProfileButton() {
 *   const { user, logout, isLoading } = useAuth()
 *
 *   if (isLoading) return <Spinner />
 *   if (!user) return <LoginButton />
 *
 *   return (
 *     <div>
 *       <span>{user.email}</span>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

/**
 * Hook to get just the current user, throwing if not authenticated.
 *
 * Use this in components that should only render when authenticated.
 */
export function useRequiredAuth() {
  const auth = useAuth()

  if (!auth.user || !auth.tenant) {
    throw new Error('User not authenticated')
  }

  return {
    user: auth.user,
    tenant: auth.tenant,
    logout: auth.logout,
    refreshUser: auth.refreshUser,
  }
}
