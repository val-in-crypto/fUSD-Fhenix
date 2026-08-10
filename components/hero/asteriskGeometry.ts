import * as THREE from "three";

/**
 * The fUSD asterisk as real geometry, rebuilt from the designer's render rather than traced.
 *
 * Measured off tex-base.png: six arms whose axes sit at 24, 86, 146, 204, 266 and 325 degrees
 * — 60 apart to within the 2-degree measurement noise — with a tip radius of 232px in a 512px
 * frame. The arm width was then fitted rather than eyeballed: rasterising candidate shapes and
 * matching two independent properties of the silhouette, its filled fraction (0.421) and the
 * ratio of its waist to its tip radius (0.459). A half-width of 0.24 x the tip radius
 * reproduces both to within 4%, which no other value in the sweep does.
 *
 * Each arm is a capsule — a bar with a rounded end — which is what gives the tips their radius
 * without a separate fillet.
 */

/** Arm axes, in degrees, exactly as measured. Kept individually rather than generated at 60
 *  degree steps: the render is not perfectly regular and this preserves its character. */
export const ARM_AXES_DEG = [24, 86, 146, 204, 266, 325] as const;

/** Fitted. See the header — this is the one number the silhouette actually pins down. */
export const ARM_HALF_WIDTH = 0.24;

/**
 * Is this point inside the union of the six capsules? This is the same predicate the arm
 * width was fitted with, kept verbatim so the geometry is the shape that was measured rather
 * than a second derivation of it that might drift.
 */
function inside(px: number, py: number, tipRadius: number, halfWidth: number): boolean {
  const spine = tipRadius - halfWidth; // the capsule's straight part, before its rounded end
  for (const axisDeg of ARM_AXES_DEG) {
    const th = (axisDeg * Math.PI) / 180;
    const u = Math.cos(th) * px + Math.sin(th) * py; // along the arm
    const v = -Math.sin(th) * px + Math.cos(th) * py; // across it
    if (u < 0) continue;
    const along = Math.min(u, spine); // nearest point on the spine
    const dx = u - along;
    if (dx * dx + v * v <= halfWidth * halfWidth) return true;
  }
  return false;
}

/**
 * Distance from the centre to the shape's edge along `theta`.
 *
 * The asterisk is star-convex about its centre — every ray leaves it exactly once, which the
 * measured radius profile confirms — so the outline can be expressed as r(theta). That makes
 * it a single closed loop, with no boolean union to compute and none of the self-intersections
 * that stitching six overlapping capsules by hand would invite.
 *
 * Found by bisection rather than in closed form. The closed form has to case-split on whether
 * a given ray leaves through an arm's flank or its end cap, and getting that split subtly
 * wrong deforms the shape in ways that still look plausible. Bisection cannot: it is only ever
 * asking the predicate above. This runs 720 times at startup, so the cost is irrelevant.
 */
function radiusAt(theta: number, tipRadius: number, halfWidth: number): number {
  const dx = Math.cos(theta);
  const dy = Math.sin(theta);
  let lo = 0;
  let hi = tipRadius * 1.05; // just past the furthest the shape can reach
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (inside(dx * mid, dy * mid, tipRadius, halfWidth)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * The 2D outline, sampled finely enough that the straight flanks stay straight and the tip
 * caps stay round. 720 steps puts a vertex every half degree.
 */
export function asteriskShape(tipRadius = 1, halfWidth = ARM_HALF_WIDTH): THREE.Shape {
  const shape = new THREE.Shape();
  const steps = 720;
  const w = halfWidth * tipRadius;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = radiusAt(t, tipRadius, w);
    const x = Math.cos(t) * r;
    const y = Math.sin(t) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * Extruded, with a bevel. The bevel is what reads as glass — it is the edge that catches the
 * light in the designer's render — so it is a real chamfer in the geometry rather than
 * something faked in the shading.
 */
export function asteriskGeometry({
  tipRadius = 1,
  depth = 0.34,
  bevel = 0.055,
}: { tipRadius?: number; depth?: number; bevel?: number } = {}): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(asteriskShape(tipRadius), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 12,
  });
  // Extrude builds from z=0 forward; centre it so the mesh turns about its own middle.
  geo.center();
  geo.computeVertexNormals();
  return geo;
}
