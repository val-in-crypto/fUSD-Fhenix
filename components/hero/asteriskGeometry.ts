import * as THREE from "three";

/**
 * The fUSD asterisk as real geometry, rebuilt from the designer's render rather than traced.
 *
 * Six flat-tipped arms with radiused corners, on a regular 60 degree grid. Every constant below
 * was fitted rather than eyeballed: candidate shapes were rasterised against the alpha of
 * tex-base.png at 512px and scored by intersection-over-union, sweeping half-width, corner
 * radius, phase and scale together. The settled shape lands at **IoU 0.936**.
 *
 * The fit is worth stating because two earlier guesses looked reasonable and were not. Capsule
 * arms — a bar with a semicircular end — scored 0.898: the render's tips are flat, its reach
 * holding right across the arm's width, and a semicircle reads visibly rounder than the art.
 * And the phase is 26 degrees, not the 24 the axis scan suggested; two degrees is worth 0.038
 * of IoU here, because six arms all miss at once.
 */

/**
 * Six arms on an exact 60 degree grid, offset to the render's resting phase.
 *
 * The measured axes came out at 24/86/146/204/266/325 — spacings of 62, 60, 58, 62, 59. That
 * irregularity is perspective, not design: the render is a photograph of a 3D object, and the
 * same scan shows a single arm measuring 68px across on one side and 35px on the other,
 * narrowing to 15px while the other widens to 86px along its length. A real arm is not
 * lopsided. Fitting the projection's quirks would bake a particular camera angle into the
 * geometry, so the grid is regular and only its phase is taken from the render.
 */
export const ARM_COUNT = 6;
export const ARM_PHASE_DEG = 26;

/**
 * Half-width as a fraction of the tip radius, and the constant the silhouette pins down hardest
 * — three ways. Direct measurement puts the straight section of an arm at 53.1px against a
 * 232.1px tip radius (0.229); the waist between arms measures 106.5px, which for arms meeting
 * at the centre is exactly twice the half-width (0.229 again); and the IoU sweep peaks at 0.24.
 */
export const ARM_HALF_WIDTH = 0.24;

/**
 * Corner radius at the arm tips.
 *
 * The silhouette barely cares: IoU runs 0.9362 / 0.9363 / 0.9362 / 0.9356 across 0.03 / 0.04 /
 * 0.05 / 0.07, which is flat to within a rounding error. So this is chosen for the look rather
 * than the fit, at the rounder end of the range where it costs nothing — the render's tips are
 * softened, not cut.
 */
export const TIP_CORNER = 0.05;

/**
 * Is this point inside the union of the six arms? This is the same predicate the constants
 * above were fitted with, kept verbatim so the geometry is the shape that was measured rather
 * than a second derivation of it that might drift.
 */
function inside(
  px: number,
  py: number,
  tipRadius: number,
  halfWidth: number,
  corner: number,
): boolean {
  for (let i = 0; i < ARM_COUNT; i++) {
    const th = ((ARM_PHASE_DEG + (i * 360) / ARM_COUNT) * Math.PI) / 180;
    const u = Math.cos(th) * px + Math.sin(th) * py; // along the arm
    const v = -Math.sin(th) * px + Math.cos(th) * py; // across it
    if (u < 0) continue;

    // Rounded rectangle running from the centre out to the tip, by the usual rounded-box
    // distance: push the point into the box's inset corner quadrant and measure from there.
    const qu = u - (tipRadius - corner);
    const qv = Math.abs(v) - (halfWidth - corner);
    const outU = Math.max(qu, 0);
    const outV = Math.max(qv, 0);
    const dist = Math.sqrt(outU * outU + outV * outV) + Math.min(Math.max(qu, qv), 0);
    if (dist <= corner) return true;
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
function radiusAt(theta: number, tipRadius: number, halfWidth: number, corner: number): number {
  const dx = Math.cos(theta);
  const dy = Math.sin(theta);
  let lo = 0;
  let hi = tipRadius * 1.05; // just past the furthest the shape can reach
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (inside(dx * mid, dy * mid, tipRadius, halfWidth, corner)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * The 2D outline, sampled finely enough that the straight flanks stay straight and the tip
 * corners stay round. 720 steps puts a vertex every half degree.
 */
export function asteriskShape(tipRadius = 1, halfWidth = ARM_HALF_WIDTH): THREE.Shape {
  const shape = new THREE.Shape();
  const steps = 720;
  const w = halfWidth * tipRadius;
  const corner = TIP_CORNER * tipRadius;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = radiusAt(t, tipRadius, w, corner);
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
    // A rounder edge than a chamfer. The render's edges read as a soft radius catching light
    // along their length, not a single flat facet, and segments are what buy that.
    bevelSegments: 8,
    curveSegments: 12,
  });
  // Extrude builds from z=0 forward; centre it so the mesh turns about its own middle.
  geo.center();
  geo.computeVertexNormals();
  return geo;
}
