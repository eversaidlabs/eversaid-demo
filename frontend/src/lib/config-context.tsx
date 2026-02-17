'use client'

import { createContext, useContext, useEffect, useState, Suspense, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'

interface Limits {
  maxAudioFileSizeMb: number
  maxAudioDurationSeconds: number
}

interface AppConfig {
  limits: Limits | null
}

const ConfigContext = createContext<AppConfig>({ limits: null })

interface ConfigProviderProps {
  children: ReactNode
}

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname && posthog.__loaded) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url += '?' + searchParams.toString()
      }
      posthog.capture('$pageview', { $current_url: url })
    }
  }, [pathname, searchParams])

  return null
}

/**
 * App configuration provider.
 *
 * Fetches config from /api/config at runtime to support the single Docker
 * image pattern (same build across staging/production with different env vars).
 * Also initializes PostHog analytics if configured.
 */
export function ConfigProvider({ children }: ConfigProviderProps) {
  const [limits, setLimits] = useState<Limits | null>(null)
  const [posthogInitialized, setPosthogInitialized] = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((config) => {
        // Set limits
        if (config.limits) {
          setLimits(config.limits)
        }

        // Initialize PostHog
        if (config.posthog?.key) {
          posthog.init(config.posthog.key, {
            api_host: config.posthog.host,
            ui_host: 'https://eu.posthog.com',
            capture_pageview: false,
            capture_pageleave: true,
            person_profiles: 'identified_only',
          })
          setPosthogInitialized(true)
        }
      })
      .catch((err) => {
        console.warn('Failed to load app config:', err)
      })
  }, [])

  return (
    <ConfigContext.Provider value={{ limits }}>
      {posthogInitialized && (
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
      )}
      {children}
    </ConfigContext.Provider>
  )
}

/**
 * Hook to access app configuration.
 *
 * Returns limits with fallback defaults when config hasn't loaded yet.
 */
export function useConfig() {
  return useContext(ConfigContext)
}