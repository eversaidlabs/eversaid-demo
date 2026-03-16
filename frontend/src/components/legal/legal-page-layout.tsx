import { Link } from "@/i18n/routing"
import { LanguageSwitcherLight } from "@/components/ui/language-switcher"
import { DemoFooter } from "@/components/demo/demo-footer"
import { MarkdownRenderer } from "./markdown-renderer"
import { getTranslations } from "next-intl/server"

interface LegalPageLayoutProps {
  content: string
  locale: string
}

export async function LegalPageLayout({ content, locale }: LegalPageLayoutProps) {
  const tNav = await getTranslations({ locale, namespace: 'navigation' })

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 md:px-16 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="EverSaid logo" className="h-[39px] w-auto" />
          <span className="font-[family-name:var(--font-comfortaa)] font-bold text-[27px] text-white tracking-[0.01em]">
            EverSaid
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/demo"
            className="text-white/80 hover:text-white text-[15px] font-bold transition-colors"
          >
            {tNav('tryFreeDemo')}
          </Link>
          <LanguageSwitcherLight />
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 px-4 md:px-8 py-8 md:py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-12">
          <MarkdownRenderer content={content} />
        </div>
      </main>

      {/* Footer */}
      <DemoFooter />
    </div>
  )
}
