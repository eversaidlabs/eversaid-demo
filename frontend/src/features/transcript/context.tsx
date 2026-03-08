'use client'

import { createContext, useContext, type ReactNode } from 'react'

/**
 * Feature flags for transcript display components.
 * Controls which features are shown based on the usage context (demo vs dashboard).
 */
export interface TranscriptFeatures {
  /** Mode identifier: 'demo' for anonymous users, 'dashboard' for authenticated users */
  mode: 'demo' | 'dashboard'
  /** Show quota warnings in header (dashboard only, for authenticated users) */
  showQuotaWarnings: boolean
  /** Show upgrade/waitlist prompts (demo only, for conversion) */
  showUpgradePrompts: boolean
  /** Show feedback widget (both flows) */
  showFeedback: boolean
  /** Show entry history sidebar (demo only) */
  showEntryHistory: boolean
  /** Show demo warning banner (demo only) */
  showDemoWarning: boolean
  /** Allow deleting entries (demo has restrictions, dashboard allows all) */
  allowDelete: boolean
}

/**
 * Preset features for demo flow (anonymous users)
 */
export const DEMO_FEATURES: TranscriptFeatures = {
  mode: 'demo',
  showQuotaWarnings: false,
  showUpgradePrompts: true,
  showFeedback: true,
  showEntryHistory: true,
  showDemoWarning: true,
  allowDelete: true, // Demo entries can be deleted but are re-created
}

/**
 * Preset features for dashboard flow (authenticated users)
 */
export const DASHBOARD_FEATURES: TranscriptFeatures = {
  mode: 'dashboard',
  showQuotaWarnings: true,
  showUpgradePrompts: false,
  showFeedback: true,
  showEntryHistory: false,
  showDemoWarning: false,
  allowDelete: true,
}

const TranscriptContext = createContext<TranscriptFeatures | null>(null)

export interface TranscriptProviderProps {
  features: TranscriptFeatures
  children: ReactNode
}

/**
 * Provider for transcript feature flags.
 * Wrap transcript components with this to control feature visibility.
 *
 * @example
 * ```tsx
 * // Demo page
 * <TranscriptProvider features={DEMO_FEATURES}>
 *   <TranscriptComparisonLayout ... />
 * </TranscriptProvider>
 *
 * // Dashboard page
 * <TranscriptProvider features={DASHBOARD_FEATURES}>
 *   <EntryDetailContainer entryId={id} />
 * </TranscriptProvider>
 * ```
 */
export function TranscriptProvider({ features, children }: TranscriptProviderProps) {
  return (
    <TranscriptContext.Provider value={features}>
      {children}
    </TranscriptContext.Provider>
  )
}

/**
 * Hook to access transcript feature flags.
 * Must be used within a TranscriptProvider.
 *
 * @returns TranscriptFeatures object with all feature flags
 * @throws Error if used outside of TranscriptProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const features = useTranscriptFeatures()
 *
 *   return (
 *     <div>
 *       {features.showUpgradePrompts && <UpgradePrompt />}
 *       {features.showQuotaWarnings && <QuotaWarning />}
 *     </div>
 *   )
 * }
 * ```
 */
export function useTranscriptFeatures(): TranscriptFeatures {
  const context = useContext(TranscriptContext)
  if (!context) {
    throw new Error('useTranscriptFeatures must be used within a TranscriptProvider')
  }
  return context
}

/**
 * Optional hook that returns null if used outside provider.
 * Useful for components that work both standalone and within provider.
 */
export function useOptionalTranscriptFeatures(): TranscriptFeatures | null {
  return useContext(TranscriptContext)
}
