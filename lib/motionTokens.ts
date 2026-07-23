/** Shared motion vocabulary. Every animated surface reads from here so the page
 *  feels like one system rather than a pile of one-off transitions. */
export const MOTION = {
  duration: { fast: 300, base: 600, slow: 900 },
  ease: {
    out: "cubic-bezier(0.16, 1, 0.3, 1)",
    inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  },
  /** px a revealed element rises from */
  revealDistance: 24,
  /** ms between staggered siblings */
  stagger: 90,
} as const;
