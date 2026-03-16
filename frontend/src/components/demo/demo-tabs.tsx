"use client"

import { useTranslations } from "next-intl"
import { m } from "@/components/motion"

export type DemoTabType = "transcript" | "analysis"

interface DemoTabsProps {
  activeTab: DemoTabType
  onTabChange: (tab: DemoTabType) => void
}

export function DemoTabs({ activeTab, onTabChange }: DemoTabsProps) {
  const t = useTranslations("demo.tabs")

  const tabs: { id: DemoTabType; label: string }[] = [
    { id: "transcript", label: t("transcript") },
    { id: "analysis", label: t("analysis") },
  ]

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <m.div
                layoutId="demo-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
