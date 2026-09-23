# DESIGN.md — «Аким на 5 часов»

## 1. Visual theme & atmosphere

An official akimat letterhead, not a SaaS dashboard. Cool paper, navy ink, the sky and gold of
Astana's flag. The page reads like a document someone signs: a plain letterhead header,
calm tables, and one round ink stamp that carries the outcome. Numbers are counted by code and shown plainly; the LLM's texts are quoted,
never decorated. Light theme only: the game is played in a lit room on a projector or laptop.

## 2. Color palette & roles

All tokens live in `src/app/globals.css` (`:root`). No pure white, no pure black.

| Token | Hex | Role |
| --- | --- | --- |
| `--background` | `#f3f6f8` | Paper: page surface |
| `--card` / `--popover` / `--sidebar` | `#fbfcfd` | Raised sheet: cards, tooltips (tinted, never `#fff`) |
| `--foreground` / `--primary` | `#10283a` | Navy ink: text, primary buttons, selected state |
| `--muted` | `#e8eef2` | Quiet fill: tracks, chips, neutral middle of the heat scale |
| `--muted-foreground` | `#56697a` | Secondary text (≥ 4.5:1 on paper and card) |
| `--secondary` | `#e4ecf1` | Secondary buttons |
| `--accent` / `--accent-foreground` | `#dcf0f5` / `#0b5569` | Sky tint for a selected toggle |
| `--border` / `--input` | `#d3dde4` / `#c6d2db` | Hairlines, control outlines, scrollbar thumb |
| `--sky` / `--ring` | `#0096b7` | Accent: river, budget bar, focus ring, caret, high end of heat |
| `--gold` | `#d99a06` | Flag gold: app mark, notices (as a 10 % tint + 40 % hairline), dispute marker |
| `--outcome-approve` | `#1b7f4e` | Stamp «Утвердить», positive deltas |
| `--outcome-conditions` | `#95650a` | Stamp «с условиями», dark gold for icons on gold tints |
| `--outcome-return` / `--destructive` | `#b8322a` | Stamp «Вернуть», errors, negative deltas, low end of heat |
| `--by-code` / `--by-llm` | `#0b6e88` / `#6a48a8` | Who checked a condition: program vs LLM reviewer |

Accent budget: sky and gold together stay under ~5 % of any viewport. Heat map is data, not
accent: diverging `--outcome-return` → `--muted` → `--sky`, mixed at most 42 % so ink labels
keep ≥ 4.5:1 (`src/components/map/heat.ts`).

## 3. Typography rules

- **Display** — Unbounded (`font-display`), semibold: page titles (`text-3xl`), section titles
  (`text-2xl` / `text-lg`), big numbers (Score `text-6xl`, live score `text-4xl`). Tracking
  `tracking-tight` (−0.025em) at most; never tighter than −0.03em.
- **Text** — Onest (`font-sans`): body 16px, secondary `text-sm`, labels `text-xs` in
  `text-muted-foreground`, sentence case.
- **Mono** — Geist Mono (`font-mono`) only for codes and data: measure ids (M7), indicator codes
  (T1, E2), fact ids (F15), condition ids (C3), run ids, the Score formula, numeric table columns.
- No uppercase and no wide tracking anywhere except inside the outcome stamp.
- `tabular-nums` on every number that changes or sits in a column.
- Prose measure ≤ 75ch (`max-w-[65ch]`–`max-w-[72ch]`). Headings `text-balance`.
- Russian typography: «ёлочки», em dash «—», ellipsis «…», minus «−» in formulas.

## 4. Component stylings

- **Header** (`SiteHeader`): one calm row on `bg-card` with a hairline underneath — dial mark +
  «Аким на 5 часов в Астане» (display, sentence case) on the left, the step row on the right
  («Лидерборд» after a divider). No subtitle, no ornament. Below 640px the row wraps under the
  name and step labels collapse to numbers except the current one. `html, body { overflow-x: clip }`.
- **PageHeader**: title, lead, optional quiet `meta` line (e.g. «Прогон sample-run-001»).
  No eyebrow — the step is already in the nav.
