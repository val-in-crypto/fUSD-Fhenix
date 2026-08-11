// GLSL for the glossy fUSD logo.
//
// Two renders of the same asterisk: cyan glass at rest, the dollar-glass note under the pointer.
// They register — IoU 0.9865, measured in place — so the reveal is a straight cross-fade with
// nothing to fit, nothing to warp and nothing that can drift out of alignment.
//
// That is the whole story of this file, and it took a matched pair to get there. The *old* cyan
// plate was a different asterisk from the note: their arms differ in proportion, no rotation,
// scale or translation gets their silhouettes past IoU 0.8321, warping one onto the other per
// angle reaches 0.9983 but bends straight arm edges into curves and reads as melted, and the
// leftover either way showed as arm tips the note never reached. Every attempt to compose the
// rest state out of gradients, masks and a synthesised chamfer was working around that mismatch.
// None of it is needed now: tex-glass.png is the same geometry as the note, so the honest thing
// is to show it.
//
// The rest render arrived on an opaque black background, so its alpha is keyed from luminance —
// the glass is light on black, which makes that a clean cut — and it is reframed into the note's
// own bounding box, which is what buys the registration above.

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uGlass;  // cyan glass asterisk — the plate at rest
  uniform sampler2D uArt;    // dollar-glass asterisk — revealed under the pointer
  uniform float uTime;
  uniform float uReveal;     // 0..1 pointer proximity; fades the note in, moves nothing
  uniform float uVelocity;   // |angular velocity|, 0..1
  uniform vec2  uRotation;   // x: spin phase, y: tilt

  varying vec2 vUv;

  // Back to sRGB on the way out.
  //
  // Both textures are flagged sRGB, so three.js converts them to linear as it samples them, and
  // normally converts back in the material's output chunks — which a raw ShaderMaterial does not
  // include. The post-processing pass used to do it instead; with that gone, linear values were
  // landing in an sRGB framebuffer and the mark read dark. The interior mean #aae6ef is (0.667,
  // 0.902, 0.937), and unconverted it displays as roughly (0.402, 0.792, 0.863).
  //
  // The real transfer function rather than a 2.2 gamma: the two diverge most in the darks, which
  // is where the bevels are.
  vec3 toSRGB(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
               step(vec3(0.0031308), c));
  }

  // Where the key light sits, in screen space (radians; 0 = right, PI/2 = up). Fixed in the
  // world — the plate turns through it, it does not travel with the plate.
  const float LIGHT_ANGLE = 2.35; // upper-left

  // A lit-end-to-dark-end falloff across the plate, laid along the counter-rotating light axis so
  // it holds still on screen and the arms travel through it rather than carrying it around. Both
  // renders are lit from a fixed angle of their own, so this is deliberately slight: enough that
  // turning reads as light moving over the mark, not enough to fight the render's own shading.
  const float DEPTH_GRADIENT = 0.10;
  const float DEPTH_SPIN = 0.60;

  void main() {
    vec2 uv = vUv;

    vec4 glass = texture2D(uGlass, uv);
    vec4 note = texture2D(uArt, uv);

    // Premultiplied, because the two disagree on coverage by about 1.4% around the rim and a
    // straight mix would drag the transparent one's black into the other's edge there.
    vec4 pg = vec4(glass.rgb * glass.a, glass.a);
    vec4 pn = vec4(note.rgb * note.a, note.a);
    vec4 m = mix(pg, pn, uReveal);
    if (m.a < 0.005) discard;
    vec3 col = m.rgb / m.a;

    float ang = uRotation.x;
    float lightPhase = LIGHT_ANGLE - ang;
    vec2 dir = vec2(cos(lightPhase), sin(lightPhase));
    col *= 1.0 + DEPTH_GRADIENT * (1.0 + DEPTH_SPIN * uVelocity) * dot(uv - 0.5, dir);

    gl_FragColor = vec4(toSRGB(col), m.a);
  }
`;
