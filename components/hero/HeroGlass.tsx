"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The hero asterisk: cyan glass at rest, the dollar-glass render on hover.
 *
 * Both frames are the 1024-square normalisations of the designer's art, so they sit in the
 * same box and the swap lands in place. They are still different asterisks underneath — the
 * arms differ in proportion — so the fade is kept short: long enough to read as a dissolve,
 * short enough that the disagreement between the two silhouettes does not sit on screen as a
 * double image, which is what a slow cross-fade between them looked like.
 *
 * Hover is hit-tested against the art's own alpha, not the element box. The box is a square
 * and the asterisk does not fill it — its corners and the gaps between the arms are empty, so
 * a plain :hover would fire from space that looks like nothing at all.
 */

const REST_SRC = "/assets/hero-glass-rest.png";
const BILL_SRC = "/assets/hero-glass.png";

/** Resolution of the alpha lookup. Finer than the arms are thin. */
const LOOKUP = 128;
/** Base glass sits near alpha 176 inside the shape and 0 outside. */
const HIT = 40;

export default function HeroGlass({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const alpha = useRef<Uint8Array | null>(null);
  const [over, setOver] = useState(false);
  const [ready, setReady] = useState(false);

  // Sample the rest frame's alpha once. Reading pixels per pointer move would be far too
  // slow, and the shape never changes — only its transform does.
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = LOOKUP;
      c.height = LOOKUP;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, LOOKUP, LOOKUP);
      const px = ctx.getImageData(0, 0, LOOKUP, LOOKUP).data;
      const out = new Uint8Array(LOOKUP * LOOKUP);
      for (let i = 0; i < out.length; i++) out[i] = px[i * 4 + 3];
      alpha.current = out;
      setReady(true);
    };
    img.src = REST_SRC;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const map = alpha.current;
      if (!map) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!w || !h) return;

      // The plate is mid-rotation, so the pointer has to be taken back through whatever
      // transform it is currently under. getComputedStyle gives the live matrix — reading it
      // is what keeps the hit region on the art rather than on where the art started.
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      const inv = m.inverse();

      // transform-origin is the centre, so measure from there.
      const box = el.getBoundingClientRect();
      const p = inv.transformPoint(
        new DOMPoint(e.clientX - (box.left + box.width / 2), e.clientY - (box.top + box.height / 2)),
      );

      const u = p.x / w + 0.5;
      const v = p.y / h + 0.5;
      if (u < 0 || u > 1 || v < 0 || v > 1) return setOver(false);

      const ix = Math.min(LOOKUP - 1, Math.max(0, Math.floor(u * LOOKUP)));
      const iy = Math.min(LOOKUP - 1, Math.max(0, Math.floor(v * LOOKUP)));
      setOver(map[iy * LOOKUP + ix] > HIT);
    };

    const onLeave = () => setOver(false);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      // Reflects the hit test in the DOM. The hover has no other observable trace — the
      // reveal is an opacity on a child — so without this there is nothing to assert against.
      data-over={over ? "true" : "false"}
      data-alpha-ready={ready ? "true" : "false"}
      className={`hero-glass pointer-events-none select-none ${className ?? ""}`}
      style={style}
    >
      {/* Two layers because one element cannot animate transform twice — a second declaration
          replaces the first rather than composing. The outer turns, this one drifts. */}
      <div className="hero-glass-drift absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={REST_SRC} alt="" className="absolute inset-0 h-full w-full" />
        {/* The bill is clipped to the cyan plate's own alpha, so there is one silhouette on
            screen at every point of the fade. Stacking the two renders and cross-fading them
            does not work: they are different asterisks — the arms differ in proportion, ~22%
            of the shape — so mid-fade both outlines show and it reads as two asterisks.
            Masking makes the base's shape the only shape; the bill just fills it. */}
        <div className="hero-glass-bill absolute inset-0" style={{ opacity: over ? 1 : 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BILL_SRC} alt="" className="hero-glass-bill-art absolute inset-0 h-full w-full" />
        </div>
      </div>
    </div>
  );
}
