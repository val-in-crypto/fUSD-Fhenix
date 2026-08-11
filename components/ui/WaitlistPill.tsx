import { ArrowEnter } from "@/components/hero/icons";

/**
 * JOIN WAITLIST CTA — Figma node 91:40. Cyan (#0AD9DC / --glow-cyan) pill with a light-cyan
 * (#ABFEFF) hairline border, a soft drop shadow, and a dark Geist Mono SemiBold label + icon.
 */

/**
 * Label and icon colour. Not in CLAUDE.md's token layer and close to but distinct from --ink
 * (#001623), so it stays a local constant rather than being folded into either — adding to the
 * token layer is the designer's call.
 *
 * Set once on the button: the icon draws with currentColor, so the label and the arrow cannot
 * drift apart the way two separate colour classes would.
 */
const LABEL = "#122531";

/** Fhenix's Mailchimp signup. Every instance of this pill points here — the hero's, the
 *  "rebuilding value" section's and the footer's — so the destination lives in one place. */
const WAITLIST_URL = "https://mailchi.mp/fhenix/d8otecz7tq";

/** Matches Socials: a new tab, and noopener so the opened page cannot reach back through
 *  window.opener. */
const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function WaitlistPill({ className }: { className?: string }) {
  return (
    // An anchor, not a button: this navigates. As a button it was inert, and it also cost
    // middle-click, cmd-click and "copy link address", which people expect of a CTA.
    <a
      href={WAITLIST_URL}
      {...EXTERNAL}
      className={`inline-flex items-center gap-2 rounded-full bg-glow-cyan ${className ?? ""}`}
      style={{
        padding: "10px 20px",
        border: "1px solid #ABFEFF",
        boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.1)",
        color: LABEL,
      }}
    >
      <ArrowEnter className="size-5 shrink-0" style={{ transform: "scaleY(-1) rotate(180deg)" }} />
      <span
        className="font-mono font-semibold whitespace-nowrap"
        style={{ fontSize: 16, letterSpacing: "-0.16px", lineHeight: 0.9 }}
      >
        JOIN WAITLIST
      </span>
    </a>
  );
}
