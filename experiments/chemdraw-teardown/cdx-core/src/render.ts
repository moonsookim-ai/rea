// SVG depiction with ChemDraw's "ACS Document 1996" style settings:
// bond length 14.4 pt, line width 0.6 pt, bold (wedge) width 2 pt,
// hash spacing 2.5 pt, margin width 1.6 pt, bond spacing 18 % of length,
// Arial 10 pt labels. All sizes scale with the drawing's own bond length.

import {
  BOND_LENGTH,
  bondsOf,
  implicitHydrogens,
  kekulize,
  neighborOf,
  rings,
  type Atom,
  type Bond,
  type Scene,
} from "./chem.ts";

export interface Style {
  bondLength: number;
  lineWidth: number;
  boldWidth: number;
  hashSpacing: number;
  marginWidth: number;
  bondSpacing: number; // fraction of bond length
  fontSize: number;
  fontFamily: string;
  color: string;
  heteroColors: boolean;
}

export const ACS_1996: Style = {
  bondLength: BOND_LENGTH,
  lineWidth: 0.6,
  boldWidth: 2,
  hashSpacing: 2.5,
  marginWidth: 1.6,
  bondSpacing: 0.18,
  fontSize: 10,
  fontFamily: "Arial, Helvetica, sans-serif",
  color: "#000",
  heteroColors: false,
};

const HETERO: Record<string, string> = {
  N: "#2f4fd8",
  O: "#d62828",
  S: "#b08900",
  P: "#d97706",
  F: "#15803d",
  Cl: "#15803d",
  Br: "#9a3412",
  I: "#7e22ce",
};

const f = (n: number): string => (Math.round(n * 100) / 100).toString();
const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export interface RenderOptions {
  style?: Partial<Style>;
  /** Highlight these atom ids (selection, warnings). */
  highlight?: ReadonlySet<number>;
  /** Extra padding around the content, in points. */
  padding?: number;
  /** Emit data-id attributes for hit testing in the editor. */
  interactive?: boolean;
  /** Fixed viewBox instead of fitting the content. */
  viewBox?: { x: number; y: number; w: number; h: number };
}

/** Median bond length of the drawing, so ACS proportions scale with it. */
function drawingScale(scene: Scene): number {
  const lengths = scene.bonds
    .map((b) => {
      const a = scene.atoms.find((x) => x.id === b.a);
      const c = scene.atoms.find((x) => x.id === b.b);
      return a && c ? Math.hypot(a.x - c.x, a.y - c.y) : 0;
    })
    .filter((l) => l > 0)
    .sort((x, y) => x - y);
  const median = lengths[Math.floor(lengths.length / 2)];
  return median === undefined ? 1 : median / BOND_LENGTH;
}

function showLabel(scene: Scene, atom: Atom): boolean {
  return (
    atom.el !== "C" ||
    atom.charge !== 0 ||
    atom.isotope !== 0 ||
    bondsOf(scene, atom.id).length === 0
  );
}

interface LabelBox {
  /** `lead` marks text placed before the element symbol. */
  text: Array<{ s: string; sub?: boolean; sup?: boolean; lead?: boolean }>;
  /** Half-extent of the clear area around the atom for bond trimming. */
  radius: number;
}

function labelFor(scene: Scene, atom: Atom, st: Style): LabelBox | null {
  if (!showLabel(scene, atom)) return null;
  const h = atom.pseudo ? 0 : implicitHydrogens(scene, atom);
  const parts: LabelBox["text"] = [];
  // Put hydrogens on the side away from the bonds (ChemDraw: "HO", "OH").
  const dx = bondsOf(scene, atom.id).reduce((acc, b) => {
    const n = scene.atoms.find((x) => x.id === neighborOf(b, atom.id));
    return acc + (n === undefined ? 0 : n.x - atom.x);
  }, 0);
  const hFirst = h > 0 && dx > 0.01;
  if (hFirst) {
    parts.push({ s: "H", lead: true });
    if (h > 1) parts.push({ s: String(h), sub: true, lead: true });
  }
  if (atom.isotope > 0)
    parts.push({ s: String(atom.isotope), sup: true, lead: true });
  parts.push({ s: atom.el });
  if (h > 0 && !hFirst) {
    parts.push({ s: "H" });
    if (h > 1) parts.push({ s: String(h), sub: true });
  }
  if (atom.charge !== 0) {
    const n = Math.abs(atom.charge);
    parts.push({
      s: `${n > 1 ? n : ""}${atom.charge > 0 ? "+" : "−"}`,
      sup: true,
    });
  }
  return { text: parts, radius: st.fontSize * 0.45 + st.marginWidth };
}

