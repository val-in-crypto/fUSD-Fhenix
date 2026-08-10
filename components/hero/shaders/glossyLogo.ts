// GLSL for the glossy fUSD logo.
//
// One texture, one silhouette. The plate rests as the designer's three-layer glass — a thick
// cyan edge, a frosted body, and a sharp reflection — all masked by the dollar-glass render's own
// alpha, and fades the note in under the pointer. Both states come from the same PNG, so the
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
// The rest state is the spec's CSS, composited here instead of by the browser — because the plate
// spins and tilts, and a DOM element cannot follow a mesh. The three layers carry different
// scales, which is the whole trick: the edge sits 3.5% proud of the body, so it shows as a rim
// all the way round rather than needing a stroke.
//
// backdrop-filter does not survive the move, harmlessly: it blurs what is behind the element, and
// behind this is a plain white hero, so it resolves to white either way — which is what the
// layers are composited over. The drop-shadows do not either; they fall outside the mask, which
// this shader discards, and are a glow around the mark rather than glass in it. The CSS fallback
// keeps both.

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

  // One CSS pixel, in uv. The mask is contain-fitted, so the square texture spans the box's
  // smaller edge — 564.15px — and that is the scale the spec's shadow offsets are written in.
  const float PX = 1.0 / 564.15;

  const vec4 CLEAR = vec4(0.0);

  // ── the glass bevel ──────────────────────────────────────────────────────────
  // The with-bill render's gloss lives on its chamfers: bright bands running along every edge,
  // with a darker turn where they face away. Those follow the outline, and the outline is the
  // mask, so they can be rebuilt from it — rather than lifted out of the render, where they are
  // inseparable from the print. A median filter wide enough to remove the engraving's hatching
  // leaves Franklin's tonal mass as a ghost and turns the bevels to mush; that was tried.
  //
  // Rebuilt this way the chamfer is in register with the shape by construction, because it *is*
  // the shape.
  const float BEVEL_PX = 26.0;    // chamfer width, in the spec's pixel scale
  const float BEVEL_SLOPE = 2.4;  // how far the chamfer turns away from face-on
  const float BEVEL_LIGHT = 0.90; // the lit band
  const float BEVEL_DARK = 0.34;  // the turn away from the light
  const float BEVEL_SPEC = 0.60;  // the hot line inside the lit band
  const float BEVEL_TIGHT = 26.0; // specular exponent

  // Where the key sits. Upper-left, matching the render's own.
  const vec3 KEY = vec3(-0.55, 0.62, 0.56);

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
  vec4 overA(vec4 dst, vec4 src) {
    float a = src.a + dst.a * (1.0 - src.a);
    vec3 c = a > 0.0001
      ? (src.rgb * src.a + dst.rgb * dst.a * (1.0 - src.a)) / a
      : vec3(0.0);
    return vec4(c, a);
  }

  // Each layer carries its own scale, so it samples the mask — and lays out its gradients — in
  // its own space. transform: scale() scales the painted result, gradient and all.
  vec2 scaled(vec2 uv, float s) { return (uv - 0.5) / s + 0.5; }
  float maskAt(vec2 q) {
    if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) return 0.0;
    return texture2D(uArt, q).a;
  }

  // A CSS inset shadow is the shape's own inverse, offset and blurred, clipped back inside it.
  // Five taps is enough for the soft falloff these use. CSS y runs down and uv runs up, so the
  // offset's y is negated on the way in.
  float insetShadow(vec2 q, vec2 offsetPx, float blurPx) {
    vec2 o = vec2(offsetPx.x, -offsetPx.y) * PX;
    float b = blurPx * PX * 0.5;
    float acc = 1.0 - maskAt(q - o);
    acc += 1.0 - maskAt(q - o + vec2(b, 0.0));
    acc += 1.0 - maskAt(q - o - vec2(b, 0.0));
    acc += 1.0 - maskAt(q - o + vec2(0.0, b));
    acc += 1.0 - maskAt(q - o - vec2(0.0, b));
    return clamp(acc / 5.0, 0.0, 1.0);
  }

  void main() {
    vec2 uv = vUv;

    // ── the thick cyan edge, 3.5% proud ─────────────────────────────────────────
    vec2 qe = scaled(uv, 1.035);
    float ae = maskAt(qe);
    if (ae < 0.005 && maskAt(scaled(uv, 0.965)) < 0.005) discard;

    vec2 pe = vec2(qe.x, 1.0 - qe.y);
    float te = gradT(pe, 135.0);
    vec3 edge;
    if (te < 0.12)      edge = mix(vec3(0.918, 1.000, 1.000), vec3(0.463, 0.965, 1.000), te / 0.12);
    else if (te < 0.35) edge = mix(vec3(0.463, 0.965, 1.000), vec3(0.000, 0.875, 0.949), (te - 0.12) / 0.23);
    else if (te < 0.60) edge = mix(vec3(0.000, 0.875, 0.949), vec3(0.000, 0.561, 0.682), (te - 0.35) / 0.25);
    else if (te < 0.82) edge = mix(vec3(0.000, 0.561, 0.682), vec3(0.396, 0.961, 1.000), (te - 0.60) / 0.22);
    else                edge = mix(vec3(0.396, 0.961, 1.000), vec3(1.000, 1.000, 1.000), (te - 0.82) / 0.18);

    // ── the frosted body, 3.5% inside ───────────────────────────────────────────
    vec2 qb = scaled(uv, 0.965);
    float ab = maskAt(qb);
    vec2 pb = vec2(qb.x, 1.0 - qb.y);

    float tb = gradT(pb, 145.0);
    vec4 body;
    if (tb < 0.20)      body = stopMix(vec4(0.882, 1.000, 1.000, 0.95), vec4(0.627, 0.961, 1.000, 0.90), tb / 0.20);
    else if (tb < 0.55) body = stopMix(vec4(0.627, 0.961, 1.000, 0.90), vec4(0.314, 0.804, 0.882, 0.72), (tb - 0.20) / 0.35);
    else                body = stopMix(vec4(0.314, 0.804, 0.882, 0.72), vec4(0.745, 0.980, 1.000, 0.90), (tb - 0.55) / 0.45);

    // radial-gradient(circle at 28% 18%, ...) — no size given, so CSS sizes it farthest-corner
    float rb = distance(pb, vec2(0.28, 0.18)) / distance(vec2(1.0, 1.0), vec2(0.28, 0.18));
    vec4 sheen = CLEAR;
    if (rb < 0.14)      sheen = stopMix(vec4(1.0, 1.0, 1.0, 0.95), vec4(1.0, 1.0, 1.0, 0.50), rb / 0.14);
    else if (rb < 0.34) sheen = stopMix(vec4(1.0, 1.0, 1.0, 0.50), CLEAR, (rb - 0.14) / 0.20);
    body = overA(body, sheen);

    // the two inset shadows: white from the top-left, teal from the bottom-right
    body = overA(body, vec4(1.0, 1.0, 1.0, 0.55 * insetShadow(qb, vec2(10.0, 10.0), 20.0)));
    body = overA(body, vec4(0.0, 0.471, 0.588, 0.30 * insetShadow(qb, vec2(-14.0, -16.0), 26.0)));

    // ── the sharp reflection, at 0.72 layer opacity ─────────────────────────────
    vec2 qs = scaled(uv, 0.97);
    float as = maskAt(qs);
    vec2 ps = vec2(qs.x, 1.0 - qs.y);

    float ts = gradT(ps, 125.0);
    vec4 shine;
    if (ts < 0.04)      shine = stopMix(vec4(1.0, 1.0, 1.0, 0.95), vec4(1.0, 1.0, 1.0, 0.65), ts / 0.04);
    else if (ts < 0.16) shine = stopMix(vec4(1.0, 1.0, 1.0, 0.65), vec4(1.0, 1.0, 1.0, 0.12), (ts - 0.04) / 0.12);
    else if (ts < 0.29) shine = stopMix(vec4(1.0, 1.0, 1.0, 0.12), CLEAR, (ts - 0.16) / 0.13);
    else if (ts < 0.68) shine = CLEAR;
    else if (ts < 0.84) shine = stopMix(CLEAR, vec4(0.0, 0.933, 1.0, 0.28), (ts - 0.68) / 0.16);
    else                shine = stopMix(vec4(0.0, 0.933, 1.0, 0.28), vec4(1.0, 1.0, 1.0, 0.72), (ts - 0.84) / 0.16);
    shine.a *= 0.72;

    // ── the chamfer, from the mask's own falloff ────────────────────────────────
    // Mean alpha over a ring is a cheap stand-in for distance from the edge: about 1 well
    // inside, about a half on the outline itself. The same taps give the inward gradient, which
    // is the direction the chamfer turns.
    float inner = 0.0;
    vec2 inward = vec2(0.0);
    for (int i = 0; i < 8; i++) {
      float a = (float(i) + 0.5) / 8.0 * 6.2831853;
      vec2 o = vec2(cos(a), sin(a)) * (BEVEL_PX * PX);
      float m = maskAt(qb + o);
      inner += m;
      inward += o * m;
    }
    inner /= 8.0;

    float bevel = 1.0 - smoothstep(0.45, 0.95, inner);
    vec2 outward = length(inward) > 0.00001 ? -normalize(inward) : vec2(0.0);
    vec3 n = normalize(vec3(outward * bevel * BEVEL_SLOPE, 1.0));
    vec3 L = normalize(KEY);
    float diff = max(dot(n, L), 0.0);
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), BEVEL_TIGHT);

    // ── composite, over the white hero ──────────────────────────────────────────
    vec3 glass = vec3(1.0);
    glass = over(glass, vec4(edge, ae));
    glass = over(glass, vec4(body.rgb, body.a * ab));

    // Chamfer under the reflection, so the sweep still reads across it.
    float lit = bevel * ab;
    glass = over(glass, vec4(1.0, 1.0, 1.0, lit * BEVEL_LIGHT * pow(diff, 1.6)));
    glass = over(glass, vec4(0.02, 0.38, 0.47, lit * BEVEL_DARK * (1.0 - diff)));
    glass += vec3(spec) * lit * BEVEL_SPEC;

    glass = over(glass, vec4(shine.rgb, shine.a * as));

    // The union is the edge, since it is the largest of the three.
    float outA = max(ae, max(ab, as));

    // The note answers the pointer and nothing else. It is drawn at the mask's own scale, so it
    // sits inside the edge exactly as the body does.
    vec4 art = texture2D(uArt, uv);
    vec3 col = mix(glass, art.rgb, uReveal * art.a);

    gl_FragColor = vec4(col, mix(outA, max(outA, art.a), uReveal));
  }
`;
