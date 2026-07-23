import Socials from "@/components/ui/Socials";
import WaitlistPill from "@/components/ui/WaitlistPill";

/**
 * Figma 94:3, y3343–3454 (111px). CTA pill left, status label beside it, socials right.
 * Offsets are Figma-absolute minus the 3343 section origin.
 */
export default function SiteFooter() {
  return (
    <footer aria-label="Footer" className="relative w-full bg-[color:var(--bg)]">
      {/* ── Desktop stage ─────────────────────────────────────────────────── */}
      <div className="relative mx-auto hidden h-[111px] w-full max-w-[1440px] md:block">
        <div className="absolute" style={{ left: 40, top: 0 }}>
          <WaitlistPill />
        </div>

        <p
          className="absolute font-mono uppercase whitespace-nowrap text-mono-muted"
          style={{ left: 263, top: 12, fontSize: 16, letterSpacing: "-0.16px", lineHeight: 1.1 }}
        >
          Live on Arbitrum soon
        </p>

        <div className="absolute" style={{ left: 1345, top: 6 }}>
          <Socials />
        </div>
      </div>

      {/* ── Mobile ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 px-6 pb-10 pt-4 md:hidden">
        <WaitlistPill className="self-start" />
        <div className="flex items-end justify-between">
          <p
            className="font-mono uppercase text-mono-muted"
            style={{ fontSize: 13, letterSpacing: "-0.13px", lineHeight: 1.1 }}
          >
            Live on Arbitrum soon
          </p>
          <Socials />
        </div>
      </div>
    </footer>
  );
}
