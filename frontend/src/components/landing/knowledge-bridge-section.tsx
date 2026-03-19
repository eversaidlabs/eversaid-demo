"use client"

import { useTranslations } from "next-intl"
import { MotionDiv } from "@/components/motion"
import { useAnimationVariants } from "@/lib/animation-variants"
import { Search, History, Sparkles } from "lucide-react"

interface ConceptCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function ConceptCard({ icon, title, description }: ConceptCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm h-full">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-cyan-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{description}</p>
    </div>
  )
}

export function KnowledgeBridgeSection() {
  const t = useTranslations("landing.knowledgeBridge")
  const { fadeUp, staggerContainer, staggerItem } = useAnimationVariants()

  return (
    <section className="px-8 md:px-16 py-24 bg-[linear-gradient(135deg,#0F172A_0%,#1E3A5F_100%)] relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-50%] right-[-20%] w-[60%] h-[200%] bg-[radial-gradient(ellipse,rgba(56,189,248,0.1)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-[-50%] left-[-20%] w-[50%] h-[150%] bg-[radial-gradient(ellipse,rgba(168,85,247,0.08)_0%,transparent_60%)] pointer-events-none" />

      <div className="max-w-[1000px] mx-auto relative z-10">
        <MotionDiv
          className="text-center mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <MotionDiv variants={fadeUp}>
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              {t("badge")}
            </div>
          </MotionDiv>

          <MotionDiv variants={fadeUp}>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-[-0.02em]">
              {t("title")}
            </h2>
          </MotionDiv>

          <MotionDiv variants={fadeUp}>
            <p className="text-lg text-white/70 max-w-[700px] mx-auto leading-relaxed">
              {t("intro")}
            </p>
          </MotionDiv>
        </MotionDiv>

        <MotionDiv
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          <MotionDiv variants={staggerItem} className="h-full">
            <ConceptCard
              icon={<Search className="w-6 h-6" />}
              title={t("concept1.title")}
              description={t("concept1.description")}
            />
          </MotionDiv>
          <MotionDiv variants={staggerItem} className="h-full">
            <ConceptCard
              icon={<History className="w-6 h-6" />}
              title={t("concept2.title")}
              description={t("concept2.description")}
            />
          </MotionDiv>
          <MotionDiv variants={staggerItem} className="h-full">
            <ConceptCard
              icon={<Sparkles className="w-6 h-6" />}
              title={t("concept3.title")}
              description={t("concept3.description")}
            />
          </MotionDiv>
        </MotionDiv>

        <MotionDiv
          className="text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <p className="text-white/50 text-sm italic">{t("cta")}</p>
        </MotionDiv>
      </div>
    </section>
  )
}
