/**
 * Figma 94:59 — full-bleed cyan band, 115px tall. "\\BACKED BY" pinned left, partner
 * logos to its right. Figma shows a static row that fills 1440 exactly; we run it as a
 * seamless marquee so the strip has life and doesn't clip on narrower viewports.
 * Motion is pure CSS and disables itself under prefers-reduced-motion.
 */

type Partner = {
  name: string;
  src: string;
  w: number;
  h: number;
  /** Figma gap to the next logo */
  gap: number;
};

const PARTNERS: Partner[] = [
  { name: "Arbitrum", src: "/assets/partner-arbitrum.svg", w: 171, h: 67, gap: 44 },
  { name: "M0", src: "/assets/partner-m0.png", w: 112, h: 75, gap: 83 },
  { name: "Gauntlet", src: "/assets/partner-gauntlet.svg", w: 175, h: 40, gap: 114 },
  { name: "Predicate", src: "/assets/partner-predicate.png", w: 216, h: 27, gap: 114 },
  { name: "Paxos", src: "/assets/partner-paxos.png", w: 144, h: 41, gap: 114 },
];

function LogoRun({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden || undefined}>
      {PARTNERS.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p.name}
          src={p.src}
          alt={ariaHidden ? "" : p.name}
          width={p.w}
          height={p.h}
          className="block shrink-0 object-contain"
          style={{ width: p.w, height: p.h, marginRight: p.gap }}
        />
      ))}
    </div>
  );
}

export default function BackedBy() {
  return (
    <section
      aria-label="Backed by"
      className="relative w-full overflow-hidden bg-glow-cyan"
      style={{ height: 115 }}
    >
      <div className="relative mx-auto h-full w-full max-w-[1440px]">
        <p
          className="absolute z-10 font-mono font-semibold uppercase whitespace-nowrap text-white"
          style={{ left: 40, top: 49, fontSize: 16, letterSpacing: "-0.16px", lineHeight: 1.1 }}
        >
          {"\\\\backed by"}
        </p>

        {/* marquee viewport starts where the Figma logo row starts */}
        <div className="absolute inset-y-0 right-0 overflow-hidden" style={{ left: 227 }}>
          <div className="marquee-track flex h-full w-max items-center">
            <LogoRun />
            <LogoRun ariaHidden />
          </div>
        </div>
      </div>
    </section>
  );
}
