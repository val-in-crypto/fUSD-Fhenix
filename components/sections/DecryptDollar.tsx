"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/components/motion/MotionProvider";
import { useScrollProgress } from "@/components/motion/useScrollProgress";
import { fragmentShader, vertexShader } from "./shaders/decryptDollar";

const PLAIN_SRC = "/assets/dollar.png"; // plaintext bill — progress 0
const CIPHER_SRC = "/assets/dollar-engraved.png"; // cyan cipher plate — progress 1

/** Remap raw travel-through-viewport into the window where the decrypt should play. */
const START = 0.25;
const END = 0.7;
const remap = (p: number) => Math.min(1, Math.max(0, (p - START) / (END - START)));

function FillCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.left = -1;
    cam.right = 1;
    cam.top = 1;
    cam.bottom = -1;
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

type PlateProps = {
  progressRef: React.RefObject<number>;
  reduced: boolean;
  debugProgress?: number;
  onReady: () => void;
};

function Plate({ progressRef, reduced, debugProgress, onReady }: PlateProps) {
  const { size } = useThree();
  const ready = useRef(false);
  const [plain, cipher] = useTexture([PLAIN_SRC, CIPHER_SRC]);
  plain.colorSpace = THREE.SRGBColorSpace;
  cipher.colorSpace = THREE.SRGBColorSpace;

  const plainImg = plain.image as { width: number; height: number };
  const cipherImg = cipher.image as { width: number; height: number };

  const uniforms = useMemo(
    () => ({
      uPlain: { value: plain },
      uCipher: { value: cipher },
      uProgress: { value: 0 },
      uSpeed: { value: 0 },
      uScramble: { value: reduced ? 0 : 1 },
      uPlainAspect: { value: plainImg.width / plainImg.height },
      uCipherAspect: { value: cipherImg.width / cipherImg.height },
      uQuadAspect: { value: 1 },
    }),
    [plain, cipher], // eslint-disable-line react-hooks/exhaustive-deps
  );

  uniforms.uScramble.value = reduced ? 0 : 1;
  uniforms.uQuadAspect.value = size.width / Math.max(1, size.height);

  const material = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true }),
    [uniforms],
  );

  // Eased copy of the scroll progress. The raw signal is a step function — one value per
  // scroll event — and the whole encrypt plays across ~480px of travel, so a single wheel
  // notch moves it ~0.19 and the encryption front jumps rather than sweeps. Easing toward
  // the target gives the front its own momentum and absorbs the jolts.
  const shown = useRef(0);

  useFrame((_, delta) => {
    const target =
      debugProgress !== undefined
        ? debugProgress
        : reduced
          ? 1
          : remap(progressRef.current ?? 0);

    if (debugProgress !== undefined || reduced || !ready.current) {
      // Debug scrubbing and reduced motion want the exact value, not an approach to it — and
      // the first frame must snap, or loading the page already scrolled to this section would
      // play the whole encrypt as an unrequested intro animation.
      shown.current = target;
      uniforms.uSpeed.value = 0;
    } else {
      const dt = Math.min(delta, 0.05); // clamp so a dropped frame cannot overshoot
      // Frame-rate independent: 0.001^dt settles 99.9% in a second either way, ~0.11 per
      // frame at 60fps. Same curve at 120fps, where a fixed per-frame factor would be twice
      // as fast and undo the damping on exactly the machines that scroll most smoothly.
      const k = 1 - Math.pow(0.001, dt);
      const prev = shown.current;
      shown.current += (target - shown.current) * k;
      uniforms.uSpeed.value = Math.abs(shown.current - prev) / Math.max(dt, 1 / 120);
    }

    uniforms.uProgress.value = shown.current;

    if (!ready.current) {
      ready.current = true;
      onReady();
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

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

export default function DecryptDollar({ debugProgress }: { debugProgress?: number }) {
  const reduced = useReducedMotion();
  const { ref, progressRef } = useScrollProgress<HTMLDivElement>();
  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [visible, setVisible] = useState(true);
  const [painted, setPainted] = useState(false);
  // Desktop + mobile trees both live in the DOM; only mount where there's real size,
  // so we don't spend a second WebGL context on a display:none copy.
  const [hasSize, setHasSize] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWebgl(detectWebGL());
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      setHasSize(r.width > 0 && r.height > 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    // rootMargin keeps the frameloop alive just outside the viewport. Gating exactly on the
    // edge freezes the eased progress mid-approach as the plate leaves, so it jumps to catch
    // up the moment it comes back — the seam is most visible scrolling back up into it.
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0,
      rootMargin: "200px 0px",
    });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [ref]);

  return (
    <div
      ref={ref}
      className="relative h-full w-full"
      role="img"
      aria-label="A one hundred dollar bill dissolving into an encrypted cyan cipher plate"
    >
      {/* Plaintext bill as the static fallback: SSR content, load placeholder, no-WebGL.
          Accessible name is on the wrapper so it outlives this element. */}
      {!painted && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={PLAIN_SRC}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-contain"
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
          <OrthographicCamera makeDefault position={[0, 0, 1]} />
          <FillCamera />
          <Plate
            progressRef={progressRef}
            reduced={reduced}
            debugProgress={debugProgress}
            onReady={() => setPainted(true)}
          />
        </Canvas>
      )}
    </div>
  );
}
