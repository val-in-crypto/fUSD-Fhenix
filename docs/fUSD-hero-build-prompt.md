# Claude Code Build Prompt — fUSD Hero + Glossy Drag-to-Spin Logo

Paste this into Claude Code (terminal, with the Figma MCP connected). Work in phases;
after each phase, stop and show me the result before continuing.

> **Read `CLAUDE.md` first.** It holds the tokens, the stack decision, and the hard
> constraints. Figma MCP is the source of truth for every measurement — pull specs live
> from node `40:4` in file `SgLXeHToggDmYNLKDipGjE`; don't trust transcribed numbers.

---

## The one-liner

Rebuild the fUSD hero pixel-faithfully, then make the cyan asterisk logo a **glossy
object you can grab and spin with momentum**, where a **user-supplied dollar image
appears as a live reflection** sweeping across the surface as it turns. We only have a
flat PNG of the logo, so the "3D" is faked convincingly with inertia + a reflection
shader — **not** real orbit.

---

## Phase 0 — Scaffold & assets

1. Scaffold Next.js (App Router) + TypeScript + Tailwind. Single route `/`.
2. Fonts: load **Instrument Serif** (italic) and **Geist Mono** (400 + 500) via
   `next/font`. Wire the display face through `--font-display` (see CLAUDE.md licensing
   note); default to the system-Helvetica fallback until a licensed HN file is dropped in.
3. Create `/public/assets/` and export from Figma via MCP at 2× (retina):
   - `asterisk.png` — the logo render, **with transparent alpha** (node `43:70` / `image 1`).
   - `glow-top.png`, `glow-bottom.png` — the two cyan radial ellipses (nodes `42:66`,
     `43:73`). If cleaner, reproduce as CSS `radial-gradient` in `--glow-cyan`.
   - the arrow glyphs (`pixel:arrow-down`, `proicons:arrow-enter`) as inline SVG.
4. Drop a placeholder `dollar.png` in `/public/assets/`; I'll replace it with my real
   asset. Assume it's a square-ish PNG with alpha.

## Phase 1 — Design tokens

Emit the token layer from CLAUDE.md as CSS variables + a Tailwind theme extension
(`ink`, `ink-deep`, `mono-muted`, `hairline`, `glow-cyan`). Nothing visual yet —
just the system every later phase pulls from.

## Phase 2 — Static hero (no animation)

Rebuild `40:4` exactly, fluid and responsive, anchored to the Figma coordinates below.
Pull the precise values live from MCP; these are for orientation:

- **Headline** (top-left, ~594px column, top 40 / left 40): Helvetica Neue Regular 80px,
  `-0.8px` tracking, `0.9` line-height, `--ink`. Text: `Create money that feels `
  + *private* (Instrument Serif Italic) + ` and stable`. Use `clamp()` so it scales down
  cleanly; the serif italic word must sit on the baseline with the sans, not jump.
- **Top-right label block** (~75%, top 40, 209px wide): `YOUR MONEY. BUT ENCRYPTED` /
  arrow + `BUILT TO STAY STABLE` — Geist Mono 400, 16px, `--mono-muted`.
- **FHENIX mark** (top-right corner, top 30): arrow-enter glyph + `FHENIX`, Geist Mono
  500, black.
- **Mid-line micro-labels** (top ~502): `WE TURN PRIVACY` (left ~8%) and
  `INTO STABLE VALUE` (left ~75%), Geist Mono 400, `--mono-muted`.
- **Registration squares**: two 10px `--ink-deep` squares on the vertical mid-line,
  left 40 and far-right (~92%).
- **FHENIX pill** (bottom-left, top 920, left 40): `--hairline` fill, radius 2000,
  `20px/10px` padding, arrow-enter + `FHENIX` Geist Mono 500.
- **Hairlines**: two 1px `--hairline` verticals at ~25% and ~75%, full height.
- **Logo placeholder**: for now, the static `asterisk.png` at base rotation **−25.98°**,
  ~70% opacity, centered over the two cyan glows. (Phase 4 replaces this with the canvas.)

