// GLSL for the glossy fUSD logo.
//
// One texture, one silhouette. The plate rests as flat brand cyan in the exact shape of the
// dollar-glass render — its alpha used as a mask, per the designer's spec — and fades the note
// in under the pointer. Because both states come from the same PNG there is nothing to fit,
// nothing to warp and nothing that can drift out of register.
//
// That is worth stating, because everything before it fought this. The cyan and dollar-glass
// renders are different asterisks whose arms differ in proportion: no rotation, scale or
// translation gets their silhouettes past IoU 0.8321, warping one onto the other per angle
// reaches 0.9983 but bends straight arm edges into curves and reads as melted, and the leftover
// either way shows as arm tips the note never reaches. Masking removes the second shape rather
// than trying to reconcile it.
//
// The trade is that a flat fill has no bevels, so the rest state carries no glass modelling of
// its own — only the body gradient below, which is what keeps the spin readable. The glass is
// the reveal.

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uArt;   // dollar-glass render: its alpha is the mask, its colour the reveal
  uniform float uTime;
  uniform float uReveal;    // 0..1 pointer proximity; fades the note in, moves nothing
  uniform float uVelocity;  // |angular velocity|, 0..1
  uniform vec2  uRotation;  // x: spin phase, y: tilt

  varying vec2 vUv;

  // The plate at rest, from the spec.
  const vec3 PLATE_COLOR = vec3(0.0, 0.9412, 1.0); // #00F0FF

  // Where the key light sits, in screen space (radians; 0 = right, PI/2 = up). Fixed in the
  // world — the plate turns through it, it does not travel with the plate.
  const float LIGHT_ANGLE = 2.35; // upper-left

  // Lit-end-to-dark-end falloff across the plate. uv - 0.5 reaches 0.5, so this is half the peak
  // swing. On a flat fill it is the only thing distinguishing one arm from another, and it is
  // laid along the counter-rotating light axis so it holds still on screen and the arms travel
  // through it rather than carrying it around with them.
  const float DEPTH_GRADIENT = 0.30;

  // How much the gradient deepens with the turn, so spinning the mark reads as light moving over
  // it rather than as a shape rotating under a fixed shade.
  const float DEPTH_SPIN = 0.35;

  void main() {
    vec2 uv = vUv;

    vec4 art = texture2D(uArt, uv);
    if (art.a < 0.005) discard;

    float ang = uRotation.x;

    // The key light, in plate space. uv is fixed to the plate, so a world-fixed light must
    // rotate *backwards* against the spin — hence LIGHT_ANGLE - ang. Leave the subtraction out
    // and the lit side rides along with the plate, so the same arms stay lit however far it
    // turns, which reads as a pattern painted on the asterisk rather than as light it moves
    // through.
    float lightPhase = LIGHT_ANGLE - ang;
    vec2 dir = vec2(cos(lightPhase), sin(lightPhase));

    // Flat cyan in the render's own shape, crossing to the render itself. uReveal is pointer
    // proximity alone: the note answers hover and nothing else.
    vec3 col = mix(PLATE_COLOR, art.rgb, uReveal);

    // Shading only while the plate is cyan. The render is finished art carrying its own bevels
    // and its own light; laying a second set over it is what made the revealed state look
    // washed, so this fades out exactly as the note arrives.
    float synth = 1.0 - uReveal;
    col *= 1.0 + DEPTH_GRADIENT * synth * (1.0 + DEPTH_SPIN * uVelocity) * dot(uv - 0.5, dir);

    gl_FragColor = vec4(col, art.a);
  }
`;
