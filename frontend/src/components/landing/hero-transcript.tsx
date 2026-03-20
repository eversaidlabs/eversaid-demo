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
          color: rgba(255, 255, 255, 0.92);
          position: relative;
          animation: strikeWord 6s ease-in-out infinite;
        }

        .removed::after {
          content: '';
          position: absolute;
          left: -2px;
          right: -2px;
          top: 50%;
          height: 2px;
          background: rgba(239, 68, 68, 0.6);
          transform: scaleX(0);
          transform-origin: left;
          animation: strikeLine 6s ease-in-out infinite;
        }

        @keyframes strikeWord {
          /* Normal state */
          0%, 15% { color: rgba(255, 255, 255, 0.92); }
          /* Fade to dimmed */
          30%, 70% { color: rgba(255, 255, 255, 0.15); }
          /* Fade back to normal */
          85%, 100% { color: rgba(255, 255, 255, 0.92); }
        }

        @keyframes strikeLine {
          /* Hidden */
          0%, 15% { transform: scaleX(0); }
          /* Animate in and hold */
          30%, 70% { transform: scaleX(1); }
          /* Fade out */
          85%, 100% { transform: scaleX(0); }
        }

        .removed:nth-of-type(1), .removed:nth-of-type(1)::after { animation-delay: 0s; }
        .removed:nth-of-type(2), .removed:nth-of-type(2)::after { animation-delay: 0.08s; }
        .removed:nth-of-type(3), .removed:nth-of-type(3)::after { animation-delay: 0.16s; }
        .removed:nth-of-type(4), .removed:nth-of-type(4)::after { animation-delay: 0.24s; }
        .removed:nth-of-type(5), .removed:nth-of-type(5)::after { animation-delay: 0.32s; }
        .removed:nth-of-type(6), .removed:nth-of-type(6)::after { animation-delay: 0.4s; }
        .removed:nth-of-type(7), .removed:nth-of-type(7)::after { animation-delay: 0.48s; }

        .added {
          display: inline;
          color: rgba(255, 255, 255, 0.92);
          position: relative;
          animation: addWord 6s ease-in-out infinite;
        }

        .added::before {
          content: '';
          position: absolute;
          inset: -2px -4px;
          background: rgba(74, 222, 128, 0.15);
          border-radius: 4px;
          opacity: 0;
          animation: addBg 6s ease-in-out infinite;
        }

        @keyframes addWord {
          /* Hidden initially */
          0%, 15% { opacity: 0; }
          /* Fade in with green highlight */
          25% { opacity: 1; color: #4ade80; }
          /* Hold visible */
          35%, 70% { opacity: 1; color: rgba(255, 255, 255, 0.92); }
          /* Fade out */
          85%, 100% { opacity: 0; }
        }

        @keyframes addBg {
          0%, 15% { opacity: 0; }
          25% { opacity: 1; }
          40%, 100% { opacity: 0; }
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
