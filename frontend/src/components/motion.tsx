"use client"

import { motion, AnimatePresence, LazyMotion, domAnimation, useReducedMotion, LayoutGroup } from "motion/react"

export { motion, AnimatePresence, LazyMotion, domAnimation, useReducedMotion, LayoutGroup }

// Re-export commonly used motion components for convenience
export const MotionDiv = motion.div
export const MotionSpan = motion.span
export const MotionButton = motion.button

// LazyMotion provider for optimized animation loading
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  )
}
