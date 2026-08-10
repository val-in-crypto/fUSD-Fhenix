// GLSL for the glossy fUSD logo. The reveal swaps the whole plate from the cyan glass
// (uBase) to the designer's pre-rendered dollar-glass art, blended between its two angle
// frames (uDollarA / uDollarB) by tilt sign, behind a rotation-driven light sweep. Plus a
// fresnel edge, a matcap env sheen, and a moving specular band. uReveal/uRotation are driven
// from the drag + idle-spin physics in GlossyLogo.tsx.
//
// Why the whole plate rather than printing the note into the base glass: the dollar-glass
// renders are a *different* asterisk from the cyan one — measured against the base with a
// full five-parameter fit (rotation, independent X/Y scale, translation) they reach only
// IoU 0.84, up from 0.78 as-is. That gap is arm proportion, not misalignment, so no transform
// closes it. Compositing them into the base's silhouette therefore leaves holes at the arm
// tips and doubled bevels — but swapping the plate outright sidesteps the whole problem,
// because each end of the fade is a complete, finished render standing on its own.
//
// The cost lands in the middle of the fade instead: the silhouette shifts by ~16% between the
// two shapes. It is brief, both shapes are cyan glass on white, and it buys the designer's
// exact art at both ends plus a real angle change on tilt, which a flat print cannot give.

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
  // Wider feather than the print version used. The two plates do not share a silhouette, so
  // a hard terminator would cut a visible seam between two different arm shapes; softening it
  // spreads that disagreement over enough distance to read as refraction.
  const float HALF_FEATHER = 0.34;

  // Facet gate. A bevel counts as "catching" the light once its normal turns far enough
  // toward it, so the swap reads as something the glass is doing rather than a flat wipe.
  const float FACET_LO = -0.15;
  const float FACET_HI = 0.35;
  const float FACET_MIX = 0.22;

  // Tilt at which the frame blend reaches fully one angle or the other. The two renders are
  // shot at different angles, so crossing between them on tilt is what makes the turn read as
  // the block actually rotating rather than a texture fading up.
  const float FRAME_TILT_RANGE = 0.35;

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
    vec4 dA = texture2D(uDollarA, uv);
    vec4 dB = texture2D(uDollarB, uv);
    float frameMix = clamp(uRotation.y / FRAME_TILT_RANGE * 0.5 + 0.5, 0.0, 1.0);
    float frameA = mix(dA.a, dB.a, frameMix);
    vec3 frameRGB = mix(dA.rgb * dA.a, dB.rgb * dB.a, frameMix);

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

    // Premultiplied all the way through. The two plates disagree on silhouette by ~16%, so
    // over that margin one side is transparent while the other is not — exactly where a
    // straight RGBA mix pulls the empty side's black into the result and fringes the arms.
    float outA = mix(base.a, frameA, reveal);
    vec3 outRGB = mix(base.rgb * base.a, frameRGB, reveal);
    vec3 col = outA > 0.001 ? outRGB / outA : vec3(0.0);

    // matcap env sheen from the perturbed normal — subtle at rest, blooms with velocity
    vec2 mUv = n.xy * 0.5 + 0.5 + vec2(sin(ang), cos(ang)) * 0.1;
    vec3 env = texture2D(uEnv, fract(mUv)).rgb;
    col += env * fres * uReflStrength * (0.3 + uVelocity);

    // moving specular band for glassiness
    float spec = smoothstep(0.985, 1.0, sin((uv.x + uv.y) * 6.0 - uTime * 1.2) * 0.5 + 0.5);
    col += spec * fres * 0.5;

    // Discard on the composite, not on the base: the dollar frames reach past the cyan plate
    // in places, and testing base.a alone would clip their arms off mid-reveal.
    if (outA < 0.005) discard;
    gl_FragColor = vec4(col, outA);
  }
`;
