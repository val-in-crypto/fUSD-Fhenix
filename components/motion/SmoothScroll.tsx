"use client";

import { ReactLenis } from "lenis/react";
import { MotionConfig } from "framer-motion";
import { useReducedMotion } from "./MotionProvider";
import { MOTION } from "@/lib/motionTokens";

/**
 * Site-wide motion shell.
 *
 * - **Lenis** smooth-scroll on the root. It still scrolls the real window, so the existing
 *   `useScrollProgress` listeners (decrypt-dollar scrub, card parallax) keep firing — they
 *   just get eased values. Mounted once here, above every section.
 * - **Framer MotionConfig** seeds every `motion.*` component with the design's easing/duration
 *   vocabulary so Framer-driven motion (e.g. Animation 3's headline dissolve) matches the
 *   hand-rolled CSS transitions.
 *
 * Reduced motion is the single gate: when the user asks for less motion we drop Lenis entirely
 * (native instant scroll) and let `MotionConfig reducedMotion="user"` neutralise Framer motion.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  const framed = (
    <MotionConfig
      reducedMotion="user"
      transition={{ ease: [0.16, 1, 0.3, 1], duration: MOTION.duration.base / 1000 }}
    >
      {children}
    </MotionConfig>
  );

  if (reduced) return framed;

  return (
    <ReactLenis root options={{ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 }}>
      {framed}
    </ReactLenis>
  );
}
