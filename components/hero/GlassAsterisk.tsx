"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, MeshTransmissionMaterial, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useReducedMotion } from "@/components/motion/MotionProvider";
import { asteriskGeometry } from "./asteriskGeometry";

/**
 * The asterisk as real geometry, turning in three dimensions.
 *
 * Everything before this rotated a flat photograph of a 3D object, which is what produced the
 * problems it kept producing: a fake turn that only ever spun in the picture plane, silhouettes
 * that disagreed between renders, and the double image whenever two of them were cross-faded.
 * With actual geometry the plate has sides and thickness, so turning it is just turning it.
 *
 * Shape comes from ./asteriskGeometry, fitted to the designer's render rather than guessed —
 * see its header for how the arm width was pinned.
 */

/** Matches the Figma resting angle for the plate's roll. */
const BASE_ROLL = (-22.35 * Math.PI) / 180;
/** Seconds per revolution. The pace the shader version idled at, and slow enough to sit under
 *  the copy rather than compete with it. */
const TURN_SECONDS = 60;
/** A little off head-on, so the bevels catch light and the form reads as solid at rest. */
const REST_PITCH = 0.18;

function Plate({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const bill = useTexture("/assets/dollar.png");

  const outer = useMemo(() => asteriskGeometry({ tipRadius: 1, depth: 0.34, bevel: 0.055 }), []);
  // The note, as a wafer sitting inside the glass rather than printed on it. Being inside the
  // volume is what makes the outer surface refract it — the reason for real geometry in the
  // first place — and it can never show outside the silhouette, which is what every flat
  // compositing attempt kept failing at.
  const inner = useMemo(() => asteriskGeometry({ tipRadius: 0.93, depth: 0.02, bevel: 0.004 }), []);

  const billMap = useMemo(() => {
    const t = bill.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    // ExtrudeGeometry's default UVs are the shape's own XY, so they run about -1..1. Halving
    // and centring maps that onto the texture; the extra zoom frames Franklin rather than the
    // note's margins.
    t.repeat.set(0.34, 0.62);
    t.offset.set(0.33, 0.2);
    t.needsUpdate = true;
    return t;
  }, [bill]);

  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    m.rotation.z = BASE_ROLL;
    m.rotation.x = REST_PITCH;
    // A real turn about the vertical axis. The flat version could never do this — edge-on, a
    // picture of an asterisk has nothing to show.
    m.rotation.y = reduced ? 0 : (state.clock.elapsedTime / TURN_SECONDS) * Math.PI * 2;
  });

  return (
    <mesh ref={ref} geometry={outer}>
      <MeshTransmissionMaterial
        // Sampled rather than analytic, so the note behind the front face actually refracts.
        samples={6}
        resolution={512}
        transmission={1}
        thickness={0.55}
        ior={1.45}
        chromaticAberration={0.06}
        anisotropy={0.1}
        roughness={0.06}
        distortion={0.15}
        distortionScale={0.3}
        temporalDistortion={0}
        color={"#bff3f6"}
        attenuationColor={"#3fd8de"}
        attenuationDistance={1.6}
      />
      <mesh geometry={inner}>
        <meshBasicMaterial map={billMap} transparent opacity={0.92} toneMapped={false} />
      </mesh>
    </mesh>
  );
}

/** Built in-scene from area lights rather than fetched. A preset would pull an HDR from a CDN,
 *  which this page should not depend on to draw its logo. */
function Studio() {
  return (
    <Environment resolution={256}>
      <Lightformer intensity={2.2} position={[0, 3, 2]} scale={[6, 3, 1]} color="#ffffff" />
      <Lightformer intensity={1.1} position={[-3, 1, 1]} scale={[3, 4, 1]} color="#d8fbfd" />
      <Lightformer intensity={0.8} position={[3, -1, 1]} scale={[3, 3, 1]} color="#9fe9ee" />
      <Lightformer intensity={0.6} position={[0, -3, 1]} scale={[6, 2, 1]} color="#ffffff" />
    </Environment>
  );
}

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

export default function GlassAsterisk({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [visible, setVisible] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setWebgl(detectWebGL());
    const el = wrap.current;
    if (!el) return;
    // Off-screen the frameloop stops: a transmission material re-renders the scene into a
    // buffer every frame, so leaving it running below the fold is not free.
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className={className} style={style} aria-hidden="true">
      {/* The render stands in until the canvas paints, and stays for good without WebGL.
          CLAUDE.md requires the page to work without it. */}
      {(!mounted || !webgl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/hero-glass.png"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
        />
      )}

      {mounted && webgl && (
        <Canvas
          className="absolute inset-0"
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          dpr={[1, 2]}
          frameloop={visible ? "always" : "never"}
          camera={{ position: [0, 0, 4.2], fov: 28 }}
        >
          <Studio />
          <Plate reduced={reduced} />
        </Canvas>
      )}
    </div>
  );
}
