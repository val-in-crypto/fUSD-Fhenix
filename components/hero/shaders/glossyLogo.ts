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
// The plate rests as cyan glass and fades the note in under the pointer, across its whole face
// rather than behind a sweeping terminator.
//
// tex-glass.png is the cyan render rescaled offline to the note's own bounding box, so both
// states stand at the same height and the same proportion. That is a plain resize and costs
// nothing in sharpness.
//
// It does not make them the same shape. The two renders are different asterisks whose arms
// differ in proportion, and nothing gets their silhouettes past IoU 0.8323 — the leftover shows
// as arm tips the note does not quite reach. Warping one onto the other per angle was tried and
// does reach 0.9983, but a radial warp bends straight arm edges into curves and the result is a
// visibly melted asterisk. Matching the box is as far as this can honestly go; matching the
// shape needs both renders out of one 3D scene.
//
// Highlights are masked by the luminance of whatever is currently on screen, so they are in
// register with it in both states, with no second silhouette to keep aligned. They fade out as
// the note arrives: the render is finished art carrying its own bevels and its own light, and
// laying a second set over it is what made the revealed state look washed.

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uBase;  // cyan glass — the plate: its outline, its alpha, its bevels
  uniform sampler2D uArt;   // dollar-glass, fitted in and revealed on hover; colour only
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

  // Strength of the white core laid into the brightest bevels.
  const float RIM_CORE = 0.5;
  // How far the channels are pulled apart across a lit bevel. Dispersion is the most reliable
  // cue that something is glass and not chrome.
  const float RIM_DISPERSION = 0.05;
  // How much of the specular band's travel comes from the spin rather than from time. Tied to
  // time alone the band holds still while the plate turns underneath it, which is precisely the
  // moment a highlight on glass should be moving.
  const float SPEC_SPIN = 3.0;

  // Residual fit, after the plate was rescaled offline to the note's own bounding box. Scale is
  // now essentially identity — 1.02 and 1.01 — so the note is shown at its true proportions and
  // only needs turning into place. It used to carry 0.9375 x 1.0156, squashing the note to fit
  // a plate that was the wrong shape for it; the plate is adapted to the note now instead,
  // which is the right way round because the note is the more sharply drawn of the two.
  //
  // Applied in image space (y down), the convention it was measured in, so the sign cannot
  // drift.
  const float ART_ROT = -0.0813; // -4.655deg
  const vec2  ART_SCALE = vec2(1.0202, 1.0108);
  const vec2  ART_OFFSET = vec2(-0.0176, 0.0073);

  // Lit-end-to-dark-end falloff across the plate. uv - 0.5 reaches 0.5, so this is half the peak
  // swing. It is what keeps a fixed render from reading as a spinning sticker: the gradient is
  // laid along the counter-rotating light axis, so it holds still on screen and the arms travel
  // through it rather than carrying it around with them.
  const float DEPTH_GRADIENT = 0.40;

  // 1 / 0.698 — the reciprocal of the cyan render's own peak alpha, so the plate lands exactly
  // opaque at full reveal rather than approximately.
  const float PLATE_SEAL = 1.432;

  // Into image space, transform, back out — step for step as the fit was measured.
  vec2 artUv(vec2 uv) {
    vec2 p = (vec2(uv.x, 1.0 - uv.y) - 0.5 - ART_OFFSET) * ART_SCALE;
    float c = cos(ART_ROT), s = sin(ART_ROT);
    vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y) + 0.5;
    return vec2(q.x, 1.0 - q.y);
  }

  void main() {
    vec2 uv = vUv;

    // The cyan render is the plate: its outline, its alpha, its bevels. Nothing is fitted onto
    // it that the eye reads as edge, so nothing can look out of register.
    vec4 base = texture2D(uBase, uv);
    if (base.a < 0.005) discard;

    // The plate is 0.698 opaque at most, which is how the cyan render was drawn and is right
    // for glass. It is wrong for the note: 30% of white page laid over the engraving is most of
    // why the revealed state looked washed. So the plate closes up as the note arrives, to
    // exactly opaque, and the correction below then resolves to the render's own colours.
    //
    // Scaling alpha does not move the outline. The edge ramps 0 -> 0.698 across a couple of
    // texels either way; multiplying steepens that ramp but barely shifts where it crosses half,
    // which is where the eye puts the edge.
    float outA = min(1.0, base.a * mix(1.0, PLATE_SEAL, uReveal));

    float ang = uRotation.x;

    // The key light, in plate space. uv is fixed to the plate, so a world-fixed light must
    // rotate *backwards* against the spin — hence LIGHT_ANGLE - ang. Leave the subtraction out
    // and the lit side rides along with the plate, so the same arms stay lit however far it
    // turns, which reads as a pattern painted on the asterisk rather than as light it moves
    // through.
    float lightPhase = LIGHT_ANGLE - ang;
    vec2 dir = vec2(cos(lightPhase), sin(lightPhase));

    // The note. Its alpha is coverage only and never reaches the output, so the outline cannot
    // move as it comes up; sampling off its edge gives 0, which feathers the arm tips rather
    // than cutting them.
    vec2 aUv = artUv(uv);
    vec4 art = texture2D(uArt, aUv);
    float artCover = smoothstep(0.05, 0.5, art.a)
      * step(0.0, aUv.x) * step(aUv.x, 1.0) * step(0.0, aUv.y) * step(aUv.y, 1.0);

    // Un-composited against the page before it is drawn.
    //
    // This plate is 0.7 opaque, so painting the note into it lays 30% of white page over the
    // engraving and washes it out — the note came out visibly paler than the render it was
    // taken from. Solving for the colour that *composites* to the render's own puts it back.
    // Where the engraving is darker than the page can account for, the solution goes negative
    // and clamps, which is the one place this cannot reach: the deepest ink lands around 0.30
    // instead of 0.20, against 0.44 with no correction at all.
    vec3 noteCol = clamp((art.rgb - (1.0 - outA)) / max(outA, 0.001), 0.0, 1.0);

    // uReveal is pointer proximity alone: the note answers hover and nothing else, so spinning
    // the plate no longer brings it up uninvited.
    vec3 col = mix(base.rgb, noteCol, uReveal * artCover);

    // Read off what is actually on screen, so the highlights follow whichever image is showing
    // and are in register with it either way.
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float gloss = smoothstep(GLOSS_LO, GLOSS_HI, lum);

    // Everything synthetic fades out as the note arrives. The render is finished art with its
    // own bevels and its own light; adding a second set on top is what made the revealed state
    // read as washed. At rest it is all still there, lighting the cyan plate.
    float synth = 1.0 - uReveal;
    float edgeGain = (EDGE_REST + EDGE_SPIN * uVelocity) * synth;

    // Body gradient. Applied before the additive terms so it shades the plate itself rather
    // than the highlights laid on top of it.
    col *= 1.0 + DEPTH_GRADIENT * synth * dot(uv - 0.5, dir);

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
    col += spec * gloss * (0.5 + uVelocity) * synth;

    gl_FragColor = vec4(col, outA);
  }
`;
