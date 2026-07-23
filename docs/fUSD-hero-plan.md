# fUSD Hero — build plan for Claude Code

A phase-by-phase plan to rebuild the fUSD hero (Figma node `40:4`) pixel-faithfully in
**Next.js**, then make the cyan asterisk a **glossy logo you grab and spin with momentum**,
where a **user-supplied dollar image appears as a live reflection** sweeping across the
surface as it turns.

> **Source of truth is the Figma file, always.** File `SgLXeHToggDmYNLKDipGjE`, hero node
> `40:4`. Pull every measurement live via the Figma MCP (`get_metadata` /
> `get_design_context` / `get_screenshot`) — never transcribe numbers from memory.
> Work **phase by phase and stop for review** after each one.

---

## The core idea (read this before writing the shader)

We only have a **flat PNG** of the logo — there is no 3D model. So the "3D glossy object"
is **faked**, and the fake has to be chosen well:

- **Spin** is a real in-plane rotation of the flat quad around Z. The asterisk is radially
  busy, so rotating it genuinely reads as "spinning an object." This is the honest part.
- **Tilt** (X/Y) is *not* real perspective — it's faked purely by shifting the reflection
  and the surface normals, then clamped so it never looks broken. Never rotate the flat
  quad in X/Y far enough to reveal it's a sheet of paper.
- **The reflection** is the star. Technique: **matcap-style sampling** — sample the dollar
  texture using the perturbed surface normal's XY, offset by the live rotation angle. As
  the logo turns, the sample coordinate slides, so the dollar **sweeps across the surface**.
  This is cheaper and far more robust than computing true reflection vectors, and it gives
  exactly the effect asked for.
- **Glossiness** = a **fresnel** term (brighter at grazing edges) + a moving **specular
  band** + a low **bloom** pass that ties the highlights into the cyan background glow.
- **"Subtle at rest, stronger mid-spin"** is driven two ways: fresnel (always) *and*
  reflection strength scaled by **angular velocity**, so a fast flick blooms the dollar and
  a resting logo only shows a faint sheen.

Surface relief for the normals comes from a **normal map generated from the PNG's own
luminance** (the render already bakes in bevels/highlights) — no geometry needed.

---

## Stack & conventions

- **Next.js (App Router) + TypeScript + Tailwind CSS.** Single route `app/page.tsx`.
- The hero is self-contained under `components/hero/`. The WebGL logo is a **client
  component** (`'use client'`); the static text/layout render on the server. The canvas
  mounts client-side over a static `<img>` fallback.
- Typed props everywhere. No `any`. Functional components only.
- Design tokens live as CSS variables + a Tailwind theme extension. Never hardcode a hex
  that has a token.
- **Fonts via `next/font`:** Geist Mono (400 + 500) and Instrument Serif (italic) from
  `next/font/google`; Helvetica Neue via `next/font/local` **when a licensed file is
  provided** — until then `--font-display` falls back to the system Helvetica stack. The
  whole hero swaps the display face through that one variable.
- **Approved dependencies:** `three`, `@react-three/fiber`, `@react-three/drei`,
  `@react-three/postprocessing`. The one-time normal-map script may need `sharp` (dev-only)
  — **ask before adding it**; alternative is to generate the map once and commit the PNG so
  runtime ships only the four approved deps.

## Design tokens (pulled live from `40:4`)

```css
--ink:        #001623;  /* headline + primary text */
--ink-deep:   #011623;  /* registration squares */
--mono-muted: #777B7D;  /* Geist Mono micro-labels */
--hairline:   #E4EAEE;  /* 1px vertical rules + FHENIX pill fill */
--surface:    #FFFFFF;  /* page background */
--glow-cyan:  #0AD9DC;  /* exact glow fill (ships at 0.7 opacity + heavy blur) */
```

Tailwind theme names: `ink`, `ink-deep`, `mono-muted`, `hairline`, `glow-cyan`.
Figma defines **no variables** (`get_variable_defs` → `{}`) — this token layer is authored,
not inherited.

## Typography

