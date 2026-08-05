// GLSL for the glossy fUSD logo. The dollar is a real banknote (uBill, a plain rectangular
// photo) printed into the cyan glass and clipped by the glass's own alpha, plus a fresnel
// edge, a matcap env sheen, and a moving specular band. uReveal/uRotation are driven from
// the drag + idle-spin physics in GlossyLogo.tsx.
//
// Why a flat bill and not the designer's pre-rendered dollar-glass art: those renders are a
// *different* asterisk — fatter, shorter arms — so their silhouette never reconciles with
// the cyan base. Measured best case is IoU 0.80 at the optimal rotation and scale, leaving
// ~11% of the glass with no art behind it and doubled bevel edges wherever they disagree.
// Clipping a rectangular note to the base's alpha has no silhouette to reconcile at all, and
// a rectangular texture can also parallax under tilt, which a baked render cannot.

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uBase;    // cyan glass (rest) — also the silhouette, via its alpha
  uniform sampler2D uNormal;  // tangent-space normals from luminance
  uniform sampler2D uBill;    // $100 note, plain rectangular photo
  uniform sampler2D uEnv;     // dollar bill, sampled as matcap env for live sheen
  uniform float uTime;
  uniform float uReveal;      // slides the terminator across the plate
  uniform float uDollarMix;   // master on the note; 0 = plain cyan glass, lighting intact
  uniform float uReflStrength;
  uniform float uVelocity;    // |angular velocity| -> blooms reflection mid-spin
  uniform vec2  uRotation;    // x: spin phase, y: tilt

  varying vec2 vUv;

  // How far the spin and tilt lean the surface normal. Kept well under 1 so the normal map
  // keeps the upper hand — these bias the lighting, they don't replace it.
  const float SPIN_LEAN = 0.35;
  const float TILT_LEAN = 0.60;

  // Where the key light sits, in screen space (radians; 0 = right, PI/2 = up). Fixed in the
  // world — the plate turns through it, it does not travel with the plate.
  const float LIGHT_ANGLE = 2.35; // upper-left

  // Where the lit/unlit boundary falls along the light axis. uReveal slides between them, so
  // a flick or a scroll pushes the light further across the plate. These are the *start* of
  // the feather, so the perceived terminator sits at edge + HALF_FEATHER/2 — the pair below
  // puts that near 0.0 (a true half) at the default rest reveal.
  const float HALF_DIM = 0.10; // light just catching the outer arms
  const float HALF_BRIGHT = -0.45; // well past half, most of the plate carrying it
  const float HALF_FEATHER = 0.20; // softness of the terminator

  // Facet gate. A bevel counts as "catching" the light once its normal turns far enough
  // toward it, so the print reads as something the glass is carrying rather than a flat wipe.
  const float FACET_LO = -0.15;
  const float FACET_HI = 0.35;
  const float FACET_MIX = 0.22;

  // --- banknote placement -------------------------------------------------------------
  // The note is a plain rectangle, so it needs framing: fit it by height, keep its own
  // proportions, and centre the crop on Franklin rather than on the middle of the note.
  const float BILL_ASPECT = 2.40;             // note texture width / height
  // 1.0 fits the note's full height to the plate, which is the designer's framing: Franklin's
  // head lands at ~0.44 of the plate, with "UNITED STATES" and "JULY 4, 1776" carried out
  // along the upper-right arm. Above ~1.1 the portrait crowds the plate and the text falls
  // off the arms; below ~0.95 the crop runs past the note's edge and the clamp smears.
  const float BILL_ZOOM = 1.0;
  const vec2  BILL_FOCUS = vec2(0.45, 0.50);  // Franklin's face, in note UV
  // How far the note slides under tilt. This is what sells it as sitting *inside* the glass
  // at depth rather than being painted on the front face.
  const float BILL_PARALLAX = 0.05;

  // Ink extraction. Banknote paper sits bright and the intaglio lines dark, so a threshold
  // just under the paper level lifts the engraving and drops the paper to nothing.
  const float BILL_PAPER = 0.86; // luminance the note's paper sits at
  const float INK_GAIN = 1.6;    // how sharply a drop below that counts as engraving

  // Tonal ramp for the print, sampled off the designer's dollar-glass render at the 8th,
  // 50th and 80th percentiles of its luminance. The print does not multiply into the glass:
  // the target field (153,203,221) is both *lighter* and less cyan than the glass beneath it
  // (121,234,242), and a multiply can only darken, so it can never reach that colour. The
  // ramp sets the colour outright and the glass contributes its lighting separately.
  const vec3 PAPER_COL = vec3(0.898, 0.949, 0.945); // 229,242,241
  const vec3 MID_COL   = vec3(0.600, 0.796, 0.867); // 153,203,221
  const vec3 INK_COL   = vec3(0.129, 0.388, 0.639); // 33,99,163

  // Base luminance the ramp is calibrated against — the glass's own median. Dividing by it
  // turns the base into a relative lighting term (~1 on a flat face, >1 on a highlight) so
  // bevel falloff and specular survive the print instead of being flattened by it.
  const float GLASS_REF = 0.79;
  const float LIGHT_KEEP = 0.5; // how much of that lighting carries through

  // The glass renders at alpha 0.69, the designer's art at 1.0. Left alone, ~31% of the white
  // page bleeds through the print and washes every mid-tone toward white — which is most of
  // why the engraving read as a faint watermark. Ink is opaque; the print closes the gap.
  const float NOTE_OPACITY = 1.0;

  // Bevels stay clear glass. Engraving that climbs onto them reads as a decal wrapped over
  // the edge; holding it to the flat faces is both what the reference art does and what a
  // real inclusion inside a bevelled block would do.
  const float BEVEL_KEEP = 0.85;

  void main() {
    vec2 uv = vUv;
    vec4 base = texture2D(uBase, uv);
    if (base.a < 0.01) discard;

    float ang = uRotation.x;

    // The key light, expressed in plate space. uv is fixed to the plate, so a world-fixed
    // light must rotate *backwards* against the spin — hence LIGHT_ANGLE - ang. Leave the
    // subtraction out and the lit region rides along with the plate, so the same side stays
    // lit however far it turns; that is what made earlier passes look like a pattern painted
    // on the asterisk rather than a reflection it moves through.
    float lightPhase = LIGHT_ANGLE - ang;
    vec2 dir = vec2(cos(lightPhase), sin(lightPhase));

    // Raw normal first: the bevel mask has to read the geometry the map actually describes,
    // before the light lean tips every normal toward dir and flattens the distinction.
    vec3 rawN = normalize(texture2D(uNormal, uv).rgb * 2.0 - 1.0);
    float bevel = clamp(length(rawN.xy) * 1.6, 0.0, 1.0);

    // Surface normal, leaned toward the light so bevels facing it read brighter. The lean is
    // taken from dir rather than the raw angle: added directly, the offset ramps to ~3.8 over
    // a revolution, swamps the normal map — fresnel washes flat — then pops at the 2pi wrap.
    vec3 n = rawN;
    n.xy += dir * SPIN_LEAN;
    n.y += uRotation.y * TILT_LEAN;
    n = normalize(n);

    vec3 V = vec3(0.0, 0.0, 1.0);
    float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0);

    // Frame the note: centre on the plate, undo the plate's square aspect so the portrait is
    // not stretched, then shift the crop onto Franklin. Tilt slides it for parallax.
    vec2 p = (uv - 0.5) / BILL_ZOOM;
    p.x /= BILL_ASPECT;
    vec2 billUv = BILL_FOCUS + p + vec2(uRotation.y, -uRotation.x * 0.15) * BILL_PARALLAX;
    float billLum = dot(texture2D(uBill, clamp(billUv, 0.001, 0.999)).rgb, vec3(0.299, 0.587, 0.114));

    // Half-plane split along the light axis: positive on the side facing the light, negative
    // on the side turned away. Because dir counter-rotates, this boundary holds still on
    // screen while the arms sweep through it — each arm brightens as it swings into the light
    // and falls back to cyan as it leaves.
    float coord = dot(uv - 0.5, dir);
    float edge = mix(HALF_DIM, HALF_BRIGHT, uReveal);
    float lightMask = smoothstep(edge, edge + HALF_FEATHER, coord);

    // Within the lit half, bevels angled toward the light catch it while flat faces stay
    // cyan, so it reads as a reflection rather than a flat wipe across the shape.
    float facing = dot(n.xy, dir);
    float facet = smoothstep(FACET_LO, FACET_HI, facing);
    // uDollarMix gates the note outright. uReveal alone cannot do it: at 0 the terminator
    // simply sits at HALF_DIM, which still lights the outer arms.
    float reveal = lightMask * mix(1.0, facet, FACET_MIX) * uDollarMix;
    reveal *= 1.0 - bevel * BEVEL_KEEP;

    // Walk the note's paper-to-ink ramp, then re-light it with the glass underneath so the
    // print picks up the bevel falloff rather than sitting on the surface as flat artwork.
    float ink = clamp((BILL_PAPER - billLum) * INK_GAIN, 0.0, 1.0);
    vec3 noteCol = ink < 0.5
      ? mix(PAPER_COL, MID_COL, ink * 2.0)
      : mix(MID_COL, INK_COL, (ink - 0.5) * 2.0);
    float lumBase = dot(base.rgb, vec3(0.299, 0.587, 0.114));
    vec3 printed = noteCol * mix(1.0, lumBase / GLASS_REF, LIGHT_KEEP);

    vec3 col = mix(base.rgb, printed, reveal);
    float alpha = mix(base.a, 1.0, reveal * NOTE_OPACITY);

    // matcap env sheen from the perturbed normal — subtle at rest, blooms with velocity
    vec2 mUv = n.xy * 0.5 + 0.5 + vec2(sin(ang), cos(ang)) * 0.1;
    vec3 env = texture2D(uEnv, fract(mUv)).rgb;
    col += env * fres * uReflStrength * (0.3 + uVelocity);

    // moving specular band for glassiness
    float spec = smoothstep(0.985, 1.0, sin((uv.x + uv.y) * 6.0 - uTime * 1.2) * 0.5 + 0.5);
    col += spec * fres * 0.5;

    gl_FragColor = vec4(col, alpha);
  }
`;
