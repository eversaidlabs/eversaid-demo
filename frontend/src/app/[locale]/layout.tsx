import type React from "react"
import type { Metadata } from "next"
import { Inter, Comfortaa, DM_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { ConfigProvider } from "@/lib/config-context"
import { MotionProvider } from "@/components/motion"
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
    name: 'EverSaid',
    url: BASE_URL,
    logo: `${BASE_URL}/icon-192x192.png`,
    description:
      'Transcribe audio or upload existing transcripts. Choose Clean or Edited cleanup and verify every change side-by-side against the original audio.',
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
    name: 'EverSaid',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Transcribe audio or upload existing transcripts. Choose Clean or Edited cleanup and verify every change side-by-side against the original audio.',
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
      default: 'EverSaid - Transcribe. Clean Up. Verify. All in One Place.',
      template: '%s | EverSaid',
    },
    description:
      'Transcribe audio or upload existing transcripts. Choose Clean or Edited cleanup and verify every change side-by-side against the original audio. All your sessions in one place.',
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
      siteName: 'EverSaid',
      title: 'EverSaid - Transcribe. Clean Up. Verify. All in One Place.',
      description:
        'Transcribe audio or upload existing transcripts. Choose Clean or Edited cleanup and verify every change side-by-side against the original audio. All your sessions in one place.',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'EverSaid - Transcribe. Clean Up. Verify. All in One Place.',
      description:
        'Transcribe audio or upload existing transcripts. Choose Clean or Edited cleanup and verify every change side-by-side against the original audio. All your sessions in one place.',
      images: ['/og-image.png'],
    },
    alternates: getAlternates(locale),
    icons: {
      icon: '/icon-192x192.png',
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
          <MotionProvider>
            <NextIntlClientProvider messages={messages}>
              {children}
              <Toaster />
            </NextIntlClientProvider>
          </MotionProvider>
        </ConfigProvider>
        <Analytics />
      </body>
    </html>
  )
}
