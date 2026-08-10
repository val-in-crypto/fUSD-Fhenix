// GLSL for the glossy fUSD logo. The reveal swaps the whole plate from the cyan glass
// (uBase) to the designer's pre-rendered dollar-glass art, blended between its two angle
// frames (uDollarA / uDollarB) by tilt sign, behind a rotation-driven light sweep. Plus a
// fresnel edge, a matcap env sheen, and a moving specular band. uReveal/uRotation are driven
// from the drag + idle-spin physics in GlossyLogo.tsx.
//
// The base's silhouette is the one the plate always keeps. The dollar-glass renders are a
// *different* asterisk from the cyan one — fatter, shorter arms — so swapping the whole plate
// made the shape itself morph as the reveal came up, which is worse than anything it bought.
// Only the art's colour crosses over; the outline never moves.
//
// Sampled through a measured fit (-4.5deg, 1.068 x 0.97) that lands the art on the base as
// closely as it will go: that puts dollar art behind 92.9% of the cyan plate, against 88.8%
// untransformed. The remaining ~7% is arm tips, which fall back to cyan glass — the art is
// feathered out by its own alpha there, so it reads as a tip catching the light rather than
// as a hole.
//
// Both angle frames are kept and crossed on tilt, so turning the block still changes the
// angle the note is seen through.

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uBase;    // cyan glass (rest)
  uniform sampler2D uNormal;  // tangent-space normals from luminance
  uniform sampler2D uDollarA; // dollar-glass, angle A
  uniform sampler2D uDollarB; // dollar-glass, angle B
  uniform sampler2D uEnv;     // dollar bill, sampled as matcap env for live sheen
  uniform float uTime;
  uniform float uReveal;      // slides the terminator across the plate
  uniform float uDollarMix;   // master on the art; 0 = plain cyan glass, lighting intact
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
  // the feather, so the perceived terminator sits at edge + HALF_FEATHER/2.
  const float HALF_DIM = 0.10; // light just catching the outer arms
  const float HALF_BRIGHT = -0.45; // well past half, most of the plate carrying it
  const float HALF_FEATHER = 0.24;

  // Fit that lands the dollar art on the cyan base. Measured by maximising how much of the
  // base has art behind it: 92.9% here against 88.8% untransformed. Applied in image space
  // (y down), the convention it was measured in, so the sign cannot drift.
  const float ART_ROT = -0.0785; // -4.5deg
  const vec2  ART_SCALE = vec2(1.068, 0.97);

  // Facet gate. A bevel counts as "catching" the light once its normal turns far enough
  // toward it, so the swap reads as something the glass is doing rather than a flat wipe.
  const float FACET_LO = -0.15;
  const float FACET_HI = 0.35;
  const float FACET_MIX = 0.22;

  // Tilt at which the frame blend reaches fully one angle or the other. The two renders are
  // shot at different angles, so crossing between them on tilt is what makes the turn read as
  // the block actually rotating rather than a texture fading up.
  const float FRAME_TILT_RANGE = 0.35;

  // Into image space, transform, back out. Going through the flip explicitly rather than
  // folding it into the rotation keeps this identical to the measurement it came from.
  vec2 artUv(vec2 uv) {
    vec2 p = vec2(uv.x, 1.0 - uv.y) - 0.5;
    float c = cos(ART_ROT), s = sin(ART_ROT);
    vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y) / ART_SCALE + 0.5;
    return vec2(q.x, 1.0 - q.y);
  }

  void main() {
    vec2 uv = vUv;
    vec4 base = texture2D(uBase, uv);

    float ang = uRotation.x;

    // The key light, expressed in plate space. uv is fixed to the plate, so a world-fixed
    // light must rotate *backwards* against the spin — hence LIGHT_ANGLE - ang. Leave the
    // subtraction out and the lit region rides along with the plate, so the same side stays
    // lit however far it turns; that is what made earlier passes look like a pattern painted
    // on the asterisk rather than a reflection it moves through.
    float lightPhase = LIGHT_ANGLE - ang;
    vec2 dir = vec2(cos(lightPhase), sin(lightPhase));

    vec3 rawN = normalize(texture2D(uNormal, uv).rgb * 2.0 - 1.0);

    // Surface normal, leaned toward the light so bevels facing it read brighter. The lean is
    // taken from dir rather than the raw angle: added directly, the offset ramps to ~3.8 over
    // a revolution, swamps the normal map — fresnel washes flat — then pops at the 2pi wrap.
    vec3 n = rawN;
    n.xy += dir * SPIN_LEAN;
    n.y += uRotation.y * TILT_LEAN;
    n = normalize(n);

    vec3 V = vec3(0.0, 0.0, 1.0);
    float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0);

    // Pick between the two angle frames on tilt sign, premultiplied — they carry their own
    // alpha and a straight mix would drag each one's transparent black into the other's edge.
    vec2 aUv = artUv(uv);
    vec4 dA = texture2D(uDollarA, aUv);
    vec4 dB = texture2D(uDollarB, aUv);
    float frameMix = clamp(uRotation.y / FRAME_TILT_RANGE * 0.5 + 0.5, 0.0, 1.0);
    float frameA = mix(dA.a, dB.a, frameMix);
    vec3 frameRGB = mix(dA.rgb * dA.a, dB.rgb * dB.a, frameMix);
    // Unpremultiply back to a plain colour, and keep the coverage separately. Sampling off
    // the edge of the art gives alpha 0, which is what feathers the arm tips out to glass.
    vec3 artCol = frameA > 0.001 ? frameRGB / frameA : base.rgb;
    float artCover = smoothstep(0.05, 0.5, frameA) * step(0.0, aUv.x) * step(aUv.x, 1.0)
                   * step(0.0, aUv.y) * step(aUv.y, 1.0);

    // Half-plane split along the light axis: positive on the side facing the light, negative
    // on the side turned away. Because dir counter-rotates, this boundary holds still on
    // screen while the arms sweep through it — each arm turns to the note as it swings into
    // the light and back to cyan as it leaves.
    float coord = dot(uv - 0.5, dir);
    float edge = mix(HALF_DIM, HALF_BRIGHT, uReveal);
    float lightMask = smoothstep(edge, edge + HALF_FEATHER, coord);

    // Within the lit half, bevels angled toward the light carry it while flat faces lag, so
    // the swap reads as a reflection crossing the block rather than a wipe over a picture.
    float facing = dot(n.xy, dir);
    float facet = smoothstep(FACET_LO, FACET_HI, facing);
    // uDollarMix gates the art outright. uReveal alone cannot do it: at 0 the terminator
    // simply sits at HALF_DIM, which still lights the outer arms.
    float reveal = lightMask * mix(1.0, facet, FACET_MIX) * uDollarMix;

    // Colour only. Alpha stays the base's throughout, so the outline never moves — swapping
    // it for the art's made the arms visibly change shape as the reveal came up.
    vec3 col = mix(base.rgb, artCol, reveal * artCover);
    float outA = base.a;

    // matcap env sheen from the perturbed normal — subtle at rest, blooms with velocity
    vec2 mUv = n.xy * 0.5 + 0.5 + vec2(sin(ang), cos(ang)) * 0.1;
    vec3 env = texture2D(uEnv, fract(mUv)).rgb;
    col += env * fres * uReflStrength * (0.3 + uVelocity);

    // moving specular band for glassiness
    float spec = smoothstep(0.985, 1.0, sin((uv.x + uv.y) * 6.0 - uTime * 1.2) * 0.5 + 0.5);
    col += spec * fres * 0.5;

    if (outA < 0.005) discard;
    gl_FragColor = vec4(col, outA);
  }
`;
