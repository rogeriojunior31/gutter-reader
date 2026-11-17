---
name: Gutter
description: A comic, manga and webtoon reader for files you already own, shelved like books at night.
colors:
  ink-50: "#f6f1e6"
  ink-100: "#ece6d8"
  ink-200: "#d3d1de"
  ink-300: "#b0b3cb"
  ink-400: "#8a8fb0"
  ink-500: "#6b7196"
  ink-600: "#3a4170"
  ink-700: "#2a3052"
  ink-800: "#1f2440"
  ink-850: "#181c33"
  ink-900: "#13162a"
  ink-950: "#0b0d1a"
  obi-100: "#fde3dd"
  obi-300: "#f4937f"
  obi-500: "#e2412b"
  obi-600: "#c9331f"
  gold-200: "#fae9a8"
  gold-300: "#f7d76b"
  gold-400: "#f2c230"
typography:
  display:
    fontFamily: "Big Shoulders Display Variable, Big Shoulders Display, ui-sans-serif, system-ui, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "0.025em"
  headline:
    fontFamily: "Big Shoulders Display Variable, Big Shoulders Display, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.025em"
  section:
    fontFamily: "Big Shoulders Display Variable, Big Shoulders Display, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.33
    letterSpacing: "0.025em"
  numeral:
    fontFamily: "Big Shoulders Display Variable, Big Shoulders Display, ui-sans-serif, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  title:
    fontFamily: "Figtree Variable, Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
  body:
    fontFamily: "Figtree Variable, Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Figtree Variable, Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  tag:
    fontFamily: "Figtree Variable, Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
rounded:
  spine: "3px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
spacing:
  spine-gap: "6px"
  grid-gap: "16px"
  grid-row: "28px"
  shelf-row: "44px"
  gutter-mobile: "16px"
  gutter-desktop: "32px"
  panel: "24px"
  section: "56px"
components:
  button-primary:
    backgroundColor: "{colors.obi-600}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.obi-500}"
  button-secondary:
    backgroundColor: "rgb(255 255 255 / 0.10)"
    textColor: "{colors.ink-50}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    textColor: "{colors.ink-200}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "40px"
  icon-button:
    textColor: "{colors.ink-200}"
    rounded: "{rounded.lg}"
    size: "36px"
  chip:
    textColor: "{colors.ink-100}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "32px"
  chip-active:
    backgroundColor: "rgb(226 65 43 / 0.15)"
    textColor: "{colors.obi-100}"
  segmented-on:
    backgroundColor: "{colors.obi-600}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "36px"
  view-toggle-on:
    backgroundColor: "{colors.ink-600}"
    textColor: "{colors.ink-50}"
    rounded: "{rounded.md}"
    height: "36px"
  input:
    backgroundColor: "{colors.ink-900}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  panel:
    backgroundColor: "{colors.ink-850}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.panel}"
  nav-item-active:
    backgroundColor: "rgb(255 255 255 / 0.10)"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    height: "40px"
  spine-label:
    backgroundColor: "{colors.ink-100}"
    textColor: "{colors.ink-900}"
    typography: "{typography.tag}"
    rounded: "2px"
  ledge:
    backgroundColor: "{colors.ink-700}"
    height: "10px"
---

# Design System: Gutter

## Overview

**Creative North Star: "The Night Shelf"**

Gutter is a bookshelf in a dark room: an indigo-ink floor, paper-cream type, and every book present as a physical, countable object. The collection can be turned. From the front it is the familiar media-library grid of covers standing on a ledge; from the side it is a row of numbered spines tinted from their own covers. Reading state is not a badge bolted on top; it is the obi, the paper band wrapped around a tankōbon, and it is the only loud color in the room.

Density is calm and generous at the library level (56px between sections, covers 132 to 220px wide) and disappears entirely in the reader, where the page is the product and the chrome fades out. Big Shoulders Display, condensed and uppercase, carries titles and numbers at poster scale; Figtree carries everything you operate. Motion is physical and short: a spine slides up and its cover swings out, a card lifts 4px, covers morph into spines when the view turns.

The user explicitly rejected a streaming look (poster wall on black) and anything cold or corporate. The ink ground is blue-violet, never neutral black, and the shelf boards under every row keep covers from floating.

