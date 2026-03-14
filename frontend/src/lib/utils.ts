import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the landing page URL based on the current hostname.
 *
 * Maps app subdomains back to landing domains:
 * - app.eversaid.ai → https://eversaid.ai
 * - app-staging.eversaid.ai → https://staging.eversaid.ai
 * - localhost/other → empty string (relative, stays on same domain)
 */
export function getLandingUrl(): string {
  if (typeof window === 'undefined') return ''

  const hostname = window.location.hostname

  // Production: app.eversaid.ai → eversaid.ai
  if (hostname === 'app.eversaid.ai') {
    return 'https://eversaid.ai'
  }

  // Staging: app-staging.eversaid.ai → staging.eversaid.ai
  if (hostname === 'app-staging.eversaid.ai') {
    return 'https://staging.eversaid.ai'
  }

  // Development or other: stay on same domain
  return ''
}
