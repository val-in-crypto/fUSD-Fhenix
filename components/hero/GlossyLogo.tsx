"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { PerspectiveCamera, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/components/motion/MotionProvider";
import { fragmentShader, vertexShader } from "./shaders/glossyLogo";

const BASE_ROTATION = (-25.98 * Math.PI) / 180;
// World units across the smaller viewport edge, so larger = smaller logo.
//
// Set from the designer's render rather than by eye. In hero-glass.png the asterisk fills 72%
// of its frame's height, and that frame is placed 599.4px tall in a 1024px stage — so the
// mark is meant to stand about 431px, or 42% of the stage. Every value this has held was well
// over that: 2.5 gave 64%, 2.1 gave 74%, 2.3 gave 64% again at the sizes actually measured.
//
// The arithmetic runs: the asterisk covers 0.91 of tex-base.png, on a 1.7 quad, so its height
// is 1.547 / VIEW of the canvas's smaller edge. 3.5 lands it on the design's 42%.
//
// Scaled rather than stretched — the plate is square and the art is square within it, so
// pulling only its height would distort the mark itself.
const VIEW = 3.5;
// Vertical FOV. Narrow on purpose: enough foreshortening for the tilt to read as depth,
// short of the wide-angle stretch that would fight the flat, product-shot framing.
const FOV = 30;

// physics feel — defaults; overridable via props for art direction
const DEFAULTS = {
  reflStrength: 0.35,
  inertiaDecay: 0.94, // per 1/60 s
  tiltClamp: 30, // degrees
  idleSpeed: 0.5,
  scrollReveal: 0.9, // ceiling of scroll's contribution to the reveal; 0 disables it
  idleTilt: 0.55, // fraction of tiltClamp used by the resting wobble; 0 = flat spin only
  // Ceiling on the edge bloom reached when the pointer is over the logo or the plate is turned
  // right off-axis. It used to gate the note; the note is always shown now, so this scales how
  // much extra light the glass catches instead. 0 leaves the render entirely alone.
  edgeBloom: 1,
  // How far the plate leans toward the cursor on approach, as a fraction of tiltClamp.
  //
  // Off. The lean tilted the plate to face the pointer, which both moved it and foreshortened
  // it — a mark that shifts and squashes whenever the cursor passes near it. Hover still
  // brings the portrait up; it just no longer touches the geometry. Kept as a prop rather
  // than deleted, so the behaviour is one number away if it is ever wanted back.
  hoverLean: 0,
};
const SPIN_SENS = 0.01;
const TILT_SENS_X = 0.002;
const TILT_SENS_Y = 0.006;
const TILT_DECAY = 0.9;
// Scroll speed (px/s) that reads as a "full" reveal — roughly one brisk wheel flick.
const SCROLL_REF = 1400;
// Per 1/60 s falloff of the scroll signal once the page stops moving. Slower than the
// spin's inertiaDecay so the reflection lingers a beat instead of snapping off.
const SCROLL_DECAY = 0.88;
// Rad/s of the resting tilt wobble. The two axes run at different rates so they trace a
// slow lissajous rather than a repeating figure-eight.
const IDLE_TILT_SPEED = 0.42;
const IDLE_TILT_RATIO = 0.68; // second axis rate, relative to the first
const HOVER_EASE = 6; // approach rate per second toward the measured proximity
// Resolution of the alpha lookup built from the base texture. The hover tests this rather
// than the quad the asterisk is drawn on: the quad is square and the asterisk does not fill
// it, so raycasting the mesh alone would still trigger from the empty corners.
const ALPHA_LOOKUP = 128;
// Base glass renders around alpha 176 inside the shape and 0 outside, so anything well clear
// of zero reads as "on the art" while still excluding the antialiased fringe.
const ALPHA_HIT = 40;
// multiplier on idleSpeed -> resting angular velocity (rad/s); default 0.5*0.2 = 0.1 rad/s,
// a full turn in ~63s (luxury-watch pace).
const IDLE_VEL = 0.2;

const FALLBACK_STYLE: React.CSSProperties = { transform: "rotate(-25.98deg)", opacity: 0.7 };

