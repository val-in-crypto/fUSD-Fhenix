import Reveal from "@/components/motion/Reveal";
import WaitlistPill from "@/components/ui/WaitlistPill";
import DecryptDollar from "./DecryptDollar";

/**
 * Figma 94:3, y1298–1898. Copy left, decrypting dollar right.
 * Desktop offsets are Figma-absolute minus the 1298 section origin.
 */

const HEADING_STYLE = {
  fontSize: 80,
  letterSpacing: "-0.8px",
  lineHeight: 0.9,
} as const;

const SUB_STYLE = {
  fontSize: 24,
  letterSpacing: "-0.24px",
  lineHeight: 1.1,
} as const;

const CAPTION_STYLE = {
  fontSize: 16,
  letterSpacing: "-0.16px",
  lineHeight: 1.1,
} as const;

const CAPTION = "A quantum-proof stack that returns you control over your onchain data.";

export default function RebuildingValue() {
  return (
    <section
      aria-label="Rebuilding the economy of value"
      className="relative w-full bg-[color:var(--bg)]"
    >
      {/* ── Desktop stage ─────────────────────────────────────────────────── */}
      <div className="relative mx-auto hidden h-[600px] w-full max-w-[1440px] md:block">
        {/* decrypting bill */}
        <div
          className="absolute"
          style={{ left: 788.6, top: 120, width: 627.1, height: 296.5 }}
        >
          <DecryptDollar />
        </div>

        <div className="absolute" style={{ left: 45, top: 159, width: 646 }}>
          <Reveal>
            <h2 className="font-display text-ink" style={HEADING_STYLE}>
              Rebuilding the economy of <span className="font-serif italic">value</span>
            </h2>
          </Reveal>
        </div>

        <div className="absolute" style={{ left: 45, top: 338, width: 559 }}>
          <Reveal delay={90}>
            <p className="font-display text-mono-muted" style={SUB_STYLE}>
              Your financial data is truly yours now — until you want otherwise.
            </p>
          </Reveal>
        </div>

        <div className="absolute" style={{ left: 40, top: 430 }}>
          <WaitlistPill />
        </div>

        <p
          className="absolute font-mono uppercase text-mono-muted"
          style={{ left: 1068, top: 431, width: 332, ...CAPTION_STYLE }}
        >
          {CAPTION}
        </p>
      </div>

      {/* ── Mobile ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-8 px-6 py-16 md:hidden">
        <Reveal>
          <h2
            className="font-display text-ink"
            style={{ fontSize: "clamp(36px, 11vw, 60px)", letterSpacing: "-0.4px", lineHeight: 0.92 }}
          >
            Rebuilding the economy of <span className="font-serif italic">value</span>
          </h2>
        </Reveal>

        <div className="h-[220px] w-full">
          <DecryptDollar />
        </div>

        <Reveal>
          <p className="font-display text-mono-muted" style={{ ...SUB_STYLE, fontSize: 18 }}>
            Your financial data is truly yours now — until you want otherwise.
          </p>
        </Reveal>

        <WaitlistPill className="self-start" />

        <p className="font-mono uppercase text-mono-muted" style={{ ...CAPTION_STYLE, fontSize: 13 }}>
          {CAPTION}
        </p>
      </div>
    </section>
  );
}
