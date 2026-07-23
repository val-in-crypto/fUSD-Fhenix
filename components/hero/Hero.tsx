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
      {/* ── Desktop / fluid stage (>= md) — exact Figma 94:3 anchors ─────────── */}
      <div className="relative mx-auto hidden h-[1024px] w-full max-w-[1440px] md:block">
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
          style={{ left: "calc(8.33% + 45px)", top: 75, width: 1082, height: 980 }}
        >
          <GlossyLogo />
        </div>

        {/* ◐USD lockup */}
        <div className="absolute" style={{ left: 39, top: 26 }}>
          <Logo />
        </div>

        {/* Headline */}
        <h1
          className="absolute font-display text-ink"
          style={{
            left: 40,
            top: 94,
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

        {/* Eyebrow block (top-right) */}
        <p
          className={`absolute ${MONO} uppercase`}
          style={{
            left: "calc(75% + 7px)",
            top: 94,
            width: 209,
            fontSize: 16,
            letterSpacing: "-0.16px",
            lineHeight: 1.1,
          }}
        >
          Confidential by default — public when you want.
        </p>
        <div
          className="absolute flex items-center gap-1"
          style={{ left: "calc(75% + 7px)", top: 164, width: 199 }}
        >
          <ArrowDown className="size-4 shrink-0 text-ink" style={{ transform: "rotate(90deg) scaleY(-1)" }} />
          <p className={`${MONO} uppercase`} style={{ ...MONO_LABEL_STYLE, width: 202 }}>
            One token, one toggle, two modes.
          </p>
        </div>

        {/* FHENIX nav mark (top-right corner) */}
        <div className="absolute flex items-center gap-2" style={{ left: "calc(91.67% - 5px)", top: 30 }}>
          <ArrowEnter className="size-5 shrink-0 text-black" style={{ transform: "scaleY(-1) rotate(180deg)" }} />
          <span className="font-mono font-medium whitespace-nowrap text-black" style={MONO_LABEL_STYLE}>
            FHENIX
          </span>
        </div>

        {/* Mid-line micro-labels */}
        <p
          className={`absolute ${MONO} whitespace-nowrap`}
          style={{ left: "calc(8.33% + 91px)", top: 502, ...MONO_LABEL_STYLE }}
        >
          WE TURN PRIVACY
        </p>
        <p
          className={`absolute ${MONO} whitespace-nowrap`}
          style={{ left: "calc(75% + 7px)", top: 502, ...MONO_LABEL_STYLE }}
        >
          INTO STABLE VALUE
        </p>

        <div className="absolute" style={{ left: 40, top: 920 }}>
          <WaitlistPill />
        </div>

        <div className="absolute" style={{ left: 1345, top: 936 }}>
          <Socials />
        </div>
      </div>

      {/* ── Mobile reflow (< md) ─────────────────────────────────────────────── */}
      <div className="relative flex min-h-[100svh] flex-col overflow-hidden px-6 py-8 md:hidden">
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
          className="relative mt-10 font-display text-ink"
          style={{ fontSize: "clamp(40px, 13vw, 72px)", letterSpacing: "-0.4px", lineHeight: 0.92 }}
        >
          The dual-mode dollar with <span className="font-serif italic">yield</span>
        </h1>

        <div className="relative mt-6 flex flex-col gap-2">
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

        <div className="relative my-8 flex flex-1 items-center justify-center">
          <div className="aspect-square w-[82%] max-w-[380px]">
            <GlossyLogo />
          </div>
        </div>

        <div className="relative flex items-end justify-between">
          <WaitlistPill />
          <Socials />
        </div>
      </div>
    </section>
  );
}
