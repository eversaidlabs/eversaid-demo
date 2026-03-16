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
    title: t('subProcessors.title'),
    description: t('subProcessors.description'),
    alternates: getAlternates(locale, '/sub-processors'),
  }
}

export default async function SubProcessorsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const content = await getLegalContent('sub-processors', locale)

  return <LegalPageLayout content={content} locale={locale} />
}
