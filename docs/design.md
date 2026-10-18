# Design System & Page Design — Aaarchive Online Store

| | |
|---|---|
| **Version** | 1.0 |
| **Last updated** | 17 October 2026 |
| **Related docs** | `PRD.md` (features and requirements) · `architecture.md` (where tokens and components live in code) · `rules.md` |
| **Reference** | Editorial dark fashion landing page (chosen reference shot). We adopt its **structure and mood**, not its brand, copy or imagery. |

---

## 1. Design direction

### 1.1 Mood

**Dark editorial streetwear.** A near-black, warm (maroon-tinted) canvas; cinematic, film-grain photography lit with red and orange spotlights; heavy slab-serif uppercase headlines; monospace "spec-sheet" labels; small pale-yellow tags that look like garment labels or price stickers. It should feel like a fashion magazine crossed with a clothing tag.

Keywords: *cinematic · editorial · raw · warm-dark · label/tag aesthetic · grid-structured*

### 1.2 What we keep from the reference

- Dark warm background with film-grain / noise texture
- Heavy slab-serif uppercase headings + monospace body and labels
- Pale accent "tag" chips for categories, prices and counts
- Square corners everywhere — no rounded cards, no soft shadows
- Thin hairline dividers and `// 01` index markers
- Giant brand wordmark used as a background texture (outlined / glitched)
- The hero composition (main image + two side images, spotlight, markers, pills, headline)
- A similar section *order* (hero → categories → featured look → product grid → why us → social → footer)

**The hero, the social section and the footer follow the reference's structure (user decision, 2026-10-17).** The four sections between them (§6.3–6.6) have our own titles, layouts and content. See rows 12–16 below.

### 1.3 What we change (to make it our own)

| # | Reference | Ours | Why |
|---|---|---|---|
| 1 | Fashion-house wordmark | **Aaarchive** wordmark (custom) | Own identity |
| 2 | Pale butter-yellow accent | **Marigold** accent (`#F2C14E`), warmer and more saturated | Distinct; marigold (গাঁদা ফুল) is a familiar Bangladeshi festive colour |
| 3 | Triple yellow stripe section breaks | **"Kantha stitch" divider** — a dashed running-stitch line between two hairlines | Subtle nod to nakshi kantha embroidery; ties in with panjabi |
| 4 | `// 01 // 02` index markers | Same pattern, optional **Bangla numerals** `// ০১ // ০২` | Local character with no extra cost |
| 5 | Generic fashion categories (Sneakers, Sunglasses, Bags) | **Hoodies, Panjabi, T-Shirts, Sweatshirts, Joggers, Accessories** | Our catalogue |
| 6 | USD prices (`$40.2`) | **BDT**: `৳1,450` (whole taka) | Market |
| 7 | "240k+ View" reels | Facebook / Instagram / TikTok posts with real labels (e.g., `12K+ LIKES`) | Our main channels |
| 8 | Category card "Available 40" | **Product count** ("40 ITEMS") — never stock numbers | Stock numbers stay private (PRD §5.6) |
| 9 | Decorative-only product cards | Product cards show **sale price** and **out-of-stock** state | E-commerce needs |
| 10 | Body text in monospace everywhere | Mono for labels/short copy; **readable sans for long text** (product descriptions, policies) | Readability, especially on mobile |
| 11 | Cream outer page frame on desktop | Optional; if used, **4px** instead of a wide frame | Cleaner, more screen for content |
| 12 | "Browse by category" slider with a taller middle card | **"The archive index"**: editorial bento of category photos, name over image (§6.3) | Original layout; image-led |
| 13 | "Designed for every style": centred look, floating cards, wordmark behind | **"Look file No. 01"**: editorial photo with numbered shop-the-look hotspots + piece cards and look total (§6.4) | Original; shoppable |
| 14 | "Exclusive collections…" sparse masonry, text tabs | **"Latest entries"**: chip filters + a 2×2 campaign tile ("Winter drop") leading a dense product grid (§6.5) | Original; campaign-led |
| 15 | "The perfect blend…" portrait + icon list (comfort / quality / delivery / design) | **"Made to be kept"**: full-width campaign photo with heading and four promises overlaid (§6.6) | Original layout and content |
| 16 | Social slider / footer | Kept close to the reference: "Follow our style journey" slider (§6.7) and the footer (§6.8), with our logo replacing the typed brand name | User preference |

### 1.4 Brand — Aaarchive

| | |
|---|---|
| **Name** | Aaarchive |
| **Written as** | "Aaarchive" in running text; **AAARCHIVE** (uppercase via CSS) in headings and the giant outlined wordmark texture |
| **Logo** | Chrome/silver lowercase "aaarchive" script with an orbit swoosh and stars; tagline **"Archive the essence"**. Source: `apps/web/public/logo.png` (raster, black background). Web cuts with a transparent background: `public/images/logo-wordmark.png` (header, menu) and `public/images/logo-full.png` (footer, with tagline), rendered by `components/store/logo.tsx`. Never retype the logo in a font. |
| **Idea** | An *archive* of looks — pieces worth keeping, season after season. Fits the editorial, catalogue-like design (index markers, tags, spec-sheet labels). |
| **Signature detail** | The triple **A** is the brand's mark. Use it as a monogram (`AAA` stacked or set tight) for the favicon, social avatar, packaging stamp and product tags. |
| **Voice** | Short, confident, slightly archival: "Filed under: Winter", "Archive No. 03", "Catalogued for Eid". Use archive language for collections and drops (e.g., collection names as `ARCHIVE 01 — WINTER DROP`). |
| **Order numbers** | `AAR-24105` format |
| **Social handle** | `@aaarchive` (or nearest available) — check Facebook, Instagram, TikTok before launch |

