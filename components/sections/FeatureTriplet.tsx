import Reveal from "@/components/motion/Reveal";
import { MOTION } from "@/lib/motionTokens";

/** Figma 94:19 — centered 1038px row of three 266px columns, 120px gaps, 48px band padding. */
const ITEMS = [
  {
    label: "01 / One toggle",
    body: "One token, one toggle, two modes. No wrapping, no bridging.",
  },
  {
    label: "02 / Confidential by default",
    body: "Your business stays your business — public only when you want.",
  },
  {
    label: "03 / Yield, too",
    body: "Oh, have we mentioned yield yet? Your yield can be confidential too.",
  },
] as const;

const TEXT_STYLE = { fontSize: 16, lineHeight: 1.1, letterSpacing: "-0.16px" } as const;

export default function FeatureTriplet() {
  return (
    <section aria-label="How fUSD works" className="relative w-full bg-[color:var(--bg)]">
      <div className="mx-auto w-full max-w-[1440px] border-t border-hairline px-10 py-12">
        <div className="mx-auto flex w-full max-w-[1038px] flex-col gap-10 md:flex-row md:gap-[120px]">
          {ITEMS.map((item, i) => (
            <Reveal key={item.label} delay={i * MOTION.stagger} className="md:w-[266px]">
              <div className="flex flex-col gap-2 text-mono-muted" style={TEXT_STYLE}>
                <p className="font-mono uppercase">{item.label}</p>
                <p className="font-display">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
