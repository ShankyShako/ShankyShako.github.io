# Fonts

Latin Modern Roman 10, the OpenType release of Computer Modern that pdfTeX uses
for the LaTeX template. Downloaded unmodified from CTAN
(`fonts/lm/fonts/opentype/public/lm/`).

| File | Used for |
| --- | --- |
| `lmroman10-regular.otf` | body text, dates |
| `lmroman10-bold.otf` | name, entry titles, skill labels |
| `lmroman10-italic.otf` | organisation and location rows |
| `lmromancaps10-regular.otf` | section headings (real small caps, not scaled capitals) |

Licence: GUST Font License (an LPPL variant). Redistribution unmodified is
permitted; see <https://www.gust.org.pl/projects/e-foundry/licenses>.

Embed these whole (`subset: false`). pdf-lib's fontkit subsetter corrupts CFF
outlines: the text still extracts correctly, so a parser test passes, but every
glyph prints as the wrong shape. See `src/engine/pdf.js`.
