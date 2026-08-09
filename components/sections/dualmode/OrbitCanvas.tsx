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
const TOKEN_SIZE = 400; // px height of the formed hero token, at the desktop stage's size
const TOKEN_HEADROOM = 16; // px kept clear above the token when the canvas forces it smaller
const DURATION = 1.5; // seconds for a full OFF↔ON transition

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

    // Pre-scale each coin once, on load. The sources are ~230px tall and are drawn near
    // 56px, so the old path asked the rasteriser to filter a 4x downscale eighty times a
    // frame. Baking them to roughly their on-screen footprint makes each draw close to a
    // blit. Sized for the largest a coin ever gets (BASE_COIN x max sizeVar x max frontness)
    // at the dpr cap, so they are never upscaled.
    const SPRITE_H = Math.round(BASE_COIN * 1.5 * 2);
    // Blur ladder, in sprite-space px, baked once per coin. Doing it here rather than with
    // ctx.filter in the loop is the whole point: filter applies per draw call, so blurring
    // live would put a real gaussian on eighty draws a frame. Picking a pre-blurred sprite
    // costs nothing. Five steps is enough that the change tracks the spiral without the
    // jumps between them reading, given the coins are also accelerating and fading by then.
    const BLUR_STEPS = [0, 1.5, 3.5, 6, 9];
    // Room for the blur to spread into instead of clipping at the sprite's edge.
    const BLUR_PAD = 14;

    type Sprite = { levels: HTMLCanvasElement[]; aspect: number; padScale: number };
    const sprites: (Sprite | undefined)[] = [];

    const bake = (im: HTMLImageElement, idx: number) => {
      if (!im.complete || im.naturalWidth === 0) return;
      const a = im.naturalWidth / im.naturalHeight;
      const w = Math.max(1, Math.round(SPRITE_H * a));
      const h = SPRITE_H;
      const levels = BLUR_STEPS.map((blur) => {
        const off = document.createElement("canvas");
        off.width = w + BLUR_PAD * 2;
        off.height = h + BLUR_PAD * 2;
        const c2 = off.getContext("2d");
        if (!c2) return off;
        // Unsupported filter is simply ignored, which degrades to an unblurred coin.
        if (blur > 0) c2.filter = `blur(${blur}px)`;
        c2.drawImage(im, BLUR_PAD, BLUR_PAD, w, h);
        return off;
      });
      sprites[idx] = {
        levels,
        // Of the padded canvas, not the coin — the padding has to be drawn to scale or the
        // blur would be squeezed back into the coin's own footprint.
        aspect: (w + BLUR_PAD * 2) / (h + BLUR_PAD * 2),
        padScale: (h + BLUR_PAD * 2) / h,
      };
    };

    COIN_SRCS.forEach((src, idx) => {
      const im = new Image();
      im.onload = () => bake(im, idx);
      im.src = src;
      if (im.complete) bake(im, idx);
    });

    // Bake the token the same way, and for a second reason: it is a 900x900 PNG whose first
    // draw lands on the exact frame the token appears. Decoding and rasterising it there
    // costs a frame precisely at the moment the eye is on it, which is the hitch in the
    // hand-off. Doing it once up front means that frame is just a blit.
    let tokenSprite: { canvas: HTMLCanvasElement; aspect: number } | undefined;
    const token = new Image();
    token.onload = () => {
      if (token.naturalWidth === 0) return;
      const aspect = token.naturalWidth / token.naturalHeight;
      const off = document.createElement("canvas");
      off.height = Math.round(TOKEN_SIZE * 1.05 * 2); // max scale (breathing) x dpr cap
      off.width = Math.max(1, Math.round(off.height * aspect));
      off.getContext("2d")?.drawImage(token, 0, 0, off.width, off.height);
      tokenSprite = { canvas: off, aspect };
    };
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

    // Scratch buffers, allocated once. The render loop must not allocate: the old path built
    // a fresh array of `count` objects with .map() and then sorted a second array off it,
    // every frame — around five thousand short-lived objects a second at 80 coins and 60fps.
    // That much GC churn is exactly what reads as stutter in an otherwise cheap 2D canvas.
    const oX = new Float32Array(count);
    const oY = new Float32Array(count);
    const oScale = new Float32Array(count);
    const oAlpha = new Float32Array(count);
    const oFront = new Float32Array(count);
    const order = new Uint16Array(count);
    for (let i = 0; i < count; i++) order[i] = i;
    // Sorts the index array in place against oFront — painter's order without a new array.
    const byFront = (a: number, b: number) => oFront[a] - oFront[b];

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

    const drawToken = (
      cx: number,
      cy: number,
      size: number,
      scale: number,
      rot: number,
      alpha: number,
    ) => {
      if (!tokenSprite || alpha <= 0) return;
      const dh = size * scale;
      const dw = dh * tokenSprite.aspect;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      ctx.globalAlpha = clamp01(alpha);
      ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, dpr * cx, dpr * cy);
      ctx.drawImage(tokenSprite.canvas, -dw / 2, -dh / 2, dw, dh);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
    };

    const render = (dt: number, prog: number, elapsed: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const rxMax = w * 0.46;
      const ryMax = h * 0.46;
      const tokenBottom = mergeRef.current != null ? mergeRef.current : cy + TOKEN_SIZE / 2;
      // TOKEN_SIZE is the design value, taken off the 787px-tall desktop stage where there
      // happens to be room for it above the toggle. Mobile has far less: on a 390x560 canvas
      // the merge line sits at y=181, so a fixed 400 put 219px of the token — 55% of it —
      // above the top edge, and it was wider than the canvas besides. Fit it to whichever
      // constraint actually binds. The floor keeps it from collapsing on a very short canvas.
      const tokenSize = Math.max(
        96,
        Math.min(TOKEN_SIZE, w * 0.9, tokenBottom - TOKEN_HEADROOM),
      );
      const tokenCenterY = tokenBottom - tokenSize / 2;

      // These two overlap deliberately, 0.58 to 0.70. They used to be disjoint — the spiral
      // finished at 0.60 and the token only began at 0.66 — leaving a beat where the coins
      // sat piled on the merge point and nothing on screen changed. Intended as anticipation,
      // it reads as the animation catching. Starting the token while the last coins are
      // still closing hands off in one continuous move.
      const spiral = easeInOutCubic(clamp01(prog / 0.7));
      const tok = easeOutCubic(clamp01((prog - 0.58) / 0.42));
      const twist = spiral * Math.PI * 1.2; // spiral path, not straight lines
      const speedUp = 1 + spiral * 1.6;
      const coinAlpha = 1 - tok;

      if (coinAlpha > 0.01) {
        for (let i = 0; i < count; i++) {
          const c = coins[i];
          if (!reduced && dt > 0) {
            c.ang += c.angSpeed * dt * speedUp;
            c.selfRot += c.selfRotSpeed * dt;
          }
          const a = c.ang + twist;
          const frontness = (Math.sin(a) + 1) / 2;
          oX[i] = mix(cx + Math.cos(a) * rxMax * c.fr, cx, spiral); // converge to centre-x
          oY[i] = mix(cy + Math.sin(a) * ryMax * c.fr, tokenCenterY, spiral); // …and up
          oFront[i] = frontness;
          oScale[i] = (0.5 + 0.6 * frontness) * c.sizeVar;
          oAlpha[i] = (0.4 + 0.6 * frontness) * coinAlpha;
        }
        order.sort(byFront);

        // Blur tracks the spiral, so the coins are crisp while they orbit and smear into a
        // soft mass as they compress — which is what lets them dissolve into the token
        // instead of eighty hard edges vanishing under it.
        const blurIdx = Math.min(
          BLUR_STEPS.length - 1,
          Math.round(spiral * (BLUR_STEPS.length - 1)),
        );

        for (let k = 0; k < count; k++) {
          const i = order[k];
          const sprite = sprites[coins[i].img];
          if (!sprite) continue;
          const dh = BASE_COIN * oScale[i] * sprite.padScale;
          const dw = dh * sprite.aspect;
          const rot = coins[i].selfRot;
          const cos = Math.cos(rot);
          const sin = Math.sin(rot);
          ctx.globalAlpha = clamp01(oAlpha[i]);
          // setTransform rather than save/translate/rotate/restore. Eighty save/restore
          // pairs a frame is the other half of the cost — each one snapshots the whole 2D
          // state, and none of it needs preserving between coins.
          ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, dpr * oX[i], dpr * oY[i]);
          ctx.drawImage(sprite.levels[blurIdx], -dw / 2, -dh / 2, dw, dh);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = 1;
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
        drawToken(cx, tokenCenterY + floatY, tokenSize, scale, rot, tok);
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
      // The desktop and mobile trees are both in the DOM; one is display:none and measures
      // 0x0. Without the size test that twin still ran the whole simulation every frame
      // against a canvas nobody can see — the other canvases guard this way too.
      if (!visible || w === 0 || h === 0) return;
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
