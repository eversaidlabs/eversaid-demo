"use client"

import { useTranslations, useLocale } from "next-intl"

export function HeroTranscript() {
  const t = useTranslations('landing.heroTranscript')
  const locale = useLocale()

  return (
    <div className="hero-transcript-container relative pl-6">
      {/* Gradient line accent */}
      <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-[linear-gradient(to_bottom,#38BDF8,#A855F7)] rounded-sm" />

      <p className="hero-transcript-text font-[family-name:var(--font-dm-sans)] text-[25px] leading-[2] text-white/[0.92] font-medium">
        &ldquo;{t('so')}{locale === 'sl' && <span className="added">,</span>} <span className="removed">{t('I')}</span> {t('I')} {t('think')} <span className="removed">{t('youKnow')}</span> <span className="removed">{t('um')}</span> {locale === 'en' && <span className="added">{t('the')}</span>} {t('mainPointHereIs')} <span className="removed">{t('basically')}</span><span className="removed">,</span> <span className="removed">{t('basically')}</span>{locale === 'sl' ? ', ' : ' '}{t('weNeedTo')} <span className="removed">{t('like')}</span>{locale === 'sl' && ' '}{t('improveTheUserExperience')}&rdquo;
      </p>

      <style jsx>{`
        .removed {
          display: inline;
          color: rgba(255, 255, 255, 0.15);
          position: relative;
          animation: strikeWord 8s ease-in-out 3 forwards;
        }

        .removed::after {
          content: '';
          position: absolute;
          left: -2px;
          right: -2px;
          top: 50%;
          height: 2px;
          background: rgba(239, 68, 68, 0.6);
          transform: scaleX(1);
          transform-origin: left;
          animation: strikeLine 8s ease-in-out 3 forwards;
        }

        @keyframes strikeWord {
          0%, 10% { color: rgba(255, 255, 255, 0.45); }
          25%, 80% { color: rgba(255, 255, 255, 0.15); }
          95%, 100% { color: rgba(255, 255, 255, 0.15); }
        }

        @keyframes strikeLine {
          0%, 10% { transform: scaleX(0); }
          25%, 80% { transform: scaleX(1); }
          95%, 100% { transform: scaleX(1); }
        }

        .removed:nth-of-type(1), .removed:nth-of-type(1)::after { animation-delay: 0s; }
        .removed:nth-of-type(2), .removed:nth-of-type(2)::after { animation-delay: 0.12s; }
        .removed:nth-of-type(3), .removed:nth-of-type(3)::after { animation-delay: 0.24s; }
        .removed:nth-of-type(4), .removed:nth-of-type(4)::after { animation-delay: 0.36s; }
        .removed:nth-of-type(5), .removed:nth-of-type(5)::after { animation-delay: 0.48s; }
        .removed:nth-of-type(6), .removed:nth-of-type(6)::after { animation-delay: 0.6s; }
        .removed:nth-of-type(7), .removed:nth-of-type(7)::after { animation-delay: 0.72s; }

        .added {
          display: inline;
          color: rgba(255, 255, 255, 0.92);
          position: relative;
          animation: addWord 8s ease-in-out 3 forwards;
        }

        .added::before {
          content: '';
          position: absolute;
          inset: -2px -4px;
          background: rgba(74, 222, 128, 0.15);
          border-radius: 4px;
          opacity: 0;
          animation: addBg 8s ease-in-out 3 forwards;
        }

        @keyframes addWord {
          0%, 15% { opacity: 0; }
          30% { opacity: 1; color: #4ade80; }
          50%, 80% { opacity: 1; color: rgba(255, 255, 255, 0.92); }
          95%, 100% { opacity: 1; color: rgba(255, 255, 255, 0.92); }
        }

        @keyframes addBg {
          0%, 15% { opacity: 0; }
          30% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .removed, .removed::after, .added, .added::before {
            animation: none;
          }
          .removed {
            color: rgba(255, 255, 255, 0.15);
          }
          .removed::after {
            transform: scaleX(1);
          }
          .added {
            opacity: 1;
            color: rgba(255, 255, 255, 0.92);
          }
        }

        @media (max-width: 1024px) {
          .hero-transcript-container {
            padding-left: 0;
            padding-top: 20px;
          }

          .hero-transcript-container > div:first-child {
            top: 0;
            left: 20%;
            right: 20%;
            bottom: auto;
            width: auto;
            height: 3px;
            background: linear-gradient(to right, #38BDF8, #A855F7);
          }

          .hero-transcript-text {
            font-size: 21px;
          }
        }
      `}</style>
    </div>
  )
}
