import Reveal from "@/components/motion/Reveal";
import { MOTION } from "@/lib/motionTokens";

/**
 * Figma 94:3, y2685–3343. Copy + halftone Franklin, then the two comparison cards
 * (94:84 / 94:89) rebuilt in markup so the type stays crisp and selectable.
 */

const SECTION_TOP = 2685;

const SUB =
  "Shielded pools are one-way rooms: you're either hidden or you're liquid. fUSD is the only yield-bearing stablecoin with switchable privacy.";

type CompareCard = {
  label: string;
  title: string;
  body: string;
  /** Figma pads card 1 at 29px and card 2 at 39px */
  padX: number;
  bodyWidth: number;
};

const CARDS: CompareCard[] = [
  {
    label: "Shielded pool",
    title: "A one-way room.",
    body: "Deposit in, and you're hidden — but illiquid. Exit, and you're liquid — but exposed. Pick one.",
    padX: 29,
    bodyWidth: 338,
  },
  {
    label: "(fusd*)",
    title: "A door that swings both ways.",
    body: "Hidden and liquid, at the same time. Toggle privacy per balance, per transfer — while yield keeps accruing.",
    padX: 39,
    bodyWidth: 384,
  },
];

function CompareCard({ card, absolute }: { card: CompareCard; absolute?: boolean }) {
  return (
    <div
      className="compare-card relative overflow-hidden rounded-[24px] bg-white/10"
      style={{
        height: absolute ? 294 : undefined,
        minHeight: absolute ? undefined : 260,
      }}
    >
      {/* Cyan pooling into the bottom-right corner, fading up the right edge and along the
          bottom. Replaces card-glow.svg, which was a blurred ellipse centred at (492, 255)
          of a 580x294 card — a hot spot sitting inside the card rather than light gathering
          in its corner, and fixed at 560px wide however the card was sized.
          Anchored at the corner and measured in card-relative units, so it holds its shape
          on both the 580px desktop card and the narrower mobile one. Sampled against the
          card: 0.24 in the corner, 0.10 up the right edge, 0.06 along the bottom, and
          effectively nothing on the copy — 0.007 at the body, 0 at the title and label.
          Only the stops carry the brightness; the geometry above is what shapes it, so the
          two are independent to tune.
          Built from --glow-cyan via color-mix so it tracks the token. */}
      <div
        aria-hidden="true"
        className="compare-card-glow pointer-events-none absolute inset-0 select-none"
        style={{
          background:
            "radial-gradient(70% 95% at 100% 100%, " +
            "color-mix(in srgb, var(--glow-cyan) 24%, transparent) 0%, " +
            "color-mix(in srgb, var(--glow-cyan) 11%, transparent) 45%, " +
            "transparent 100%)",
        }}
      />
      <div className="relative" style={{ padding: `30px ${card.padX}px` }}>
        <p
          className="font-mono uppercase text-mono-muted"
          style={{ fontSize: 16, letterSpacing: "-0.16px", lineHeight: 1.1 }}
        >
          {card.label}
        </p>
        <p
          className="mt-[72px] font-serif italic text-black"
          style={{ fontSize: 36, letterSpacing: "-0.36px", lineHeight: 1.1 }}
        >
          {card.title}
        </p>
        <p
          className="mt-[26px] font-display text-mono-muted"
          style={{
            fontSize: 16,
            letterSpacing: "-0.16px",
            lineHeight: 1.1,
            maxWidth: card.bodyWidth,
          }}
        >
          {card.body}
        </p>
      </div>
    </div>
  );
}

export default function DualMode() {
  return (
    <section
      aria-label="Dual-mode is the new black"
      className="relative w-full bg-[color:var(--bg)]"
    >
      {/* ── Desktop stage ─────────────────────────────────────────────────── */}
      <div className="relative mx-auto hidden h-[658px] w-full max-w-[1440px] md:block">
        <div className="absolute" style={{ left: 40, top: 0, width: 597 }}>
          <Reveal>
            <h2
              className="font-display text-ink"
              style={{ fontSize: 80, letterSpacing: "-0.8px", lineHeight: 0.9 }}
            >
              <span className="font-serif italic">Dual-mode</span> is the new black
            </h2>
          </Reveal>
        </div>

        <div className="absolute" style={{ left: 40, top: 2859 - SECTION_TOP, width: 576 }}>
          <Reveal delay={MOTION.stagger}>
            <p
              className="font-display text-mono-muted"
              style={{ fontSize: 16, letterSpacing: "-0.16px", lineHeight: 1.1 }}
            >
              {SUB}
            </p>
          </Reveal>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/franklin-halftone.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute select-none"
          style={{ left: 1080, top: 0, width: 172, height: 258 }}
        />

        <div className="absolute" style={{ left: 40, top: 2993 - SECTION_TOP, width: 580 }}>
          <Reveal delay={MOTION.stagger * 2}>
            <CompareCard card={CARDS[0]} absolute />
          </Reveal>
        </div>
        <div className="absolute" style={{ left: 820, top: 2993 - SECTION_TOP, width: 580 }}>
          <Reveal delay={MOTION.stagger * 3}>
            <CompareCard card={CARDS[1]} absolute />
          </Reveal>
        </div>
      </div>

      {/* ── Mobile ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-8 px-6 py-16 md:hidden">
        <Reveal>
          <h2
            className="font-display text-ink"
            style={{ fontSize: "clamp(34px, 10vw, 56px)", letterSpacing: "-0.4px", lineHeight: 0.92 }}
          >
            <span className="font-serif italic">Dual-mode</span> is the new black
          </h2>
        </Reveal>
        <Reveal>
          <p
            className="font-display text-mono-muted"
            style={{ fontSize: 16, letterSpacing: "-0.16px", lineHeight: 1.1 }}
          >
            {SUB}
          </p>
        </Reveal>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/franklin-halftone.png"
          alt=""
          aria-hidden="true"
          className="h-auto w-[150px] select-none"
        />
        <div className="flex flex-col gap-5">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={MOTION.stagger * (i + 1)}>
              <CompareCard card={c} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
