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

function Glows() {
  return (
    <>
      {/* Cyan wash behind the headline. Local to this corner on purpose — spanning the full
          top edge tints the whole masthead and flattens the asterisk's own glow into it.
          Wide and shallow, so it spans the headline without reaching down into the asterisk.
          The two genuinely overlap — the art runs 458-927px across and the headline 40-604px
          — but only above y=213, where the headline ends and the art has barely begun (its
          top is y=163). Staying flat exploits that: this reaches 704px across but only 317px
          down, which covers "yield" while passing over the asterisk's shoulder.
          Reaches 653px, so it clears the asterisk's left edge at 458px in everything but the
          rim: scanned across the art's true extent (its 234px radius, not the corners of its
          box, which an asterisk leaves empty) the most it picks up is 0.12.
          Trimmed from the right by the horizontal radius alone, with the centre following it
          left, so "dual-mode" and the logo hold their level while the far end comes down.
          That end is the whole tension in this thing — "yield" sits at 458-604px, physically
          on top of the asterisk's box — so trimming right and covering "yield" are the same
          dial pulled opposite ways. It now carries 0.14 falling to 0.01 across its width.
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/glow-top.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-[28%] top-[1%] w-[1568px] max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/glow-bottom.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-[81.2%] top-[61.6%] w-[988px] max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
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
        <div
          className="absolute size-[10px] -translate-y-1/2 bg-ink-deep"
          style={{ left: "calc(91.67% + 70px)", top: "calc(50% - 3px)" }}
        />

        {/* Interactive glossy logo */}
        <div
          className="absolute"
          style={{ left: "calc(8.33% + 45px)", top: "7.324%", width: 1082, height: "95.703%" }}
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
        <div
          className="absolute flex flex-col"
          style={{ left: "calc(75% + 7px)", top: "9.180%", gap: 17 }}
        >
          <p
            className={`${MONO} uppercase`}
            style={{ width: 209, fontSize: 16, letterSpacing: "-0.16px", lineHeight: 1.1 }}
          >
            Confidential by default — public when you want.
          </p>
          <div className="flex items-center gap-1" style={{ width: 199 }}>
            <ArrowDown className="size-4 shrink-0 text-ink" style={{ transform: "rotate(90deg) scaleY(-1)" }} />
            <p className={`${MONO} uppercase`} style={{ ...MONO_LABEL_STYLE, width: 202 }}>
              One token, one toggle, two modes.
            </p>
          </div>
        </div>

        {/* FHENIX nav mark (top-right corner) */}
        <div className="absolute flex items-center gap-2" style={{ left: "calc(91.67% - 5px)", top: "2.930%" }}>
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

        <div className="absolute" style={{ left: 1345, top: "91.406%" }}>
          <Socials />
        </div>
      </div>

      {/* ── Mobile reflow (< md) — compact stack matching Figma 136:2 ────────────
          Pinned to one screen. The type and CTA keep their intrinsic heights and the
          logo takes whatever is left (flex-1), so the stack fits every phone instead
          of pushing the CTA past the fold on short ones. */}
      <div className="relative flex h-[100dvh] flex-col overflow-hidden px-6 pb-12 pt-6 md:hidden">
        <Glows />

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