| Role | Font | Spec |
|---|---|---|
| Headline | Helvetica Neue Regular (`--font-display`) | 80px, tracking −0.8px, line-height 0.9, `--ink` |
| Serif accent (word *private*) | Instrument Serif **Italic** | matches headline size/baseline |
| Mono labels / eyebrows / captions | Geist Mono 400 | 16px, tracking −0.16px, `--mono-muted` |
| FHENIX marks | Geist Mono 500 | 16px, black |

## Assets (already exported to `public/assets/`, reuse as-is)

| File | Source node | Notes |
|---|---|---|
| `asterisk.png` | `43:70` | logo render, **1448×1086, transparent alpha** |
| `glow-top.svg` / `glow-bottom.svg` | `42:66` / `43:73` | vector cyan ellipse, `#0AD9DC`, 0.7 opacity, blur 150 — may also be a CSS `radial-gradient` |
| `arrow-down.svg` | `42:49` | `pixel:arrow-down`, inline SVG |
| `arrow-enter.svg` | `42:53` | `proicons:arrow-enter`, inline SVG |
| `dollar.png` | **you provide** | drop your dollar image here; loaded as the reflection texture. A placeholder is in place until you replace it. |
| `asterisk-normal.png` | generated (Phase 3) | normal map from `asterisk.png` luminance |

---

## Phases

### Phase 0 — Scaffold
Next.js + TS + Tailwind. `git init`. Wire `next/font` (Geist Mono 400/500, Instrument Serif
italic) and `--font-display` with the system-Helvetica fallback. Copy the exported assets
into `public/assets/`. Confirm dev server runs clean. **Stop for review.**

### Phase 1 — Design tokens
Emit the token layer as CSS variables + Tailwind theme extension (`ink`, `ink-deep`,
`mono-muted`, `hairline`, `glow-cyan`). Nothing visual yet.

### Phase 2 — Static hero (no animation)
Rebuild `40:4` exactly, responsive. Pull precise values live from MCP; anchors:
- **Headline** (top-left, 40/40, ~594px column): `Create money that feels ` + *private*
  (Instrument Serif italic) + ` and stable`. `clamp()` so it scales; the italic word sits
  on the sans baseline, no jump.
- **Eyebrow block** (top-right ~x1087, y40): `YOUR MONEY. BUT ENCRYPTED` / arrow-down +
  `BUILT TO STAY STABLE`.
- **FHENIX nav** (top-right corner, y30): arrow-enter + `FHENIX` (Geist Mono 500).
- **Mid micro-labels** (y~502): `WE TURN PRIVACY` (left ~8%), `INTO STABLE VALUE` (~75%).
- **Registration squares**: two 10px `--ink-deep` at mid-height, x40 and x1390.
- **FHENIX pill** (bottom-left 40/920): `--hairline` fill, radius 2000, 20/10 padding.
- **Hairlines**: two 1px `--hairline` verticals at x≈377 and x≈1062, full height.
- **Logo (static for now)**: `asterisk.png` at base rotation **−25.98°**, ~70% opacity,
  centered over the two cyan glows. Replaced by the canvas in Phase 4.

