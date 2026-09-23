/**
 * Typesetting for the personalized resume: one layout plan, drawn twice.
 *
 * The plan (every string, rule, and the QR code, with positions in points) is
 * what the on-screen preview draws as SVG and what the PDF export draws with
 * pdf-lib. Both read the same numbers, so the page you watch assemble is the
 * page you download. The fit loop measures the plan, not the screen.
 *
 * Ported from Resumator (engine/templates.js + engine/pdf.js), LaTeX template
 * only: the sb2nov / Jake Gutierrez layout that resume/resume.tex uses. The
 * rules that make its PDFs parse cleanly are kept, and noted where they bite:
 * see docs/RESUME-PERSONALIZER.md.
 *
 * Loaded on demand (pdf-lib + fontkit + four fonts is ~1 MB), never on first
 * paint of /resume.
 */
import { PDFDocument, PDFString, rgb, pushGraphicsState, beginText, setFontAndSize, setTextRise,
  moveText, showText, endText, popGraphicsState, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import qrcode from 'qrcode-generator';

import { entries, meta, sections, type Entry, type SkillLine } from '../../data/resume.ts';

export type FontKey = 'regular' | 'bold' | 'italic' | 'caps';

/* Latin Modern Roman 10, from CTAN. Private family names in CSS (see
   components.css) so an installed copy of a different version never stands in. */
const FONT_FILES: Record<FontKey, string> = {
  regular: '/fonts/lm/lmroman10-regular.otf',
  bold: '/fonts/lm/lmroman10-bold.otf',
  italic: '/fonts/lm/lmroman10-italic.otf',
  caps: '/fonts/lm/lmromancaps10-regular.otf',
};

const PX = 0.75; // one CSS px at 96dpi, in points
const PAGE = { w: 8.5 * 72, h: 11 * 72, margin: 0.5 * 72 };
/* Jake's template sets bullets at 10pt under an 11pt class. */
const BASE = 10;

const T = {
  lineHeight: 1.2,
  dateDash: ' – ',
  header: { nameScale: 2.488, nameGapPx: 1.3, separator: '|', afterPx: 10.7 },
  heading: { scale: 1.2, beforePx: 8, ruleGapPx: 2.4, ruleWidthPx: 0.53, afterPx: 3.5 },
  entry: { indentPx: 14.4, rightInsetPx: 7.2, rowGapPx: 1.3, datesGapPx: 12, titleScale: 1.1, datesScale: 1.1, bulletsBeforePx: 2.4, betweenPx: 8 },
  bullets: { indentPx: 31.6, markerXPx: 21.6, markerScale: 0.55, betweenPx: 2 },
  lines: { indentPx: 14.4 },
};

const BADGE = { sizeIn: 0.8, gapPx: 16, minTopIn: 0.25 };

/* ---------------------------------------------------------------------------
 * What goes on the page, in order, with no styling.
 * ------------------------------------------------------------------------ */
export type PageEntry = { entry: Entry; bullets: { id: string; text: string }[] };
export type PageSection = { title: string; lines: SkillLine[]; entries: PageEntry[] };

/**
 * @param ids   selected fragment ids, most relevant first. Bullets keep this
 *              order inside an entry, and projects are ordered by their best.
 * @param texts the text to print per id (a verified rewrite or the original)
 */
export function buildPage(ids: string[], texts: Record<string, string>, skillLines: SkillLine[]): PageSection[] {
  const pos = new Map(ids.map((id, i) => [id, i]));
  const firstPos = (e: Entry) => Math.min(...e.bullets.map((b) => pos.get(b) ?? Infinity));
  return sections
    .map((s) => {
      let list = entries
        .filter((e) => e.section === s.id)
        .map((entry) => ({
          entry,
          bullets: entry.bullets
            .filter((b) => pos.has(b))
            .sort((a, b) => pos.get(a)! - pos.get(b)!)
            .map((id) => ({ id, text: texts[id] })),
        }))
        .filter((pe) => pe.bullets.length || pe.entry.always);
      if (s.id === 'projects') list = list.sort((a, b) => firstPos(a.entry) - firstPos(b.entry));
      return { title: s.title, lines: s.lines ? skillLines : [], entries: list };
    })
    .filter((s) => s.lines.length || s.entries.length);
}

/* ---------------------------------------------------------------------------
 * Plan
 * ------------------------------------------------------------------------ */
export type TextCmd = {
  kind: 'text'; str: string; font: FontKey; size: number; x: number; y: number;
  href?: string; linkBox?: Box; rise?: number; bulletOf?: string;
};
export type Box = { x: number; y: number; w: number; h: number };
export type Cmd =
  | TextCmd
  | { kind: 'rule'; x1: number; x2: number; y: number; thickness: number }
  | { kind: 'badge'; x: number; y: number; w: number; h: number; href: string; qr: { size: number; path: string } };

export type Plan = { commands: Cmd[]; height: number; usable: number; pageW: number; pageH: number; top: number };

type Font = {
  pdf: PDFFont;
  baseline: (size: number, box: number) => number;
  /** Width in points. Additive by word, because kerning and ligatures are off. */
  width: (str: string, size: number) => number;
};
type Fonts = Record<FontKey, Font>;

const hrefFor = (u: string) => (/^[a-z]+:/i.test(u) ? u : `https://${u}`);
const dateRange = (s = '') => s.replace(/\s*--\s*/g, T.dateDash);

function contactItems() {
  const c = meta.contact;
  return [
    { text: c.phone, href: null },
    { text: c.email, href: `mailto:${c.email}` },
    ...c.links.map((l) => ({ text: l, href: hrefFor(l) })),
  ];
}

function qrMatrix(text: string) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  /* One rectangle per horizontal run of dark modules: no seams between them. */
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; ) {
      if (!qr.isDark(r, c)) { c++; continue; }
      const start = c;
      while (c < n && qr.isDark(r, c)) c++;
      d += `M${start} ${r}h${c - start}v1h${start - c}z`;
    }
  }
  return { size: n, path: d };
}

