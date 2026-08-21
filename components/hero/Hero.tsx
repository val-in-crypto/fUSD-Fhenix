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
          "Live on Arbitrum in Q4" line.
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
      {/* The wash paints on the section, which is full width, not on the stage, which caps at
          1440 and centres. Inside the stage it stopped dead at that cap: at 1800 the hero showed
          180px of bare white down each side, with a hard vertical edge where the gradient ended.

          Nothing changes at or below 1440 — there the stage is the section's full width, so the
          gradient resolves against the same box it always did. Above it the wash simply keeps
          going, growing with the viewport rather than leaving the surplus unpainted.

          First child, so it paints under the stage that follows. Desktop only: the phone stack
          carries its own wash, with geometry of its own. */}
      <div className="pointer-events-none absolute inset-0 hidden md:block">
        <Glows />
      </div>

      {/* ── Desktop / fluid stage (>= md) — exact Figma 94:3 anchors ───────────
          Stage height tracks the viewport so the hero never runs into the section
          below, and caps at the Figma stage height so it does not stretch on tall
          displays. Every vertical anchor below is therefore a percentage of the
          1024px design height rather than a frozen pixel — same coordinates, but
          they follow the stage. dvh, not vh, so mobile browser chrome collapsing
          does not leave the fold mid-composition. */}
      <div className="relative mx-auto hidden h-[min(100dvh,1024px)] w-full max-w-[1440px] md:block">
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

        {/* Interactive glossy logo. The box is the spec's 564.15 x 599.4, kept as fractions so
            it tracks the stage, and now centred on it rather than at the spec's offsets.

            Centred horizontally, and a little below centre vertically: the box's middle sits at
            50% / 53%. The mark's middle is the box's, because tex-glass.png is framed with its
            asterisk at 98px left and right, 63 and 64 top and bottom of 1024 — so it lands on
            the hairline axis (377 and 1062, midpoint 719.5 against a stage centre of 720) and
            three per cent below the vertical middle.

            The drop is what lets the mark be as large as it is. It grows symmetrically about
            this centre, so every pixel of growth costs two at the top; moving the centre down
            hands that back. Measured clear at 1440: the mark spans 478-963 across against mono
            labels at 211-353 and 1087-1247, and 280-805 down against a headline ending at 241.

            The -22.35deg is still the spec's and lives on the mesh. */}
        <div
          className="absolute"
          style={{ left: "30.4115%", top: "23.7325%", width: "39.177%", height: "58.535%" }}
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

        {/* CTA, at the spec's own y=820. It had been raised to 700 to clear the fold on shorter
            viewports; that still holds at the shortest stage this hero is built for — 80.078% of
            a 700px viewport is 561, and the pill is 42 tall, so it lands at 561-603 against a
            700px fold with the socials at 640-664 below it.

            Also clear of the mark, which ends at 730. */}
        <div className="absolute" style={{ left: 40, top: "80.078%" }}>
          <WaitlistPill />
        </div>

        {/* Status line, in the right column on the CTA's own line. Height matches the pill
            and centres against it, so the two align optically rather than by top edge —
            the pill's text sits inside 10px of padding and a 1px border. Size is fluid
            because the right column is only ~180px wide at the md breakpoint. */}
        <div
          className="absolute flex items-center"
          style={{ left: "calc(75% + 7px)", top: "80.078%", height: 42 }}
        >
          <p
            className="font-serif uppercase whitespace-nowrap text-glow-cyan"
            style={{ fontSize: "clamp(18px, 2.2vw, 32px)", letterSpacing: "-0.32px", lineHeight: 0.9 }}
          >
            Live on Arbitrum in Q4
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

        {/* Status line, between the intro copy and the mark rather than above the CTA.
            It used to sit on its own line just above the CTA, right-aligned, reading as the
            CTA's pair — it cannot share the CTA's row, since pill, line and socials come to
            ~344px against 327px of content width at 375px.

            Left-aligned here because it now sits in a left-aligned column under the eyebrow;
            kept right-aligned it would be stranded mid-stack with nothing to align to. */}
        <p
          className="relative mt-5 font-serif uppercase text-glow-cyan"
          style={{ fontSize: 20, letterSpacing: "-0.2px", lineHeight: 0.9 }}
        >
          Live on Arbitrum in Q4
        </p>

        {/* min-h-0 is load-bearing: a flex item's default min-height:auto would let the
            canvas's intrinsic size win and push the CTA back off the screen. */}
        <div className="relative mx-auto mt-4 w-full max-w-[380px] flex-1 min-h-0">
          <GlossyLogo />
        </div>

        <div className="relative mt-6 flex items-center justify-between">
          <WaitlistPill />
          <Socials />
        </div>
      </div>
    </section>
  );
}
