// Decrypt transition: the cyan halftone "plate" (uFrom) resolves into the photographic
// bill (uTo) in scattered cell-blocks as uProgress rises — confidential -> public.
// Unresolved cells jitter per-cell (scrambled data); a cyan scan line rides the front.

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform float uProgress;   // 0 = fully encrypted, 1 = fully resolved
  uniform float uScramble;   // 0 disables jitter + scan line (reduced motion)
  uniform float uFromAspect;
  uniform float uToAspect;
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

    // resolve front sweeps left -> right, scattered by per-cell randomness
    float threshold = uv.x * 0.55 + rnd * 0.45;
    float resolved = smoothstep(threshold - 0.10, threshold + 0.10, uProgress);

    // encrypted cells jitter; resolved cells sit still
    vec2 jitter = (vec2(hash(cellId + 3.7), hash(cellId + 9.1)) - 0.5)
                * 0.06 * (1.0 - resolved) * uScramble;

    vec4 fromCol = texture2D(uFrom, coverUv(uv + jitter, uFromAspect));
    vec4 toCol   = texture2D(uTo,   coverUv(uv, uToAspect));

    vec4 col = mix(fromCol, toCol, resolved);

    // cyan scan line riding the resolve front, faded out at both ends so the
    // finished plate is clean and the untouched plate isn't pre-lit
    float endsFade = smoothstep(0.0, 0.06, uProgress) * (1.0 - smoothstep(0.92, 1.0, uProgress));
    float front = (1.0 - smoothstep(0.0, 0.045, abs(threshold - uProgress))) * uScramble * endsFade;
    float inShape = step(0.001, max(fromCol.a, toCol.a));
    col.rgb += vec3(0.04, 0.85, 0.86) * front * 0.55 * inShape;
    col.a = max(col.a, front * 0.45 * inShape);

    if (col.a < 0.005) discard;
    gl_FragColor = col;
  }
`;
