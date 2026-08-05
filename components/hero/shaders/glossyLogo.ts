// GLSL for the glossy fUSD logo. HYBRID reflection: cyan glass base (uBase) with the
// pre-rendered dollar-glass art (uDollar) revealed by a rotation-driven sweep, plus a
// fresnel edge, a matcap env sheen (uEnv = dollar bill), and a moving specular band.
// uReveal/uRotation are driven from the drag + idle-spin physics in GlossyLogo.tsx.

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
  uniform sampler2D uDollar;  // pre-rendered dollar-glass art (aligned to base)
  uniform sampler2D uEnv;     // dollar bill, sampled as matcap env for live sheen
  uniform float uTime;
  uniform float uReveal;      // 0 = pure cyan, 1 = full dollar-glass
  uniform float uReflStrength;
  uniform float uVelocity;    // |angular velocity| -> blooms reflection mid-spin
  uniform vec2  uRotation;    // x: spin phase, y: tilt

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec4 base = texture2D(uBase, uv);
    if (base.a < 0.01) discard;

    // surface normal, perturbed by fake tilt so it "faces" a shifting direction
    vec3 n = normalize(texture2D(uNormal, uv).rgb * 2.0 - 1.0);
    n.xy += uRotation * 0.6;
    n = normalize(n);

    vec3 V = vec3(0.0, 0.0, 1.0);
    float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0);

    // dollar-glass art (the authored refraction look)
    vec4 dollar = texture2D(uDollar, uv);

    // reveal as a band that sweeps across, following the spin direction
    float ang = uRotation.x;
    vec2 dir = normalize(vec2(cos(ang + 0.7), sin(ang + 0.7)));
    float coord = dot(uv - 0.5, dir) + 0.5;              // 0..1 along sweep axis
    float band = smoothstep(uReveal - 0.35, uReveal + 0.08, coord);
    float reveal = clamp(1.0 - band, 0.0, 1.0);

    vec3 col = mix(base.rgb, dollar.rgb, reveal * dollar.a);

    // matcap env sheen from the perturbed normal — subtle at rest, blooms with velocity
    vec2 mUv = n.xy * 0.5 + 0.5 + vec2(sin(ang), cos(ang)) * 0.1;
    vec3 env = texture2D(uEnv, fract(mUv)).rgb;
    col += env * fres * uReflStrength * (0.3 + uVelocity);

    // moving specular band for glassiness
    float spec = smoothstep(0.985, 1.0, sin((uv.x + uv.y) * 6.0 - uTime * 1.2) * 0.5 + 0.5);
    col += spec * fres * 0.5;

    gl_FragColor = vec4(col, base.a);
  }
`;
