import type { Variants } from "motion/react"
import { useReducedMotion } from "@/components/motion"

// Consistent easing used throughout the codebase
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

// =============================================================================
// REDUCED MOTION VARIANTS (instant transitions for accessibility)
// =============================================================================

const reducedMotionVariant: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
}

const reducedMotionContainer: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
}

// =============================================================================
// HERO ANIMATIONS (page load, not scroll-triggered)
// =============================================================================

export const heroTitle: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: EASE_OUT_EXPO,
    },
  },
}

export const heroSubtitle: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: EASE_OUT_EXPO,
      delay: 0.1,
    },
  },
}

export const heroCta: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: EASE_OUT_EXPO,
      delay: 0.2,
    },
  },
}

export const heroNote: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      delay: 0.4,
    },
  },
}

// =============================================================================
// SCROLL-TRIGGERED ANIMATIONS (simplified to 2 patterns)
// =============================================================================

// Pattern 1: Fade Up - for all text content (headers, subtitles, labels, paragraphs)
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: EASE_OUT_EXPO,
    },
  },
}

// Pattern 2: Stagger Container + Item - for all grouped elements (cards, steps, grids)
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
}

// =============================================================================
// LEGACY EXPORTS (kept for backwards compatibility, all point to simplified patterns)
// =============================================================================

export const sectionHeader = fadeUp
export const sectionSubtitle = fadeUp
export const cardItem = staggerItem
export const stepItem = staggerItem
export const stepsContainer = staggerContainer
export const scaleFade = fadeUp

// =============================================================================
// REDUCED MOTION HOOK
// Returns appropriate variants based on user's motion preferences
// =============================================================================

export function useAnimationVariants() {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return {
      heroTitle: reducedMotionVariant,
      heroSubtitle: reducedMotionVariant,
      heroCta: reducedMotionVariant,
      heroNote: reducedMotionVariant,
      fadeUp: reducedMotionVariant,
      staggerContainer: reducedMotionContainer,
      staggerItem: reducedMotionVariant,
      sectionHeader: reducedMotionVariant,
      sectionSubtitle: reducedMotionVariant,
      cardItem: reducedMotionVariant,
      stepItem: reducedMotionVariant,
      stepsContainer: reducedMotionContainer,
      scaleFade: reducedMotionVariant,
    }
  }

  return {
    heroTitle,
    heroSubtitle,
    heroCta,
    heroNote,
    fadeUp,
    staggerContainer,
    staggerItem,
    sectionHeader,
    sectionSubtitle,
    cardItem,
    stepItem,
    stepsContainer,
    scaleFade,
  }
}
