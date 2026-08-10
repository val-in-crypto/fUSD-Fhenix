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
// rather than behind a sweeping terminator. The cyan render is the plate throughout — its
// outline, its alpha — and the note is colour only, so the silhouette never moves and a
// cross-fade cannot put two outlines on screen.
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

  uniform sampler2D uBase;  // clear cut glass, tinted cyan — the plate: outline, alpha, bevels
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

  // Which of the plate's own tones count as bevel, from its measured luminance rather than
  // guessed. The clear render is a narrow band once tinted — p50 0.837, p99 0.875 — because
  // almost all of its modelling is in the alpha rather than the colour, so this window is tight
  // and sits high in that band. Set it by eye and it does nothing at all: the old 0.94 was above
  // the plate's brightest pixel.
  const float GLOSS_LO = 0.855;
  const float GLOSS_HI = 0.875;

  // Maps the clear glass onto the brand cyan. A tint rather than a repaint, so every bit of the
  // render's contrast and highlight structure survives it.
  //
  // Solved for what it *composites* to, not what it starts at. Tinting the mean straight onto
  // #7ce5ed was the first attempt and came out near-white: the plate then draws at 0.7 over a
  // white page, which lifts it to #a4edf3. Working backwards through that gives #44dae5, which
  // lands on #7ce5ed once the page is accounted for.
  const vec3 PLATE_TINT = vec3(0.2881, 0.9189, 0.9662);

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

  // Fit that lands the note on the plate, from a direct search over rotation, scale and
  // translation maximising intersection-over-union of the two alphas: IoU 0.8321, against
  // 0.7785 for leaving it alone.
  //
  // The plate is the cyan render and the note is fitted onto it, never the other way round.
  // Inverting this to make the note the plate was tried and is worse than doing nothing — it
  // scored 0.7166 — and either way the residual is real: these are different asterisks whose
  // arms differ in proportion, so no rigid transform gets past about 0.83. Fitting the note
  // into the plate hides that in the interior, where it is print on print; fitting the plate
  // into the note puts it on the bevels, where it reads as edges that miss the outline.
  //
  // Applied in image space (y down), the convention it was measured in, so the sign cannot
  // drift.
  const float ART_ROT = -0.2313; // -13.250deg
  const vec2  ART_SCALE = vec2(0.9617, 1.0398);
  const vec2  ART_OFFSET = vec2(-0.0150, 0.0303);

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
    base.rgb *= PLATE_TINT;

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

    // The note, fitted in. Its alpha is coverage only and never reaches the output, so the
    // outline cannot move as it comes up; sampling off its edge gives 0, which feathers the arm
    // tips back to glass.
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
