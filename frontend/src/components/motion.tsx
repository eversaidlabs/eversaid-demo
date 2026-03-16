"use client"

import { m, motion, AnimatePresence, LazyMotion, domAnimation, useReducedMotion, LayoutGroup } from "motion/react"

export { m, motion, AnimatePresence, LazyMotion, domAnimation, useReducedMotion, LayoutGroup }

// Re-export commonly used motion components for convenience
// Using `m` instead of `motion` for LazyMotion tree shaking compatibility
export const MotionDiv = m.div
export const MotionSpan = m.span
export const MotionButton = m.button

// LazyMotion provider for optimized animation loading
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  )
}
