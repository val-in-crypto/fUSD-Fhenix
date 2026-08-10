// GLSL for the glossy fUSD logo.
//
// The plate is the designer's dollar-glass render, shown whole and shown always. It used to be
// a cyan asterisk that the note was revealed *onto*, by a terminator sweeping across on spin —
// which meant the note only ever covered part of the plate, and only while something was
// moving. Now the render is the thing itself, and the shader's job is narrower: make turning
// it read as light moving over glass rather than as a picture being spun.
//
// That change removed two textures and the register problem that came with them. The cyan base
// and this render are *different* asterisks — their arms differ by about a fifth of the
// silhouette — so anything derived from one and drawn on the other had to be fitted, and was
// still visibly off at the arm tips. Nothing is fitted now. The second angle frame goes for the
// same reason: cross-fading two renders shot at different angles puts two outlines on screen at
// once, which has been reported as a double asterisk more than once.
//
// The plate rests as plain cyan glass and fades the note in under the pointer. Both states are
// built from this one render — the rest state is it with its print lifted out — so there is a
// single silhouette throughout and a cross-fade cannot show two outlines, which is what the
// old cyan base texture did.
//
// Every highlight added here is masked by the art's own luminance. The render's bright pixels
// *are* its bevels, so that mask is in perfect register by construction — no second silhouette
// to keep aligned, and no extra texture samples needed to find one.

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uArt;   // the dollar-glass asterisk — the plate itself
  uniform sampler2D uBase;  // cyan glass, sampled for colour only; the outline is always uArt's
  uniform sampler2D uEnv;   // dollar bill, sampled as a matcap for live sheen
  uniform float uTime;
  uniform float uReveal;    // 0..1 pointer proximity; fades the note in, moves nothing
  uniform float uReflStrength;
  uniform float uVelocity;  // |angular velocity| -> blooms the sheen mid-spin
  uniform vec2  uRotation;  // x: spin phase, y: tilt

  varying vec2 vUv;

  // Where the key light sits, in screen space (radians; 0 = right, PI/2 = up). Fixed in the
  // world — the plate turns through it, it does not travel with the plate.
  const float LIGHT_ANGLE = 2.35; // upper-left

  // Which of the art's own tones count as bevel. Taken from the render's actual luminance
  // distribution rather than guessed: across its opaque pixels the median is 0.762 and the 95th
  // percentile 0.966, so the glass edges are the top few per cent and the note's paper occupies
  // everything below. The first pass at this used 0.62, which passed 73.5% of the plate — the
  // paper included — and blew the whole note out. 0.94 catches the top 12%, 0.99 the top 1%.
  const float GLOSS_LO = 0.94;
  const float GLOSS_HI = 0.99;

  // How hard the highlights work, at rest and at full spin. uVelocity and uReveal are both
  // clamped to 0..1 on the JS side, so these are the ends of a range rather than scale factors.
  const float EDGE_REST = 0.30;
  const float EDGE_SPIN = 1.00;
  const float EDGE_HOVER = 0.35;

  // Strength of the white core laid into the brightest bevels.
  const float RIM_CORE = 0.5;
  // How far the channels are pulled apart across a lit bevel. Dispersion is the most reliable
  // cue that something is glass and not chrome.
  const float RIM_DISPERSION = 0.05;
  // How much of the specular band's travel comes from the spin rather than from time. Tied to
  // time alone the band holds still while the plate turns underneath it, which is precisely the
  // moment a highlight on glass should be moving.
  const float SPEC_SPIN = 3.0;

  // Fallback tint for the few pixels of the plate the cyan render does not reach. Its own
  // measured mean, #7ce5ed.
  const vec3 GLASS_TINT = vec3(0.486, 0.898, 0.929);

  // Fit that lands the cyan render on this one. Measured the other way round originally — the
  // plate used to be the cyan asterisk and the note was fitted onto it, at -4.5deg and
  // 1.068 x 0.97, which put art behind 92.9% of the base. The plate is the note now, so this is
  // that transform inverted. Applied in image space (y down), the convention it was measured
  // in, so the sign cannot drift.
  const float ART_ROT = -0.0785; // -4.5deg
  const vec2  ART_SCALE = vec2(1.068, 0.97);

  // Lit-end-to-dark-end falloff across the plate. uv - 0.5 reaches 0.5, so this is half the peak
  // swing. It is what keeps a fixed render from reading as a spinning sticker: the gradient is
  // laid along the counter-rotating light axis, so it holds still on screen and the arms travel
  // through it rather than carrying it around with them.
  const float DEPTH_GRADIENT = 0.40;

  // Inverse of the fit: into image space, scale, rotate back, out again.
  vec2 baseUv(vec2 uv) {
    vec2 p = (vec2(uv.x, 1.0 - uv.y) - 0.5) * ART_SCALE;
    float c = cos(-ART_ROT), s = sin(-ART_ROT);
    vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y) + 0.5;
    return vec2(q.x, 1.0 - q.y);
  }

  void main() {
    vec2 uv = vUv;

    // The render, 1:1. No transform: the art is the plate now, so there is nothing to fit it to
    // and nothing that can drift out of register.
    vec4 art = texture2D(uArt, uv);
    if (art.a < 0.005) discard;

    vec3 note = art.rgb;
    float outA = art.a;

    float ang = uRotation.x;

    // The key light, in plate space. uv is fixed to the plate, so a world-fixed light must
    // rotate *backwards* against the spin — hence LIGHT_ANGLE - ang. Leave the subtraction out
    // and the lit side rides along with the plate, so the same arms stay lit however far it
    // turns, which reads as a pattern painted on the asterisk rather than as light it moves
    // through.
    float lightPhase = LIGHT_ANGLE - ang;
    vec2 dir = vec2(cos(lightPhase), sin(lightPhase));

    // Read off the note, not off the blend below, so the bevels sit in the same places whether
    // the print is showing or not — only the print crosses over, never the glass.
    float lum = dot(note, vec3(0.2126, 0.7152, 0.0722));
    float gloss = smoothstep(GLOSS_LO, GLOSS_HI, lum);

    // The plate at rest, taken from the cyan render's colour but never from its alpha.
    //
    // Lifting the note out of this render by luminance was tried first and does not work: its
    // chamfers are not separable from its paper by brightness, so the plate came out as a flat
    // cyan blob with no bevels. Sampling the real cyan glass gets its modelling back. Taking
    // only its colour is what keeps the double asterisk away — the two are different shapes,
    // about a fifth apart on silhouette, so if its alpha reached the output the outline would
    // morph as the note came up. It never does; outA is the note's throughout.
    vec2 bUv = baseUv(uv);
    vec4 b = texture2D(uBase, bUv);
    float inFrame = step(0.0, bUv.x) * step(bUv.x, 1.0) * step(0.0, bUv.y) * step(bUv.y, 1.0);
    // The cyan render draws at alpha 0.7 over a white page, so compositing it against white is
    // what makes it look the way it looked there.
    vec3 cyan = mix(vec3(1.0), b.rgb, b.a);
    // The fit reaches about 93% of the plate; the rest is arm tip and takes the flat tint,
    // feathered in by the same alpha so it reads as glass rather than as a seam.
    vec3 glass = mix(GLASS_TINT, cyan, smoothstep(0.05, 0.5, b.a) * inFrame);

    // uReveal is pointer proximity alone: the note answers hover and nothing else, so spinning
    // the plate no longer brings it up uninvited.
    vec3 col = mix(glass, note, uReveal);

    float edgeGain = EDGE_REST + EDGE_SPIN * uVelocity + EDGE_HOVER * uReveal;

    // Body gradient. Applied before the additive terms so it shades the render itself rather
    // than the highlights laid on top of it.
    col *= 1.0 + DEPTH_GRADIENT * dot(uv - 0.5, dir);

    // Matcap sheen, dispersed. The three channels leave a steep face at slightly different
    // angles, so a lit bevel fringes instead of staying white; the split widens with the same
    // gain, opening as the plate spins and closing as it settles.
    vec2 mUv = (uv - 0.5) * 1.2 + 0.5 + vec2(sin(ang), cos(ang)) * 0.12;
    vec2 split = dir * RIM_DISPERSION * gloss * edgeGain;
    vec3 fringe = vec3(
      texture2D(uEnv, fract(mUv + split)).r,
      texture2D(uEnv, fract(mUv)).g,
      texture2D(uEnv, fract(mUv - split)).b
    );
    col += fringe * gloss * uReflStrength * edgeGain;

    // A white core inside that fringe, squared so it stays on the brightest bevels only.
    col += vec3(gloss * gloss) * edgeGain * RIM_CORE;

    // Travelling specular band, carried by the spin as well as by time.
    float spec = smoothstep(0.985, 1.0,
      sin((uv.x + uv.y) * 6.0 - uTime * 1.2 - ang * SPEC_SPIN) * 0.5 + 0.5);
    col += spec * gloss * (0.5 + uVelocity);

    gl_FragColor = vec4(col, outA);
  }
`;
