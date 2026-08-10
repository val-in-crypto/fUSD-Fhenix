import Socials from "@/components/ui/Socials";
import WaitlistPill from "@/components/ui/WaitlistPill";
import GlossyLogo from "./GlossyLogo";
import { ArrowDown, ArrowEnter } from "./icons";

/**
 * fUSD hero — faithful rebuild of Figma "Landing page" (94:3), top 1024px.
 * The logo is the interactive <GlossyLogo> canvas (drag to spin, dollar reveals).
 *
 * Desktop (>= md): exact fluid anchors as exported by Figma (calc(% + px)).
 * Mobile (< md): stacked reflow — decorative marks hidden, logo centered.
 */

const MONO = "font-mono text-mono-muted";
const MONO_LABEL_STYLE = {
  fontSize: 16,
  letterSpacing: "-0.16px",
  lineHeight: 0.9,
} as const;

/**
 * Phone wash. A broad fall from the top edge rather than the desktop's corner radial: on a
 * 390px screen the copy, the mark and the status line all sit in the top third and there is
 * no side column to keep clear, so light gathered in one corner reads as a stray blob. The
 * desktop geometry cannot simply be reused either — 31% x 27% at 20%/16% is 121x151px on a
 * phone, a patch smaller than the headline it is meant to sit behind.
 *
 * Centred on the top edge so only the falloff is on screen, which is what keeps it reading as
 * light rather than a painted band.
 */
const MOBILE_WASH =
  "radial-gradient(130% 52% at 50% 0%, " +
  "color-mix(in srgb, var(--glow-cyan) 52%, transparent) 0%, " +
  "color-mix(in srgb, var(--glow-cyan) 30%, transparent) 45%, " +
  "transparent 100%)";

