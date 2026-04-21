'use client'

import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Motion provider — wraps `framer-motion`'s `LazyMotion` with the smaller
 * `domAnimation` features bundle (not `domMax`) to keep bundle size lean.
 *
 * Usage: mount once at the top of the tree (root layout). Then use
 * `<m.div />` from `framer-motion` instead of `motion.div` everywhere.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig
        reducedMotion="user"
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 30,
          mass: 0.9,
        }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}
