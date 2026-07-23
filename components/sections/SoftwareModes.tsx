"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Reveal from "@/components/motion/Reveal";
import { useReducedMotion } from "@/components/motion/MotionProvider";
import { useScrollProgress } from "@/components/motion/useScrollProgress";
import { MOTION } from "@/lib/motionTokens";

/**
 * Figma 94:2643, y1898–2685. Centered headline over the cyan glow, ringed by the glass
 * cards. Each card fades/rises in as it scrolls into view (staggered), and its visual
 * plays a per-element reveal: coin gleams, icon row + chart wipe in, fingerprint scans.
 * Desktop cards also drift with scroll parallax. All motion is CSS + IntersectionObserver
 * (no libs) and fully disabled under prefers-reduced-motion.
 *
 * Card exports carry ~4px shadow bleed, so each is drawn 8px larger and offset -4px.
 */

const SECTION_TOP = 1898;
const SECTION_HEIGHT = 787;

type Effect = "gleam" | "wipe" | "scan";

type Card = {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** px of parallax travel across the section (sign = direction) */
  depth: number;
  effect: Effect;
  /** vertical shadow-bleed offset: PNG exports bleed all sides (-4); the SVG cards
   *  only pad the shadow at the bottom, so their card-top sits at y0 (0). */
  oy?: number;
};

const CARDS: Card[] = [
  { src: "/assets/card-a.svg", x: 115, y: 1988, w: 240, h: 245, depth: -64, effect: "gleam", oy: 0 }, // coin
  { src: "/assets/card-b.svg", x: 1045, y: 1898, w: 330, h: 263, depth: 44, effect: "wipe", oy: 0 }, // app icons
  { src: "/assets/card-c.png", x: 290, y: 2341, w: 334, h: 167, depth: 52, effect: "wipe" }, // chart draws
  { src: "/assets/card-d.png", x: 969, y: 2318, w: 416, h: 245, depth: -36, effect: "scan" }, // fingerprint
];

/** The inner visual: entrance (opacity/rise) + a per-element reveal, self-triggered on
 *  scroll-in. Fails open (shows) if IO can't fire, and no-ops under reduced motion. */
function CardVisual({ card, index, fill }: { card: Card; index: number; fill?: boolean }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    const el = innerRef.current;
    if (!el) return;
    const inView = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      return r.top < vh * 0.9 && r.bottom > 0;
    };
    if (typeof IntersectionObserver === "undefined" || inView()) {
      setShown(true);
      return;
    }
    let delivered = false;
    const io = new IntersectionObserver(
      ([e]) => {
        delivered = true;
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    const t = window.setTimeout(() => {
      if (!delivered) setShown(true);
    }, 1500);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [reduced]);

  return (
    <div
      ref={innerRef}
      data-shown={shown}
      className={`mode-card relative ${fill ? "h-full w-full" : "w-full"}`}
      style={{ ["--enter-delay" as string]: `${index * MOTION.stagger}ms` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.src}
        alt=""
        aria-hidden="true"
        className={`mode-fx-${card.effect} block max-w-none select-none ${fill ? "h-full w-full" : "w-full"}`}
      />
      {card.effect === "scan" && <span className="mode-scanbar" />}
      {card.effect === "gleam" && <span className="mode-gleam" aria-hidden="true" />}
    </div>
  );
}

export default function SoftwareModes() {
  const reduced = useReducedMotion();
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const onProgress = useCallback(
    (p: number) => {
      if (reduced) return;
      const centered = p - 0.5;
      for (let i = 0; i < cardRefs.current.length; i++) {
        const el = cardRefs.current[i];
        if (el) el.style.transform = `translate3d(0, ${centered * CARDS[i].depth}px, 0)`;
      }
    },
    [reduced],
  );

  const { ref } = useScrollProgress<HTMLDivElement>(onProgress);

  return (
    <section aria-label="Software has modes" className="relative w-full bg-[color:var(--bg)]">
      {/* ── Desktop stage ─────────────────────────────────────────────────── */}
      <div
        ref={ref}
        className="relative mx-auto hidden w-full max-w-[1440px] overflow-hidden md:block"
        style={{ height: SECTION_HEIGHT }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/glow-top.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute w-[1568px] max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
          style={{ left: 720, top: 2195 - SECTION_TOP }}
        />

        {/* Outer wrapper = parallax (JS transform); inner CardVisual = entrance + effect. */}
        {CARDS.map((c, i) => (
          <div
            key={c.src}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="pointer-events-none absolute will-change-transform"
            style={{ left: c.x - 4, top: c.y + (c.oy ?? -4) - SECTION_TOP, width: c.w, height: c.h }}
          >
            <CardVisual card={c} index={i} fill />
          </div>
        ))}

        <div className="absolute" style={{ left: 397, top: 2087 - SECTION_TOP, width: 646 }}>
          <Reveal>
            <h2
              className="text-center font-display text-ink"
              style={{ fontSize: 80, letterSpacing: "-0.8px", lineHeight: 0.9 }}
            >
              Software has modes. <span className="font-serif italic">Money</span> never got one
            </h2>
          </Reveal>
        </div>
      </div>

      {/* ── Mobile ────────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center gap-10 overflow-hidden px-6 py-20 md:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/glow-top.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 w-[900px] max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
        />
        <Reveal>
          <h2
            className="relative text-center font-display text-ink"
            style={{ fontSize: "clamp(34px, 10vw, 56px)", letterSpacing: "-0.4px", lineHeight: 0.92 }}
          >
            Software has modes. <span className="font-serif italic">Money</span> never got one
          </h2>
        </Reveal>
        <div className="relative grid w-full grid-cols-2 gap-4">
          {CARDS.map((c, i) => (
            <CardVisual key={c.src} card={c} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