> The `// 01` index markers and tag chips already feel like archive labels — lean into that: collection pages can show `ARCHIVE NO. 01`, product tags can show a catalogue code (e.g., `AAR-HD-014`, from the SKU).

---

## 2. Colour

### 2.1 Palette

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#120607` | Page background (warm near-black) |
| `--bg-raised` | `#1B0A0C` | Cards, drawers, modals, inputs |
| `--bg-sunken` | `#0C0405` | Footer, image placeholders |
| `--fg` | `#F3EDE2` | Primary text (warm off-white) |
| `--fg-muted` | `#A89C92` | Secondary text, descriptions |
| `--fg-subtle` | `#6E625B` | Placeholders, disabled text |
| `--line` | `rgba(243, 237, 226, 0.14)` | Hairline dividers, borders |
| `--line-strong` | `rgba(243, 237, 226, 0.32)` | Hover borders, active outlines |
| `--accent` | `#F2C14E` | Marigold — tags, primary buttons, active states |
| `--accent-hover` | `#F7D278` | Hover on accent |
| `--accent-fg` | `#140707` | Text/icons on accent |
| `--cream` | `#E4DDC0` | Optional page frame, footer nav bar |
| `--ember` | `#C4412B` | Brand red — hero glow, sale badge, highlights |
| `--ember-deep` | `#5E1310` | Red gradients, spotlight backgrounds |
| `--success` | `#7DBE8A` | In stock, verified, delivered |
| `--warning` | `#F2C14E` | Low stock, pending (same as accent) |
| `--danger` | `#E5604D` | Out of stock, errors, cancelled |

### 2.2 Usage rules

- **Ratio:** ~85% dark background, ~10% off-white text, ~5% accent. The accent works because it is rare — use it only for tags, the primary CTA, the active slider arrow and active tab.
- Never put body text in accent colour on dark; use accent as a **background** with `--accent-fg` text.
- `--ember` lives mostly in **photography** (red-lit scenes) and the hero glow; in UI it is only for the sale badge and errors.
- Contrast: `--fg` on `--bg` ≈ 16:1, `--fg-muted` on `--bg` ≈ 7:1, `--accent-fg` on `--accent` ≈ 11:1 — all pass WCAG AA.

### 2.3 Texture

- **Film grain:** a fixed, full-page noise overlay (SVG `feTurbulence` as a data URI, or a 200×200 tiled PNG) at 5–8% opacity, `mix-blend-mode: overlay`, `pointer-events: none`.
- **Spotlight glow:** radial gradient from `--ember-deep` (40% opacity) to transparent behind the hero image.
- Grain is decorative; it must not move (no animated noise) to save CPU on mobile.

---

## 3. Typography

### 3.1 Typefaces (all free, Google Fonts, self-hosted via `next/font`)

| Role | Font | Fallback | Notes |
|---|---|---|---|
| **Display** (headings, wordmark text) | **Alfa Slab One** | `Georgia, serif` | Heavy slab serif, uppercase only. Alternative if we want to be further from the reference: **Ultra**. |
| **Mono** (labels, tags, nav, buttons, short copy, prices) | **JetBrains Mono** (400, 500, 700) | `ui-monospace, monospace` | The "spec-sheet" voice |
| **Text** (long paragraphs: descriptions, policies, FAQ) | **Inter** (400, 500) | `system-ui, sans-serif` | Readability |
| **Bangla** (product names, Release 2 UI) | **Hind Siliguri** (400, 600) | `"Noto Sans Bengali", sans-serif` | Add to every font stack so Bangla characters render consistently |

### 3.2 Type scale

Fluid sizes with `clamp()`; values shown as mobile → desktop.

| Token | Font | Size | Line height | Tracking | Case | Use |
|---|---|---|---|---|---|---|
| `display-xl` | Display | 36 → 64px | 1.0 | 0 | UPPER | Hero headline |
| `display-lg` | Display | 28 → 44px | 1.05 | 0 | UPPER | Section headings |
| `display-md` | Display | 20 → 28px | 1.1 | 0 | UPPER | Feature titles, product name on PDP |
| `display-sm` | Display | 14 → 16px | 1.2 | 0.02em | UPPER | Card titles ("FORMAL WEAR") |
| `mono-body` | Mono 400 | 13 → 14px | 1.6 | 0 | Sentence | Section intros, short descriptions |
| `mono-label` | Mono 500 | 11 → 12px | 1.3 | 0.04em | Title / UPPER | Nav, tabs, buttons, tags, prices |
| `mono-micro` | Mono 400 | 10 → 11px | 1.3 | 0.06em | UPPER | `// 01` markers, legal text |
| `text-body` | Inter 400 | 15 → 16px | 1.65 | 0 | Sentence | Long-form content |
| `wordmark` | Display | 11vw | 0.85 | -0.02em | UPPER | Giant background wordmark ("AAARCHIVE" is 9 letters — 11vw fills the width without overflow; test at all breakpoints) |

### 3.3 Rules

- Headings are always **uppercase** and usually split onto **two short lines** ("BROWSE / BY CATEGORY").
- Section intros are short monospace paragraphs, max width ~42ch, often right-aligned opposite the heading.
- Never use the display font below 14px or for paragraphs.
- Prices always in mono: `৳1,450`. Sale: new price in `--fg`, old price `--fg-subtle` with strikethrough.

---

## 4. Layout & spacing

### 4.1 Grid

| Breakpoint | Width | Columns | Gutter | Side padding |
|---|---|---|---|---|
| Mobile | < 640px | 4 | 12px | 16px |
| Tablet | 640–1023px | 8 | 16px | 24px |
| Desktop | 1024–1439px | 12 | 20px | 40px |
| Wide | ≥ 1440px | 12 | 24px | auto (max content width **1320px**) |