/** Which side of a ring bond the ring lies on (+1 left of a->b, -1 right, 0 none). */
function ringSide(
  scene: Scene,
  bond: Bond,
  ringSets: number[][],
  pos: Map<number, Atom>,
): number {
  const a = pos.get(bond.a);
  const b = pos.get(bond.b);
  if (a === undefined || b === undefined) return 0;
  let best = 0;
  let bestSize = 99;
  for (const ring of ringSets) {
    if (
      !ring.includes(bond.a) ||
      !ring.includes(bond.b) ||
      ring.length >= bestSize
    )
      continue;
    const cx =
      ring.reduce((s, id) => s + (pos.get(id)?.x ?? 0), 0) / ring.length;
    const cy =
      ring.reduce((s, id) => s + (pos.get(id)?.y ?? 0), 0) / ring.length;
    const cross = (b.x - a.x) * (cy - a.y) - (b.y - a.y) * (cx - a.x);
    best = cross > 0 ? 1 : -1;
    bestSize = ring.length;
  }
  if (best !== 0) return best;
  // acyclic: put the second line on the side with more substituents
  let score = 0;
  for (const end of [bond.a, bond.b]) {
    for (const nb of bondsOf(scene, end)) {
      if (nb === bond) continue;
      const p = pos.get(neighborOf(nb, end));
      if (p === undefined) continue;
      score += Math.sign((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x));
    }
  }
  return Math.sign(score);
}

