"use client"

import { m, AnimatePresence } from "@/components/motion"

interface WaveformOverlayProps {
  visible: boolean
}

const waveConfig = [
  { minHeight: 12, maxHeight: 20, delay: 0 },
  { minHeight: 18, maxHeight: 30, delay: 0.1 },
  { minHeight: 24, maxHeight: 40, delay: 0.2 },
  { minHeight: 18, maxHeight: 30, delay: 0.3 },
  { minHeight: 12, maxHeight: 20, delay: 0.4 },
]

export function WaveformOverlay({ visible }: WaveformOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none"
        >
          {/* Contained pill background */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
            {/* Speaker icon */}
            <svg
              className="w-5 h-5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="#38BDF8"
            >
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>

            {/* Animated wave bars */}
            <div className="flex items-center gap-[3px]">
              {waveConfig.map((config, index) => (
                <m.div
                  key={index}
                  className="w-[4px] rounded-full"
                  style={{
                    background: "linear-gradient(to top, #38BDF8, #A855F7)",
                  }}
                  initial={{ height: config.minHeight }}
                  animate={{
                    height: [config.minHeight, config.maxHeight, config.minHeight],
                  }}
                  transition={{
                    duration: 0.6,
                    delay: config.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