/* Encodes the full https URL: a bare domain decodes as text, and some phone
   cameras will not offer to open it. */
const QR = qrMatrix(meta.badgeUrl);

function wrap(text: string, font: Font, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (!cur || font.width(next, size) <= maxWidth) cur = next;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Word-wrap a bold label then plain text, as lines of same-font segments. */
function wrapRuns(runs: { text: string; font: FontKey }[], fonts: Fonts, size: number, maxWidth: number) {
  const words: { text: string; font: FontKey; lead: string }[] = [];
  let pendingSpace = false;
  for (const r of runs) {
    for (const p of r.text.split(/(\s+)/)) {
      if (!p) continue;
      if (/^\s+$/.test(p)) { pendingSpace = true; continue; }
      words.push({ text: p, font: r.font, lead: pendingSpace && words.length ? ' ' : '' });
      pendingSpace = false;
    }
  }
  const lines: { text: string; font: FontKey }[][] = [];
  let line: typeof words = [];
  let w = 0;
  for (const word of words) {
    const add = fonts[word.font].width(word.lead + word.text, size);
    if (line.length && word.lead && w + add > maxWidth) {
      lines.push(line.map((x, i) => ({ text: (i ? x.lead : '') + x.text, font: x.font })));
      line = [{ ...word, lead: '' }];
      w = fonts[word.font].width(word.text, size);
    } else {
      line.push(word);
      w += add;
    }
  }
  if (line.length) lines.push(line.map((x, i) => ({ text: (i ? x.lead : '') + x.text, font: x.font })));
  return lines.map((ws) => {
    const segs: { text: string; font: FontKey }[] = [];
    for (const s of ws) {
      const last = segs[segs.length - 1];
      if (last && last.font === s.font) last.text += s.text;
      else segs.push({ ...s });
    }
    return segs;
  });
}

function layout(page: PageSection[], fonts: Fonts, scale: number): Plan {
  const width = PAGE.w - 2 * PAGE.margin;
  const left = PAGE.margin;
  const base = BASE * scale;
  const gap = (px: number) => px * PX * scale;
  const W = (k: FontKey, s: string, size: number) => fonts[k].width(s, size);
  const commands: Cmd[] = [];
  let y = 0;

  const text = (str: string, font: FontKey, size: number, x: number, box: number, extra: Partial<TextCmd> = {}) => {
    const cmd: TextCmd = { kind: 'text', str, font, size, x, y: y + fonts[font].baseline(size, box), ...extra };
    commands.push(cmd);
    return cmd;
  };

  // ---- header: name and contact on the left, QR code top right
  const bw = BADGE.sizeIn * 72 * scale;
  const textWidth = width - bw - gap(BADGE.gapPx);
  const nameSize = base * T.header.nameScale;
  for (const line of wrap(meta.name, fonts.bold, nameSize, textWidth)) {
    text(line, 'bold', nameSize, left, nameSize);
    y += nameSize;
  }
  y += gap(T.header.nameGapPx);

  const cbox = base * T.lineHeight;
  const spaceW = W('regular', ' ', base);
  const pieces = contactItems().map((it, i, all) => {
    const tail = i < all.length - 1 ? ` ${T.header.separator}` : '';
    return { it, labelW: W('regular', it.text, base), w: W('regular', it.text + tail, base), tail };
  });
  const rows: { items: typeof pieces; w: number }[] = [];
  for (const p of pieces) {
    const row = rows[rows.length - 1];
    if (row && row.w + spaceW + p.w <= textWidth) { row.items.push(p); row.w += spaceW + p.w; }
    else rows.push({ items: [p], w: p.w });
  }
  for (const row of rows) {
    let x = left;
    for (const p of row.items) {
      const baseline = y + fonts.regular.baseline(base, cbox);
      /* Trailing space: two strings on one line must not glue together
         in a parser ("EngineerSeptember"). */
      text(p.it.text + p.tail + ' ', 'regular', base, x, cbox, p.it.href
        ? { href: p.it.href, linkBox: { x, y: baseline - base * 0.8, w: p.labelW, h: base * 1.05 } }
        : {});
      if (p.it.href) commands.push({ kind: 'rule', x1: x, x2: x + p.labelW, y: baseline + 1.5 * scale, thickness: 0.4 * scale });
      x += p.w + spaceW;
    }
    y += cbox;
  }

  /* Taller than the name and contact rows, the QR code rises into the top
     margin until its bottom meets the contact line, as the LaTeX original's
     textpos block does, leaving at least minTopIn of paper above it. */
  const textH = y;
  const rise = Math.min(Math.max(0, bw - textH), (PAGE.margin - BADGE.minTopIn * 72) * scale);
  commands.push({ kind: 'badge', x: left + width - bw, y: -rise, w: bw, h: bw, href: meta.badgeUrl, qr: QR });
  y = Math.max(y, bw - rise) + gap(T.header.afterPx);

  // ---- sections
  const bodyBox = base * T.lineHeight;
  for (const s of page) {
    y += gap(T.heading.beforePx);
    const titleSize = base * T.heading.scale;
    const titleBox = titleSize * T.lineHeight;
    text(s.title, 'caps', titleSize, left, titleBox);
    y += titleBox + gap(T.heading.ruleGapPx);
    const ruleW = T.heading.ruleWidthPx * PX;
    commands.push({ kind: 'rule', x1: left, x2: left + width, y: y + ruleW / 2, thickness: ruleW });
    y += ruleW + gap(T.heading.afterPx);

    const lx = left + gap(T.lines.indentPx);
    for (const l of s.lines) {
      const runs = [{ text: l.label, font: 'bold' as const }, { text: `: ${l.items.join(', ')}`, font: 'regular' as const }];
      for (const segs of wrapRuns(runs, fonts, base, width - gap(T.lines.indentPx))) {
        let x = lx;
        for (const seg of segs) { text(seg.text, seg.font, base, x, bodyBox); x += W(seg.font, seg.text, base); }
        y += bodyBox;
      }
    }

    const ex = left + gap(T.entry.indentPx);
    const rowW = width - gap(T.entry.indentPx) - gap(T.entry.rightInsetPx);
    const datesGap = gap(T.entry.datesGapPx);

    s.entries.forEach(({ entry: e, bullets }, i) => {
      if (e.tags !== undefined) {
        // Project row: \small \textbf{Title} | \emph{tags}
        let x = ex;
        for (const [str, font] of [[`${e.title} `, 'bold'], ['| ', 'regular'], [e.tags, 'italic']] as const) {
          text(str, font, base, x, bodyBox);
          x += W(font, str, base);
        }
        y += bodyBox;
      } else if (!e.headingless) {
        const size = base * T.entry.titleScale;
        const rsize = base * T.entry.datesScale;
        const rowBox = Math.max(size, rsize) * T.lineHeight;
        const right = dateRange(e.right);
        const rightW = right ? W('regular', right, rsize) : 0;
        wrap(e.title ?? '', fonts.bold, size, rowW - rightW - (right ? datesGap : 0)).forEach((line, n) => {
          text(n === 0 && right ? `${line} ` : line, 'bold', size, ex, rowBox);
          if (n === 0 && right) text(right, 'regular', rsize, ex + rowW - rightW, rowBox);
          y += rowBox;
        });
        if (e.sub || e.subRight) {
          y += gap(T.entry.rowGapPx);
          const subR = dateRange(e.subRight);
          const subRW = subR ? W('italic', subR, base) : 0;
          const lines = wrap(e.sub ?? '', fonts.italic, base, rowW - subRW - (subR ? datesGap : 0));
          (lines.length ? lines : ['']).forEach((line, n) => {
            if (line) text(n === 0 && subR ? `${line} ` : line, 'italic', base, ex, bodyBox);
            if (n === 0 && subR) text(subR, 'italic', base, ex + rowW - subRW, bodyBox);
            y += bodyBox;
          });
        }
      }

      if (bullets.length && !e.headingless) y += gap(T.entry.bulletsBeforePx);
      const indent = gap(T.bullets.indentPx);
      const markerSize = base * T.bullets.markerScale;
      bullets.forEach((b, n) => {
        wrap(b.text, fonts.regular, base, width - gap(T.entry.indentPx) - indent).forEach((line, k) => {
          if (k === 0) {
            /* The small raised bullet goes on the text's own baseline, lifted
               with text rise, so a parser reads "• Ported…" as one line. */
            const lift = fonts.regular.baseline(base, bodyBox) - fonts.regular.baseline(markerSize, bodyBox);
            const m = text('•', 'regular', markerSize, ex + gap(T.bullets.markerXPx), bodyBox);
            m.y += lift;
            m.rise = lift;
          }
          text(line, 'regular', base, ex + indent, bodyBox, { bulletOf: b.id });
          y += bodyBox;
        });
        if (n < bullets.length - 1) y += gap(T.bullets.betweenPx);
      });
      if (i < s.entries.length - 1) y += gap(T.entry.betweenPx);
    });
  }

  return { commands, height: y, usable: PAGE.h - 2 * PAGE.margin, pageW: PAGE.w, pageH: PAGE.h, top: PAGE.margin };
}

/* ---------------------------------------------------------------------------
 * The engine: fonts loaded once, a measuring document kept for planning.
 * ------------------------------------------------------------------------ */

/* Ligatures and kerning off, so widths match the preview and "fi" stays two
   letters for parsers. subset: false is load-bearing: fontkit's subsetter
   scrambles these CFF outlines, and only a rendered page shows it. */
const EMBED = { subset: false, features: { liga: false, clig: false, dlig: false, kern: false } };

const KEYS: FontKey[] = ['regular', 'bold', 'italic', 'caps'];

export class Typesetter {
  private bytes: Record<FontKey, Uint8Array>;
  private metrics: Record<FontKey, { asc: number; desc: number }>;
  private measure: Fonts;

  private constructor(bytes: Record<FontKey, Uint8Array>, metrics: Record<FontKey, { asc: number; desc: number }>, measure: Fonts) {
    this.bytes = bytes;
    this.metrics = metrics;
    this.measure = measure;
  }

  static async load(): Promise<Typesetter> {
    const bytes = {} as Record<FontKey, Uint8Array>;
    await Promise.all(KEYS.map(async (k) => {
      const res = await fetch(FONT_FILES[k]);
      if (!res.ok) throw new Error(`font ${k}: HTTP ${res.status}`);
      bytes[k] = new Uint8Array(await res.arrayBuffer());
    }));
    const metrics = {} as Record<FontKey, { asc: number; desc: number }>;
    for (const k of KEYS) {
      const f = fontkit.create(bytes[k]) as any;
      metrics[k] = { asc: f.hhea.ascent / f.unitsPerEm, desc: -f.hhea.descent / f.unitsPerEm };
    }
    const doc = await PDFDocument.create();
    return new Typesetter(bytes, metrics, await Typesetter.embed(doc, bytes, metrics));
  }

  private static async embed(doc: PDFDocument, bytes: Record<FontKey, Uint8Array>, metrics: Record<FontKey, { asc: number; desc: number }>) {
    doc.registerFontkit(fontkit);
    const out = {} as Fonts;
    for (const k of KEYS) {
      const m = metrics[k];
      const pdf = await doc.embedFont(bytes[k], EMBED);
      const cache = new Map<string, number>();
      const unit = (w: string) => {
        let v = cache.get(w);
        if (v === undefined) cache.set(w, (v = pdf.widthOfTextAtSize(w, 1)));
        return v;
      };
      out[k] = {
        pdf,
        width: (str, size) => {
          let total = 0;
          for (const part of str.split(/( )/)) if (part) total += unit(part);
          return total * size;
        },
        /* Where a browser puts the baseline in a line box: half the leftover
           leading above the ascent. The SVG preview relies on it too. */
        baseline: (size, box) => (box - (m.asc + m.desc) * size) / 2 + m.asc * size,
      };
    }
    return out;
  }

  plan(page: PageSection[], scale = 1): Plan {
    return layout(page, this.measure, scale);
  }

  /** The page as PDF bytes. Shrinks a step at a time rather than spill onto page two. */
  async pdf(page: PageSection[], from = 1): Promise<Uint8Array> {
    for (let attempt = 0, scale = from; attempt < 8; attempt++, scale *= 0.96) {
      if (layout(page, this.measure, scale).height > PAGE.h - 2 * PAGE.margin) continue;
      const doc = await PDFDocument.create();
      const fonts = await Typesetter.embed(doc, this.bytes, this.metrics);
      const plan = layout(page, fonts, scale);
      const pdfPage = doc.addPage([plan.pageW, plan.pageH]);
      const toY = (y: number) => plan.pageH - plan.top - y;
      const black = rgb(0, 0, 0);
      for (const c of plan.commands) {
        if (c.kind === 'text' && c.rise) drawRaised(pdfPage, c.str, fonts[c.font].pdf, c.size, c.x, toY(c.y), c.rise);
        else if (c.kind === 'text') pdfPage.drawText(c.str, { x: c.x, y: toY(c.y), size: c.size, font: fonts[c.font].pdf, color: black });
        else if (c.kind === 'rule') pdfPage.drawLine({ start: { x: c.x1, y: toY(c.y) }, end: { x: c.x2, y: toY(c.y) }, thickness: c.thickness, color: black });
        else pdfPage.drawSvgPath(c.qr.path, { x: c.x, y: toY(c.y), scale: c.w / c.qr.size, color: black, borderWidth: 0 });
        const link = c.kind === 'badge' ? { href: c.href, box: c } : c.kind === 'text' && c.href && c.linkBox ? { href: c.href, box: c.linkBox } : null;
        if (link) addLink(doc, pdfPage, link.href, link.box, toY);
      }
      doc.setTitle(`${meta.name} Resume`);
      doc.setAuthor(meta.name);
      doc.setCreator('gmango.dev');
      doc.setProducer('gmango.dev');
      return doc.save();
    }
    throw new Error('the resume does not fit on one page');
  }
}

/** Text lifted `rise` points with the PDF Ts operator, on the line's own baseline. */
function drawRaised(page: PDFPage, str: string, font: PDFFont, size: number, x: number, y: number, rise: number) {
  const key = page.node.newFontDictionary(font.name, font.ref);
  page.pushOperators(
    pushGraphicsState(), beginText(), setFontAndSize(key, size), setTextRise(rise),
    moveText(x, y), showText(font.encodeText(str)), endText(), popGraphicsState(),
  );
}

function addLink(doc: PDFDocument, page: PDFPage, href: string, box: Box, toY: (y: number) => number) {
  const annot = doc.context.obj({
    Type: 'Annot', Subtype: 'Link',
    Rect: [box.x, toY(box.y + box.h), box.x + box.w, toY(box.y)],
    Border: [0, 0, 0],
    A: { Type: 'Action', S: 'URI', URI: PDFString.of(href) },
  });
  page.node.addAnnot(doc.context.register(annot));
}
