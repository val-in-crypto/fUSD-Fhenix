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

  vec2 coverUv(vec2 uv, float texAspect) {
    return (uv - 0.5) * coverScale(texAspect, uQuadAspect) + 0.5;
  }

  void main() {
    vec2 uv = vUv;

    // block grid roughly matching the bill's proportions
    vec2 cells = vec2(56.0, 24.0);
    vec2 cellId = floor(uv * cells);
    float rnd = hash(cellId);

    // encryption front sweeps left -> right, scattered by per-cell randomness
    float threshold = uv.x * 0.55 + rnd * 0.45;
    float encrypted = smoothstep(threshold - 0.10, threshold + 0.10, uProgress);

    // encrypted cells jitter (scrambled ciphertext); plaintext cells sit still
    vec2 jitter = (vec2(hash(cellId + 3.7), hash(cellId + 9.1)) - 0.5)
                * 0.06 * encrypted * uScramble;

    vec4 plainCol  = texture2D(uPlain,  coverUv(uv, uPlainAspect));
    vec4 cipherCol = texture2D(uCipher, coverUv(uv + jitter, uCipherAspect));

    vec4 col = mix(plainCol, cipherCol, encrypted);

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