### 4.2 Spacing scale (8px base)

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`

- Section vertical padding: **64px mobile / 96–128px desktop**.
- Heading → content: 32px mobile / 48px desktop.
- Card image → meta row: 8px.

### 4.3 Structural lines

- Sections are framed by **full-width hairlines** (`1px solid var(--line)`).
- Index markers (`// 01` … `// 04`) sit on a hairline, evenly spaced across the width, at the vertical middle of hero/feature sections.
- Category labels sit on a bottom hairline, evenly spaced (see §6.4).

### 4.4 Shape

- **Border radius: 0** on everything (cards, buttons, inputs, images, modals). The only exception: colour swatches are circles.
- **No drop shadows.** Depth comes from photography, overlap and grain.

---

## 5. Components

### 5.1 Tag / Chip (the signature element)

Small rectangular label like a garment tag.

```
┌──────────────┐
│ Casual Wear  │   bg: --accent · text: --accent-fg · mono-label · padding 2px 8px · height 18–20px
└──────────────┘
```

| Variant | Style | Use |
|---|---|---|
| `tag-accent` | accent bg, dark text | Category tag, price tag, view count, active filter |
| `tag-outline` | transparent, 1px `--line-strong`, `--fg` text | Secondary info ("40 ITEMS") |
| `tag-sale` | `--ember` bg, `--fg` text | "-20%" |
| `tag-stock-low` | accent bg | "Low Stock" |
| `tag-stock-out` | `--bg-raised` bg, `--danger` text, 1px `--danger` border | "Out of Stock" |

Tags sit **directly under or overlapping the bottom edge of images**: category tag at the left, price tag at the right.

### 5.2 Buttons

**Primary (label + arrow)**

```
┌────────────────────────────┐
│ Browse All              ↗  │   bg --accent (or --cream) · text --accent-fg · mono-label
└────────────────────────────┘   height 32px (sm) / 44px (md, mobile default) · padding 0 12px
                                  label left, ↗ icon right, min-width 160px
```

- Hover: bg `--accent-hover`, arrow moves 2px up-right.
- Active: 1px inset dark border.
- Full-width on mobile for main actions (Add to Cart, Place Order).

**Secondary:** transparent, 1px `--line-strong` border, `--fg` text, same layout. Hover: border `--fg`.

**Ghost / text link:** mono-label, underline on hover.

**Icon button (slider arrows):** 28×28 (desktop) / 40×40 (mobile tap target).
- Previous: `--bg` with 1px `--line-strong` border, `‹` in `--fg`.
- Next: `--accent` bg, `›` in `--accent-fg`.
- Disabled: 40% opacity.

**Header chips:** "Menu" and "Cart (0)" are small accent chips (mono-label, 24px high) — the header has no other buttons.

### 5.3 Index marker

`// 01` in `mono-micro`, `--fg-muted`, placed on a hairline. Optional Bangla numerals `// ০১`.

### 5.4 Section divider — Kantha stitch

Replaces the reference's triple stripe. Placed at the top/bottom edge of key sections (after hero, before why-us, before footer).

```
──────────────────────────────────────────   1px --accent
 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    2px dashed --accent (dash 10 / gap 8)
──────────────────────────────────────────   1px --accent
```

Total height 12px, gap 4px between lines.

### 5.5 Product card

```
┌───────────────────┐
│                   │
│   image 3:4       │   object-fit cover · hover: scale 1.03 + show 2nd image (desktop)
│                   │
│ [-20%]            │   optional sale tag, top-left inside image
└───────────────────┘
[Hoodies]     [৳1,450]   tags row (8px below image)
OVERSIZED BLACK HOODIE   display-sm, 2 lines max (optional in dense grids)
```

- Out of stock: image at 50% opacity + `tag-stock-out` top-left; price tag stays.
- Whole card is one link; minimum tap area full card.
- In the masonry grid, some cards are **tall (3:4)** and some **wide/large (4:5 spanning 2 columns)**.

### 5.6 Category card

- Image (3:4; featured card taller, ~3:5), category tag bottom-left, `NN ITEMS` outline tag bottom-right.
- Featured (centre/active) card shows the category name in `display-sm` under the tags and a `↗` icon at bottom-right.

### 5.7 Floating product card (featured look)

Small card overlapping the main image:

```
┌─────────────────────────┐
│ ┌─────┐  TOP BLAZER     │   bg --bg-raised · 1px --line border · padding 8px
│ │ img │  ● ● ●  swatch  │   thumbnail 56×72 · name display-sm (12px) · swatches 10px circles
│ └─────┘  ৳2,450         │
└─────────────────────────┘
```

A thin `--fg-muted` line with a small arrow connects the card to the garment in the image (desktop only).

### 5.8 Tabs

Mono-label items evenly spaced on a hairline. Active tab: `--fg` text + 2px `--fg` underline (aligned with the hairline). Inactive: `--fg-muted`. Horizontally scrollable on mobile, no visible scrollbar.

### 5.9 Feature item (why-us)

```
 ◯◯   EVERYDAY COMFORT          icon 40px, 1.25px stroke, --fg, line style
      Soft, breathable fabrics  title display-sm · text mono-body --fg-muted, max 32ch
      for all-day wear.
```

