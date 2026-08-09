// Encrypt transition: the photographic bill (uPlain) dissolves INTO the cyan cipher plate
// (uCipher) in scattered cell-blocks as uProgress rises — plaintext -> ciphertext, embodying
// "your financial data becomes truly yours." Scrolling back up reverses it (decrypt).
// Newly-encrypted cells jitter (scrambled data); a cyan scan line rides the encryption front.

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uPlain;    // photographic bill (plaintext, progress = 0)
  uniform sampler2D uCipher;   // cyan halftone plate (ciphertext, progress = 1)
  uniform float uProgress;     // 0 = fully plaintext, 1 = fully encrypted
  uniform float uSpeed;        // |d(progress)/dt|, per second — widens the front when scrubbing
  uniform float uScramble;     // 0 disables jitter + scan line (reduced motion)
  uniform float uPlainAspect;
  uniform float uCipherAspect;
  uniform float uQuadAspect;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // The cipher plate was exported with its bill rotated ~3.7deg inside the frame: its ink
  // edges run from y=4 at x=60 to y=35 at x=540 on a 600px-wide sample, top and bottom
  // sloping alike. The plain bill is dead level. Undo the rotation when sampling so the two
  // read as the same note being encrypted rather than two notes at different angles.
  const float CIPHER_TILT = 0.0646; // radians, +3.7deg

  // The two notes are also framed differently inside their own textures: the plain bill
  // fills 0.995 x 0.900 of its frame, the cipher only 0.980 x 0.870. Matching the frames
  // (aspect, rotation) is not enough while the notes sit at different sizes within them —
  // their printed borders land ~3% apart, about 10px on the desktop stage, so the
  // transition showed two edges rather than one. Magnify the cipher onto the plain bill:
  // 0.995/0.980 across, 0.900/0.870 down.
  const vec2 CIPHER_FIT = vec2(1.0153, 1.0345);

  // Crop. Both plates fray along their own top and bottom borders — the bill's alpha edge
  // and the halftone's sparse border dots — and no amount of registering them fixes an edge
  // that is ragged in the source. So cut the composite to a straight inset rectangle and let
  // that be the edge. Symmetric, so it holds whichever way the texture's V runs. The note
  // spans 0.048..0.952 of the plate, so 0.075 trims a little inside its border. Left and
  // right need no crop: the cover fit already samples 0.055..0.945 across, well inside the
  // note, so those edges are the quad's own and were always clean.
  const float CROP_V = 0.075;
  const float CROP_AA = 0.006; // feather, so the cut is antialiased rather than a hard step

  vec2 unrotate(vec2 texUv, float aspect, float angle) {
    vec2 p = (texUv - 0.5) * vec2(aspect, 1.0); // into square space, or the turn skews
    float s = sin(angle), c = cos(angle);
    p = mat2(c, -s, s, c) * p;
    return p / vec2(aspect, 1.0) + 0.5;
  }

  // "cover" fit so neither plate is distorted by the quad's aspect
  vec2 coverScale(float texAspect, float quadAspect) {
    return texAspect > quadAspect
      ? vec2(quadAspect / texAspect, 1.0)
      : vec2(1.0, texAspect / quadAspect);
  }

  // Both plates deliberately share ONE cover fit, taken from the plain bill. The two sources
  // differ ~4% in aspect (2.376 vs 2.276); letting each fit itself slid them apart
  // horizontally, so mid-transition you saw two offset bills at once and the crossfade read
  // as ghosting. A 4% stretch on a halftone plate is invisible; the misregistration was not.
  vec2 coverUv(vec2 uv) {
    return (uv - 0.5) * coverScale(uPlainAspect, uQuadAspect) + 0.5;
  }

  void main() {
    vec2 uv = vUv;

    // Block grid, roughly matching the bill's proportions. Fine enough to read as data
    // rather than as a broken JPEG — at 56x24 the cells were ~11px on the desktop stage,
    // big enough that each one showed recognisable photograph.
    vec2 cells = vec2(112.0, 48.0);
    vec2 cellId = floor(uv * cells);
    float rnd = hash(cellId);

    // Encryption front sweeps left -> right, scattered by per-cell randomness. The
    // directional term has to dominate the random one or there is no legible front at all —
    // at 0.55/0.45 the scatter was nearly as strong as the sweep, so cells all over the
    // plate flipped at once and it read as an image corrupting rather than a wipe crossing.
    // Sub-cell grain, finer than a cell, added to the threshold. Without it the threshold is
    // constant down a cell's height, so vertically adjacent cells flip along a shared
    // horizontal seam and the front reads as a staircase. The grain breaks those seams into
    // stipple while leaving the block structure itself intact.
    float grain = hash(floor(uv * cells * 4.0) + 31.7);
    float threshold = uv.x * 0.78 + rnd * 0.19 + (grain - 0.5) * 0.06;

    // Per-cell fade. Tight enough that a cell still commits to plaintext or ciphertext
    // rather than sitting half-mixed — two photographs averaged at 50% look like neither —
    // but wide enough that neighbours overlap as they flip instead of each snapping on its
    // own and leaving a hard seam against the cell beside it.
    float encrypted = smoothstep(threshold - 0.07, threshold + 0.07, uProgress);

    // Jitter peaks while a cell is mid-flip and settles to nothing once it has landed.
    // Scaling it by "encrypted" alone left finished cells permanently displaced, which is
    // what made the completed side read as a corrupted image instead of a cipher plate —
    // and, at 0.06 of a 1220px texture (~73px), dragged transparent regions in and opaque
    // ones out, scattering detached blocks beyond the bill's own silhouette.
    float flipping = encrypted * (1.0 - encrypted) * 4.0;
    // Amplitude tracks the cell size. At 0.03 (~37px of a 1220px plate) the throw was
    // several cells wide once the grid halved, which turns a scramble into noise.
    vec2 jitter = (vec2(hash(cellId + 3.7), hash(cellId + 9.1)) - 0.5)
                * 0.015 * flipping * uScramble;

    vec4 plainCol  = texture2D(uPlain,  coverUv(uv));

    // Un-rotating walks the sample off the plate along the leading corner, where the
    // sampler clamps and repeats its border row across the width. Fall back to the plain
    // bill there so nothing streaks.
    vec2 cipherUv = unrotate(coverUv(uv + jitter), uCipherAspect, CIPHER_TILT);
    cipherUv = (cipherUv - 0.5) / CIPHER_FIT + 0.5; // sit the cipher note on the plain one
    vec2 inside = step(vec2(0.0), cipherUv) * step(cipherUv, vec2(1.0));
    vec3 cipherRGB = mix(plainCol.rgb, texture2D(uCipher, cipherUv).rgb, inside.x * inside.y);

    // Silhouette. Neither plate can supply a clean one: the cipher has no alpha at all
    // (every pixel 255, an opaque white background) and the bill's own alpha edge frays once
    // the cells and jitter work on it. The crop rectangle supplies the edge instead, and the
    // bill's alpha only clips it so nothing paints past the note. min() rather than a
    // multiply, so the crop stays a hard straight line instead of inheriting the bill's
    // frayed falloff.
    float cropMask = smoothstep(CROP_V, CROP_V + CROP_AA, uv.y)
                   * (1.0 - smoothstep(1.0 - CROP_V - CROP_AA, 1.0 - CROP_V, uv.y));
    vec4 col = vec4(mix(plainCol.rgb, cipherRGB, encrypted), min(plainCol.a, cropMask));

    // cyan scan line riding the encryption front, faded out at both ends so the
    // finished plate is clean and the untouched plate isn't pre-lit
    float endsFade = smoothstep(0.0, 0.06, uProgress) * (1.0 - smoothstep(0.92, 1.0, uProgress));
    // The band has to cover at least the ground the front makes in one frame, or a scrub
    // steps clean over it and the line strobes instead of sweeping. At rest it stays the
    // designed 0.045 hairline; under a fast flick it opens up and reads as motion blur.
    float band = clamp(0.045 + uSpeed * 0.12, 0.045, 0.30);
    float front = (1.0 - smoothstep(0.0, band, abs(threshold - uProgress))) * uScramble * endsFade;
    // Dim it as it widens so a fast scroll does not flash a thick slab of cyan across the
    // plate. sqrt rather than a straight 0.045/band, which would fade it to nothing.
    front *= sqrt(0.045 / band);
    // Tint only — the scan line used to contribute alpha of its own, over a shape taken
    // from the cipher's useless all-255 alpha, so it painted a cyan bar across the full
    // width of the quad and past the bill's edge. Colour added under the silhouette's own
    // alpha stays inside the bill and fades out with its antialiased edge.
    col.rgb += vec3(0.04, 0.85, 0.86) * front * 0.55;

    if (col.a < 0.005) discard;
    gl_FragColor = col;
  }
`;
