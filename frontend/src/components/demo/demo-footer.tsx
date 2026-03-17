import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"

export function DemoFooter() {
  const t = useTranslations("landing.footer")
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#0F172A] px-8 md:px-12 py-6 mt-12 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <span className="text-[13px] text-white/60">{t("copyright", { year: currentYear })}</span>
        <span className="text-xs text-white/40">{t("builtIn")}</span>
      </div>
      <div className="flex gap-6 items-center">
        <Link href="/privacy" className="text-[13px] text-white/60 hover:text-white transition-colors">
          {t("privacy")}
        </Link>
        <Link href="/terms" className="text-[13px] text-white/60 hover:text-white transition-colors">
          {t("terms")}
        </Link>
        <a href="mailto:hello@eversaid.ai" className="text-[13px] text-white/60 hover:text-white transition-colors">
          hello@eversaid.ai
        </a>
      </div>
    </footer>
  )
}