**Key Characteristics:**
- Indigo ink ground (ink-900) with tonal panels (ink-850), no pure black outside the reader.
- Obi vermilion means reading and progress; obi gold means done, goal and streak. Both are scarce.
- Every row of books stands on a board (ledge); front and side are the same shelf, turned.
- Condensed uppercase display type for names and numbers, humanist sans for UI.
- Spines take their color from their cover, clamped to one dark lightness so the shelf stays coherent.

## Colors

A one-hue night palette (indigo ink, from paper cream to near-black) lit by two warm accents that each carry meaning.

### Primary
- **Obi Vermilion** (obi-500, with obi-600 for filled controls): the reading band. Fills the obi on a spine being read, the "faltam N" band across a pulled cover, day spines that met the goal, the primary button and the selected segment. obi-600 is the resting fill for anything with white label text; obi-500 is hover and the band itself.
- **Obi Blush** (obi-300, obi-100): text-scale tints of the same band. obi-300 marks the active nav icon, hovered titles and "Ver tudo" links; obi-100 is text on an active chip.

### Secondary
- **Obi Gold** (gold-400, with gold-300 and gold-200 for text): completion and habit. The band on a finished spine, the "Lido" tag on a cover, the streak flame, the goal line in Estante de dias, today's ring, and the global focus outline. gold-300 and gold-200 are its readable text forms.

### Neutral
- **Paper Cream** (ink-50, ink-100): primary text and the paper label on a spine. ink-100 is body text; ink-50 is emphasized text and selected toggles.
- **Lavender Grey** (ink-200, ink-300, ink-400): secondary text, metadata, idle icons. ink-300 is the workhorse (most used token in the build) for subtitles and captions.
- **Dusk Indigo** (ink-500, ink-600): logo third panel, selected view toggle, scrollbar thumb.
- **Shelf Board** (ink-700): the boards under rows, empty day spines, spine fallback tint.
- **Night Panel** (ink-800, ink-850): cover placeholders, toasts, panels, dialogs, popovers, the Resume hero.
- **Ink Floor** (ink-900): the page ground, sidebar and inputs.
- **Deep Ink** (ink-950): the reader chrome's fade-to-page gradient only.

### Named Rules
**The Obi Rule.** Vermilion means "being read" and nothing else decorative. If an element is not progress, the current read, or the one primary action, it does not get obi.

**The Gold Means Done Rule.** Gold marks finished, streak, goal and focus. It is never a fill for an action button; the one gold fill, the skip link, belongs to the focus system.

**The Spine Tint Rule.** Spine color is computed from the cover's average hue and forced to `oklch(0.36 C H)` with chroma capped at 0.14, falling back to `oklch(0.34 0.05 275)`. White numerals must always read on it; never hand-pick spine colors.

## Typography

**Display Font:** Big Shoulders Display Variable (fallback ui-sans-serif, system-ui), self-hosted via @fontsource-variable
**Body Font:** Figtree Variable (fallback ui-sans-serif, system-ui), self-hosted via @fontsource-variable

**Character:** A condensed poster grotesque that reads like spine lettering and issue numbers, paired with a warm, round humanist sans that stays quiet for controls and prose.

### Hierarchy
- **Display** (800, 3.75 to 4.5rem, line-height 0.92, uppercase, 0.025em): the series name in the Resume hero and Series page, the Welcome hero. Needs `pt-[0.1em]` to protect accents from the tight leading.
- **Headline** (800, 2.25 to 3rem, line-height 1, uppercase, 0.025em): page titles via PageHeader and EndOfBook.
- **Section** (800, 1.5rem, uppercase, 0.025em): section heads ("Sua estante", "Estante de dias", "Histórico").
- **Numeral** (800, tabular): spine numbers at 26/34/40px by size, streak count at 6rem, today's pages at 1.875rem, history page counts at 1.25rem.
- **Title** (Figtree 600, 1.125rem): dialog titles.
- **Body** (Figtree 400, 0.875rem): UI text, card names (500), summaries capped at 65ch.
- **Label** (Figtree 500, 0.75rem): captions, metadata, controls, chips, segmented options.
- **Tag** (Figtree 600, 11px, uppercase on spines): spine paper labels, cover tags, badges, mobile tab labels.

### Named Rules
**The Spine Lettering Rule.** Big Shoulders is always 600 or heavier and always uppercase when it sets words; it sets numbers in tabular figures. It never sets running text or anything under 14px.

**The Quiet Operator Rule.** Every control, caption and paragraph is Figtree. Display type names things; it does not label buttons.

## Layout