Acceptance: side-by-side with the Figma screenshot at 1440 it matches; holds down to 375
(**propose** the mobile reflow/hide behavior for the micro-labels — don't guess silently).
**Stop for review.**

### Phase 3 — Shader asset prep
Generate `asterisk-normal.png`: Sobel gradient on the PNG luminance → tangent-space normals,
lightly blurred (smooth bevel relief, not literal detail). Keep the PNG alpha as the shape
mask. Confirm `dollar.png` loads and is power-of-two-friendly / sized sanely (≤1024).

### Phase 4 — `<GlossyLogo>` (R3F + shader)
Orthographic camera, one quad sized to the logo, `ShaderMaterial`. Uniforms: `uBase`,
`uNormal`, `uDollar`, `uTime`, `uRotation` (vec2: spin, tilt), `uReflStrength`, `uVelocity`.
Fragment logic:
- Sample `uBase`; its alpha is the final mask (discard outside).
- `n = normalize(texture(uNormal, uv).rgb*2 - 1)`; perturb `n.xy` by `uRotation` (fake tilt).
- Fresnel `= pow(1 - dot(n, viewDir(0,0,1)), 3)`.
- Matcap reflection: `reflUv = n.xy*0.5 + 0.5 + rotationOffset(uRotation)`; sample `uDollar`.
- Moving specular band from `uTime` + `uRotation`.
- `reflection = dollar * fresnel * uReflStrength * (0.4 + uVelocity) + specular`;
  `final = screen(base, reflection)`, output with `base.a`.
Expose `reflStrength` as a prop (start ~0.35). **Static at this phase — no input yet.**

### Phase 5 — Drag physics (free-spin feel)
- Pointer/touch down on the logo → capture, cursor `grabbing`.
- Move → accumulate velocity: `dragX → Δspin(Z) + a little tilt`, `dragY → tilt`.
- Release → **inertia**: spin velocity decays (`*= ~0.94/frame`); tilt springs back to 0;
  spin keeps momentum. Flick spins, nudge turns a little.
- **Clamp tilt to ±~30°**; Z-spin unbounded.
- Feed live rotation into **both** the quad transform **and** `uRotation`, and feed
  `|angular velocity|` into `uVelocity` so the reflection blooms mid-spin.
- Idle (untouched): gentle auto-drift oscillating around **−25.98°** + slow sheen; any
  interaction overrides instantly.

### Phase 6 — Glow & post
Two cyan glows behind the logo (SVG assets or CSS `radial-gradient` in `--glow-cyan`). One
low **Bloom** pass (`@react-three/postprocessing`) so highlights + reflected dollar softly
bloom and unify with the background — reads as premium glass.

### Phase 7 — Responsive & accessibility
- Canvas scales with viewport; mobile centers the logo, micro-labels collapse per the
  Phase 2 decision.
- **`prefers-reduced-motion`**: no idle drift, inertia, animated sheen, or animated bloom;
  logo static at −25.98° but still draggable (instant, no momentum).
- **No WebGL / canvas error** → fall back to the static `asterisk.png` (progressive
  enhancement). Logo is decorative: `aria-label` "fUSD glossy logo, drag to rotate", no
  keyboard trap; page fully usable without the canvas.

### Phase 8 — Polish
60fps: no per-frame allocations (reuse vectors/quats), textures ≤1024, `dpr` capped at 2,
render on demand where possible. Re-match the Figma screenshot at 1440. Expose tuning props
(`reflStrength`, `inertiaDecay`, `tiltClamp`, `idleSpeed`) so the feel is art-directable
without touching shader code.

---

## Acceptance criteria (whole build)

1. Static hero indistinguishable from Figma `40:4` at 1440; degrades cleanly to 375.
2. Dragging spins with believable momentum; flick-and-release keeps spinning and settles;
   tilt never goes edge-on.
3. The dollar asset visibly **sweeps across the logo as a reflection** while turning —
   subtle at rest, stronger mid-spin.
4. Cyan glow + gentle bloom present; logo feels glassy, not a flat sticker.
5. `prefers-reduced-motion` honored; static fallback if WebGL is missing.
6. Helvetica Neue swappable via one variable; Instrument Serif italic + Geist Mono exact.
7. 60fps on a mid laptop; no console errors; no layout shift.

## Senior notes / risks

- **Don't over-tilt the flat quad.** The illusion breaks the instant it reads as paper.
  Keep real rotation to Z; sell everything else through the shader.
- **Tie reflection to velocity, not just fresnel** — that's what makes it feel physical
  rather than like a decal.
- **Generate the normal map at build time and commit it** to avoid a runtime dependency and
  a first-paint hitch. Blur it if it looks noisy.
- **SSR/hydration:** the canvas is client-only; guard against SSR-ing WebGL, and make the
  `<img>` fallback the server-rendered content so there's no layout shift when the canvas
  takes over.
- **Ask before adding any dependency** beyond the four approved (and `sharp` for the
  one-time script).

## Note on prior files in this folder

`CLAUDE.md` and `fUSD-hero-build-prompt.md` here describe an earlier **Vite** direction and
are **superseded by this plan** (stack is now Next.js). The exported `public/assets/` are
still correct and reused. On approval, I'll reconcile CLAUDE.md to Next.js and reset the
scaffold.
