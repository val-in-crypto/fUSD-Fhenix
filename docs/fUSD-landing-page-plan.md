# fUSD Landing Page — build plan (Phases 9–17)

Extends the shipped hero (Phases 0–8) into the full landing page from Figma
`SgLXeHToggDmYNLKDipGjE`, node `40:2`.

> **Source of truth is Figma.** Pull exact specs live per section via MCP before building
> it. Work phase by phase; stop for review after each.

## Canonical source — a specified mix of two artboards

`40:2` holds four artboards. The build takes:

| Area | From | Why |
|---|---|---|
| **Hero asterisk** | `94:3` — **cyan glass** | Already built + animated; shader textures derive from it. Zero rework. |
| **Hero CTA pill** | `94:3` — **JOIN WAITLIST** | Consistent conversion action with the sections below and footer. |
| **"Software has modes" cards** | `94:2643` — **filled with content** | Logo tile, app icons, fingerprint, chart. Richer than the empty frosted placeholders. |
| **"Rebuilding the economy of value" visual** | **Both — as motion** | Engraved (`94:2643`) **→ decrypts into →** photographic bill (`94:3`). See Phase 13. |

Reference: `94:5478` / `94:5506` (hero-only artboards) show the **dollar-revealed** asterisk —
these are the far end of the hero motion we already shipped, i.e. design confirmation that
`reveal=0 → 1` is correct. Nothing new to build there.

## Page structure (1440×3454)

1. **Hero** (0–1024) — logo mark, headline, eyebrow, mid-labels, registration squares,
   glossy asterisk, JOIN WAITLIST, socials
2. **Feature triplet** (~1073–1300) — `01 / ONE TOGGLE`, `02 / CONFIDENTIAL BY DEFAULT`,
   `03 / YIELD, TOO`
3. **Backed-by strip** (~1183) — full-bleed cyan: Arbitrum · M0 · Gauntlet · Predicate · Paxos
4. **Rebuilding the economy of *value*** (~1457–1770) — copy, CTA, decrypting dollar
5. **Software has modes. *Money* never got one** (~2021–2500) — centered headline over cyan
   glow, ringed by floating glass cards
6. **_Dual-mode_ is the new black** (~2685–3300) — comparison cards + halftone Franklin
7. **Footer** (~3343–3400) — JOIN WAITLIST, "LIVE ON ARBITRUM SOON", socials

## Motion inventory

| # | Motion | Status |
|---|---|---|
| 1 | **Hero glossy logo** — drag-to-spin, inertia, dollar reveal | ✅ shipped (Phases 4–8) |
| 2 | **Decrypt dollar** — engraved → photographic, "encrypted" vibe | 🆕 Phase 13 (the centrepiece) |
| 3 | **Floating glass cards** — slow parallax drift | 🆕 Phase 14 |
| 4 | **Backed-by marquee** — continuous logo scroll | 🆕 Phase 12 |
| 5 | **Section scroll-reveals** — fade/rise on enter | 🆕 Phase 10 (shared primitive) |

Every motion respects `prefers-reduced-motion` via the shared system from Phase 10.

---

## Phases

### Phase 9 — Hero update
Copy/chrome only; **`<GlossyLogo>` is untouched**.
- New `◐USD` logo mark top-left (export `94:5541`)
- Headline → "The dual-mode dollar with *yield*" (*yield* = Instrument Serif italic)
- Eyebrow → "CONFIDENTIAL BY DEFAULT — PUBLIC WHEN YOU WANT." / "→ ONE TOKEN, ONE TOGGLE, TWO MODES."
- Pill → "↳ JOIN WAITLIST"; add socials (LinkedIn, X) bottom-right
- Keep: mid-labels, registration squares, hairlines, glow, asterisk

### Phase 10 — Page shell & motion system
Convert the single-screen hero into a scrolling page.
- Sections as `components/sections/*`, composed in `app/page.tsx`
- `<Reveal>` primitive (IntersectionObserver → fade/rise), motion tokens (durations/easings)
- `useScrollProgress(ref)` hook returning 0→1 for in-view elements (drives Phases 13/14)
- **Global reduced-motion context** — one source of truth all motion reads
- Verify the hero canvas still frameloop-gates correctly now that it scrolls out of view

### Phase 11 — Feature triplet
Three mono-numbered columns with hairline rules. `<Reveal>` staggered.

### Phase 12 — Backed-by strip
Full-bleed cyan (`--glow-cyan` family) band, partner logos exported as SVG. Continuous
**marquee** (CSS transform loop, paused under reduced-motion and when off-screen).

### Phase 13 — "Rebuilding the economy of value" + `<DecryptDollar>` 🆕
Two-column: copy + CTA left, dollar visual right, mono caption beneath.

**The decrypt motion** — the engraved bill resolves into the photographic bill as it enters
view, reading as *confidential → public*:
- R3F plane, `ShaderMaterial`, uniforms `uFrom` (engraved), `uTo` (photo bill = existing
  `dollar.png`), `uProgress`, `uTime`
- **Cell dissolve:** quantize UV into a grid; per-cell pseudo-random threshold via
  `hash(cell)`; a cell flips from engraved→photo when `progress > threshold`. Reads as
  blocks of data resolving rather than a soft crossfade.
- **Encrypted texture:** on not-yet-resolved cells, jitter UV per cell and add a subtle
  channel offset so it looks scrambled; a thin cyan scan line leads the resolve front.
- `uProgress` driven by `useScrollProgress` (scrub, not autoplay) so it feels causal.
- **Reduced motion:** render the final photographic state statically, no scramble.
- Perf: own `<Canvas>`, visibility-gated like the hero (never two canvases rendering at once
  in practice — they're ~1500px apart).

### Phase 14 — "Software has modes"
Centered headline over the cyan glow; **filled glass cards** (from `94:2643`) scattered
around it. Cards drift with slow scroll parallax at differing depths; frosted glass via
`backdrop-filter`. Export card contents from Figma.

### Phase 15 — "Dual-mode is the new black"
Copy + halftone Franklin (export `94:105`), then the two comparison cards
(*A one-way room.* vs *A door that swings both ways.*) revealed with a stagger.

### Phase 16 — Footer
JOIN WAITLIST + "LIVE ON ARBITRUM SOON" + socials.

### Phase 17 — Responsive, a11y & perf
- 1440 → 375 across every section; propose mobile behaviour per section, don't guess silently
- **Canvas budget:** both canvases visibility-gated; `dpr` capped at 2; verify no jank while
  scrolling the full 3454px page
- Reduced-motion audit end-to-end; keyboard/SR pass; no layout shift (reserve media boxes)

---

## Assets to export

**Have already:** cyan asterisk + shader textures, `dollar.png` (photo bill), glow SVGs,
arrow glyphs, `asterisk-clear.png` (unused in this mix).

**Still needed:** `◐USD` logo mark (`94:5541`) · social icons · 5 partner logos
(Arbitrum, M0, Gauntlet, Predicate, Paxos) · **engraved dollar** (`94:2698`, the decrypt
"from" state) · card contents from `94:2643` · halftone Franklin (`94:105`).

## Constraints carried forward

Approved deps unchanged (`three`, `@react-three/fiber`, `@react-three/drei`,
`@react-three/postprocessing`) — **ask before adding anything else**, including any
scroll/animation library. Tokens from `CLAUDE.md`; never hardcode a hex that has a token.
Figma is the source of truth for every measurement.
