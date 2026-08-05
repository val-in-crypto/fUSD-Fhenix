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
} as const;

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
            fontSize: 96,
            letterSpacing: "-0.96px",
            lineHeight: 1.1,
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
            fontSize: "clamp(40px, 13vw, 96px)",
            letterSpacing: "-0.4px",
            lineHeight: 1.1,
            ...LIVE_TEXT_STYLE,
          }}
        >
          Live on Arbitrum soon
        </p>
      </div>
    </footer>
  );
}