Acceptance: side-by-side with the Figma screenshot, spacing/type/positions match; layout
holds from 1440 down to 375 (labels may reflow/hide on mobile — propose the breakpoint
behavior, don't guess silently).

## Phase 3 — Asset prep for the shader

1. Generate a **normal map** from `asterisk.png`: derive surface normals from the render's
   luminance (Sobel gradient → RGB-encoded normals), since the glossy render already
   encodes its own highlights/bevels. Output `asterisk_normal.png`. This gives the shader
   fake surface relief to bend reflections around — no 3D geometry needed.
2. Keep the PNG **alpha** as the shape mask.
3. Confirm `dollar.png` loads; it will be sampled as the **reflection/environment texture**.

## Phase 4 — The glossy logo component (`<GlossyLogo>`)

Build with React Three Fiber: orthographic camera, one quad sized to the logo, custom
`ShaderMaterial`. Uniforms: `uBase`, `uNormal`, `uDollar`, `uGlow`, `uTime`, `uRotation`
(vec2: spin + tilt), `uPointer`, `uReflStrength`.

**Fragment shader logic (the core of the whole feature):**

- Sample `uBase`; carry its alpha through as the final mask (discard/zero outside).
- `n = normalize(texture(uNormal, uv).rgb * 2.0 - 1.0)`; perturb `n.xy` by `uRotation`
  so the surface "faces" a shifting direction as the user turns it.
- View direction is fixed `(0,0,1)`. Compute **fresnel** = `pow(1.0 - dot(n, viewDir), 3.0)`
  — reflection is strongest at grazing angles, like real gloss.
- **Reflection UV**: `reflUv = uv + n.xy * uReflAmount + rotationOffset(uRotation)`.
  Sample `uDollar` at `reflUv`. Because `rotationOffset` tracks the drag, the dollar
  **slides across the surface as the logo turns** — that's the "appears as a reflection"
  effect.
- **Specular sweep**: a moving highlight band from `uTime` + `uRotation` for glassy sheen.
- Composite: `reflection = dollarColor * fresnel * uReflStrength + specular`, then
  `final = screen(baseColor, reflection)`; output with `base.a`.

Tune `uReflStrength` so the dollar is a **subtle sheen at rest that blooms as you spin**,
not a flat sticker. Start ~0.35 and expose it as a prop so I can dial it.

## Phase 5 — Drag physics ("free spin" feel)

- Pointer/touch **down anywhere on the logo** → capture; cursor becomes `grabbing`.
- Move → accumulate velocity. `dragX → Δspin (Z) + tiltY`, `dragY → tiltX`.
- Up → **inertia**: rotation keeps going and decays (velocity *= ~0.94/frame). A flick
  spins it; a nudge turns it a little. Tilt springs back toward center slowly; spin keeps
  its momentum.
- **Clamp tilt to ±~30°** so it never goes edge-on and vanishes. Z-spin is unbounded.
- Feed the live rotation state into **both** the quad transform **and** the shader's
  `uRotation` uniform, so the reflection tracks the turn frame-for-frame.
- **Idle**: when untouched, a gentle auto-drift + slow sheen animation keeps it alive;
  any interaction overrides instantly.
- Keep the base **−25.98°** as the resting orientation the idle drift oscillates around.

## Phase 6 — Glow & post-processing

- Behind the logo: the two cyan radial glows (assets or CSS gradient).
- Add a single **Bloom** pass (`@react-three/postprocessing`) tuned low, so the glossy
  highlights and the reflected dollar softly bloom — this unifies the logo with the
  background glow and reads as "premium glass."

## Phase 7 — Responsive & accessibility

- Logo canvas scales with viewport; on mobile it centers and the mono micro-labels
  collapse per the Phase 2 breakpoint decision.
- `prefers-reduced-motion`: **disable idle drift, inertia, and the animated sheen**. The
  logo stays static at −25.98° but is still draggable (instant, no momentum). No Bloom
  animation.
- Logo is decorative: `aria-label` it ("fUSD glossy logo, drag to rotate"), don't trap
  keyboard focus, ensure the page is fully usable without the canvas (progressive: if
  WebGL is unavailable, fall back to the static `asterisk.png`).

## Phase 8 — Polish pass

- Verify 60fps (no per-frame allocations, textures sized sanely, `dpr` capped at 2).
- Match the Figma screenshot one more time at 1440.
- Expose a small tuning panel or props (`reflStrength`, `inertiaDecay`, `tiltClamp`,
  `idleSpeed`) so I can art-direct the feel without touching shader code.

---

## Acceptance criteria (whole build)

1. Static hero is indistinguishable from Figma `40:4` at 1440; degrades cleanly to 375.
2. Dragging the logo spins it with believable momentum; flick-and-release keeps spinning
   and settles; tilt never goes edge-on.
3. My dollar asset visibly **sweeps across the logo as a reflection** while turning —
   subtle at rest, stronger mid-spin.
4. Cyan glow + gentle bloom present; logo feels glassy, not like a flat sticker.
5. `prefers-reduced-motion` fully honored; static fallback if WebGL is missing.
6. Helvetica Neue swappable via one variable; Instrument Serif italic + Geist Mono exact.
7. 60fps on a mid laptop; no console errors; no layout shift.

## Deliverables

- `CLAUDE.md` (already provided)
- `app/page.tsx` + `components/hero/*` (static hero, self-contained folder)
- `components/hero/GlossyLogo.tsx` + `shaders/` (glossy logo + reflection shader)
- `lib/generateNormalMap.*` (Phase 3 tooling) and prepared textures in `/public/assets/`
- Token layer (CSS vars + Tailwind theme)

## Notes for you (Claude Code)

- Pull every exact measurement from the **Figma MCP in this terminal** — it's the
  reliable path; don't hardcode from memory.
- If the auto-generated normal map looks noisy, blur it slightly before encoding; the
  goal is smooth bevel relief, not literal detail.
- Ask me before adding any dependency beyond: `three`, `@react-three/fiber`,
  `@react-three/drei`, `@react-three/postprocessing`.
