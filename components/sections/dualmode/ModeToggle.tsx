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

/**
 * Figma geometry at full size. The knob's travel is deliberately not listed: it is whatever
 * the track has left over once the knob and its two insets are taken out, so scaling cannot
 * leave the knob stopping short of the end or running past it.
 */
const DESIGN = { w: 148, h: 68, knob: 54, inset: 7, dot: 8, dotTop: 12, dotRight: 14 };

export default function ModeToggle({
  on,
  onClick,
  animate = true,
  scale = 1,
  className,
}: {
  on: boolean;
  onClick?: () => void;
  animate?: boolean;
  /** 1 = the Figma size. Phones run smaller — see SoftwareModes. */
  scale?: number;
  className?: string;
}) {
  const t = animate ? `500ms ${EASE}` : "0ms";
  const px = (v: number) => Math.round(v * scale);
  const w = px(DESIGN.w);
  const h = px(DESIGN.h);
  const knob = px(DESIGN.knob);
  const inset = px(DESIGN.inset);
  const travel = w - knob - inset * 2;

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
        width: w,
        height: h,
        borderRadius: 999,
        background: on ? "var(--glow-cyan)" : "#d7dde0",
        // Shadows scale with the switch — held at full size they read as a much heavier
        // drop under a smaller control.
        boxShadow: on
          ? `0 ${px(10)}px ${px(34)}px ${px(-6)}px rgba(10,217,220,0.65), inset 0 1px 2px rgba(255,255,255,0.4)`
          : `0 ${px(4)}px ${px(14)}px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.5)`,
        transition: `background ${t}, box-shadow ${t}`,
      }}
    >
      {/* status dot, brightens with ON */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: px(DESIGN.dotTop),
          right: px(DESIGN.dotRight),
          width: px(DESIGN.dot),
          height: px(DESIGN.dot),
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
          top: inset,
          left: inset,
          width: knob,
          height: knob,
          borderRadius: "50%",
          background: "linear-gradient(180deg, #ffffff 0%, #eef1f2 100%)",
          boxShadow: `0 ${px(6)}px ${px(14)}px rgba(0,0,0,0.28), inset 0 1px 1px rgba(255,255,255,0.9)`,
          transform: on ? `translateX(${travel}px)` : "translateX(0)",
          transition: `transform ${t}`,
        }}
      />
    </button>
  );
}
