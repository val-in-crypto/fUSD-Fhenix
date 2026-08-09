import Socials from "@/components/ui/Socials";
import WaitlistPill from "@/components/ui/WaitlistPill";

/**
 * Figma 85:2 footer (node 93:91). CTA pill left, socials right, and the big
 * "LIVE ON ARBITRUM SOON" display headline (Instrument Serif 96px, upright) spanning the
 * width beneath them — a cyan gradient (0AD9DC → 067476 → 58FCFF) at 30% opacity, clipped
 * to the text. Replaces the old small mono status label.
 */

// Exact gradient + type spec from Figma node 93:91.
const LIVE_TEXT_STYLE = {
  backgroundImage:
    "linear-gradient(90deg, rgba(10,217,220,0.3) 0%, rgba(6,116,118,0.3) 52.885%, rgba(88,252,255,0.3) 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  // Tracking as an em rather than the Figma pixel value, so it scales with the size below
  // instead of tightening as the type grows. -0.96px at 96px is exactly -0.01em.
  letterSpacing: "-0.01em",
} as const;

// The line is meant to span the full width, and 96px does not: measured in Instrument Serif
// this string sets 8.77x its font-size wide, so 96px covers only 842 of 1280px. Dividing the
// available width by that ratio sizes it to fit exactly, at any width, rather than guessing
// a number that happens to work at one breakpoint.
const GLYPH_RATIO = 8.77;
// Capped at the stage's own 1440px max-width, past which vw would keep growing and overrun.
const LIVE_SIZE_DESKTOP = `min(calc(100vw / ${GLYPH_RATIO}), ${Math.round(1440 / GLYPH_RATIO)}px)`;
// Mobile carries 24px of padding either side, so it fills what is left of the viewport.
const LIVE_SIZE_MOBILE = `calc((100vw - 48px) / ${GLYPH_RATIO})`;

export default function SiteFooter() {
  return (
    <footer aria-label="Footer" className="relative w-full overflow-hidden bg-[color:var(--bg)]">
      {/* ── Desktop stage ─────────────────────────────────────────────────── */}
      <div className="relative mx-auto hidden h-[240px] w-full max-w-[1440px] md:block">
        <div className="absolute" style={{ left: 40, top: 30 }}>
          <WaitlistPill />
        </div>

        <div className="absolute" style={{ left: 1345, top: 36 }}>
          <Socials />
        </div>

        <p
          className="absolute w-full text-center font-serif uppercase whitespace-nowrap not-italic"
          style={{
            left: 0,
            bottom: 12,
            fontSize: LIVE_SIZE_DESKTOP,
            lineHeight: 1,
            ...LIVE_TEXT_STYLE,
          }}
        >
          Live on Arbitrum soon
        </p>
      </div>

      {/* ── Mobile ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 px-6 pb-10 pt-6 md:hidden">
        <div className="flex items-end justify-between">
          <WaitlistPill className="self-start" />
          <Socials />
        </div>
        <p
          className="font-serif uppercase whitespace-nowrap not-italic"
          style={{
            fontSize: LIVE_SIZE_MOBILE,
            lineHeight: 1,
            ...LIVE_TEXT_STYLE,
          }}
        >
          Live on Arbitrum soon
        </p>
      </div>
    </footer>
  );
}
