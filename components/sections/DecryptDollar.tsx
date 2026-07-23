"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/components/motion/MotionProvider";
import { useScrollProgress } from "@/components/motion/useScrollProgress";
import { fragmentShader, vertexShader } from "./shaders/decryptDollar";

const FROM_SRC = "/assets/dollar-engraved.png";
const TO_SRC = "/assets/dollar.png";

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
  const [from, to] = useTexture([FROM_SRC, TO_SRC]);
  from.colorSpace = THREE.SRGBColorSpace;
  to.colorSpace = THREE.SRGBColorSpace;

  const fromImg = from.image as { width: number; height: number };
  const toImg = to.image as { width: number; height: number };

  const uniforms = useMemo(
    () => ({
      uFrom: { value: from },
      uTo: { value: to },
      uProgress: { value: 0 },
      uScramble: { value: reduced ? 0 : 1 },
      uFromAspect: { value: fromImg.width / fromImg.height },
      uToAspect: { value: toImg.width / toImg.height },
      uQuadAspect: { value: 1 },
    }),
    [from, to], // eslint-disable-line react-hooks/exhaustive-deps
  );

  uniforms.uScramble.value = reduced ? 0 : 1;
  uniforms.uQuadAspect.value = size.width / Math.max(1, size.height);

  const material = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true }),
    [uniforms],
  );

  useFrame(() => {
    const p =
      debugProgress !== undefined
        ? debugProgress
        : reduced
          ? 1
          : remap(progressRef.current ?? 0);
    uniforms.uProgress.value = p;

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

    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.01,
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
      aria-label="A one hundred dollar bill, resolving from an encrypted halftone plate"
    >
      {/* Resolved state as the static fallback: SSR content, load placeholder, no-WebGL.
          Accessible name is on the wrapper so it outlives this element. */}
      {!painted && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={TO_SRC}
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
