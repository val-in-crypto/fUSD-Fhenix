// GLSL for the glossy fUSD logo.
//
// One texture, one silhouette. The plate rests as the designer's frosted-glass treatment in the
// exact shape of the dollar-glass render — that render's own alpha used as the mask, per the
// spec — and fades the note in under the pointer. Both states come from the same PNG, so the
// silhouette is identical by definition: nothing to fit, nothing to warp, nothing that can drift
// out of register.
//
// That is worth stating, because everything before it fought this. The cyan and dollar-glass
// renders are different asterisks whose arms differ in proportion: no rotation, scale or
// translation gets their silhouettes past IoU 0.8321, warping one onto the other per angle
// reaches 0.9983 but bends straight arm edges into curves and reads as melted, and the leftover
// either way showed as arm tips the note never reached. Masking removes the second shape rather
// than trying to reconcile it.
//
// The rest state is the spec's CSS, layer for layer, composited here instead of by the browser —
// because the plate spins and tilts, and a DOM element cannot follow a mesh. What the browser
// would do to a stack of translucent gradients over a white page, this does in one pass.
//
// Two things in that CSS do not survive the move, both harmlessly. backdrop-filter blurs and
// saturates what is behind the element, and behind this is a plain white hero, so it resolves to
// white either way. The drop-shadows fall outside the mask, which this shader discards; they
// would need a second pass to reproduce and are a glow around the mark rather than glass in it.

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

  // Progress along a CSS linear-gradient axis, for a 1x1 box.
  //
  // CSS measures from 0deg pointing up and runs clockwise, and its gradient line is long enough
  // that the corners land exactly on the end stops — which for a unit box is |sin| + |cos|.
  // Getting either wrong slides every stop along the arm.
  float gradT(vec2 p, float deg) {
    float a = radians(deg);
    vec2 d = vec2(sin(a), -cos(a));
    float L = abs(d.x) + abs(d.y);
    return clamp((dot(p - 0.5, d) + L * 0.5) / L, 0.0, 1.0);
  }

  // Interpolate two stops the way CSS does: premultiplied.
  //
  // This matters wherever a stop fades to "transparent", which is rgba(0,0,0,0). Interpolated
  // straight, a white stop drags toward black as it fades and the highlight goes grey. In
  // premultiplied space it stays white and simply thins out.
  vec4 stopMix(vec4 a, vec4 b, float t) {
    vec4 pa = vec4(a.rgb * a.a, a.a);
    vec4 pb = vec4(b.rgb * b.a, b.a);
    vec4 m = mix(pa, pb, clamp(t, 0.0, 1.0));
    return vec4(m.a > 0.0001 ? m.rgb / m.a : vec3(0.0), m.a);
  }

  vec3 over(vec3 dst, vec4 src) { return mix(dst, src.rgb, src.a); }

  const vec4 CLEAR = vec4(0.0);

  void main() {
    vec2 uv = vUv;

    vec4 art = texture2D(uArt, uv);
    if (art.a < 0.005) discard;

    // Into CSS space: y down, so every angle and percentage below reads as written.
    vec2 p = vec2(uv.x, 1.0 - uv.y);

    // ── background layer 2: linear-gradient(145deg, ...) ─────────────────────────
    float t1 = gradT(p, 145.0);
    vec4 body;
    if (t1 < 0.22) {
      body = stopMix(vec4(0.902, 1.000, 1.000, 0.90), vec4(0.490, 0.933, 0.980, 0.75), t1 / 0.22);
    } else if (t1 < 0.52) {
      body = stopMix(vec4(0.490, 0.933, 0.980, 0.75), vec4(0.282, 0.808, 0.882, 0.55), (t1 - 0.22) / 0.30);
    } else {
      body = stopMix(vec4(0.282, 0.808, 0.882, 0.55), vec4(0.725, 0.973, 1.000, 0.80), (t1 - 0.52) / 0.48);
    }

    // ── background layer 1: radial-gradient(circle at 30% 20%, ...) ──────────────
    // No size given, so CSS sizes it farthest-corner — from (0.3, 0.2) that is (1, 1).
    float r1 = distance(p, vec2(0.30, 0.20)) / distance(vec2(1.0, 1.0), vec2(0.30, 0.20));
    vec4 sheen = CLEAR;
    if (r1 < 0.20) {
      sheen = stopMix(vec4(1.0, 1.0, 1.0, 0.78), vec4(1.0, 1.0, 1.0, 0.30), r1 / 0.20);
    } else if (r1 < 0.42) {
      sheen = stopMix(vec4(1.0, 1.0, 1.0, 0.30), CLEAR, (r1 - 0.20) / 0.22);
    }

    // ── ::before — the glossy reflection, at 0.8 layer opacity ───────────────────
    float t2 = gradT(p, 125.0);
    vec4 gloss = CLEAR;
    if (t2 < 0.12) {
      gloss = stopMix(vec4(1.0, 1.0, 1.0, 0.90), vec4(1.0, 1.0, 1.0, 0.35), t2 / 0.12);
    } else if (t2 < 0.31) {
      gloss = stopMix(vec4(1.0, 1.0, 1.0, 0.35), CLEAR, (t2 - 0.12) / 0.19);
    } else if (t2 >= 0.70) {
      gloss = stopMix(CLEAR, vec4(0.0, 0.922, 1.0, 0.28), (t2 - 0.70) / 0.30);
    }
    gloss.a *= 0.8;

    // ── ::after — cyan depth. Its linear sits under its radial, as listed. ───────
    float t3 = gradT(p, 160.0);
    vec4 depth = t3 < 0.40 ? CLEAR : stopMix(CLEAR, vec4(0.0, 0.922, 1.0, 0.25), (t3 - 0.40) / 0.60);
    float r2 = distance(p, vec2(0.60, 0.65)) / 0.55;
    vec4 pool = r2 < 1.0 ? stopMix(vec4(0.0, 0.725, 0.843, 0.25), CLEAR, r2) : CLEAR;

    // Composited over the white hero, bottom to top, which is what backdrop-filter would have
    // resolved to anyway.
    vec3 glass = vec3(1.0);
    glass = over(glass, body);
    glass = over(glass, sheen);
    glass = over(glass, gloss);
    glass = over(glass, depth);
    glass = over(glass, pool);

    // The note answers the pointer and nothing else.
    vec3 col = mix(glass, art.rgb, uReveal);

    gl_FragColor = vec4(col, art.a);
  }
`;
