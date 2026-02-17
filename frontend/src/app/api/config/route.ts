import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

/**
 * Runtime config endpoint.
 *
 * Proxies to the backend's /api/config endpoint which returns configuration
 * that needs to be read at request time (not build time).
 * This supports the single Docker image pattern where the same build is used
 * across staging/production with different env vars.
 */
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/config`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch config from backend:', error)
    // Fallback to minimal config if backend is unavailable
    return NextResponse.json({
      posthog: {
        key: process.env.POSTHOG_KEY || '',
        host: process.env.POSTHOG_HOST || '/ingest',
      },
      limits: {
        maxAudioFileSizeMb: 50,
        maxAudioDurationSeconds: 180,
      },
    })
  }
}