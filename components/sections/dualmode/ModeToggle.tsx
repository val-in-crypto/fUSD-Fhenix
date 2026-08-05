"use client";

/**
 * The Dual Mode toggle. A controlled iOS-style switch: `on` drives the knob (left→right)
 * and the track (muted grey → cyan glow). The 500ms easeInOutCubic flip matches §A3's
 * "toggle slides OFF → ON" beat. `animate={false}` disables the transition for the
 * reduced-motion path (rendered straight into its final state).
 *
 * Styling mirrors the Figma toggle art (node "Hero Section"): cyan pill, glossy white knob,
 * soft drop shadow, a faint status dot top-right.
 */
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)"; // easeInOutCubic

export default function ModeToggle({
  on,
  onClick,
  animate = true,
  className,
}: {
  on: boolean;
  onClick?: () => void;
  animate?: boolean;
  className?: string;
}) {
  const t = animate ? `500ms ${EASE}` : "0ms";
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label="Toggle Dual Mode"
      className={`cursor-pointer ${className ?? ""}`}
      style={{
        position: "relative",
        display: "block",
        border: "none",
        padding: 0,
        width: 148,
        height: 68,
        borderRadius: 999,
        background: on ? "var(--glow-cyan)" : "#d7dde0",
        boxShadow: on
          ? "0 10px 34px -6px rgba(10,217,220,0.65), inset 0 1px 2px rgba(255,255,255,0.4)"
          : "0 4px 14px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.5)",
        transition: `background ${t}, box-shadow ${t}`,
      }}
    >
      {/* status dot, brightens with ON */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 12,
          right: 14,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#ffffff",
          opacity: on ? 0.9 : 0.35,
          transition: `opacity ${t}`,
        }}
      />
      {/* knob */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 7,
          left: 7,
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: "linear-gradient(180deg, #ffffff 0%, #eef1f2 100%)",
          boxShadow: "0 6px 14px rgba(0,0,0,0.28), inset 0 1px 1px rgba(255,255,255,0.9)",
          transform: on ? "translateX(80px)" : "translateX(0)",
          transition: `transform ${t}`,
        }}
      />
    </button>
  );
}
