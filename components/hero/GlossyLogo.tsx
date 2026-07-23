"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrthographicCamera, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/components/motion/MotionProvider";
import { fragmentShader, vertexShader } from "./shaders/glossyLogo";

const BASE_ROTATION = (-25.98 * Math.PI) / 180;
const VIEW = 2.5; // world units across the smaller viewport edge (larger = smaller logo)

// physics feel — defaults; overridable via props for art direction
const DEFAULTS = {
  reflStrength: 0.35,
  inertiaDecay: 0.94, // per 1/60 s
  tiltClamp: 30, // degrees
  idleSpeed: 0.5,
};
const SPIN_SENS = 0.01;
const TILT_SENS_X = 0.002;
const TILT_SENS_Y = 0.006;
const TILT_DECAY = 0.9;
const IDLE_AMP = 0.0006;

const FALLBACK_STYLE: React.CSSProperties = { transform: "rotate(-25.98deg)", opacity: 0.7 };

export type GlossyLogoProps = {
  reflStrength?: number;
  inertiaDecay?: number;
  tiltClamp?: number; // degrees
  idleSpeed?: number;
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
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = Math.min(size.width, size.height) / VIEW;
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function LogoQuad({
  reflStrength,
  inertiaDecay,
  tiltClamp,
  idleSpeed,
  reducedMotion,
  onReady,
}: Required<GlossyLogoProps> & { reducedMotion: boolean; onReady: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();
  const maxTilt = (tiltClamp * Math.PI) / 180;
  const ready = useRef(false);

  const [base, normal, dollar, env] = useTexture([
    "/assets/tex-base.png",
    "/assets/tex-normal.png",
    "/assets/tex-dollar-a.png",
    "/assets/dollar.png",
  ]);
  base.colorSpace = THREE.SRGBColorSpace;
  dollar.colorSpace = THREE.SRGBColorSpace;
  env.colorSpace = THREE.SRGBColorSpace;
  normal.colorSpace = THREE.NoColorSpace;
  env.wrapS = env.wrapT = THREE.RepeatWrapping;

  const uniforms = useMemo(
    () => ({
      uBase: { value: base },
      uNormal: { value: normal },
      uDollar: { value: dollar },
      uEnv: { value: env },
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uReflStrength: { value: reflStrength },
      uVelocity: { value: 0 },
      uRotation: { value: new THREE.Vector2(0, 0) },
    }),
    [base, normal, dollar, env], // eslint-disable-line react-hooks/exhaustive-deps
  );
  uniforms.uReflStrength.value = reflStrength;

  const material = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true }),
    [uniforms],
  );

  const spin = useRef(0);
  const spinVel = useRef(0);
  const tilt = useRef(new THREE.Vector2(0, 0));
  const reveal = useRef(0);
  const vel = useRef(0);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0, t: 0 });

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
        spinVel.current *= Math.pow(inertiaDecay, f);
        spin.current += spinVel.current * dt;
        tilt.current.multiplyScalar(Math.pow(TILT_DECAY, f));
        if (Math.abs(spinVel.current) < 0.06) {
          spin.current += Math.sin(state.clock.elapsedTime * idleSpeed) * IDLE_AMP;
        }
      }
    }

    tilt.current.x = THREE.MathUtils.clamp(tilt.current.x, -maxTilt, maxTilt);
    tilt.current.y = THREE.MathUtils.clamp(tilt.current.y, -maxTilt, maxTilt);

    const speed = Math.abs(spinVel.current);
    const targetReveal = Math.min(1, speed * 0.4);
    if (reducedMotion) {
      vel.current = Math.min(1, speed * 0.5);
      reveal.current = targetReveal;
    } else {
      vel.current += (Math.min(1, speed * 0.5) - vel.current) * 0.15;
      reveal.current += (targetReveal - reveal.current) * Math.min(1, dt * 5);
    }

    if (meshRef.current) meshRef.current.rotation.z = BASE_ROTATION + spin.current;
    uniforms.uRotation.value.set(spin.current + tilt.current.x, tilt.current.y);
    uniforms.uReveal.value = reveal.current;
    uniforms.uVelocity.value = vel.current;
    uniforms.uTime.value = reducedMotion ? 0 : state.clock.elapsedTime;

    if (!ready.current) {
      ready.current = true;
      onReady(); // first painted frame -> parent hides the fallback image
    }
  });

  return (
    <mesh ref={meshRef} rotation={[0, 0, BASE_ROTATION]} onPointerDown={onPointerDown}>
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
          src="/assets/asterisk.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto h-auto w-[75%] max-w-none select-none"
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
          <OrthographicCamera makeDefault position={[0, 0, 5]} />
          <FitCamera />
          <LogoQuad
            reflStrength={settings.reflStrength}
            inertiaDecay={settings.inertiaDecay}
            tiltClamp={settings.tiltClamp}
            idleSpeed={settings.idleSpeed}
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