export function renderSvg(input: Scene, options: RenderOptions = {}): string {
  // ChemDraw draws aromatic rings as Kekulé structures
  const scene = kekulize(input);
  const k = drawingScale(scene);
  const base = { ...ACS_1996, ...options.style };
  const st: Style = {
    ...base,
    lineWidth: base.lineWidth * k,
    boldWidth: base.boldWidth * k,
    hashSpacing: base.hashSpacing * k,
    marginWidth: base.marginWidth * k,
    // ChemDraw keeps label size independent of bond length (old 30 pt
    // documents still use 10 pt labels), so only shrink for tiny drawings.
    fontSize: base.fontSize * Math.min(k, 1),
  };
  const pos = new Map(scene.atoms.map((a) => [a.id, a]));
  const labels = new Map(
    scene.atoms.map((a) => [a.id, labelFor(scene, a, st)]),
  );
  const ringSets = rings(scene);
  const out: string[] = [];
  const stroke = `stroke="${st.color}" stroke-width="${f(st.lineWidth)}" stroke-linecap="round"`;
  const attr = (kind: string, id: number): string =>
    options.interactive ? ` data-${kind}="${id}"` : "";

  const width = (t: { s: string; sub?: boolean; sup?: boolean }): number =>
    t.s.length * st.fontSize * (t.sub === true || t.sup === true ? 0.42 : 0.62);
  /** Label box relative to the atom: [left, right], half height. */
  const box = (lb: LabelBox): { l: number; r: number; h: number } => {
    const lead = lb.text
      .filter((t) => t.lead === true)
      .reduce((acc, t) => acc + width(t), 0);
    const all = lb.text.reduce((acc, t) => acc + width(t), 0);
    const sym = width(
      lb.text.find(
        (t) => t.lead !== true && t.sub !== true && t.sup !== true,
      ) ?? { s: "C" },
    );
    return {
      l: -sym / 2 - lead,
      r: all - lead - sym / 2,
      h: st.fontSize * 0.5,
    };
  };
  const trim = (from: Atom, to: Atom): { x: number; y: number } => {
    const lb = labels.get(from.id);
    if (lb === null || lb === undefined) return { x: from.x, y: from.y };
    const bx = box(lb);
    const m = st.marginWidth;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const d = Math.hypot(dx, dy) || 1;
    // distance along the bond to leave the (margin-grown) label rectangle
    const tx = dx > 0 ? (bx.r + m) / dx : dx < 0 ? (bx.l - m) / dx : Infinity;
    const ty = dy !== 0 ? (bx.h + m) / Math.abs(dy) : Infinity;
    const t = Math.min(Math.min(tx, ty), 0.45);
    return { x: from.x + dx * t, y: from.y + dy * t, ...(d === 0 ? {} : {}) };
  };

  for (const bond of scene.bonds) {
    const A = pos.get(bond.a);
    const B = pos.get(bond.b);
    if (A === undefined || B === undefined) continue;
    const p = trim(A, B);
    const q = trim(B, A);
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const nx = -(q.y - p.y) / len;
    const ny = (q.x - p.x) / len;
    const gap = st.bondSpacing * Math.hypot(B.x - A.x, B.y - A.y);
    const g: string[] = [];
    const line = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      extra = "",
    ): void => {
      g.push(
        `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" ${stroke}${extra}/>`,
      );
    };
    if (bond.stereo === "wedge") {
      const w = st.boldWidth * 1.5;
      g.push(
        `<polygon points="${f(p.x)},${f(p.y)} ${f(q.x + nx * w)},${f(q.y + ny * w)} ${f(q.x - nx * w)},${f(q.y - ny * w)}" fill="${st.color}"/>`,
      );
    } else if (bond.stereo === "hash") {
      const n = Math.max(3, Math.floor(len / st.hashSpacing));
      for (let i = 1; i <= n; i += 1) {
        const t = i / n;
        const w = st.boldWidth * 1.5 * t;
        const cx = p.x + (q.x - p.x) * t;
        const cy = p.y + (q.y - p.y) * t;
        line(cx + nx * w, cy + ny * w, cx - nx * w, cy - ny * w);
      }
    } else if (bond.stereo === "wavy") {
      const n = Math.max(4, Math.round(len / (st.hashSpacing * 1.6)));
      let d = `M${f(p.x)},${f(p.y)}`;
      for (let i = 1; i <= n; i += 1) {
        const t = i / n;
        const s = i % 2 === 0 ? 1 : -1;
        const cx = p.x + (q.x - p.x) * (t - 0.5 / n) + nx * s * st.boldWidth;
        const cy = p.y + (q.y - p.y) * (t - 0.5 / n) + ny * s * st.boldWidth;
        d += ` Q${f(cx)},${f(cy)} ${f(p.x + (q.x - p.x) * t)},${f(p.y + (q.y - p.y) * t)}`;
      }
      g.push(`<path d="${d}" fill="none" ${stroke}/>`);
    } else if (bond.order === 1) {
      line(p.x, p.y, q.x, q.y);
    } else if (bond.order === 3) {
      line(p.x, p.y, q.x, q.y);
      line(p.x + nx * gap, p.y + ny * gap, q.x + nx * gap, q.y + ny * gap);
      line(p.x - nx * gap, p.y - ny * gap, q.x - nx * gap, q.y - ny * gap);
    } else {
      const side = ringSide(scene, bond, ringSets, pos);
      const dashed =
        bond.order === 1.5
          ? ` stroke-dasharray="${f(st.lineWidth * 3)},${f(st.lineWidth * 3)}"`
          : "";
      if (side === 0) {
        line(
          p.x + (nx * gap) / 2,
          p.y + (ny * gap) / 2,
          q.x + (nx * gap) / 2,
          q.y + (ny * gap) / 2,
        );
        line(
          p.x - (nx * gap) / 2,
          p.y - (ny * gap) / 2,
          q.x - (nx * gap) / 2,
          q.y - (ny * gap) / 2,
          dashed,
        );
      } else {
        // main line on the bond, inner line shortened toward the ring
        line(p.x, p.y, q.x, q.y);
        const sx = nx * side * gap;
        const sy = ny * side * gap;
        const shrink = 0.12;
        const ax = p.x + (q.x - p.x) * shrink + sx;
        const ay = p.y + (q.y - p.y) * shrink + sy;
        const bx = q.x - (q.x - p.x) * shrink + sx;
        const by = q.y - (q.y - p.y) * shrink + sy;
        line(ax, ay, bx, by, dashed);
      }
    }
    out.push(`<g${attr("bond", bond.id)} class="bond">${g.join("")}</g>`);
  }

  for (const atom of scene.atoms) {
    const lb = labels.get(atom.id);
    const hl = options.highlight?.has(atom.id) === true;
    if (hl) {
      out.push(
        `<circle cx="${f(atom.x)}" cy="${f(atom.y)}" r="${f(st.fontSize * 0.7)}" fill="#3b82f6" fill-opacity="0.25"/>`,
      );
    }
    if (lb === null || lb === undefined) {
      if (options.interactive) {
        out.push(
          `<circle${attr("atom", atom.id)} cx="${f(atom.x)}" cy="${f(atom.y)}" r="${f(st.fontSize * 0.45)}" fill="transparent"/>`,
        );
      }
      continue;
    }
    const color = st.heteroColors ? (HETERO[atom.el] ?? st.color) : st.color;
    const tspans = lb.text
      .map((t) => {
        if (t.sub)
          return `<tspan dy="${f(st.fontSize * 0.25)}" font-size="${f(st.fontSize * 0.7)}">${esc(t.s)}</tspan><tspan dy="${f(-st.fontSize * 0.25)}">​</tspan>`;
        if (t.sup)
          return `<tspan dy="${f(-st.fontSize * 0.4)}" font-size="${f(st.fontSize * 0.7)}">${esc(t.s)}</tspan><tspan dy="${f(st.fontSize * 0.4)}">​</tspan>`;
        return `<tspan>${esc(t.s)}</tspan>`;
      })
      .join("");
    // centre the element symbol on the atom; leading text (H, isotope) goes left of it
    const lead = lb.text
      .filter((t) => t.lead === true)
      .reduce((acc, t) => acc + width(t), 0);
    const symW = width(
      lb.text.find(
        (t) => t.lead !== true && t.sub !== true && t.sup !== true,
      ) ?? { s: "C" },
    );
    out.push(
      `<text${attr("atom", atom.id)} x="${f(atom.x - lead - symW / 2)}" y="${f(atom.y + st.fontSize * 0.35)}" font-family="${st.fontFamily}" font-size="${f(st.fontSize)}" fill="${color}">${tspans}</text>`,
    );
  }

  for (const arrow of scene.arrows) {
    const len = Math.hypot(arrow.x2 - arrow.x1, arrow.y2 - arrow.y1) || 1;
    const ux = (arrow.x2 - arrow.x1) / len;
    const uy = (arrow.y2 - arrow.y1) / len;
    const hl = st.fontSize * 0.9;
    const hw = st.fontSize * 0.35;
    const bx = arrow.x2 - ux * hl;
    const by = arrow.y2 - uy * hl;
    out.push(
      `<g${attr("arrow", arrow.id)}><line x1="${f(arrow.x1)}" y1="${f(arrow.y1)}" x2="${f(bx)}" y2="${f(by)}" ${stroke}/><polygon points="${f(arrow.x2)},${f(arrow.y2)} ${f(bx - uy * hw)},${f(by + ux * hw)} ${f(bx + uy * hw)},${f(by - ux * hw)}" fill="${st.color}"/></g>`,
    );
  }
  for (const label of scene.labels) {
    const lines = label.text.split(/\r?\n/);
    out.push(
      `<text${attr("label", label.id)} x="${f(label.x)}" y="${f(label.y)}" font-family="${st.fontFamily}" font-size="${f(st.fontSize)}" fill="${st.color}">${lines
        .map(
          (l, i) =>
            `<tspan x="${f(label.x)}" dy="${i === 0 ? 0 : f(st.fontSize * 1.15)}">${esc(l)}</tspan>`,
        )
        .join("")}</text>`,
    );
  }

  const xs = [
    ...scene.atoms.map((a) => a.x),
    ...scene.arrows.flatMap((a) => [a.x1, a.x2]),
    ...scene.labels.map((l) => l.x),
  ];
  const ys = [
    ...scene.atoms.map((a) => a.y),
    ...scene.arrows.flatMap((a) => [a.y1, a.y2]),
    ...scene.labels.map((l) => l.y),
  ];
  const pad = (options.padding ?? 6) * k + st.fontSize * 1.6;
  const vb =
    options.viewBox ??
    (xs.length === 0
      ? { x: 0, y: 0, w: 200, h: 120 }
      : {
          x: Math.min(...xs) - pad,
          y: Math.min(...ys) - pad,
          w: Math.max(...xs) - Math.min(...xs) + 2 * pad,
          h: Math.max(...ys) - Math.min(...ys) + 2 * pad,
        });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(vb.x)} ${f(vb.y)} ${f(vb.w)} ${f(vb.h)}" width="${f(vb.w)}pt" height="${f(vb.h)}pt">${out.join("")}</svg>`;
}