function Glows({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  if (variant === "mobile") {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none"
        style={{ background: MOBILE_WASH }}
      />
    );
  }

  return (
    <>
      {/* Cyan wash behind the headline, and now the only light on the stage.
          Both of the design's blurred-ellipse glows have been removed from the hero, and
          CLAUDE.md lists both as preserved motifs (Figma 42:66 and 43:73), so this is a
          deliberate departure from it — each is a single element to restore.
          glow-top was a 1568px-wide ellipse spanning -426 to 1142px of a 1280px stage: it
          washed the full width and ran past both edges regardless of how this wash was
          tuned. glow-bottom was centred at (1039, 444), which put it directly over the
          "Live on Arbitrum soon" line.
          Wide and shallow, so it spans the headline without reaching down into the asterisk.
          The two genuinely overlap — the art runs 458-927px across and the headline 40-604px
          — but only above y=213, where the headline ends and the art has barely begun (its
          top is y=163). Staying flat exploits that.
          Reaches 653px, so it clears the asterisk's left edge at 458px in everything but the
          rim: scanned across the art's true extent (its 234px radius, not the corners of its
          box, which an asterisk leaves empty) the most it picks up is 0.12.
          That far end is the tension in this thing — "yield" sits at 458-604px, physically on
          top of the asterisk's box — so trimming right and covering "yield" are the same dial
          pulled opposite ways. It now carries 0.14 falling to 0.01 across its width.
          Built from --glow-cyan via color-mix so it tracks the token instead of freezing a
          second copy of the hex. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none"
        style={{
          background:
            "radial-gradient(31% 27% at 20% 16%, " +
            "color-mix(in srgb, var(--glow-cyan) 40%, transparent) 0%, " +
            "color-mix(in srgb, var(--glow-cyan) 30%, transparent) 74%, " +
            "transparent 100%)",
        }}
      />
    </>
  );
}

/** fUSD lockup — asterisk mark + wordmark (single asset). */
function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/assets/logo-fusd.png"
      alt="fUSD"
      className={`h-[28px] w-[107px] select-none ${className ?? ""}`}
    />
  );
}

export default function Hero() {
  return (
    <section aria-label="fUSD hero" className="relative w-full overflow-hidden bg-[color:var(--bg)]">
      {/* ── Desktop / fluid stage (>= md) — exact Figma 94:3 anchors ───────────
          Stage height tracks the viewport so the hero never runs into the section
          below, and caps at the Figma stage height so it does not stretch on tall
          displays. Every vertical anchor below is therefore a percentage of the
          1024px design height rather than a frozen pixel — same coordinates, but
          they follow the stage. dvh, not vh, so mobile browser chrome collapsing
          does not leave the fold mid-composition. */}
      <div className="relative mx-auto hidden h-[min(100dvh,1024px)] w-full max-w-[1440px] md:block">
        <Glows />

        <div className="absolute top-0 h-full w-px bg-hairline" style={{ left: "calc(25% + 17px)" }} />
        <div className="absolute top-0 h-full w-px bg-hairline" style={{ left: "calc(75% - 18px)" }} />

        <div
          className="absolute size-[10px] -translate-y-1/2 bg-ink-deep"
          style={{ left: 40, top: "calc(50% - 3px)" }}
        />
        {/* Mirrors the left square's 40px margin. As calc(91.67% + 70px) it landed 40px in
            from the right at 1440 but pushed past the edge on anything narrower. */}
        <div
          className="absolute size-[10px] -translate-y-1/2 bg-ink-deep"
          style={{ right: 40, top: "calc(50% - 3px)" }}
        />

        {/* Interactive glossy logo */}
        <div
          className="absolute"
          // Width as a fraction of the stage (1082/1440), not frozen px: below the 1440
          // design width a fixed 1082 runs past the right edge — 119px of it at 1100.
          style={{ left: "calc(8.33% + 45px)", top: "7.324%", width: "75.139%", height: "95.703%" }}
        >
          <GlossyLogo />
        </div>

        {/* ◐USD lockup */}
        <div className="absolute" style={{ left: 39, top: "2.539%" }}>
          <Logo />
        </div>

        {/* Headline */}
        <h1
          className="absolute font-display text-ink"
          style={{
            left: 40,
            top: "9.180%",
            width: 564,
            fontSize: 80,
            letterSpacing: "-0.8px",
            lineHeight: 0.9,
          }}
        >
          The dual-mode
          <br />
          dollar with <span className="font-serif italic">yield</span>
        </h1>

        {/* Eyebrow block (top-right). The two lines share one anchor and stack in flow.
            They used to carry separate percentage anchors, which does not hold once the
            stage height is fluid: the type stays a fixed 16px while the anchors scale, so
            the gap closed from 17px at the 1024 design height to 9px at 900 and the lines
            overlapped below ~700. 17px is the Figma spacing — y=164 less the first block's
            147px bottom — and now it holds at every stage height. */}
        {/* Bounded on both edges rather than given a width. The Figma 209px is wider than the
            right column has to give below ~950px — at 768 the column is 185px and the block
            overhung the stage by 24. right:40 lets it take what the column has, maxWidth
            holds it to the design where there is room. */}
        <div
          className="absolute flex flex-col"
          style={{ left: "calc(75% + 7px)", right: 40, maxWidth: 209, top: "9.180%", gap: 17 }}
        >
          <p
            className={`${MONO} uppercase`}
            style={{ fontSize: 16, letterSpacing: "-0.16px", lineHeight: 1.1 }}
          >
            Confidential by default — public when you want.
          </p>
          <div className="flex items-start gap-1">
            <ArrowDown
              className="size-4 shrink-0 text-ink"
              style={{ transform: "rotate(90deg) scaleY(-1)" }}
            />
            <p className={`${MONO} uppercase`} style={MONO_LABEL_STYLE}>
              One token, one toggle, two modes.
            </p>
          </div>
        </div>

        {/* FHENIX nav mark (top-right corner) */}
        <div className="absolute flex items-center gap-2" style={{ right: 40, top: "2.930%" }}>
          <ArrowEnter className="size-5 shrink-0 text-black" style={{ transform: "scaleY(-1) rotate(180deg)" }} />
          <span className="font-mono font-medium whitespace-nowrap text-black" style={MONO_LABEL_STYLE}>
            FHENIX
          </span>
        </div>

        {/* Mid-line micro-labels */}
        <p
          className={`absolute ${MONO} whitespace-nowrap`}
          style={{ left: "calc(8.33% + 91px)", top: "49.023%", ...MONO_LABEL_STYLE }}
        >
          WE TURN PRIVACY
        </p>
        <p
          className={`absolute ${MONO} whitespace-nowrap`}
          style={{ left: "calc(75% + 7px)", top: "49.023%", ...MONO_LABEL_STYLE }}
        >
          INTO STABLE VALUE
        </p>

        {/* CTA — raised from Figma's y=820 to y=700 so it clears the fold on shorter viewports */}
        <div className="absolute" style={{ left: 40, top: "68.359%" }}>
          <WaitlistPill />
        </div>

        {/* Status line, in the right column on the CTA's own line. Height matches the pill
            and centres against it, so the two align optically rather than by top edge —
            the pill's text sits inside 10px of padding and a 1px border. Size is fluid
            because the right column is only ~180px wide at the md breakpoint. */}
        <div
          className="absolute flex items-center"
          style={{ left: "calc(75% + 7px)", top: "68.359%", height: 42 }}
        >
          <p
            className="font-serif whitespace-nowrap text-glow-cyan"
            style={{ fontSize: "clamp(18px, 2.2vw, 32px)", letterSpacing: "-0.32px", lineHeight: 0.9 }}
          >
            Live on Arbitrum soon
          </p>
        </div>

        {/* Anchored from the right, not left:1345. That offset is 95px in from the 1440
            frame's right edge, so as a left position it walked off-stage on anything
            narrower — 255px off at 1100, which put the social links outside the hero's
            overflow-hidden and made them disappear entirely. */}
        <div className="absolute" style={{ right: 40, top: "91.406%" }}>
          <Socials />
        </div>
      </div>

      {/* ── Mobile reflow (< md) — compact stack matching Figma 136:2 ────────────
          Pinned to one screen. The type and CTA keep their intrinsic heights and the
          logo takes whatever is left (flex-1), so the stack fits every phone instead
          of pushing the CTA past the fold on short ones. */}
      <div className="relative flex h-[100dvh] flex-col overflow-hidden px-6 pb-12 pt-6 md:hidden">
        <Glows variant="mobile" />

        <div className="relative flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <ArrowEnter className="size-5 shrink-0 text-black" style={{ transform: "scaleY(-1) rotate(180deg)" }} />
            <span className="font-mono font-medium text-black" style={MONO_LABEL_STYLE}>
              FHENIX
            </span>
          </div>
        </div>

        <h1
          className="relative mt-7 font-display text-ink"
          style={{ fontSize: "clamp(44px, 13vw, 72px)", letterSpacing: "-0.4px", lineHeight: 0.92 }}
        >
          The dual-mode dollar with <span className="font-serif italic">yield</span>
        </h1>

        <div className="relative mt-5 flex flex-col gap-2">
          <p className={`${MONO} uppercase`} style={{ fontSize: 14, letterSpacing: "-0.14px", lineHeight: 1.1 }}>
            Confidential by default — public when you want.
          </p>
          <div className="flex items-center gap-1">
            <ArrowDown className="size-4 shrink-0 text-ink" style={{ transform: "rotate(90deg) scaleY(-1)" }} />
            <p className={`${MONO} uppercase`} style={{ fontSize: 14, letterSpacing: "-0.14px", lineHeight: 0.9 }}>
              One token, one toggle, two modes.
            </p>
          </div>
        </div>

        {/* min-h-0 is load-bearing: a flex item's default min-height:auto would let the
            canvas's intrinsic size win and push the CTA back off the screen. */}
        <div className="relative mx-auto mt-4 w-full max-w-[380px] flex-1 min-h-0">
          <GlossyLogo />
        </div>

        {/* Same status line. It cannot share the CTA's row here — pill, line and socials
            come to ~344px against 327px of content width at 375px — so it takes its own
            right-aligned line directly above, which keeps it reading as the CTA's pair. */}
        <p
          className="relative mt-6 text-right font-serif text-glow-cyan"
          style={{ fontSize: 20, letterSpacing: "-0.2px", lineHeight: 0.9 }}
        >
          Live on Arbitrum soon
        </p>

        <div className="relative mt-3 flex items-center justify-between">
          <WaitlistPill />
          <Socials />
        </div>
      </div>
    </section>
  );
}