Icons: **Lucide** (shadcn's icon library, `lucide-react`) at 1.25px stroke — outline only, never filled. Lucide has no brand logos, so social links use square mono text chips (`FB`, `IG`, `TT`, `WA`) until brand icons are sourced.

### 5.10 Social post card

`12K+ LIKES` accent tag sitting **above** the top-left corner of the image; image 3:4; whole card links to the post. Staggered vertical offsets (0 / 48 / 0 / 48px) on desktop.

### 5.11 Form inputs

- Height 48px, bg `--bg-raised`, 1px `--line` border, radius 0, mono-label placeholder in `--fg-subtle`, input text `text-body`.
- Label above in `mono-label` uppercase `--fg-muted`.
- Focus: border `--accent`, no glow.
- Error: border `--danger`, message below in mono-micro `--danger`.
- Radio cards (payment method, delivery zone): bordered boxes; selected = 1px `--accent` border + small accent square in the corner.

### 5.12 Size selector

Square buttons 44×44, mono-label.
- Default: 1px `--line-strong`, `--fg`.
- Selected: bg `--fg`, text `--bg`.
- Out of stock: `--fg-subtle` text, diagonal strike line, `cursor: not-allowed`, not focusable as a choice (still announced to screen readers as "unavailable").

### 5.13 Colour swatch

20px circle (24px tap target), 1px `--line-strong` ring; selected = 2px `--fg` ring with 2px gap.

### 5.14 Stock status line (PDP)

Small dot + mono-label: `● In Stock` (`--success`), `● Low Stock` (`--accent`), `● Out of Stock` (`--danger`). **Never shows numbers.**

### 5.15 Drawer & modal

- Cart drawer: slides from right, width 420px (100% on mobile), bg `--bg-raised`, left 1px `--line` border, backdrop `rgba(0,0,0,0.6)`.
- Modal (size chart, search): centred, max 720px, bg `--bg-raised`, 1px `--line` border, close `✕` chip top-right.
- Search overlay (built 2026-10-19): full-width panel from the top on `--bg`, big display-sm input on a strong hairline, `✕` chip; results as rows (56px 4:5 thumb, name in display-sm, `Category · ৳price` mono-micro) in 1/2/3 columns, "See all results (n) ↗" link. The header shows a search icon (+ "Search" on desktop).
- Phone filters: bottom sheet (max 85dvh, radius 0) with the same groups as the sidebar and a full-width `Show results` button.
- Menu overlay: full-screen `--bg`, big display-lg links stacked with `// 01` markers, giant wordmark at the bottom.

### 5.16 Giant wordmark

- "AAARCHIVE" in the display font at ~11vw, uppercase, spanning full width (no horizontal overflow).
- Style: **outlined** (`-webkit-text-stroke: 1px var(--line-strong)`, transparent fill) with a horizontal **scan-line / glitch** texture (repeating-linear-gradient mask) at 30–50% opacity.
- Used: behind the hero (top), behind the featured-look section (middle) and at the foot of the menu overlay. **Not in the footer**: the real logo replaced it there (2026-10-17).
- Decorative: `aria-hidden="true"`.

### 5.17 Toast / notice

Bottom-centre on mobile, bottom-right on desktop. bg `--bg-raised`, 1px border (`--accent` for success, `--danger` for error), mono-label text, auto-hide 4s.

---

## 6. Home page — section by section

Desktop wireframes are approximate; mobile behaviour listed under each.

### 6.1 Header

```
[Menu]                     AAARCHIVE                        [Cart (0)]
```
- Height 56px, transparent over the hero, then `--bg` with bottom hairline once scrolled.
- Logo: the chrome wordmark image (`logo-wordmark.png`), 32px tall on mobile, 40px on desktop.
- Add a search icon (mono-label "Search") left of Cart on desktop; inside the menu on mobile.

### 6.2 Hero

```
████ GIANT WORDMARK (outlined, behind) ████████████████████████████
          ┌────┐   ┌─────────────┐   ┌────┐
          │img │   │  MAIN IMAGE │   │img │       red spotlight glow behind
          └────┘   │  (red-lit)  │   └────┘
// 01 ─────────── // 02          // 03 ─────────── // 04
                   │             │
                   └─────────────┘
               [MEN] [WOMEN] [KIDS]                  accent tags as pills
          CURATED COLLECTIONS FOR                    display-xl, centred
              EVERY OCCASION
═════════════ kantha stitch divider ═══════════════
```
- Main image ~ 4:5, centred, ~28% of width; side images ~10% of width, offset upward.
- Thin diagonal connector lines from side images toward the main image (decorative, desktop only).
- **Mobile:** main image full width (with 16px padding), side images hidden or shown as a small row below; markers hidden; headline below the pills.
- Our copy idea: "MADE FOR EVERY SEASON, WORN FOR EVERY STORY" (replace freely).

### 6.3 The archive index (categories)

```
THE ARCHIVE                                   Everything we make, filed in one
INDEX                                         drawer. Pick a section…
┌──────────────────────┬──────────┬──────────┐
│[24 ITEMS]            │[36 ITEMS]│[40 ITEMS]│
│                      │ T-SHIRTS │          │
│   lead photo (2×2)   ├──────────┤  tall    │
│                      │[18 ITEMS]│  (1×2)   │
│ // 01                │SWEATSHIRT│ PANJABI  │
│ HOODIES              │          │          │
├──────────────────────┼──────────┴──────────┤
│ JOGGERS (2×1)        │ ACCESSORIES (2×1)   │
└──────────────────────┴─────────────────────┘
[Browse all ↗]
```
- Bento: 4 columns × 3 rows on desktop, every cell filled; 2 columns on mobile (lead and last tile full width). Rows 13rem / 15rem / 17rem.
- Each tile: photo (`object-cover`, slow 1.05 zoom on hover), bottom gradient scrim to `--bg`, `// 0N` marker + category name (display-lg on the lead, display-md on others, display-sm below `sm`), outline count tag top-left, marigold arrow square top-right on hover/focus.
- Counts are product counts, never stock.

### 6.4 Look file No. 01 (featured look)

```
┌────────────────────────────────────┐   LOOK FILE
│[Filed under: Winter]               │   NO. 01
│                (3)                 │   short mono intro
│                                    │   ┌──────┐┌──────┐┌──────┐
│             (2)                    │   │1 img ││2 img ││3 img │
│     editorial photo (5:6)          │   └──────┘└──────┘└──────┘
│        (1)                         │   NAME     NAME     NAME
│                                    │   ৳1,950   ৳990     ৳750
└────────────────────────────────────┘   ─────────────────────────
                                         LOOK TOTAL ৳3,690  [Shop the look ↗]
```
- `--bg-sunken` section with a faint ember spotlight. Desktop 7/5 columns; mobile stacks photo → text → cards.
- Hotspots: 32px marigold squares with the piece number and a soft ping (off under reduced motion), positioned by `hotspot {x, y}` percentages in the data; each links to the product and shows "name · price" on hover/focus (desktop).
- Piece cards: 3:4 image with the matching number badge, name (display, 11–12px), price.

### 6.5 Latest entries (product grid)

```
LATEST                                                  [Browse more ↗]
ENTRIES
mono intro
[New] [Hoodies] [Panjabi] [T-Shirts] [Sweatshirts] [Joggers]     chip filters
┌───────────────────┐ ┌──────┐ ┌──────┐
│ [Archive 01]      │ │ card │ │ card │
│ WINTER            │ └──────┘ └──────┘
│ DROP              │ ┌──────┐ ┌──────┐
│ mono line         │ │ card │ │ card │
│ [Shop the drop ↗] │ └──────┘ └──────┘
└───────────────────┘
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ card │ │ card │ │ card │ │ card │
└──────┘ └──────┘ └──────┘ └──────┘
```
- Filters are shadcn Tabs styled as outline chips; the active chip is marigold.
- The campaign tile (2 columns; 2 rows from `md`) is a full-bleed photo with a bottom scrim, accent tag, display-xl title, mono line and CTA. Content is admin-editable.
- Grid: 4 columns desktop, 3 tablet, 2 mobile, `grid-flow-dense`; max 8 products (PRD H4), so campaign + 8 fills three desktop rows. Cards = §5.5.

### 6.6 Made to be kept (why us)

```
═════════════ kantha stitch divider ═════════════
┌─────────────────────────────────────────────────────────────────┐
│ MADE TO                              full-width campaign photo  │
│ BE KEPT                              (21:10 desktop, 4:5 mobile)│
│ mono intro                                                      │
│ [Learn more ↗]                                                  │
│ ─────────────────────────────────────────────────────────────── │
│ ☼ CUT FOR OUR   ⚖ FABRIC BY     ▭ PAY AT YOUR   ⇄ WRONG SIZE?   │
│   WEATHER         THE GRAM        DOOR            SWAP IT       │
│   text            text            text            text          │
└─────────────────────────────────────────────────────────────────┘
```
- Photo with left-to-right and bottom-to-top scrims to `--bg` so overlaid text keeps contrast. Heading display-xl.
- Desktop: the four promises sit inside the photo on a `--line-strong` hairline, icons in marigold (Lucide, 1.25px). Below `lg`: photo with heading only, promises listed underneath (2 columns from `sm`).
- Promise text is admin-editable content.

### 6.7 Follow our style journey (social)

```
       FOLLOW OUR STYLE JOURNEY              display-lg centred
     mono intro, 2 lines centred
[Follow us ↗]                                         [‹][›]
[12K+ LIKES]          [8K+ VIEWS]
┌─────┐  [9K+]       ┌─────┐  [15K+]
│     │  ┌─────┐     │     │  ┌─────┐
│     │  │     │     │     │  │     │
└─────┘  │     │     └─────┘  │     │
         └─────┘              └─────┘
```
- Staggered: odd cards at top, even cards offset down 48px (desktop). Scroll-snap slider with arrows (`ScrollSlider`).
- Images are uploaded in admin (no paid social API). Each links to the post.
- **Mobile:** horizontal scroll of cards (no stagger), ~1.3 cards visible.

### 6.8 Footer

```
═════════════ kantha stitch divider ═════════════
            [ full logo + "Archive the essence" ]    logo-full.png, ~256px mobile / 360px desktop
     short mono brand description, centred
          [FB] [IG] [TT] [WA]                square text chips (first one accent)
   ┌────────────────────────────────────┐
   │  wide cinematic image (16:6)       │
   └────────────────────────────────────┘
 [PRIVACY POLICY] [TERMS & CONDITIONS] [RETURN POLICY]   outline chips on hairline
┌───────────────────────────────────────────────────────────┐
│ Home   About Us   Collections   Shop   FAQs   Track Order   Contact │  --cream bar, dark mono text
└───────────────────────────────────────────────────────────┘
───────────────────────────────────────────────────────────── hairline
        © 2026 Aaarchive. All rights reserved.
```
- The brand name is not typed in the footer: the logo carries it. Only the © line names the company.
- **Mobile:** nav bar wraps to 2 rows; policy chips wrap; image 4:3.

---

## 7. Other storefront pages

All pages share the header, footer, grain, colours and components above.

### 7.1 Shop / category / collection

- Page header: breadcrumb (mono-micro) → title (display-lg, e.g., "PANJABI") → short intro → result count `48 PRODUCTS` (mono-label).
- Toolbar on a hairline: `Filter (2)` button (left) · sort dropdown (right).
- Filters: left sidebar (desktop, 240px) with accordion groups; bottom sheet on mobile.
- Active filters shown as accent tags with `✕`.
- Grid: 4 columns desktop / 3 tablet / 2 mobile, regular (non-masonry) for scanning. Card = §5.5.
- "Load More" secondary button centred.
- *Built (2026-10-19):* result count `18 PRODUCTS` (mono-label) above the toolbar; the toolbar's `Filter (n)` is phone-only (the desktop sidebar is always shown); filter groups are `<details>` rows (Size as 44px square toggles, Colour as swatch + name rows, Price min/max inputs + Apply, "In stock only" checkbox); filters apply at once by navigating (shareable URL). Active filters are accent tags with `✕` plus a "Clear all" text link. Empty state: dashed box, one mono line, `Back to all products ↗`.

### 7.2 Product details page

```
Home / Hoodies / Oversized Black Hoodie
┌───┐ ┌──────────────────────┐   [Hoodies]
│th │ │                      │   OVERSIZED BLACK HOODIE        display-md
├───┤ │     MAIN IMAGE       │   ৳1,450  ৳1,800  [-20%]        mono-label
│th │ │       (4:5)          │   ● Low Stock
├───┤ │                      │   ─────────────────────
│th │ │                      │   COLOUR — Black
└───┘ └──────────────────────┘   ● ● ●
                                 SIZE                Size Chart ↗
                                 [S][M][L][X̶L̶][XXL]
                                 QTY  [− 1 +]
                                 [ Add to Cart        ↗ ] primary, full width
                                 [ Buy Now               ] secondary, full width
                                 ─────────────────────
                                 ▸ Description
                                 ▸ Fabric & Care
                                 ▸ Delivery & Exchange
───────────────────────────────────────────────
YOU MAY ALSO LIKE                       [‹][›]
[card] [card] [card] [card]
```
- Desktop: gallery 7 columns, info 5 columns, info column sticky.
- Mobile: swipe gallery with dot/count indicator (`1/5` mono-micro), info below, **sticky bottom bar** with price + "Add to Cart" when the main button is off-screen.
- Size chart modal: table with mono numbers, alternate row bg `--bg-sunken`, "How to measure" small illustration.
- *Built (2026-10-19):* the price block (price, crossed-out compare price, `-20%` sale tag, "Sale ends …") is in the cached shell; the purchase block (status line, colour radios as 24px swatches in 44px targets, size squares with the diagonal strike for sold-out sizes, quantity stepper with "Up to 5 per order", buttons) streams in with a skeleton of the same shape. A variant whose price differs shows its own price under the sizes. Details are `<details>` rows on hairlines (`+` turns into `×`); Description is open by default. Share: `Copy link` / `FB` / `WA` square text chips. Gallery: scroll-snap track with a `1/5` counter, square prev (outline) / next (accent) arrows and a thumbnail column on desktop; tap opens a full-screen zoom (tap again for 2× at that point). While the phone sticky bar shows, the floating chat buttons move up above it (`--buy-bar-h`). "You may also like" is a 4-up grid (2-up on phones).

### 7.3 Cart drawer and cart page

- Drawer header: `CART (2)` display-sm + close chip.
- Line item: 64×80 image, name (display-sm 12px), `Black / L` mono-micro, price, qty stepper, remove link.
- Footer: coupon input + Apply, subtotal, "Delivery calculated at checkout", primary `Checkout ↗` full width.
- Empty state: large outlined wordmark-style "EMPTY" text, `Start Shopping ↗`.

### 7.4 Checkout

- Desktop: 2 columns — form (7 cols) / sticky order summary (5 cols, `--bg-raised` panel).
- Mobile: collapsible "Order summary — ৳2,970 ▾" bar at top, then form, then a sticky **Place Order** button.
- Form sections separated by hairlines with index markers: `// 01 CONTACT`, `// 02 DELIVERY`, `// 03 PAYMENT`.
- Payment method radio cards:
  - **Cash on Delivery** — short note.
  - **bKash** / **Nagad** — expands an instruction panel: store number in large mono with a `Copy` chip, exact amount, steps (1–3), then fields for sender number and TrxID.
  - Use official bKash/Nagad logos only as allowed by their brand guidelines; otherwise use text labels.
- Delivery zone radio cards show charge and estimate: `INSIDE DHAKA · ৳70 · 1–2 days` (values from admin).

### 7.5 Order success

- Big `✓` in an accent square, `ORDER PLACED` display-lg, order number in a large mono accent tag with `Copy`.
- Message: "We'll call you on 017••••••89 to confirm your order."
- If bKash/Nagad: "Payment pending verification" notice.
- Summary panel + `Track Order ↗` and `Continue Shopping` buttons.

### 7.6 Track order

- Centred card: phone + order number inputs → `Track ↗`.
- Result: vertical timeline — completed steps with accent squares, current step pulsing outline (disabled for reduced motion), upcoming steps `--fg-subtle`. Courier + tracking number with external link.

### 7.7 Content pages (About, FAQ, policies)

- Title display-lg, body in `text-body` (Inter), max width 68ch.
- FAQ: accordion rows on hairlines, `+`/`−` icon right.

### 7.8 Empty, loading and error states

- **Loading:** skeleton blocks in `--bg-raised` with a slow shimmer (disabled for reduced motion). Same aspect ratios as final images to avoid layout shift. Utility: `skeleton` in `globals.css` (2.4 s shimmer); `ProductCardSkeleton`, `ProductGridSkeleton`, listing and PDP skeletons reuse it.
- **404:** giant outlined "404", short mono line, `Back to Shop ↗`.
- **Error:** inline notice with `--danger` border and a retry button.

---

## 8. Admin dashboard design

The admin prioritises **speed and clarity** over editorial style.

- Same colour tokens, but **no grain, no giant wordmark, no stitch dividers**.
- Font: **Inter** for everything; JetBrains Mono for numbers, SKUs, order numbers, TrxIDs.
- Radius: 4px (slight) for usability; components from **shadcn/ui** themed with our tokens.
- Layout: left sidebar 240px (collapsible to a 64px icon rail, remembered per device), top bar with search + user menu, content max 1400px. Sidebar groups: Dashboard/Orders · Catalog · Sales · Store; screens not built yet show greyed with a mono "SOON" tag. Active item: `--sidebar-accent` background + marigold text. On phones the same nav opens as a left Sheet from a menu button; nav rows are ≥ 44px tall there.
- Screens: page header (title, one-line intro, primary action on the right; stacked on mobile), then a table. Create/edit happens in a dialog; delete asks in an alert dialog that shows the API error inline. On phones, tables keep name + actions and drop secondary columns (`hidden sm:table-cell`); a flag like "show on home" becomes a small badge under the name.
- Photo fields (`components/admin/image-picker.tsx`): 4:5 thumbnail, "Upload photo" / "Choose from library" (grid dialog) / remove, and an alt-text field once a photo is chosen.
- Grid editors (size charts, `size-charts/_components/size-chart-form-dialog.tsx`): a wide dialog (`sm:max-w-3xl`) with a table of small inputs (mono for values), editable column headers with a remove ✕, a remove ✕ per row, and "Add size" / "Add measurement" outline buttons below. The table scrolls sideways inside a bordered box on phones; invalid cells get the destructive border and one summary line below the table.
- Selects: `components/admin/native-select.tsx`, a styled native `<select>` (Input look, chevron icon) for filters and short lists; the browser supplies keyboard, screen-reader and phone-picker behaviour.
- Product editor (`/admin/products/[id]`): back link, title + status badge + `/slug`, primary "Save product" and a ⋯ menu (Duplicate, View in store, Delete) on the right. Line tabs (Details · Pricing · Images · Variants · Size chart · SEO) scroll sideways on phones; a tab with an invalid field shows a small destructive dot, and saving jumps to the first such tab. Details has a right column (status, featured, category, collections, tags) on desktop. Images are cards (4:5 thumb, alt, colour, make main / move / remove; the first is badged "Main"). Variants is its own panel: "Add variants" with size/colour toggle chips (44px), then a table (swatch + colour + size, SKU, stock, own price, on-sale switch, delete); edited rows collect into a sticky "Save stock" bar. Stock numbers: low in marigold, zero in destructive.
- Products list: search + filter selects (category, status, stock) + sort above the table; rows are fully clickable (link `::after`), 4:5 thumb, name with status/featured/sale badges; phones keep product + stock.
- Portals: dialogs, menus and sheets mount on `<body>`, so the admin values (`--radius`, Inter headings) are also set on `html:has(.admin)`.
- Tables: dense rows (44px), sticky header, row hover `--bg-raised`, status badges:

| Status | Badge |
|---|---|
| Pending | outline, `--fg-muted` |
| Confirmed | accent outline |
| Processing | accent fill |
| Shipped | blue-grey `#8FA3B8` fill, dark text |
| Delivered | `--success` fill, dark text |
| Cancelled / Returned | `--danger` outline |
| Payment Pending Verification | accent fill + clock icon |

- Stock cells: number shown; low stock in accent, zero in `--danger`.
- Mobile admin: usable for order handling on a phone (staff will confirm orders by phone) — order list as cards, big tap targets for "Confirmed / No answer / Cancel".

---

## 9. Imagery & art direction

| Aspect | Direction |
|---|---|
| **Lighting** | Cinematic, single hard spotlight; warm red/orange gels for hero and campaign shots; deep shadows |
| **Colour grade** | Warm, slightly desaturated, crushed blacks, visible film grain |
| **Backgrounds** | Hero/campaign: red-lit studio, concrete, old Dhaka/Chattogram walls, textured fabric. Product (catalogue): plain warm-grey or off-white backdrop for clarity |
| **Poses** | Editorial and confident; seated, leaning, looking off-camera; half-body crops |
| **Panjabi** | Showcase embroidery details with close-up crops; festive (Eid) shoots with marigold, brass, lantern props |
| **Hoodies** | Streetwear: night street, neon/sodium light, motion blur |
| **Consistency** | Every product has: 1 front on model, 1 back, 1 detail close-up, 1 flat-lay or hanger shot (like the reference's hanger and fold shots) |
| **Aspect ratios** | Product 3:4 (catalogue) · Hero main 4:5 · Footer banner 16:6 · Social 3:4 |
| **Export** | Upload originals ≥ 1600px long edge; the image CDN generates WebP/AVIF sizes |

> Do **not** reuse any photos from the reference design. Use our own shoots or properly licensed stock (e.g., Unsplash/Pexels free licence) as placeholders only during development.

---

## 10. Motion

| Element | Motion | Duration / easing |
|---|---|---|
| Image hover | scale 1.03, second image cross-fade | 400ms `cubic-bezier(.2,.7,.2,1)` |
| Button arrow | translate (2px, −2px) | 200ms ease-out |
| Section reveal | fade + 16px rise on first view (IntersectionObserver), stagger 60ms | 500ms ease-out |
| Sliders | scroll-snap; arrow click smooth scroll | 400ms |
| Giant wordmark | very slow horizontal drift (parallax 0.1×) on desktop only; one subtle glitch flicker on load | — |
| Drawer / modal | slide/fade | 250ms ease-out |
| Tabs | underline slides between items | 250ms |

- All motion is disabled or reduced under `prefers-reduced-motion: reduce`.
- No scroll-jacking. No autoplaying video in MVP.
- Use CSS transitions and the Web Animations API — no heavy animation libraries for the storefront (Framer Motion only if needed and code-split).

---

## 11. Accessibility checklist

- Text contrast ≥ 4.5:1 (see §2.2); tags use dark text on accent.
- Focus ring: 2px `--accent` outline with 2px offset on all interactive elements.
- Tap targets ≥ 44×44px on mobile (slider arrows grow on mobile).
- Decorative elements (`// 01` markers, wordmark, grain, connector lines, doodles) are `aria-hidden`.
- Sliders: arrow buttons labelled ("Previous categories"), scroll region keyboard-scrollable.
- Size buttons announce availability ("XL, out of stock").
- Uppercase is done with CSS `text-transform`, not typed in caps, so screen readers read words normally.

---

## 12. Design tokens (CSS)

```css
:root {
  /* colour */
  --bg: #120607;
  --bg-raised: #1b0a0c;
  --bg-sunken: #0c0405;
  --fg: #f3ede2;
  --fg-muted: #a89c92;
  --fg-subtle: #6e625b;
  --line: rgba(243, 237, 226, 0.14);
  --line-strong: rgba(243, 237, 226, 0.32);
  --accent: #f2c14e;
  --accent-hover: #f7d278;
  --accent-fg: #140707;
  --cream: #e4ddc0;
  --ember: #c4412b;
  --ember-deep: #5e1310;
  --success: #7dbe8a;
  --danger: #e5604d;

  /* type */
  --font-display: "Alfa Slab One", "Hind Siliguri", Georgia, serif;
  --font-mono: "JetBrains Mono", "Hind Siliguri", ui-monospace, monospace;
  --font-text: "Inter", "Hind Siliguri", system-ui, sans-serif;

  --fs-display-xl: clamp(2.25rem, 1.5rem + 3.2vw, 4rem);
  --fs-display-lg: clamp(1.75rem, 1.3rem + 2vw, 2.75rem);
  --fs-display-md: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  --fs-display-sm: clamp(0.875rem, 0.82rem + 0.2vw, 1rem);
  --fs-mono-body: clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem);
  --fs-mono-label: clamp(0.6875rem, 0.67rem + 0.08vw, 0.75rem);
  --fs-mono-micro: clamp(0.625rem, 0.61rem + 0.06vw, 0.6875rem);
  --fs-text-body: clamp(0.9375rem, 0.92rem + 0.08vw, 1rem);

  /* spacing */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;
  --space-24: 96px; --space-32: 128px;

  /* layout */
  --container: 1320px;
  --radius: 0;
  --header-h: 56px;

  /* motion */
  --ease-out: cubic-bezier(0.2, 0.7, 0.2, 1);
  --dur-fast: 200ms;
  --dur-base: 400ms;
}
```

### 12.1 How the tokens live in code

**Tailwind CSS v4 + shadcn/ui** (no `tailwind.config`). Tokens are defined in `apps/web/app/globals.css`. shadcn's variable names are the public API, and the design palette is mapped onto them. There is **one** palette (dark): `<html class="dark">`, never a second theme.

| Design token | CSS variable | Tailwind utility |
|---|---|---|
| `--bg` | `--background` | `bg-background` |
| `--bg-raised` | `--card` (also `--popover`, `--muted`, `--secondary`) | `bg-card` |
| `--bg-sunken` | `--sunken` | `bg-sunken` |
| `--fg` | `--foreground` | `text-foreground` |
| `--fg-muted` | `--muted-foreground` | `text-muted-foreground` |
| `--fg-subtle` | `--subtle` | `text-subtle` |
| `--line` | `--border` | `border` / `border-border` |
| `--line-strong` | `--line-strong` (also `--input`) | `border-line-strong` |
| `--accent` (marigold) | **`--primary`** | `bg-primary`, `text-primary` |
| `--accent-hover` | `--primary-hover` | `hover:bg-primary-hover` |
| `--accent-fg` | `--primary-foreground` | `text-primary-foreground` |
| `--cream` | `--cream` / `--cream-foreground` | `bg-cream` |
| `--ember`, `--ember-deep` | `--ember`, `--ember-deep` | `bg-ember` |
| `--success`, `--warning`, `--danger` | `--success`, `--warning`, `--destructive` | `text-success`, `text-destructive` |
| — | `--accent` = shadcn's subtle **hover surface** (`#261113`), *not* marigold | `bg-accent` |

- **Fonts:** `next/font` variables (`--font-alfa-slab`, `--font-jetbrains`, `--font-inter`, `--font-hind`) feed `font-display`, `font-mono`, `font-sans`. Hind Siliguri is in every stack.
- **Type scale:** utilities `type-display-xl|lg|md|sm`, `type-mono-body|label|micro`, `type-text-body` (they set the font, size, line height, tracking and uppercase from §3.2).
- **Helpers:** `site-container` (§4.1 gutters + 1320px max), `grain-overlay`, `spotlight`, `wordmark-outline` / `wordmark-filled`, `kantha-stitch`, `scrollbar-none`.
- **Radius:** `--radius: 0` (storefront). The admin wraps its layout in `.admin`, which sets `--radius: 0.25rem` (§8).
- **Components:** shadcn/ui (`components/ui/`) is the base for **both** storefront and admin. Storefront pieces in `components/store/` wrap shadcn (Tag = Badge, ArrowButton = Button, menu = Sheet, tabs = Tabs) and apply this document's rules. Custom variants added to shadcn: Button `cream`; Badge `sale`, `stock-out`. Admin primitives in use: button, badge, card, input, label, textarea, switch, table, skeleton, dialog, alert-dialog, dropdown-menu, sheet, tabs. *(2026-10-19: dialog, alert-dialog, dropdown-menu, switch, textarea, table and skeleton were written by hand from shadcn's radix-nova source because the shadcn registry host was blocked in the build environment; re-run `bunx shadcn@latest add <name> --overwrite` when it is reachable and keep any theming.)*

---

## 13. Assets to prepare

- [x] Logo provided (PNG, 2026-10-17) — transparent web cuts made
- [ ] Logo as **SVG** or transparent PNG from the designer (sharper than the cut-out) + AAA monogram (favicon, social avatar) + OG default image (1200×630)
- [ ] Marigold / kantha doodle illustrations (SVG, 2–3 small marks)
- [ ] Grain texture (SVG data URI or 200×200 PNG)
- [x] Icon set chosen: Lucide via shadcn (2026-10-17). Social brand logos still to source (or keep text chips)
- [ ] Hero campaign shoot: 1 main + 2 side images (red-lit)
- [ ] Category images (one per category, 3:4)
- [ ] Featured-look image + 2 cut-out product thumbnails
- [ ] Why-us portrait
- [ ] Footer wide banner (16:6)
- [ ] 4–8 social post images
- [ ] Product photos (4 per product minimum)
- [ ] Size chart "how to measure" illustration
