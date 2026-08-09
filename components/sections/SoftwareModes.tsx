"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/motion/MotionProvider";
import OrbitCanvas from "./dualmode/OrbitCanvas";
import ModeToggle from "./dualmode/ModeToggle";
import DissolveHeadline from "./dualmode/DissolveHeadline";

/**
 * Figma 85:2 "Software has modes. Money never got one" — Animation 3.
 *
 * On enter: the headline dissolves char-by-char while ~80 orbiting coins spiral inward and
 * merge into the hero token; the Dual Mode toggle then flips OFF→ON. The cyan field behind
 * them holds steady throughout — see Glow. Timeline lives in ./dualmode/sequence.ts; the
 * canvas runs the coin/token motion, this controller fires the DOM beats (dissolve trigger,
 * toggle) on the same clock.
 *
 * Reduced motion: no sequence — the settled hero token and toggle ON render straight away.
 * The headline text is always real DOM (aria-label) for screen readers.
 */

/** Drives the section's two states via the toggle. Auto-plays the reveal once on enter;
 *  after that `toggle` flips between orbit (OFF) and merged token (ON), reversibly. */
function useSequence() {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [mergeBottomY, setMergeBottomY] = useState<number | undefined>(undefined);
  const toggle = useCallback(() => setOn((o) => !o), []);

  // Anchor the hero token's bottom 48px above the toggle (measured, kept current on resize).
  useEffect(() => {
    const measure = () => {
      const s = rootRef.current?.getBoundingClientRect();
      const t = toggleRef.current?.getBoundingClientRect();
      if (s && t) setMergeBottomY(t.top - s.top - 48);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (rootRef.current) ro.observe(rootRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (reduced) {
      setOn(true); // settled end-state, no motion
      return;
    }
    const el = rootRef.current;
    if (!el) return;
    let started = false;
    let timer = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started) {
          started = true;
          timer = window.setTimeout(() => setOn(true), 700); // auto-reveal after a beat
          io.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [reduced]);

  return { rootRef, toggleRef, on, toggle, mergeBottomY };
}

/**
 * The field the coins orbit in. Was glow-top.svg — a blurred ellipse — and is now the same
 * token-driven radial used in the hero and on the compare cards, so the site has one way of
 * making cyan light rather than a CSS treatment in some places and an SVG asset in others.
 *
 * Deliberately static. It used to bloom with the merge — scaling to 1.18 and lifting to 0.95
 * opacity as the coins came together — which made the background swell at exactly the moment
 * the eye should be on the token forming in front of it. Holding it still lets the merge read
 * as the coins doing something rather than the whole section brightening.
 *
 * aspect-ratio reproduces the SVG's 1568x948 viewBox, so the width classes at the call sites
 * still size it.
 */
function Glow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 select-none ${className ?? ""}`}
      style={{
        aspectRatio: "1568 / 948",
        // closest-side puts the ellipse's radii on the box's own half-width and half-height,
        // so it fills the box whatever width the call site gives it.
        background:
          "radial-gradient(closest-side, " +
          "color-mix(in srgb, var(--glow-cyan) 62%, transparent) 0%, " +
          "color-mix(in srgb, var(--glow-cyan) 44%, transparent) 38%, " +
          "color-mix(in srgb, var(--glow-cyan) 16%, transparent) 68%, " +
          "transparent 100%)",
        opacity: 0.68,
      }}
    />
  );
}

const HEADLINE_DESKTOP = {
  fontSize: 80,
  letterSpacing: "-0.8px",
  lineHeight: 0.9,
  maxWidth: 646,
} as const;
const HEADLINE_MOBILE = {
  fontSize: "clamp(34px, 10vw, 56px)",
  letterSpacing: "-0.4px",
  lineHeight: 0.92,
} as const;

export default function SoftwareModes() {
  const desktop = useSequence();
  const mobile = useSequence();

  return (
    <section
      aria-label="Software has modes. Money never got one"
      className="relative w-full bg-[color:var(--bg)]"
    >
      {/* ── Desktop stage ─────────────────────────────────────────────────── */}
      <div
        ref={desktop.rootRef}
        className="relative mx-auto hidden w-full max-w-[1440px] overflow-hidden md:block"
        style={{ height: 787 }}
      >
        <Glow className="w-[88.9%]" />
        <OrbitCanvas
          count={80}
          on={desktop.on}
          mergeBottomY={desktop.mergeBottomY}
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-12 px-10 text-center">
          <DissolveHeadline play={desktop.on} className="font-display text-ink" style={HEADLINE_DESKTOP} />
          <div ref={desktop.toggleRef}>
            <ModeToggle on={desktop.on} onClick={desktop.toggle} />
          </div>
        </div>
      </div>

      {/* ── Mobile ────────────────────────────────────────────────────────── */}
      <div
        ref={mobile.rootRef}
        className="relative overflow-hidden px-6 py-20 md:hidden"
        style={{ minHeight: 560 }}
      >
        <Glow className="w-[760px]" />
        <OrbitCanvas
          count={40}
          on={mobile.on}
          mergeBottomY={mobile.mergeBottomY}
          className="absolute inset-0 h-full w-full"
        />
        <div className="relative flex flex-col items-center justify-center gap-10 text-center">
          <DissolveHeadline play={mobile.on} className="font-display text-ink" style={HEADLINE_MOBILE} />
          {/* 0.72 of the Figma size on phones. At full size the switch is 148px wide, 38% of
              a 390px screen and 46% of a 320px one, which crowds a section that also has to
              hold the headline and the merged token. The scale bottoms out at a 49px tall
              control, so it stays above the ~44px minimum touch target. */}
          <div ref={mobile.toggleRef}>
            <ModeToggle on={mobile.on} onClick={mobile.toggle} scale={0.72} />
          </div>
        </div>
      </div>
    </section>
  );
}
