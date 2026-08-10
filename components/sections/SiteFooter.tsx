import Socials from "@/components/ui/Socials";
import WaitlistPill from "@/components/ui/WaitlistPill";

/**
 * Figma 85:2 footer (node 93:91). CTA pill left, socials right, and the big
 * "LIVE ON ARBITRUM SOON" display headline (Instrument Serif 96px, upright) spanning the
 * width beneath them — a cyan gradient (0AD9DC → 067476 → 58FCFF) at 30% opacity, clipped
 * to the text. Replaces the old small mono status label.
 */

// Gradient + type spec from Figma node 93:91. The stops are authored at full strength and
// held back to the spec's 30% by opacity in .live-headline, which composites identically over
// the white footer but leaves one animatable property for the hover. Baking the alpha into
// the stops instead would make the hover unanimatable — gradients do not interpolate, so it
// could only snap between two images.
// The middle stop comes through --live-mid, a registered custom property, so the hover can
// run the Figma dark teal up to full cyan. See .live-headline in globals.css.
const LIVE_TEXT_STYLE = {
  backgroundImage:
    "linear-gradient(90deg, rgb(10,217,220) 0%, var(--live-mid) 52.885%, rgb(88,252,255) 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
} as const;

/**
 * Drop needed to sit the glyphs on the bottom edge. Setting bottom to 0 only flushes the
 * element's box; the ink still stops 19.3px short at 96px, because the line box reserves
 * half-leading plus the font's 30px descent metric — and this line is uppercase, so it has
 * no descenders to spend it on. In em rather than px so it stays correct if the size changes.
 */
const LIVE_BASELINE_DROP = "-0.201em";

/**
 * Size, for both breakpoints. The line cannot wrap, so it has to be sized to the space rather
 * than pinned: at the Figma 96px it sets 842px of text, which overruns its stage on anything
 * under ~870px wide. The footer clips, so it did not scroll the page — it simply cut the ends
 * off the line, and at 320 the last word was gone entirely.
 *
 * Measured, not guessed: this string sets 8.77x its font-size wide in Instrument Serif, so
 * dividing the available width by that ratio fits it exactly. Holds the design's 96px wherever
 * there is room, which is every viewport from ~870px up.
 */
const LIVE_SIZE = "min(calc((100vw - 48px) / 8.77), 96px)";

export default function SiteFooter() {
  return (
    <footer aria-label="Footer" className="relative w-full overflow-hidden bg-[color:var(--bg)]">
      {/* ── Desktop stage ─────────────────────────────────────────────────── */}
      <div className="relative mx-auto hidden h-[240px] w-full max-w-[1440px] md:block">
        <div className="absolute" style={{ left: 40, top: 30 }}>
          <WaitlistPill />
        </div>

        {/* Anchored from the right — as left:1345 it sat 255px off-stage at 1100 and was
            clipped away, so the social links vanished below the design width. */}
        <div className="absolute" style={{ right: 40, top: 36 }}>
          <Socials />
        </div>

        <p
          className="absolute w-full text-center font-serif uppercase whitespace-nowrap not-italic"
          style={{
            left: 0,
            bottom: LIVE_BASELINE_DROP,
            fontSize: LIVE_SIZE,
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          {/* Inline span, so the hover target is the glyph run. The <p> is a full-width
              absolutely-positioned box and the line only covers about two thirds of it —
              on the <p> the hover would fire from its empty margins too. */}
          <span className="live-headline" style={LIVE_TEXT_STYLE}>
            Live on Arbitrum soon
          </span>
        </p>
      </div>

      {/* ── Mobile ────────────────────────────────────────────────────────── */}
      {/* pb-0: the headline runs to the bottom edge here too, so the padding that would
          otherwise sit under it is carried by the rows above instead. */}
      <div className="flex flex-col gap-6 px-6 pb-0 pt-6 md:hidden">
        <div className="flex items-end justify-between">
          <WaitlistPill className="self-start" />
          <Socials />
        </div>
        <p
          className="font-serif uppercase whitespace-nowrap not-italic"
          style={{
            fontSize: LIVE_SIZE,
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
            marginBottom: LIVE_BASELINE_DROP,
          }}
        >
          <span className="live-headline" style={LIVE_TEXT_STYLE}>
            Live on Arbitrum soon
          </span>
        </p>
      </div>
    </footer>
  );
}
