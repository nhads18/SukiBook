# SukiBook Design Tokens

The entire app — web shell, charts, phone preview, login/auth screens — renders
from semantic tokens defined in `src/index.css` (`@theme` + `data-theme`
override blocks). Themes are swapped by setting `document.documentElement.dataset.theme`
(see the theme effect in `src/lib/store.tsx`).

## Layers

1. **Primitive** — raw hex values. May only appear inside `@theme` and the
   `[data-theme="…"]` blocks. Never in components.
2. **Semantic** — the six surfaces + four statuses every component uses:
   | Token | Meaning |
   | --- | --- |
   | `pine` / `pine-deep` / `pine-soft` | Brand surface (sidebar, masthead, primary buttons) |
   | `paper` | App background |
   | `card` | Raised surface |
   | `line` | Borders & dividers |
   | `ink` / `ink-soft` | Text tiers (body / secondary) |
   | `mango` / `mango-deep` / `mango-soft` | Primary action accent |
   | `leaf` / `cherry` / `gcash` | Status trio: success / danger / info (GCash) |
3. **Component** — shared class recipes in `index.css`: `.field`, `.btn-press`,
   `.stripes`, `.stripes-soft`, `.skel`, `.safe-b`, `.app-h`, `.tnum`.

## Radii

- `--radius-control: 6px` → `rounded-control` (buttons, fields, chips)
- `--radius-card: 10px` → `rounded-card` (cards, tables)
- `--radius-overlay: 14px` → `rounded-overlay` (modals, masthead, login)
- Pill (`rounded-full`) is reserved for badges, dots, and toggles.

## Elevation

- `shadow-elev-1` — card at rest
- `shadow-elev-2` — hover lift (pair with `-translate-y-0.5`)
- `shadow-elev-3` — overlays, masthead, phone frame

Shadows use neutral near-black rgba so they read correctly on every theme,
including the dark Gabi theme.

## Motion

- `--dur-fast 120ms` press states · `--dur-base 240ms` toggles/tabs ·
  `--dur-slow 400–700ms` reveals & view transitions
- Easings: `--ease-standard` `cubic-bezier(0.2,0.7,0.2,1)`,
  `--ease-pop` `cubic-bezier(0.2,0.7,0.3,1.2)`
- Keyframe utilities (`rise`, `pop`, `toast-in`, `bar-grow`, `width-grow`,
  `ticker-fade`, `pulse-dot`, `stripes-anim`, `flow-dash`, `shake`) —
  every one is listed in the `prefers-reduced-motion` disable block.
  **New animations must be added to that block.**

## Type

- Display: Bricolage Grotesque (per-theme: Fraunces → Barako, Alfa Slab One →
  Jeepney) — section titles, numerals, brand only.
- Body: Instrument Sans, 14 px base.
- Mono: Spline Sans Mono — **every number** gets `.tnum` + `font-mono`.

## Fixed data-viz palette (intentionally theme-agnostic)

Category colors in `catMeta()` (data.ts) and payment status dots are a fixed
series palette — consistent across themes, standard practice for data viz.
Everything else must stay on tokens; grep for `rgba(16,53,36` or raw hex in
components before adding new styles.

## Adding a theme

1. New `[data-theme="name"]` block in `index.css` remapping the surfaces.
2. New entry in `src/theme/themes.ts` (name, tagline, swatches, meta).
3. Done — switchers, `theme-color` meta, and every surface pick it up.
