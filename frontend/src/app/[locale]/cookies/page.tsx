import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'
import { getLegalContent } from '@/lib/legal'
import { getAlternates } from '@/lib/seo'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'legal' })

  return {
    title: t('cookies.title'),
    description: t('cookies.description'),
    alternates: getAlternates(locale, '/cookies'),
  }
}

export default async function CookiesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const content = await getLegalContent('cookie-policy', locale)

  return <LegalPageLayout content={content} locale={locale} />
}
