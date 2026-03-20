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
    foundingLocation: {
      '@type': 'Place',
      name: 'Slovenia',
    },
    description:
      'AI transcription and cleanup platform with verification for professionals',
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

function WebApplicationSchema() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'EverSaid',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires a modern web browser',
    description:
      'EverSaid transcribes audio with high accuracy, then cleans up the transcript with AI. A side-by-side diff view shows every word the AI changed. Users can click any segment to hear the original audio, fix speaker labels, and edit or revert any change. Clean mode removes fillers and stutters. Edited mode for grammar and readability is coming soon.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      description: 'Free demo available without sign-up',
    },
    url: BASE_URL,
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

function FAQPageSchema() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is EverSaid?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'EverSaid is a GDPR-compliant platform that transcribes audio and cleans up the transcript with AI. You can verify the transcription by clicking any word to hear the original audio. The cleanup is fully transparent: you see what changed and can edit or revert anything.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is cleanup?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "After transcription, AI cleanup automatically removes filler words, stutters, false starts, and discourse markers while keeping your grammar and word choices intact. You get both versions: raw and cleaned, side by side in a diff view. An Edited mode that also fixes grammar and splits run-on sentences is coming soon.",
        },
      },
      {
        '@type': 'Question',
        name: 'What if I already have a transcript?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can paste or upload a text transcript directly, with or without speaker labels. EverSaid will clean it up and show you every change in the diff view, just like with transcripts it generates.',
        },
      },
      {
        '@type': 'Question',
        name: 'How is EverSaid different from Otter.ai or pasting into ChatGPT?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Transcription tools like Otter.ai give you a raw transcript but no cleanup workflow. Pasting into ChatGPT can clean text, but long transcripts have to be broken into chunks and stitched back together. You can't see what changed, verify against audio, or control how much gets edited. EverSaid handles both transcription and cleanup in one platform, processes the full transcript at once, and shows every change in a diff view with audio verification.",
        },
      },
      {
        '@type': 'Question',
        name: 'Where is my data stored?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'EverSaid runs on Hetzner servers in Germany. For registered users, AI text processing also stays in the EU via IONOS Germany, and transcripts are encrypted with per-user keys. Audio is processed by ElevenLabs for transcription. Your data is never used for AI model training.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need an account? How much does it cost?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "The demo is free with no account required. For the full platform with saved sessions, extended limits, and all features, request access through the signup form. We're adding new users gradually during the pilot. Free while we build. Early users get founding member pricing.",
        },
      },
      {
        '@type': 'Question',
        name: 'What languages does EverSaid support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Slovenian and English, for both transcription and cleanup. Each language requires dedicated cleanup development to handle fillers, discourse markers, and grammar patterns correctly. Additional languages are planned based on user demand.',
        },
      },
    ],
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
      icon: [
        { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
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
        <WebApplicationSchema />
        <FAQPageSchema />
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
