"use client";

import { useEffect, useRef, useState } from "react";
import { MOTION } from "@/lib/motionTokens";
import { useReducedMotion } from "./MotionProvider";

type RevealProps = {
  children: React.ReactNode;
  /** ms delay — use MOTION.stagger * index for staggered siblings */
  delay?: number;
  className?: string;
};

/**
 * Fades + rises its children once they enter the viewport.
 *
 * Fails open by design: content is never left permanently invisible. If the element is
 * already on screen at mount, or IntersectionObserver is unavailable / never delivers a
 * callback (unsupported, backgrounded tab), the content is shown immediately. No-ops
 * entirely under reduced motion.
 */
export default function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    // Already visible at mount, or no IO support -> show without waiting.
    const alreadyInView = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      return r.top < vh * 0.9 && r.bottom > 0;
    };
    if (typeof IntersectionObserver === "undefined" || alreadyInView()) {
      setShown(true);
      return;
    }

    let delivered = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        delivered = true;
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);

    // If IO never delivers even its initial observation, reveal rather than stay hidden.
    const failOpen = window.setTimeout(() => {
      if (!delivered) setShown(true);
    }, 1500);

    return () => {
      io.disconnect();
      window.clearTimeout(failOpen);
    };
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={className}
      style={
        reduced
          ? undefined
          : {
              opacity: shown ? 1 : 0,
              transform: shown ? "none" : `translateY(${MOTION.revealDistance}px)`,
              transition: `opacity ${MOTION.duration.base}ms ${MOTION.ease.out} ${delay}ms, transform ${MOTION.duration.base}ms ${MOTION.ease.out} ${delay}ms`,
              willChange: shown ? undefined : "opacity, transform",
            }
      }
    >
      {children}
    </div>
  );
}
