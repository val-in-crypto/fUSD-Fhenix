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
      className="relative overflow-hidden rounded-[24px] bg-white/10"
      style={{
        boxShadow: "0px 4px 4px 0px rgba(0,0,0,0.1)",
        height: absolute ? 294 : undefined,
        minHeight: absolute ? undefined : 260,
      }}
    >
      {/* inner cyan glow, bottom-right */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/card-glow.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute w-[560px] max-w-none -translate-x-1/2 select-none"
        style={{ left: "calc(50% + 202px)", top: 180 }}
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