A left rail (240px, fixed, from 1024px up) holds the wordmark, five destinations and the source switcher at the bottom; below 1024px it becomes a 56px sticky top bar with the switcher and a 64px bottom tab bar with all five destinations. Content sits in a centered column (max 1400px) with 16px gutters on phones and 32px from 640px, sections stacked 56px apart.

Covers flow in an auto-fill grid whose minimum column width is the user's size choice: P 104px, M 132px (160px from 640px), G 170px (220px from 640px), with column gaps of 12/16/20px and row gaps of 20/28/32px. Spines wrap in rows on a 6px gap with 44px between rows; each row is 180/240/300px tall by size, and spine width scales with page or book count between 40 and 78px. Activity uses a 300px streak column beside the day shelf from 1024px, stacking below.

Touch targets grow to 44px on coarse pointers across buttons, chips, segmented and view controls (`pointer-coarse`). The Day Shelf shows 12 weeks from 640px and 4 weeks below so today fits without scrolling.

### Named Rules
**The Same Shelf Rule.** Front and side are one shelf turned. Cover grids stand on ledges that touch to form a continuous board; spine rows stand on a repeating board. Never render a row of books floating without its board.

## Elevation & Depth

Depth is mostly tonal (ink-900 floor, ink-850 panels, ink-800 lifted surfaces) with thin 10% white hairlines. Shadows are reserved for physical objects: books, the boards they stand on, and things that float over the shelf (popover, dialog, toast, the pulled cover). All shadows are black, soft and downward; there are no colored glows.

### Shadow Vocabulary
- **Spine bevel** (`inset -6px 0 10px -6px rgb(0 0 0/.55), inset 4px 0 6px -4px rgb(255 255 255/.12)`): rounds every spine; a smaller version shapes day spines.
- **Cover rest** (`0 10px 15px -3px rgb(0 0 0/.4)` with a 1px white/5 ring): covers in grids.
- **Board drop** (`0 8px 14px -8px rgb(0 0 0/.7)`; hero boards `0 10px 16px -10px rgb(0 0 0/.8)`): the shadow under every ledge.
- **Pulled / floating** (`0 25px 50px -12px rgb(0 0 0/.6)`): the cover pulled off a spine, the hero cover, popovers, dialogs.
- **Button highlight** (`inset 0 1px 0 rgb(255 255 255/.15)`): top edge on the primary button only.

### Named Rules
**The Objects Cast Shadows Rule.** Panels and cards are flat tonal surfaces; only books, boards and floating layers cast shadows.

## Shapes

Small, honest corners. Spines are nearly square (3px), spine labels 2px, tags 4px, covers and buttons 8px, popovers and toasts 12px, panels and dialogs 16px, the two hero stages 24px. Chips are the only pills. Spines are tall narrow bands with vertical-rl titles; the status cell is a 12px circle with a 2px paper-white stroke (filled lido, half lendo, hollow não lido). Empty states use a dashed 10% white border on a 16px radius.

## Components

### Buttons
Solid, compact, confident.
- **Shape:** gently rounded (8px; 6px at small size), 40px tall (32px small), 44px on touch.
- **Primary:** obi-600 fill, white 600 label, 1px inset top highlight; hover obi-500. One per view: "Continuar lendo", "Abrir minha pasta", "Tentar de novo".
- **Secondary:** 10% white fill, ink-50 label, hover 15%.
- **Ghost:** no fill, ink-200 label, hover 10% white fill and white label.
- **Danger:** red at 15% fill with red-300 label (Tailwind red, not a world token).
- **Icon button:** 36px square (44px touch), ink-200 glyph, same hover as ghost. Icons are Lucide line icons at 16 to 20px.
- **Focus:** global 2px gold-400 outline, 2px offset, on every interactive element.

### Chips
- **Style:** 32px pill, 1px 15% white border, ink-100 text; hover border 30%.
- **State:** active is obi-500 at 15% fill, 60% obi border, obi-100 text; used for library filters.

### Segmented and View Controls
- **Segmented** (reader settings, Ajustes): ink-850 track with 10% ring, 2px inset; selected option obi-600 with white 600 label.
- **View controls** (Frente / Lado / Lista with P / M / G): same track, but the selected option is ink-600 with ink-50 text, so view switching never competes with the obi. Labels hide below 640px, icons remain.

