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

  // How far the interior art is displaced by the surface it is seen through, and by the turn.
  // Both are in uv units on a plate that spans 1.0, so 0.045 is about a twentieth of the
  // block's width — a plausible read for something a third as thick as it is wide.
  const float ART_DEPTH = 0.045;
  const float ART_PARALLAX = 0.06;

  // Body shading. Ambient sits high on purpose: this is glass in a bright room, not a solid
  // under a spotlight, so the diffuse term supplies form without the plate going dark on the
  // side turned away.
  const float BODY_AMBIENT = 0.72;
  const float BODY_DIFFUSE = 0.55;
  // Strength of the lit-end-to-dark-end falloff across the plate. uv - 0.5 reaches 0.5, so
  // this is half the peak swing: 0.5 here puts the two ends about 25% apart.
  const float DEPTH_GRADIENT = 0.55;

  // How hard the bevels work, at rest and at full spin. uVelocity is clamped to 0..1 on the
  // JS side, so these are the two ends of the range rather than a scale factor.
  const float EDGE_REST = 0.35;
  const float EDGE_SPIN = 1.30;
  // Falloff for the rim term. See the note at its use for why this is not the body's 3.0.
  const float RIM_POWER = 8.0;
  // How far the channels are pulled apart on a lit bevel. Real dispersion through a wedge this
  // shallow is a fraction of a degree; this is scaled to something a ~500px logo can show.
  const float RIM_DISPERSION = 0.055;
  // Strength of the white core inside the fringe.
  const float RIM_CORE = 0.6;
  // How much of the specular band's travel comes from the spin rather than from time.
  const float SPEC_SPIN = 3.0;

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
    // The art is inside the block, not printed on it, and this is what selling that costs.
    // Sampling it through the surface normal displaces it wherever the glass is steep, so the
    // interior slides against the outline along every bevel — which is what looking through a
    // thick edge does. The tilt term shifts the whole interior as the plate turns: motion
    // parallax, the one depth cue a flat quad can produce honestly.
    vec2 refr = rawN.xy * ART_DEPTH + vec2(uRotation.y, 0.0) * ART_PARALLAX;
    vec2 aUv = artUv(uv) + refr;
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

    // ── Form ─────────────────────────────────────────────────────────────────────
    // Directional shading across the body. Everything else here models the plate at its rim,
    // which leaves every face between the edges sitting at one flat value — a bright outline
    // around a sticker. This is what puts a light and a dark side on the thing.
    // This has to come off rawN, not the leaned n above. n carries dir * SPIN_LEAN, so dotting
    // it against a light that also travels on dir is dominated by dir . dir — a constant, and
    // a constant multiply is not modelling. rawN is the surface the normal map actually
    // describes, so bevels turned toward the light take it and the ones turned away do not.
    vec3 L = normalize(vec3(dir * 0.8, 0.6));
    float lambert = clamp(dot(rawN, L), 0.0, 1.0);
    col *= BODY_AMBIENT + BODY_DIFFUSE * lambert;

    // A gradient across the whole plate, lit end to dark end. A face at one even value is most
    // of what reads as a sticker; a solid picks up a falloff because one end of it is further
    // from the light than the other. Laid along dir, which counter-rotates, so the gradient
    // holds still on screen and the arms travel through it instead of carrying it around.
    col *= 1.0 + DEPTH_GRADIENT * dot(uv - 0.5, dir);

    // matcap env sheen from the perturbed normal — subtle at rest, blooms with velocity
    vec2 mUv = n.xy * 0.5 + 0.5 + vec2(sin(ang), cos(ang)) * 0.1;
    vec3 env = texture2D(uEnv, fract(mUv)).rgb;
    col += env * fres * uReflStrength * (0.3 + uVelocity);

    // ── The sides ────────────────────────────────────────────────────────────────
    // Everything below is the bevels, and all of it rides uVelocity: quiet at rest, and
    // opening up as the plate turns. A block of glass declares itself at its edges — the flat
    // faces are just a tinted window — so this is where turning has to pay off.
    float edgeGain = EDGE_REST + EDGE_SPIN * uVelocity;

    // Tighter than the body fresnel above. At 3.0 the falloff covers most of the plate and
    // reads as a wash; at 8.0 it sits only where the surface is steep, which is where an edge
    // actually is.
    float rim = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), RIM_POWER);

    // Dispersion. The three channels leave a steep face at slightly different angles, so a lit
    // bevel fringes rather than staying white — the single most reliable cue that something is
    // glass and not chrome. Split along the rim's own gradient, which is the direction the
    // surface is actually turning away in, and widened by the same gain, so the fringe opens as
    // it spins and closes as it settles.
    vec2 grad = length(n.xy) > 0.001 ? normalize(n.xy) : dir;
    vec2 split = grad * RIM_DISPERSION * rim * edgeGain;
    vec3 fringe = vec3(
      texture2D(uEnv, fract(mUv + split)).r,
      texture2D(uEnv, fract(mUv)).g,
      texture2D(uEnv, fract(mUv - split)).b
    );
    col += fringe * rim * uReflStrength * edgeGain;

    // A white core inside that fringe. Squared so it lands well inside the rim: without it the
    // edge picks up only the environment's colour and reads as a coloured outline rather than
    // as light caught on a chamfer.
    col += vec3(rim * rim) * edgeGain * RIM_CORE;

    // Moving specular band. Now carried by the spin as well as by time — tied to uTime alone
    // it held still on screen while the plate turned underneath it, which is precisely the
    // moment a highlight on glass should be travelling.
    float spec = smoothstep(0.985, 1.0,
      sin((uv.x + uv.y) * 6.0 - uTime * 1.2 - ang * SPEC_SPIN) * 0.5 + 0.5);
    col += spec * fres * (0.5 + uVelocity);

    if (outA < 0.005) discard;
    gl_FragColor = vec4(col, outA);
  }
`;
