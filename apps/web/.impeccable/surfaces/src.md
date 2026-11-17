---

version: 1
slug: "src"
primary_target: "src"
related_targets: []
---

# Surface brief — Gutter app shell (Início, Biblioteca, Série, Coleções, Leituras, Ajustes, Leitor)

Scope: the whole web app, reader chrome included; the comic page itself stays untouched. Visitor mode: Operate (library screens) with an immersive Operate reader.

Audience and job (from PRODUCT.md): people who read their own comic/manga/webtoon files on desktop, phone and tablet; read an issue end to end, resume, organize, and now keep a daily reading habit.

User decisions (17/11/2026, in words): mix the Estante (shelf) idea with the Komga standard; the user picks the view — "de lado" (spines) and "de frente" (covers) — and can shrink/grow it; a new tab to follow daily reading with streaks; must be very interactive and look good. Avoid: streaming look, cold/corporate.

## Direction contract

THESIS: The collection is a shelf you can turn: front shows covers (the familiar media-library grid), side shows numbered spines whose obi band carries reading state. Refuses the poster-wall-on-black streaming default by giving every book a physical, countable presence and by making reading progress the color.

OWN-WORLD: Night shelf in indigo ink (#13162a ground, #1f2440 surfaces), paper-cream text, obi vermilion for "lendo"/progress, obi gold for novo/sequência/lido, deep blue as quiet secondary. Big Shoulders Display condensed for numbers and titles at large scale, Figtree for UI. Spines: tall narrow bands tinted from each cover, huge issue number, tiny paper label, fixed status cell (filled lido, half lendo, hollow não lido).

STORY: The reader sees what they are reading and how far in, picks the next one in one glance, feels their habit grow (streak, days on a shelf of days) and gets out of the way while reading.

FIRST VIEWPORT: Início — left rail nav (Início, Biblioteca, Coleções, Leituras, Ajustes) with source switcher; top: the volume being read pulled off the shelf (cover + obi length = pages left, primary "Continuar"), streak chip beside it; below: shelves rendered in the current view (front covers or side spines) with a Frente/Lado toggle and size control.

FORM: Estante de Tankōbon fused with the category-standard shell at the user's request; position 4 on the grounded list (assigned by the roll), canon layout kept as the "front" view. seed:9fa2907edc0e10c4

SIGNATURE: pulling a volume off the shelf — in side view a spine slides up and its cover swings out on hover/focus; the Frente↔Lado switch animates covers turning to spines. Leituras renders days as a shelf of thin spines whose height is pages read.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