export type GlossyLogoProps = {
  reflStrength?: number;
  inertiaDecay?: number;
  tiltClamp?: number; // degrees
  idleSpeed?: number;
  scrollReveal?: number;
  idleTilt?: number;
  edgeBloom?: number;
  hoverLean?: number;
};

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    // Dolly the camera so VIEW world units still span the smaller viewport edge — the same
    // framing the orthographic zoom gave, so the logo keeps its designed on-screen size and
    // only gains perspective. fov comes from the JSX prop and aspect from R3F's resize
    // handling, so distance is the only thing left to solve for.
    cam.position.z = VIEW / (2 * Math.tan((FOV * Math.PI) / 360) * Math.min(1, aspect));
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function LogoQuad({
  reflStrength,
  inertiaDecay,
  tiltClamp,
  idleSpeed,
  scrollReveal,
  idleTilt,
  edgeBloom,
  hoverLean,
  reducedMotion,
  onReady,
}: Required<GlossyLogoProps> & { reducedMotion: boolean; onReady: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();
  const maxTilt = (tiltClamp * Math.PI) / 180;
  const ready = useRef(false);

  // Two textures where there were five. The cyan base, its normal map and the second angle
  // frame all existed to reconstruct the note onto a different asterisk; the render carries its
  // own bevels and its own outline, so none of them have anything left to do.
  const [art, env] = useTexture(["/assets/tex-dollar-a.png", "/assets/dollar.png"]);
  art.colorSpace = THREE.SRGBColorSpace;
  env.colorSpace = THREE.SRGBColorSpace;
  env.wrapS = env.wrapT = THREE.RepeatWrapping;

  const uniforms = useMemo(
    () => ({
      uArt: { value: art },
      uEnv: { value: env },
      uTime: { value: 0 },
      uHover: { value: 0 },
      uReflStrength: { value: reflStrength },
      uVelocity: { value: 0 },
      uRotation: { value: new THREE.Vector2(0, 0) },
    }),
    [art, env],
  );
  uniforms.uReflStrength.value = reflStrength;

  const material = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true }),
    [uniforms],
  );

  const spin = useRef(0);
  const spinVel = useRef(0);
  const tilt = useRef(new THREE.Vector2(0, 0));
  const vel = useRef(0);
  const dragging = useRef(false);
  const idleDir = useRef(1); // sign of the resting idle spin — follows the last flick
  const last = useRef({ x: 0, y: 0, t: 0 });
  const scrollEnergy = useRef(0); // 0..1, normalised scroll speed; decays in useFrame
  const hover = useRef(0); // eased 0..1 pointer proximity
  const hoverTarget = useRef(0); // measured proximity, before easing
  const hoverDir = useRef(new THREE.Vector2(0, 0)); // unit offset from centre to pointer
  const canvasRect = useRef<DOMRect | null>(null);

  // Alpha lookup off the base texture, so the hover can ask "is the pointer on the asterisk"
  // rather than "is it near the canvas". Sampled once into a small array — reading pixels per
  // pointer move would be far too slow, and 128 is finer than the arms are thin.
  const alphaMap = useMemo(() => {
    const img = art.image as CanvasImageSource & { width?: number };
    if (!img || !img.width) return null;
    const c = document.createElement("canvas");
    c.width = ALPHA_LOOKUP;
    c.height = ALPHA_LOOKUP;
    const ctx2d = c.getContext("2d", { willReadFrequently: true });
    if (!ctx2d) return null;
    ctx2d.drawImage(img, 0, 0, ALPHA_LOOKUP, ALPHA_LOOKUP);
    const px = ctx2d.getImageData(0, 0, ALPHA_LOOKUP, ALPHA_LOOKUP).data;
    const out = new Uint8Array(ALPHA_LOOKUP * ALPHA_LOOKUP);
    for (let i = 0; i < out.length; i++) out[i] = px[i * 4 + 3];
    return out;
  }, [art]);

  // uv is fixed to the plate, so this stays correct however far the logo has spun or tilted.
  // Flipped on v: GL samples bottom-up, the 2D canvas above wrote top-down.
  const overArt = (uv?: THREE.Vector2) => {
    if (!alphaMap || !uv) return false;
    const x = Math.min(ALPHA_LOOKUP - 1, Math.max(0, Math.floor(uv.x * ALPHA_LOOKUP)));
    const y = Math.min(ALPHA_LOOKUP - 1, Math.max(0, Math.floor((1 - uv.y) * ALPHA_LOOKUP)));
    return alphaMap[y * ALPHA_LOOKUP + x] > ALPHA_HIT;
  };

  // Cached and refreshed on resize/scroll rather than measured in the pointer handler —
  // getBoundingClientRect there would force a layout on every move. Only the lean direction
  // needs it now; whether the pointer counts as "over" comes from the raycast.
  useEffect(() => {
    const el = gl.domElement;
    const measure = () => {
      canvasRect.current = el.getBoundingClientRect();
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [gl]);

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const on = overArt(e.uv);
    hoverTarget.current = on ? 1 : 0;
    if (!on) return;
    const r = canvasRect.current;
    if (!r || r.width === 0 || r.height === 0) return;
    const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.max(Math.hypot(nx, ny), 1e-3);
    hoverDir.current.set(nx / len, ny / len);
  };

  // R3F only raycasts the quad, so leaving it stops firing move events entirely — without
  // this the reveal would stick at whatever it held on the way out.
  const onPointerOut = () => {
    hoverTarget.current = 0;
  };

  // YXZ so the Z spin is applied first, about the plate's own normal, and the X/Y tilt then
  // turns that spinning plate in view space. Default XYZ order would let the tilt drag the
  // spin axis around with it and the turn would read as a wobble instead of a rotation.
  useEffect(() => {
    if (meshRef.current) meshRef.current.rotation.order = "YXZ";
  }, []);

  // Page scroll is a second driver for the reflection, so the dollar reads on the way down
  // the page and not only on drag. Attack is instant (take the peak), release is the
  // SCROLL_DECAY falloff in useFrame. Off under reduced motion — CLAUDE.md forbids
  // auto-sheen there, and the logo stays draggable regardless.
  useEffect(() => {
    if (reducedMotion) return;
    let lastY = window.scrollY;
    let lastT = performance.now();

    const onScroll = () => {
      const now = performance.now();
      const dt = Math.max(16, now - lastT) / 1000;
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      lastT = now;
      const norm = Math.min(1, Math.abs(dy) / dt / SCROLL_REF);
      scrollEnergy.current = Math.max(scrollEnergy.current, norm);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reducedMotion]);

  useEffect(() => {
    const el = gl.domElement;
    el.style.cursor = "grab";
    el.style.touchAction = "none";

    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const now = performance.now();
      const dt = Math.max(16, now - last.current.t) / 1000;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      spin.current += dx * SPIN_SENS;
      spinVel.current = (dx * SPIN_SENS) / dt;
      if (dx !== 0) idleDir.current = Math.sign(dx);
      tilt.current.x += dx * TILT_SENS_X;
      tilt.current.y += dy * TILT_SENS_Y;
      last.current.x = e.clientX;
      last.current.y = e.clientY;
      last.current.t = now;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      if (reducedMotion) spinVel.current = 0;
      el.style.cursor = "grab";
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [gl, reducedMotion]);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    dragging.current = true;
    spinVel.current = 0;
    last.current.x = e.clientX;
    last.current.y = e.clientY;
    last.current.t = performance.now();
    gl.domElement.style.cursor = "grabbing";
    try {
      gl.domElement.setPointerCapture(e.pointerId);
    } catch {}
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const f = dt * 60;

    if (!dragging.current) {
      if (reducedMotion) {
        spinVel.current = 0;
      } else {
        // Ease angular velocity toward a slow, continuous idle spin (luxury-watch pace) in
        // the last-flicked direction. A flick blooms, then decays gently back to idle — no
        // snap, no overshoot. In-plane (Z) spin only: the asterisk is a flat plate, so a
        // Y-axis turn would send it edge-on and vanish (CLAUDE.md hard constraint).
        const idleVel = idleSpeed * IDLE_VEL * idleDir.current;
        spinVel.current = idleVel + (spinVel.current - idleVel) * Math.pow(inertiaDecay, f);
        spin.current += spinVel.current * dt;
        tilt.current.multiplyScalar(Math.pow(TILT_DECAY, f));
      }
    }

    // Keep spin 2π-periodic (visually seamless) so float precision holds over long idles.
    if (!reducedMotion) {
      const TWO_PI = Math.PI * 2;
      spin.current = ((spin.current % TWO_PI) + TWO_PI) % TWO_PI;
    }

    tilt.current.x = THREE.MathUtils.clamp(tilt.current.x, -maxTilt, maxTilt);
    tilt.current.y = THREE.MathUtils.clamp(tilt.current.y, -maxTilt, maxTilt);

    // The reflection answers to whichever is stronger right now: the spin physics or the
    // page scroll. Both feed the same band sweep + sheen bloom, so a scroll reads like a
    // flick rather than as a separate effect.
    if (!reducedMotion) scrollEnergy.current *= Math.pow(SCROLL_DECAY, f);
    const scrollDrive = reducedMotion ? 0 : scrollEnergy.current * scrollReveal;

    const speed = Math.abs(spinVel.current);
    const targetVel = Math.min(1, Math.max(speed * 0.5, scrollDrive));
    if (reducedMotion) vel.current = targetVel;
    else vel.current += (targetVel - vel.current) * 0.15;

    // Resting wobble on both tilt axes, so the plate keeps reading as a solid object even
    // when nobody is touching it — a pure Z spin is what made it look like a flat disc.
    // Amplitude is a fraction of tiltClamp and the sum below is re-clamped, so drag plus
    // wobble can still never approach edge-on, where a backless plate would vanish.
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    const wobble = reducedMotion ? 0 : maxTilt * idleTilt;
    const idleX = Math.sin(t * IDLE_TILT_SPEED) * wobble;
    const idleY = Math.cos(t * IDLE_TILT_SPEED * IDLE_TILT_RATIO) * wobble * 0.7;

    // Ease the measured proximity so the plate arrives at the cursor rather than snapping.
    hover.current += (hoverTarget.current - hover.current) * Math.min(1, dt * HOVER_EASE);

    // Lean toward the cursor. Negated on Y so the edge nearest the pointer swings forward
    // rather than away, which is what reads as the plate turning to face it.
    const lean = maxTilt * hoverLean * hover.current;
    const hoverX = hoverDir.current.y * lean;
    const hoverY = -hoverDir.current.x * lean;

    // Vertical drag tips around X, horizontal drag turns around Y.
    const tiltX = THREE.MathUtils.clamp(tilt.current.y + idleX + hoverX, -maxTilt, maxTilt);
    const tiltY = THREE.MathUtils.clamp(tilt.current.x + idleY + hoverY, -maxTilt, maxTilt);

    if (meshRef.current) {
      meshRef.current.rotation.set(tiltX, tiltY, BASE_ROTATION + spin.current);
    }
    uniforms.uRotation.value.set(spin.current + tilt.current.x, tilt.current.y);

    // How far the user has actually turned the plate off-axis, 0..1. Read off the drag tilt
    // alone, not the composed tiltX/tiltY: those carry the idle wobble, which never stops.
    const turn = Math.min(1, Math.hypot(tilt.current.x, tilt.current.y) / maxTilt);
    // Hover and turn now bloom the *edges* rather than gating the note — the note is simply
    // always there. So approaching the plate makes its glass catch more light, which answers
    // the cursor without moving or foreshortening the mark.
    uniforms.uHover.value = edgeBloom * Math.max(hover.current, turn);
    uniforms.uVelocity.value = vel.current;
    uniforms.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime;

    if (!ready.current) {
      ready.current = true;
      onReady(); // first painted frame -> parent hides the fallback image
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[0, 0, BASE_ROTATION]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
    >
      <planeGeometry args={[1.7, 1.7]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export default function GlossyLogo(props: GlossyLogoProps) {
  const settings = { ...DEFAULTS, ...props };
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [visible, setVisible] = useState(true); // gate the frameloop to on-screen
  const [painted, setPainted] = useState(false); // hide fallback once the canvas paints
  // The responsive layout keeps both desktop and mobile trees in the DOM (one is
  // display:none). Without this, the canvas would mount twice and burn two WebGL
  // contexts. Only mount where the container actually has size.
  const [hasSize, setHasSize] = useState(false);
  const reduced = useReducedMotion(); // shared source of truth

  useEffect(() => {
    setMounted(true);
    setWebgl(detectWebGL());

    const el = wrapRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      setHasSize(r.width > 0 && r.height > 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.01,
    });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full"
      role="img"
      aria-label="fUSD glossy logo, drag to rotate"
    >
      {/* Static fallback: SSR content, load placeholder, and the no-WebGL path.
          Hidden once the canvas paints its first frame so it can't ghost behind rotation.
          The accessible name lives on the wrapper, so it survives this being removed. */}
      {!painted && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/tex-dollar-a.png"
          alt=""
          aria-hidden="true"
          // Same texture the canvas draws, so the handoff is invisible — it used to be the cyan
          // asterisk, which is a different render and a different silhouette, so the swap
          // flashed one plate into another.
          //
          // 48.57% is the quad's own share of the frame: it is 1.7 world units against a VIEW
          // of 3.5. Capping both axes rather than setting a width makes that a share of the
          // *smaller* edge, which is what VIEW spans — the desktop slot is landscape and the
          // mobile one portrait, so a width alone would only be right on one of them.
          className="pointer-events-none absolute inset-0 m-auto max-h-[48.57%] max-w-[48.57%] select-none"
          style={FALLBACK_STYLE}
        />
      )}

      {mounted && webgl && hasSize && (
        <Canvas
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          dpr={[1, 2]}
          frameloop={visible ? "always" : "never"}
          className="absolute inset-0"
          style={{ width: "100%", height: "100%" }}
          aria-hidden="true"
        >
          <PerspectiveCamera makeDefault fov={FOV} position={[0, 0, 5]} />
          <FitCamera />
          <LogoQuad
            reflStrength={settings.reflStrength}
            inertiaDecay={settings.inertiaDecay}
            tiltClamp={settings.tiltClamp}
            idleSpeed={settings.idleSpeed}
            scrollReveal={settings.scrollReveal}
            idleTilt={settings.idleTilt}
            edgeBloom={settings.edgeBloom}
            hoverLean={settings.hoverLean}
            reducedMotion={reduced}
            onReady={() => setPainted(true)}
          />
          {!reduced && (
            <EffectComposer>
              <Bloom intensity={0.4} luminanceThreshold={0.72} luminanceSmoothing={0.15} mipmapBlur />
            </EffectComposer>
          )}
        </Canvas>
      )}
    </div>
  );
}
