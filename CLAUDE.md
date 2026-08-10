@AGENTS.md

# CLAUDE.md — fUSD Hero Landing

Project constitution. Read this before writing any code. Do not deviate from the token
layer or the design without asking. Build **phase by phase**; stop for review after each.
Full plan: `docs/fUSD-hero-plan.md`. Original brief: `docs/fUSD-hero-build-prompt.md`.

> ⚠️ Stack is **Next.js 16 / React 19 / Tailwind v4** — see `AGENTS.md`; it has breaking
> changes from older Next. Consult `node_modules/next/dist/docs/` before using unfamiliar
> APIs.

## What we're building

A pixel-faithful rebuild of the **fUSD hero section** (Fhenix), plus one signature
interaction: a **glossy, drag-to-spin logo** whose surface reveals a **dollar reflection**
as the user turns it.

- Figma file key: `SgLXeHToggDmYNLKDipGjE` · Hero node: `40:4`.
- **Source of truth for all measurements is the Figma MCP.** Pull exact specs from
  `get_design_context` / `get_metadata` on `40:4`; if a number here disagrees, Figma wins.

## The asterisk is now real geometry (supersedes the old flat-PNG constraint)

This used to read "we only have flat PNG renders — no 3D geometry". That is no longer true.
`components/hero/asteriskGeometry.ts` builds the asterisk procedurally and
`components/hero/GlassAsterisk.tsx` renders it through a transmission material, so the plate
has sides, thickness and real refraction.

The shape is **fitted, not traced**: six flat-tipped arms with radiused corners on a regular
60° grid, scored against the alpha of `tex-base.png` by intersection-over-union. It lands at
**IoU 0.936**. Do not adjust `ARM_PHASE_DEG`, `ARM_HALF_WIDTH` or `TIP_CORNER` by eye — re-run
the fit. Two degrees of phase is worth 0.038 of IoU, because six arms all miss at once.

- **Motion is an in-plane spin (Z), on the spot, 60s linear** — the same turn the CSS version
  ran, which is what was signed off. Pitch and yaw are a fixed three-quarter set. Spinning
  about Y reads as a coin flipping, not an asterisk turning.
- The **reflection** still sells the glossiness, but it is now physical: the note is a wafer
  *inside* the volume, so the outer surface refracts it and it can never escape the silhouette
  — which is what every flat compositing attempt kept failing at.
- The pre-rendered PNGs remain the **no-WebGL fallback**, not the primary.

## Reflection approach — HYBRID (decided)

The designer pre-rendered the dollar-in-glass look, so we use that art rather than
reproducing caustics in GLSL from scratch:
- **Base / rest** = cyan glass asterisk (`asterisk.png`).
- On spin, **reveal the pre-rendered dollar-glass** (`dollar-glass-a/-b.png`) via a
  rotation-driven shader **wipe/parallax** (a band that sweeps across, following spin
  direction), blended between the two angle frames by tilt sign.
- Reveal strength scales with **angular velocity** → subtle at rest, blooms mid-spin.
- On top: fresnel edge (from `asterisk-normal.png`) + moving specular sweep, screen-blended,
  then one low **Bloom** pass to unify with the cyan glow.

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind v4.** Hero is a self-contained
  component tree (`components/hero/*`) so it can drop into another app by moving one folder.
- Rotatable logo: **React Three Fiber v9 + drei + @react-three/postprocessing** (ortho
  camera, single textured quad, custom `ShaderMaterial`). Client component; SSR the static
  layout with an `<img>` fallback underneath.
- **Approved deps:** `three`, `@react-three/fiber`, `@react-three/drei`,
  `@react-three/postprocessing`. One-time normal-map script may need `sharp` (dev) — ask
  first, or commit the generated PNG so runtime ships only the four.

## Design tokens (authoritative)

```
Color
  --bg:          #FFFFFF   /* hero background */
  --ink:         #001623   /* headline text */
  --ink-deep:    #011623   /* registration squares, deepest marks */
  --mono-muted:  #777B7D   /* all Geist Mono labels */
  --hairline:    #E4EAEE   /* vertical dividers, FHENIX pill fill */
  --glow-cyan:   #0AD9DC   /* exact glow fill from SVG source (0.7 opacity + blur 150) */

Type
  Display  Helvetica Neue Regular — 80px, letter-spacing -0.8px, line-height 0.9  (--font-display)
  Accent   Instrument Serif Italic — only the word "private"  (next/font/google)
  Mono     Geist Mono 400 + 500 — 16px, letter-spacing -0.16px  (next/font/google)

Misc:  pill radius 2000px · hairline 1px · registration square 10px · logo base rotation -25.98°
```

**Font licensing:** Helvetica Neue is licensed — wire the display face through the single
`--font-display` variable (system Helvetica fallback until a licensed file is dropped in).

## Assets (`public/assets/`)

| File | Role | Source |
|---|---|---|
| `asterisk.png` | Cyan glass — rest state + static fallback | designer "image 1" |
| `asterisk-clear.png` | Clear-glass variant — NOT in hero by default | "image 2" |
| `dollar-glass-a.png` / `dollar-glass-b.png` | Pre-rendered $ refraction, 2 angles | "image 3" / "image 3-1" |
| `dollar.png` | Tinted $100 bill — swappable live sheen/parallax texture | provided |
| `asterisk-normal.png` | Normal map for fresnel/specular (Phase 3, generated) | derived |
| `glow-top.svg` / `glow-bottom.svg` | Cyan radial glow (`#0AD9DC`) | Figma `42:66`/`43:73` |
| `arrow-down.svg` / `arrow-enter.svg` | Eyebrow + FHENIX glyphs | Figma `42:49`/`42:53` |

## Non-negotiables

- Match Figma layout/spacing/type exactly, via **fluid CSS** (`clamp()`, %) anchored to the
  Figma coordinates — not frozen pixels.
- Preserve motifs: two vertical hairlines (~25%/~75%), two 10px registration squares on the
  mid-line, FHENIX marks (top-right + bottom-left pill), mono micro-labels.
- **`prefers-reduced-motion`**: no idle drift/inertia/auto-sheen; logo static but still
  draggable (instant, no momentum). No animated bloom.
- **No WebGL** → fall back to static `asterisk.png`. Logo is decorative: `aria-label` it,
  no focus trap, page fully usable without the canvas.
- 60fps: one shader, one quad, one Bloom pass, no per-frame allocations, `dpr` capped at 2.

## Out of scope (unless asked)

Real 3D orbit, physics engines, sections below the fold, CMS, analytics.