- **Card** (shadcn): radius 12px, 1px ring, `bg-card`. One containment layer only.
- **Notice**: `rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm` (mandate, demo
  mode, fallback). Errors use the same shape in destructive tones (`LiveMessage`).
- **Flagged paragraph** (draft text): full hairline `border-destructive/30` + `bg-destructive/8`.
- **Dispute**: small 8px gold square beside the topic, text indented — no side stripe.
- **Outcome stamp**: round double border, rotated −6°, uppercase display — the one place
  where uppercase and tracking are allowed.
- **Verdict summary**: the only card on the verdict — big Score + delta, the stamp, one plain
  sentence built by code (outcome, Score change, criticals, weakest district), one quiet line
  with percentile and review. Next steps come right under it; details live in `<details>`.
- **Toggles** (district switcher): ghost buttons in a row between two hairlines; selected =
  `bg-accent text-accent-foreground`.
- **Chips**: effect chips `bg-muted` mono; fact chips mono with 1px border; relation chips pill.

## 5. Layout principles

- Content column `max-w-6xl`, 24px gutters; cabinet is catalogue + sticky 300–340px panel.
- Rhythm: tight inside groups (`gap-1`–`gap-4`), generous between sections (`gap-8`,
  `space-y-12`); more space above a heading than below it.
- Section heads are a heading + optional hint over a hairline rule (`HallSection`), not cards.
- Grids collapse to one column below `md`; the verdict row wraps.

## 6. Depth & elevation

Flat paper. Elevation is declared once per element: a 1px border **or** a 1px ring, never
with a shadow. No glows, no blur, no glass. The only "depth" is `bg-card` over `bg-background`.
One exception: the 3D Baiterek on `/` (three.js) lets its golden sphere bloom, because the light belongs to
the monument itself; the canvas renders on the exact `--background` paper so there is no box. Nowhere else.

## 7. Do's and don'ts

Do:
- Tint every surface toward the ink anchor; theme `::selection`, caret, `accent-color`,
  scrollbars and link underline offset (`globals.css`).
- Let focus rings appear instantly (unlayered `:focus-visible` rule removes their transition).
- Transition named properties only (`transition-colors`, `transition-[width]`,
  `transition-opacity`); respect `motion-reduce`.
- Keep one purposeful motion per screen (budget bar fill; pulsing dot on the running stage).

Don't:
- Eyebrows / kickers above headings (e.g. «ШАГ 2 ИЗ 3», «КОНСИЛИУМ»).
- Monospace or uppercase + wide tracking as a costume for non-code labels.
- Coloured side stripes (`border-l-2/4`) on cards, notices, list items or highlights.
- Card-in-card: bordered boxes inside a card, cards around cards.
- Pure `#fff` / `#000`; grey text on strongly coloured fills.
- Hero-metric dashboards: a tile grid of «label + number» stats.
- `transition-all`, `hover:scale-*`, bouncy easing, fade-in on every section.
- Straight quotes, `--`, `...` in copy.

## 8. Responsive behavior

- ≥ 1024px: catalogue two columns + sticky panel; verdict row score | list | stamp.
- 768–1023px: panel narrows to 300px; map legend drops under the map (container query).
- < 768px: single column; district switcher two columns; «Как считалось» stacks; leaderboard
  table scrolls horizontally inside its card. Button labels never wrap.

## 9. Agent prompt guide

"Build inside the akimat letterhead: paper `#f3f6f8`, card `#fbfcfd`, navy ink `#10283a`,
accent sky `#0096b7`, gold `#d99a06` for notices. Unbounded for titles and big numbers, Onest
for text, Geist Mono only for codes (M7, T1, F15, C3) and numeric columns with tabular-nums.
No eyebrows, no uppercase labels, no side stripes, no nested cards, no pure white. One
containment layer, hairline rules for rhythm, sentence-case muted labels, «русские кавычки».
Outcomes are shown with the round `OutcomeStamp`; heat uses `heatColor()` from
`src/components/map/heat.ts`."
