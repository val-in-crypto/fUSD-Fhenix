"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/components/motion/MotionProvider";
import { clamp01, easeInOutCubic, easeOutCubic, mix } from "./sequence";

const COIN_SRCS = [
  "/assets/coin-1.png",
  "/assets/coin-2.png",
  "/assets/coin-3.png",
  "/assets/coin-4.png",
  "/assets/coin-5.png",
];
const TOKEN_SRC = "/assets/hero-token.png";

const BASE_COIN = 56; // px baseline coin height at depth 1
const TOKEN_SIZE = 400; // px height of the formed hero token
const DURATION = 2.8; // seconds for a full OFF↔ON transition

/** Deterministic pseudo-random in [0,1) — no Math.random, so the field is identical every
 *  mount (§A3: "deterministic, not random"). */
function rand(i: number, s: number) {
  const x = Math.sin((i + 1) * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type Coin = {
  img: number;
  fr: number;
  ang: number;
  angSpeed: number;
  sizeVar: number;
  selfRot: number;
  selfRotSpeed: number;
};

/**
 * Animation 3 engine (Canvas 2D), driven by the Dual Mode toggle — fully reversible.
 *
 * - `on = false` → the deterministic coin solar-system orbits the centre (State 0).
 * - `on = true`  → coins spiral inward, compress, and merge into the hero token.
 *
 * A single `prog` (0→1) eases toward the target each frame, so flipping the toggle plays the
 * merge forward or the expansion in reverse. One 2D canvas (no third WebGL context),
 * visibility-gated, DPR-capped. Reduced motion snaps to the target state with no motion.
 */
export default function OrbitCanvas({
  count = 80,
  on = false,
  mergeBottomY,
  className,
}: {
  count?: number;
  /** target state — false = orbit, true = merged token */
  on?: boolean;
  /** y (px, relative to canvas top) the hero token's BOTTOM sits at — 48px above the toggle */
  mergeBottomY?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const onRef = useRef(on);
  const mergeRef = useRef(mergeBottomY);
  // Sync latest props into refs the rAF loop reads (never mutate refs during render).
  useEffect(() => {
    onRef.current = on;
  }, [on]);
  useEffect(() => {
    mergeRef.current = mergeBottomY;
  }, [mergeBottomY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgs = COIN_SRCS.map((src) => {
      const im = new Image();
      im.src = src;
      return im;
    });
    const token = new Image();
    token.src = TOKEN_SRC;

    const coins: Coin[] = Array.from({ length: count }, (_, i) => ({
      img: i % COIN_SRCS.length,
      fr: 0.4 + rand(i, 1) * 0.6,
      ang: rand(i, 2) * Math.PI * 2,
      angSpeed: 0.05 + rand(i, 3) * 0.05,
      sizeVar: 0.65 + rand(i, 4) * 0.7,
      selfRot: rand(i, 5) * Math.PI * 2,
      selfRotSpeed: (rand(i, 6) - 0.5) * 0.5,
    }));

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), {
      threshold: 0.01,
    });
    io.observe(canvas);

    const drawToken = (cx: number, cy: number, scale: number, rot: number, alpha: number) => {
      if (!token.complete || token.naturalWidth === 0 || alpha <= 0) return;
      const aspect = token.naturalWidth / token.naturalHeight;
      const dh = TOKEN_SIZE * scale;
      const dw = dh * aspect;
      ctx.save();
      ctx.globalAlpha = clamp01(alpha);
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.drawImage(token, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    };

    const render = (dt: number, prog: number, elapsed: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const rxMax = w * 0.46;
      const ryMax = h * 0.46;
      const tokenBottom = mergeRef.current != null ? mergeRef.current : cy + TOKEN_SIZE / 2;
      const tokenCenterY = tokenBottom - TOKEN_SIZE / 2;

      const spiral = easeInOutCubic(clamp01(prog / 0.6)); // coils in over the first 60%
      const tok = easeOutCubic(clamp01((prog - 0.66) / 0.34)); // token forms over the last third
      const twist = spiral * Math.PI * 1.2; // spiral path, not straight lines
      const speedUp = 1 + spiral * 1.6;
      const coinAlpha = 1 - tok;

      if (coinAlpha > 0.01) {
        const list = coins.map((c) => {
          if (!reduced && dt > 0) {
            c.ang += c.angSpeed * dt * speedUp;
            c.selfRot += c.selfRotSpeed * dt;
          }
          const a = c.ang + twist;
          const orbitX = cx + Math.cos(a) * rxMax * c.fr;
          const orbitY = cy + Math.sin(a) * ryMax * c.fr;
          const x = mix(orbitX, cx, spiral); // converge to centre-x
          const y = mix(orbitY, tokenCenterY, spiral); // …and up to the token point
          const frontness = (Math.sin(a) + 1) / 2;
          const scale = (0.5 + 0.6 * frontness) * c.sizeVar;
          const alpha = (0.4 + 0.6 * frontness) * coinAlpha;
          return { c, x, y, frontness, scale, alpha };
        });
        list.sort((a, b) => a.frontness - b.frontness);

        for (const it of list) {
          const im = imgs[it.c.img];
          if (!im.complete || im.naturalWidth === 0) continue;
          const aspect = im.naturalWidth / im.naturalHeight;
          const dh = BASE_COIN * it.scale;
          const dw = dh * aspect;
          ctx.save();
          ctx.globalAlpha = clamp01(it.alpha);
          ctx.translate(it.x, it.y);
          ctx.rotate(it.c.selfRot);
          ctx.drawImage(im, -dw / 2, -dh / 2, dw, dh);
          ctx.restore();
        }
      }

      if (tok > 0) {
        let scale = mix(0.85, 1, tok);
        let rot = (1 - tok) * 0.22; // untwists slightly as it forms
        let floatY = 0;
        // idle breathing loop once fully merged
        if (!reduced && onRef.current && prog > 0.999) {
          const ph = elapsed * ((2 * Math.PI) / 8);
          scale += 0.03 * Math.sin(ph); // 100→103→100%
          floatY += -6 * Math.sin(ph); //  +6→−6→+6px
          rot += ((2 * Math.PI) / 180) * Math.sin(ph); // −2°→2°→−2°
        }
        drawToken(cx, tokenCenterY + floatY, scale, rot, tok);
      }
    };

    let prog = onRef.current ? 1 : 0;
    let elapsed = 0;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      elapsed += dt;

      const target = onRef.current ? 1 : 0;
      if (reduced) {
        prog = target;
      } else if (prog < target) {
        prog = Math.min(target, prog + dt / DURATION);
      } else if (prog > target) {
        prog = Math.max(target, prog - dt / DURATION);
      }
      render(dt, prog, elapsed);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      ro.disconnect();
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [count, reduced]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