### Cards / Containers
- **Panel:** ink-850, 1px 10% white border, 16px radius, 20px padding (24px from 640px). Activity and settings blocks.
- **Hero stage:** the same surface at 24px radius and 24 to 48px padding, holding the Resume or Welcome hero.
- **Cover card** (SeriesCard, ContinueCard): a 2:3 cover with 8px radius on a ledge, name in Figtree 500 below; hover lifts the cover 4px (200ms) and tints the name obi-300. A 4px obi-600 bar at the cover foot shows progress; a gold "Lido" tag top-right marks done; a black tag top-left marks "Oriental".

### Inputs / Fields
- **Style:** ink-900 fill, 1px 15% white border, 8px radius, 10px by 12px padding, placeholder ink-300, gold caret.
- **Focus:** border goes to obi-500 at 70% with a 2px gold-400/40 outline.

### Navigation
- **Rail:** 40px rows, Figtree 500 at 14px, ink-300 idle with 5% white hover; active row gets 10% white fill, white label and an obi-300 icon. Wordmark is the three-panel logo plus "GUTTER" in Big Shoulders 800.
- **Mobile:** bottom tab bar, five equal 64px cells, 11px labels, active in obi-300, ink-900 at 95% with backdrop blur and safe-area padding.

### Spine (signature)
The book seen from the side. A band tinted from its cover (Spine Tint Rule) carries, top to bottom: an optional cream paper label (year, format or "Série"; omitted on the Welcome hero's decorative spines), a huge Big Shoulders numeral (issue number or book count with a unit), the title set vertically, the obi (vermilion with a white progress bar while reading, solid gold when read, absent when unread), and the fixed status cell.
- **Pull:** on hover or keyboard focus the spine rises 12px and its cover swings out beside it (scale 0.95 to 1, fade in, 300ms, `cubic-bezier(0.16, 1, 0.3, 1)`), choosing left or right to stay inside the shelf; the pulled cover carries a "falta" obi whose length is pages left, plus name and detail.
- **Turn:** Frente and Lado share a view-transition name per item, so switching views morphs covers into spines (skipped under reduced motion).
- **Open item:** there is no touch long-press equivalent for the pull; on touch devices a tap goes straight to the series.

### Resume Hero
The volume being read, off the shelf: a small spine and its cover standing on a board, the cover crossed by a vermilion "faltam N" band whose width is the share of pages left, the series name in Display, page position, summary, "Continuar lendo" (primary) and "Ver série", with a gold streak link underneath. Hover lifts the cover a further 8px.

### Day Shelf
Leituras renders the last 12 weeks (4 on phones) as thin spines on an 8px ink-700 board: height is pages read (minimum 12%, 5% stub for no reading), obi-500 when the goal was met, obi-500 at 50% when below, ink-700 when none. A dashed gold line marks the daily goal; today wears a 2px gold ring.

### Floating layers
Popover (12px radius, ink-850, rises 8px in 180ms), toast (12px, ink-800, rises in 240ms), dialog (native `<dialog>`, 16px, ink-850, black/70 blurred backdrop), EndOfBook (24px, rises in 320ms). All animations stop under reduced motion.

### Reader chrome (provisional)
Top bar and controls float over the page on an ink-950-to-transparent gradient and fade out (200ms); the settings sheet reuses the panel surface at 95% with blur and the obi Segmented. This chrome was not part of the scored finish review; treat it as provisional until reviewed.

## Do's and Don'ts

### Do:
- **Do** stand every row of covers or spines on a board (ink-700 ledge, 10px, with the board drop shadow).
- **Do** use obi vermilion only for the current read, progress and the single primary action; use gold for done, streak, goal and focus.
- **Do** derive spine color from the cover through the shared cover-color helper, at oklch lightness 0.36 and chroma no more than 0.14.
- **Do** set names and numbers in Big Shoulders Display 800 uppercase with tabular figures, and everything operable in Figtree.
- **Do** give every hover motion a keyboard-focus twin and a `motion-reduce` fallback, using `cubic-bezier(0.16, 1, 0.3, 1)` at 180 to 320ms.
- **Do** grow every touch target to 44px on coarse pointers.

### Don't:
- **Don't** build a streaming-style poster wall on pure black; the ground is indigo ink and books stand on shelves.
- **Don't** make it cold or corporate: no neutral greys, no flat unshadowed books.
- **Don't** fill a button or selected view toggle with gold.
- **Don't** render a spine without its status cell; reading state must be readable from the side.
- **Don't** set running text, controls or anything under 14px in Big Shoulders Display.
