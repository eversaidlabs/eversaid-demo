'use client'

import { ApiReferenceReact } from '@scalar/api-reference-react'
import '@scalar/api-reference-react/style.css'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * Custom CSS theme for Scalar to match EverSaid's design system.
 *
 * Uses the navy/coral/white color palette with professional B2B styling.
 */
const EVERSAID_SCALAR_THEME = `
  /* Dark mode colors (default) */
  .dark-mode {
    --scalar-background-1: #0F172A;
    --scalar-background-2: #1E293B;
    --scalar-background-3: #334155;
    --scalar-color-1: #F8FAFC;
    --scalar-color-2: #E2E8F0;
    --scalar-color-3: #94A3B8;
    --scalar-color-accent: #38BDF8;
    --scalar-border-color: rgba(56, 189, 248, 0.2);
    --scalar-sidebar-background-1: #0F172A;
    --scalar-sidebar-color-1: #F8FAFC;
    --scalar-sidebar-color-2: #94A3B8;
    --scalar-button-1: #38BDF8;
    --scalar-button-1-color: #0F172A;
  }

  /* Light mode colors */
  .light-mode {
    --scalar-background-1: #FFFFFF;
    --scalar-background-2: #F8FAFC;
    --scalar-background-3: #F1F5F9;
    --scalar-color-1: #0F172A;
    --scalar-color-2: #334155;
    --scalar-color-3: #64748B;
    --scalar-color-accent: #0EA5E9;
    --scalar-border-color: #E2E8F0;
    --scalar-sidebar-background-1: #F8FAFC;
    --scalar-sidebar-color-1: #0F172A;
    --scalar-sidebar-color-2: #64748B;
    --scalar-button-1: #0EA5E9;
    --scalar-button-1-color: #FFFFFF;
  }

  /* Custom styling */
  .scalar-api-reference {
    font-family: var(--font-geist-sans), system-ui, sans-serif;
  }

  /* Hide the default Scalar header to use our custom hero */
  .scalar-api-reference .t-doc__header {
    display: none;
  }
`

/**
 * Scalar API Reference embed component with EverSaid theming.
 *
 * Shows the API documentation. Users can manually enter their API key
 * in Scalar's built-in authentication UI to test endpoints.
 */
export function ScalarEmbed() {
  return (
    <div className="scalar-embed-container">
      <ApiReferenceReact
        configuration={{
          url: `${API_BASE_URL}/api/openapi-public.json`,
          darkMode: true,
          theme: 'none',
          customCss: EVERSAID_SCALAR_THEME,
          layout: 'modern',
          hideModels: false,
          hideTestRequestButton: true,
          hideClientButton: true,
          hiddenClients: ['php', 'ruby', 'csharp', 'c', 'objc', 'ocaml'],
          defaultHttpClient: {
            targetKey: 'shell',
            clientKey: 'curl',
          },
          agent: { disabled: true },
        }}
      />
    </div>
  )
}
