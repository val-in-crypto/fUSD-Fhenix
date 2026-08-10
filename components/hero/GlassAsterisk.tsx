"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, MeshTransmissionMaterial, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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

/** The Figma resting angle, and the phase the spin begins on. */
const BASE_ROLL = (-22.35 * Math.PI) / 180;
/** Seconds per revolution. The pace the CSS spin ran at, and slow enough to sit under the copy
 *  rather than compete with it. */
const TURN_SECONDS = 60;
/**
 * A fixed three-quarter set, held while the plate spins.
 *
 * The turn itself is in-plane — about Z, the way the flat render turned, which is the motion
 * that was signed off. What the geometry adds is that the plate is now lit and thick from a
 * real angle rather than being a photograph of one, so these two hold still and only the roll
 * moves. Spinning about Y instead swings the arms through edge-on, which reads as a coin
 * flipping rather than an asterisk turning.
 */
const SET_PITCH = 0.14;
const SET_YAW = -0.19;

/** The hero's background, which is what the glass refracts. Module scope so the material does
 *  not get a new Color object every render and rebuild its uniforms. */
const PAGE_WHITE = new THREE.Color("#ffffff");

/**
 * How far back the camera sits, which is the only thing setting the plate's on-screen size.
 *
 * Measured off the designer's render rather than dialled in: in hero-glass.png the asterisk
 * fills 68% of the frame's width and 72% of its height, and that PNG is placed at the box this
 * canvas occupies. Filling the frame the way this did at 4.2 made the plate about a third
 * larger than the design and left it no air. 5.75 is 4.2 / 0.73, and 0.73 is the ratio those
 * measurements ask for.
 *
 * Distance rather than a scale on the mesh: the transmission material's thickness is in world
 * units, so shrinking the geometry would thin the glass and wash the tint out as a side effect.
 */
const CAMERA_Z = 5.75;

function Plate({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const bill = useTexture("/assets/dollar.png");

  const outer = useMemo(() => asteriskGeometry({ tipRadius: 1, depth: 0.34, bevel: 0.09 }), []);
  // The note, as a wafer sitting inside the glass rather than printed on it. Being inside the
  // volume is what makes the outer surface refract it — the reason for real geometry in the
  // first place — and it can never show outside the silhouette, which is what every flat
  // compositing attempt kept failing at.
  const inner = useMemo(() => asteriskGeometry({ tipRadius: 0.93, depth: 0.02, bevel: 0.004 }), []);

  const billMap = useMemo(() => {
    const t = bill.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    // ExtrudeGeometry's default UVs are the shape's own XY — raw, not normalised — so on a
    // wafer of tip radius 0.93 they run -0.93..0.93, a span of 1.86. Offset is therefore 0.5
    // to centre, and repeat is (region size) / 1.86 rather than anything near 1.
    //
    // The region is what the designer's render shows: Franklin, plus the block of lettering to
    // his right, u 0.30..0.78 of the note. Cropping to the portrait alone left the arms as
    // plain glass, where the design carries engraving right out to the tips.
    //
    // Vertically it takes the whole note, which stretches it about 14%. That is deliberate —
    // fitting the height honestly would need 0.613, which overruns the note and clamps into
    // bands, and Franklin is visibly elongated in the designer's render too.
    t.repeat.set(0.258, 0.538);
    t.offset.set(0.54, 0.5);
    t.needsUpdate = true;
    return t;
  }, [bill]);

  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    m.rotation.x = SET_PITCH;
    m.rotation.y = SET_YAW;
    // In-plane, on the spot, linear — the same turn the CSS ran, starting from the designer's
    // resting angle. Linear because an eased spin reads as something being animated rather
    // than something turning; geo.center() puts the pivot on the shape's own centre, so it
    // turns without the orbit the off-centre PNG had.
    m.rotation.z =
      BASE_ROLL + (reduced ? 0 : (state.clock.elapsedTime / TURN_SECONDS) * Math.PI * 2);
  });

  return (
    <mesh ref={ref} geometry={outer}>
      <MeshTransmissionMaterial
        // Sampled rather than analytic, so the note behind the front face actually refracts.
        samples={6}
        resolution={512}
        transmission={1}
        // What the glass sees when it looks through itself. Without this it samples the scene
        // buffer, which outside the plate is transparent black — so a material that transmits
        // everything transmits black, and the plate renders nearly opaque and dark. The page
        // behind it is white, so that is what it should be refracting.
        background={PAGE_WHITE}
        // Thin enough that the tint stays a tint. Attenuation is exponential in path length, so
        // thickness and attenuationDistance multiply: at 0.55 against 1.6 the long diagonal
        // through the middle came out several times denser than the arms, which is what put a
        // dark band across the plate.
        thickness={0.3}
        attenuationDistance={1.15}
        ior={1.45}
        chromaticAberration={0.06}
        anisotropy={0.1}
        roughness={0.06}
        distortion={0.15}
        distortionScale={0.3}
        temporalDistortion={0}
        color={"#d4f9fb"}
        attenuationColor={"#15cfd5"}
      />
      <mesh geometry={inner}>
        {/* Tinted, not shown straight. The note's own paper is warm and its portrait is
            photographic, so at full strength it reads as a picture stuck to the plate rather
            than something suspended in it — which is the one thing the designer's render is
            not. The colour multiplies the map, so the warm paper goes to pale aqua and the
            engraving stays dark, and the glass in front finishes the job. */}
        <meshBasicMaterial
          map={billMap}
          color={"#8fd4e8"}
          transparent
          opacity={0.88}
          toneMapped={false}
        />
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

/** Cached for the page's lifetime: the answer cannot change, and each probe costs a real
 *  WebGL context, which browsers hand out in small numbers. */
let webglSupport: boolean | null = null;

function detectWebGL(): boolean {
  if (webglSupport === null) {
    try {
      const c = document.createElement("canvas");
      webglSupport = !!(
        window.WebGLRenderingContext &&
        (c.getContext("webgl2") || c.getContext("webgl"))
      );
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

/** Never fires — the value it reports is constant per environment. */
const subscribeNever = () => () => {};

export default function GlassAsterisk({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);

  // Server renders the fallback, the client swaps in the canvas — but as a value read straight
  // through the render, not as state set from an effect. Setting it in an effect means a second
  // render pass, and React now flags it: the mount is not something to synchronise *to*, it is
  // simply a fact that differs between the two snapshots.
  const canRender = useSyncExternalStore(
    subscribeNever,
    () => detectWebGL(),
    () => false,
  );

  useEffect(() => {
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
      {!canRender && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/assets/hero-glass.png"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
        />
      )}

      {canRender && (
        <Canvas
          className="absolute inset-0"
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          dpr={[1, 2]}
          frameloop={visible ? "always" : "never"}
          camera={{ position: [0, 0, CAMERA_Z], fov: 28 }}
        >
          <Studio />
          <Plate reduced={reduced} />
        </Canvas>
      )}
    </div>
  );
}
