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

    // block grid roughly matching the bill's proportions
    vec2 cells = vec2(56.0, 24.0);
    vec2 cellId = floor(uv * cells);
    float rnd = hash(cellId);

    // Encryption front sweeps left -> right, scattered by per-cell randomness. The
    // directional term has to dominate the random one or there is no legible front at all —
    // at 0.55/0.45 the scatter was nearly as strong as the sweep, so cells all over the
    // plate flipped at once and it read as an image corrupting rather than a wipe crossing.
    float threshold = uv.x * 0.78 + rnd * 0.22;
    // Tight per-cell fade so a cell commits to plaintext or ciphertext quickly. The old
    // 0.10 window left most of the band sitting half-mixed, which is what muddied the
    // middle — two photographs averaged together at 50% look like neither.
    float encrypted = smoothstep(threshold - 0.045, threshold + 0.045, uProgress);

    // Jitter peaks while a cell is mid-flip and settles to nothing once it has landed.
    // Scaling it by "encrypted" alone left finished cells permanently displaced, which is
    // what made the completed side read as a corrupted image instead of a cipher plate —
    // and, at 0.06 of a 1220px texture (~73px), dragged transparent regions in and opaque
    // ones out, scattering detached blocks beyond the bill's own silhouette.
    float flipping = encrypted * (1.0 - encrypted) * 4.0;
    vec2 jitter = (vec2(hash(cellId + 3.7), hash(cellId + 9.1)) - 0.5)
                * 0.03 * flipping * uScramble;

    vec4 plainCol  = texture2D(uPlain,  coverUv(uv));
    vec4 cipherCol = texture2D(uCipher, coverUv(uv + jitter));

    // Composite premultiplied. Mixing straight RGBA is wrong wherever the two plates
    // disagree on alpha: the transparent plate still carries RGB (black in both sources),
    // so a straight mix drags that toward the result and leaves grey and white blocks
    // fringing the bill — including outside its own silhouette, where both are meant to
    // be empty. Weighting each plate's colour by its own alpha and dividing back out
    // keeps the colour of whichever plate is actually present.
    float outA = mix(plainCol.a, cipherCol.a, encrypted);
    vec3 outRGB = mix(plainCol.rgb * plainCol.a, cipherCol.rgb * cipherCol.a, encrypted);
    vec4 col = vec4(outA > 0.001 ? outRGB / outA : vec3(0.0), outA);

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
    float inShape = step(0.001, max(plainCol.a, cipherCol.a));
    col.rgb += vec3(0.04, 0.85, 0.86) * front * 0.55 * inShape;
    col.a = max(col.a, front * 0.45 * inShape);

    if (col.a < 0.005) discard;
    gl_FragColor = col;
  }
`;
