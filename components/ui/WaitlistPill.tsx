import { ArrowEnter } from "@/components/hero/icons";

/** Figma Frame 2147229902 / 2147229910 / 2147229911 — hairline pill, 20/10 padding. */
export default function WaitlistPill({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 rounded-full bg-hairline ${className ?? ""}`}
      style={{ padding: "10px 20px" }}
    >
      <ArrowEnter
        className="size-5 shrink-0 text-black"
        style={{ transform: "scaleY(-1) rotate(180deg)" }}
      />
      <span
        className="font-mono font-medium whitespace-nowrap text-black"
        style={{ fontSize: 16, letterSpacing: "-0.16px", lineHeight: 0.9 }}
      >
        JOIN WAITLIST
      </span>
    </button>
  );
}
