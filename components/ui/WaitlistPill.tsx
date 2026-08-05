import { ArrowEnter } from "@/components/hero/icons";

/**
 * JOIN WAITLIST CTA — Figma node 91:40. Cyan (#0AD9DC / --glow-cyan) pill with a light-cyan
 * (#ABFEFF) hairline border, a soft drop shadow, and white Geist Mono SemiBold label + icon.
 */
export default function WaitlistPill({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 rounded-full bg-glow-cyan ${className ?? ""}`}
      style={{
        padding: "10px 20px",
        border: "1px solid #ABFEFF",
        boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.1)",
      }}
    >
      <ArrowEnter
        className="size-5 shrink-0 text-white"
        style={{ transform: "scaleY(-1) rotate(180deg)" }}
      />
      <span
        className="font-mono font-semibold whitespace-nowrap text-white"
        style={{ fontSize: 16, letterSpacing: "-0.16px", lineHeight: 0.9 }}
      >
        JOIN WAITLIST
      </span>
    </button>
  );
}
