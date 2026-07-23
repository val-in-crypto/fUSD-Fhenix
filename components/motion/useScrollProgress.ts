"use client";

import { useEffect, useRef } from "react";

/**
 * Tracks how far an element has travelled through the viewport: 0 when its top
 * reaches the bottom of the screen, 1 when its bottom leaves the top.
 *
 * Writes to a ref (no re-render per scroll frame) and optionally calls `onChange`,
 * so consumers can drive shader uniforms or transforms directly in rAF.
 */
export function useScrollProgress<T extends HTMLElement>(onChange?: (p: number) => void) {
  const ref = useRef<T>(null);
  const progressRef = useRef(0);
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    const el = ref.current;
    if (typeof window === "undefined" || !el) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const total = rect.height + vh;
      const raw = total > 0 ? (vh - rect.top) / total : 0;
      const p = Math.min(1, Math.max(0, raw));
      progressRef.current = p;
      cbRef.current?.(p);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return { ref, progressRef };
}
