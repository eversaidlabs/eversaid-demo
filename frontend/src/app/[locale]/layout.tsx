import type React from "react"
import type { Metadata } from "next"
import { Inter, Comfortaa, DM_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { ConfigProvider } from "@/lib/config-context"
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { locales } from '@/i18n/config'
import { BASE_URL, getAlternates } from '@/lib/seo'
import "../globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["400", "500", "600", "700"] })

function OrganizationSchema() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'eversaid',
    url: BASE_URL,
    logo: `${BASE_URL}/icon.svg`,
    description:
      'AI-powered transcription cleanup you can review, refine, and trust.',
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  )
}

function SoftwareApplicationSchema() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'eversaid',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'AI-powered transcription cleanup. See every edit, verify against the original audio.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  )
}
const comfortaa = Comfortaa({ weight: "700", subsets: ["latin"], variable: "--font-comfortaa" })

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: 'eversaid | Smart transcription. AI listens. You decide.',
      template: '%s | eversaid',
    },
    description:
      'AI-powered cleanup you can review, refine, and trust. See every edit. Verify against the original audio.',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'sl' ? 'sl_SI' : 'en_US',
      siteName: 'eversaid',
      title: 'eversaid | Smart transcription. AI listens. You decide.',
      description:
        'AI-powered cleanup you can review, refine, and trust. See every edit. Verify against the original audio.',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'eversaid | Smart transcription. AI listens. You decide.',
      description:
        'AI-powered cleanup you can review, refine, and trust. See every edit. Verify against the original audio.',
      images: ['/og-image.png'],
    },
    alternates: getAlternates(locale),
    icons: {
      icon: [
        {
          url: '/icon-light-32x32.png',
          media: '(prefers-color-scheme: light)',
        },
        {
          url: '/icon-dark-32x32.png',
          media: '(prefers-color-scheme: dark)',
        },
        {
          url: '/icon.svg',
          type: 'image/svg+xml',
        },
      ],
      apple: '/apple-icon.png',
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  setRequestLocale(locale)

  const messages = await getMessages()

  return (
    <html lang={locale} className={`${inter.variable} ${comfortaa.variable} ${dmSans.variable}`}>
      <head>
        <OrganizationSchema />
        <SoftwareApplicationSchema />
      </head>
      <body className={`font-sans antialiased`}>
        <ConfigProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
            <Toaster />
          </NextIntlClientProvider>
        </ConfigProvider>
        <Analytics />
      </body>
    </html>
  )
}
