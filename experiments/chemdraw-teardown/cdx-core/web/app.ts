// CDX Bench — browser editor built on cdx-core (P1–P5 MVP).
// Bundled into a single HTML page by scripts/build-web.ts.

import {
  readCdx,
  unwrapCdx,
  writeCdx,
  type CdxDocument,
} from "../src/binary.ts";
import {
  enumerateRGroups,
  parseHelm,
  peptideWeight,
  renderHelmSvg,
} from "../src/bio.ts";
import { toBase64 } from "../src/bytes.ts";
import { fromCdxml, toCdxml } from "../src/cdxml.ts";
import {
  analyze,
  BOND_LENGTH,
  bondsOf,
  elementBySymbol,
  emptyScene,
  implicitHydrogens,
  layout,
  neighborOf,
  nextId,
  parseMolfile,
  parseSmiles,
  sceneFromCdx,
  sceneToCdx,
  toMolfile,
  toSmiles,
  valenceWarnings,
  type Atom,
  type Bond,
  type Scene,
  type Stereo,
} from "../src/chem.ts";
import {
  buildZip,
  extractChemDrawObjects,
  type EmbeddedDrawing,
} from "../src/office.ts";
import { renderSvg } from "../src/render.ts";

// ---- state ------------------------------------------------------------------

type Tool =
  | { kind: "select" }
  | { kind: "erase" }
  | { kind: "bond"; order: number; stereo: Stereo }
  | { kind: "ring"; size: number; aromatic: boolean }
  | { kind: "element"; el: string }
  | { kind: "charge"; delta: number }
  | { kind: "arrow" }
  | { kind: "text" };

type Hit = { kind: "atom" | "bond" | "arrow" | "label"; id: number } | null;

interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

const S = {
  scene: emptyScene(),
  past: [] as string[],
  future: [] as string[],
  tool: { kind: "bond", order: 1, stereo: "none" } as Tool,
  hover: null as Hit,
  selection: new Set<number>(),
  view: { x: 0, y: 0, w: 400, h: 300 } as View,
  /** Original document while the drawing is unchanged since opening (lossless export). */
  source: null as null | { doc: CdxDocument; name: string },
  tab: "analysis",
  preview: null as null | { x1: number; y1: number; x2: number; y2: number },
  marquee: null as null | View,
};

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`#${id} missing`);
  return el as T;
};
const stage = $<HTMLElement>("stage");
const pane = $<HTMLElement>("pane");

const bondLength = (): number => {
  const ls = S.scene.bonds
    .map((b) => {
      const a = atom(b.a);
      const c = atom(b.b);
      return a && c ? Math.hypot(a.x - c.x, a.y - c.y) : 0;
    })
    .filter((l) => l > 0)
    .sort((x, y) => x - y);
  return ls[Math.floor(ls.length / 2)] ?? BOND_LENGTH;
};
const atom = (id: number): Atom | undefined =>
  S.scene.atoms.find((a) => a.id === id);
const snapshot = (): string => JSON.stringify(S.scene);

function commit(mutate: () => void): void {
  S.past.push(snapshot());
  if (S.past.length > 200) S.past.shift();
  S.future = [];
  mutate();
  S.source = null;
  render();
}
function undo(): void {
  const prev = S.past.pop();
  if (prev === undefined) return;
  S.future.push(snapshot());
  S.scene = JSON.parse(prev) as Scene;
  S.selection.clear();
  render();
}
function redo(): void {
  const next = S.future.pop();
  if (next === undefined) return;
  S.past.push(snapshot());
  S.scene = JSON.parse(next) as Scene;
  render();
}

// ---- geometry helpers -------------------------------------------------------

function toScene(ev: { clientX: number; clientY: number }): {
  x: number;
  y: number;
} {
  const svg = stage.querySelector("svg.doc") as SVGSVGElement | null;
  const ctm = svg?.getScreenCTM();
  if (svg === null || ctm === null || ctm === undefined) return { x: 0, y: 0 };
  const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}
/** Scene units per screen pixel. */
function unit(): number {
  const r = stage.getBoundingClientRect();
  return Math.max(
    S.view.w / Math.max(r.width, 1),
    S.view.h / Math.max(r.height, 1),
  );
}

function segDist(p: { x: number; y: number }, a: Atom, b: Atom): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function hitTest(p: { x: number; y: number }): Hit {
  const tol = 9 * unit();
  let best: Hit = null;
  let bestD = tol;
  for (const a of S.scene.atoms) {
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = { kind: "atom", id: a.id };
    }
  }
  if (best !== null) return best;
  bestD = tol * 0.7;
  for (const b of S.scene.bonds) {
    const a = atom(b.a);
    const c = atom(b.b);
    if (!a || !c) continue;
    const d = segDist(p, a, c);
    if (d < bestD) {
      bestD = d;
      best = { kind: "bond", id: b.id };
    }
  }
  if (best !== null) return best;
  for (const ar of S.scene.arrows) {
    const d = segDist(
      p,
      { x: ar.x1, y: ar.y1 } as Atom,
      { x: ar.x2, y: ar.y2 } as Atom,
    );
    if (d < tol) return { kind: "arrow", id: ar.id };
  }
  for (const l of S.scene.labels) {
    if (
      p.x > l.x - 2 &&
      p.x < l.x + l.text.length * 6 &&
      p.y > l.y - 11 &&
      p.y < l.y + 4
    )
      return { kind: "label", id: l.id };
  }
  return null;
}

/** Direction for a new bond from `a`: free side, zig-zag aware. */
function freeAngle(a: Atom): number {
  const nbs = bondsOf(S.scene, a.id)
    .map((b) => atom(neighborOf(b, a.id)))
    .filter((x): x is Atom => x !== undefined);
  if (nbs.length === 0) return -Math.PI / 6;
  const angles = nbs.map((n) => Math.atan2(n.y - a.y, n.x - a.x));
  if (nbs.length === 1) {
    const back = angles[0] ?? 0;
    const L = bondLength();
    const options = [back + (2 * Math.PI) / 3, back - (2 * Math.PI) / 3];
    const crowd = (ang: number): number => {
      const x = a.x + L * Math.cos(ang);
      const y = a.y + L * Math.sin(ang);
      return Math.min(
        ...S.scene.atoms
          .filter((o) => o.id !== a.id)
          .map((o) => Math.hypot(o.x - x, o.y - y)),
        1e9,
      );
    };
    return (
      (crowd(options[0] ?? 0) >= crowd(options[1] ?? 0)
        ? options[0]
        : options[1]) ?? 0
    );
  }
  const sorted = angles
    .map((x) => (x + 2 * Math.PI) % (2 * Math.PI))
    .sort((x, y) => x - y);
  let best = 0;
  let size = -1;
  sorted.forEach((x, i) => {
    const next =
      i + 1 < sorted.length
        ? (sorted[i + 1] ?? 0)
        : (sorted[0] ?? 0) + 2 * Math.PI;
    if (next - x > size) {
      size = next - x;
      best = x + size / 2;
    }
  });
  return best;
}

function atomNear(x: number, y: number, except?: number): Atom | undefined {
  const tol = Math.max(3, 6 * unit());
  return S.scene.atoms.find(
    (a) => a.id !== except && Math.hypot(a.x - x, a.y - y) < tol,
  );
}

function addAtom(x: number, y: number, el = "C"): Atom {
  const a: Atom = {
    id: nextId(S.scene),
    el,
    x,
    y,
    charge: 0,
    isotope: 0,
    hCount: null,
    pseudo: !elementBySymbol(el),
  };
  S.scene.atoms.push(a);
  return a;
}
function addBond(
  a: number,
  b: number,
  order = 1,
  stereo: Stereo = "none",
): Bond | undefined {
  if (a === b) return undefined;
  const existing = S.scene.bonds.find(
    (x) => (x.a === a && x.b === b) || (x.a === b && x.b === a),
  );
  if (existing) return existing;
  const bond: Bond = { id: nextId(S.scene), a, b, order, stereo };
  S.scene.bonds.push(bond);
  return bond;
}

function growFrom(a: Atom, order: number, stereo: Stereo): void {
  const L = bondLength();
  const ang = freeAngle(a);
  const x = a.x + L * Math.cos(ang);
  const y = a.y + L * Math.sin(ang);
  const target = atomNear(x, y, a.id) ?? addAtom(x, y);
  addBond(a.id, target.id, order, stereo);
}

function placeRing(
  size: number,
  aromatic: boolean,
  at: { x: number; y: number },
  hit: Hit,
): void {
  const L = bondLength();
  const R = L / (2 * Math.sin(Math.PI / size));
  let center = at;
  let start = -Math.PI / 2 + (size % 2 === 0 ? Math.PI / size : 0);
  let anchors: number[] = [];
  if (hit?.kind === "bond") {
    const b = S.scene.bonds.find((x) => x.id === hit.id);
    const p = b && atom(b.a);
    const q = b && atom(b.b);
    if (b && p && q) {
      const mx = (p.x + q.x) / 2;
      const my = (p.y + q.y) / 2;
      let nx = -(q.y - p.y);
      let ny = q.x - p.x;
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl;
      ny /= nl;
      // put the new ring on the emptier side
      const side = (sx: number, sy: number): number =>
        S.scene.atoms.filter((o) => (o.x - mx) * sx + (o.y - my) * sy > 1)
          .length;
      if (side(nx, ny) > side(-nx, -ny)) {
        nx = -nx;
        ny = -ny;
      }
      const ap = R * Math.cos(Math.PI / size);
      center = { x: mx + nx * ap, y: my + ny * ap };
      start = Math.atan2(p.y - center.y, p.x - center.x);
      const dirToQ = Math.atan2(q.y - center.y, q.x - center.x) - start;
      const step = (2 * Math.PI) / size;
      const sign = Math.sin(dirToQ) > 0 ? 1 : -1;
      anchors = [p.id, q.id];
      const ids: number[] = [p.id, q.id];
      for (let k = 2; k < size; k += 1) {
        const ang = start + sign * step * k;
        const x = center.x + R * Math.cos(ang);
        const y = center.y + R * Math.sin(ang);
        ids.push((atomNear(x, y) ?? addAtom(x, y)).id);
      }
      ringBonds(ids, aromatic, anchors);
      return;
    }
  }
  if (hit?.kind === "atom") {
    const a = atom(hit.id);
    if (a) {
      const ang = freeAngle(a);
      center = { x: a.x + R * Math.cos(ang), y: a.y + R * Math.sin(ang) };
      start = ang + Math.PI;
    }
  }
  const ids: number[] = [];
  for (let k = 0; k < size; k += 1) {
    const ang = start + (2 * Math.PI * k) / size;
    const x = center.x + R * Math.cos(ang);
    const y = center.y + R * Math.sin(ang);
    ids.push((atomNear(x, y) ?? addAtom(x, y)).id);
  }
  ringBonds(ids, aromatic, anchors);
}

function ringBonds(ids: number[], aromatic: boolean, keep: number[]): void {
  const hasDouble = (id: number): boolean =>
    bondsOf(S.scene, id).some((b) => b.order === 2);
  for (let k = 0; k < ids.length; k += 1) {
    const a = ids[k] ?? 0;
    const b = ids[(k + 1) % ids.length] ?? 0;
    if (keep.includes(a) && keep.includes(b)) continue;
    const order = aromatic && !hasDouble(a) && !hasDouble(b) ? 2 : 1;
    addBond(a, b, order);
  }
}

function removeAtom(id: number): void {
  S.scene.atoms = S.scene.atoms.filter((a) => a.id !== id);
  S.scene.bonds = S.scene.bonds.filter((b) => b.a !== id && b.b !== id);
  S.selection.delete(id);
}
function removeHit(hit: Hit): void {
  if (hit === null) return;
  if (hit.kind === "atom") removeAtom(hit.id);
  if (hit.kind === "bond")
    S.scene.bonds = S.scene.bonds.filter((b) => b.id !== hit.id);
  if (hit.kind === "arrow")
    S.scene.arrows = S.scene.arrows.filter((b) => b.id !== hit.id);
  if (hit.kind === "label")
    S.scene.labels = S.scene.labels.filter((b) => b.id !== hit.id);
  // drop carbons left without bonds by a bond deletion? keep: ChemDraw keeps them
}

function setElement(a: Atom, el: string): void {
  if (el === "R") {
    const used = S.scene.atoms
      .map((x) => /^R(\d+)$/.exec(x.el)?.[1])
      .filter(Boolean)
      .map(Number);
    a.el = `R${Math.max(0, ...used) + 1}`;
    a.pseudo = true;
  } else {
    a.el = el;
    a.pseudo = !elementBySymbol(el);
  }
  a.hCount = null;
}

// ---- pointer interaction -------------------------------------------------------

let drag:
  | null
  | {
      mode: "move";
      ids: number[];
      last: { x: number; y: number };
      moved: boolean;
    }
  | {
      mode: "bond";
      from: number;
      start: { x: number; y: number };
      moved: boolean;
    }
  | { mode: "arrow"; start: { x: number; y: number } }
  | { mode: "pan"; last: { x: number; y: number } }
  | { mode: "marquee"; start: { x: number; y: number } } = null;

stage.addEventListener("pointerdown", (ev) => {
  if ((ev.target as HTMLElement).closest("button, input")) return;
  stage.setPointerCapture(ev.pointerId);
  const p = toScene(ev);
  const hit = hitTest(p);
  const t = S.tool;
  if (ev.button === 1 || (ev.button === 0 && spaceDown)) {
    drag = { mode: "pan", last: { x: ev.clientX, y: ev.clientY } };
    return;
  }
  if (t.kind === "select") {
    if (hit?.kind === "atom") {
      if (!S.selection.has(hit.id) && !ev.shiftKey) S.selection.clear();
      S.selection.add(hit.id);
      S.past.push(snapshot());
      drag = { mode: "move", ids: [...S.selection], last: p, moved: false };
    } else if (hit?.kind === "bond") {
      const b = S.scene.bonds.find((x) => x.id === hit.id);
      if (b) {
        if (!ev.shiftKey) S.selection.clear();
        S.selection.add(b.a);
        S.selection.add(b.b);
        S.past.push(snapshot());
        drag = { mode: "move", ids: [...S.selection], last: p, moved: false };
      }
    } else {
      if (!ev.shiftKey) S.selection.clear();
      drag = { mode: "marquee", start: p };
    }
    render();
    return;
  }
  if (t.kind === "bond" && hit?.kind === "atom") {
    drag = { mode: "bond", from: hit.id, start: p, moved: false };
    return;
  }
  if (t.kind === "arrow") {
    drag = { mode: "arrow", start: p };
    return;
  }
  click(p, hit);
});

stage.addEventListener("pointermove", (ev) => {
  const p = toScene(ev);
  $("where").textContent =
    `x ${p.x.toFixed(1)}  y ${p.y.toFixed(1)} pt · ${Math.round((bondLength() / BOND_LENGTH) * 100)}% bond`;
  if (drag === null) {
    const hit = hitTest(p);
    if (JSON.stringify(hit) !== JSON.stringify(S.hover)) {
      S.hover = hit;
      render(false);
    }
    return;
  }
  if (drag.mode === "pan") {
    const u = unit();
    S.view.x -= (ev.clientX - drag.last.x) * u;
    S.view.y -= (ev.clientY - drag.last.y) * u;
    drag.last = { x: ev.clientX, y: ev.clientY };
    render(false);
  } else if (drag.mode === "move") {
    const dx = p.x - drag.last.x;
    const dy = p.y - drag.last.y;
    for (const id of drag.ids) {
      const a = atom(id);
      if (a) {
        a.x += dx;
        a.y += dy;
      }
    }
    drag.last = p;
    drag.moved = true;
    render(false);
  } else if (drag.mode === "bond") {
    const from = atom(drag.from);
    if (!from) return;
    if (Math.hypot(p.x - drag.start.x, p.y - drag.start.y) < 4 * unit()) return;
    drag.moved = true;
    const L = bondLength();
    const snap = atomNear(p.x, p.y, from.id);
    let x2: number;
    let y2: number;
    if (snap) {
      x2 = snap.x;
      y2 = snap.y;
    } else {
      const ang =
        Math.round(Math.atan2(p.y - from.y, p.x - from.x) / (Math.PI / 12)) *
        (Math.PI / 12);
      x2 = from.x + L * Math.cos(ang);
      y2 = from.y + L * Math.sin(ang);
    }
    S.preview = { x1: from.x, y1: from.y, x2, y2 };
    render(false);
  } else if (drag.mode === "arrow") {
    S.preview = { x1: drag.start.x, y1: drag.start.y, x2: p.x, y2: p.y };
    render(false);
  } else if (drag.mode === "marquee") {
    S.marquee = {
      x: Math.min(drag.start.x, p.x),
      y: Math.min(drag.start.y, p.y),
      w: Math.abs(p.x - drag.start.x),
      h: Math.abs(p.y - drag.start.y),
    };
    render(false);
  }
});

stage.addEventListener("pointerup", (ev) => {
  const p = toScene(ev);
  const d = drag;
  drag = null;
  if (d === null) return;
  if (d.mode === "move") {
    if (d.moved) {
      S.future = [];
      S.source = null;
    } else S.past.pop();
  } else if (d.mode === "bond") {
    const t = S.tool;
    if (t.kind !== "bond") return;
    const preview = S.preview;
    S.preview = null;
    commit(() => {
      const from = atom(d.from);
      if (!from) return;
      if (!d.moved || preview === null) growFrom(from, t.order, t.stereo);
      else {
        const to =
          atomNear(preview.x2, preview.y2, from.id) ??
          addAtom(preview.x2, preview.y2);
        addBond(from.id, to.id, t.order, t.stereo);
      }
    });
  } else if (d.mode === "arrow") {
    S.preview = null;
    if (Math.hypot(p.x - d.start.x, p.y - d.start.y) > 8) {
      commit(() =>
        S.scene.arrows.push({
          id: nextId(S.scene),
          x1: d.start.x,
          y1: d.start.y,
          x2: p.x,
          y2: p.y,
        }),
      );
    } else render();
  } else if (d.mode === "marquee") {
    const m = S.marquee;
    S.marquee = null;
    if (m !== null) {
      for (const a of S.scene.atoms)
        if (a.x >= m.x && a.x <= m.x + m.w && a.y >= m.y && a.y <= m.y + m.h)
          S.selection.add(a.id);
    }
  }
  render();
});

function click(p: { x: number; y: number }, hit: Hit): void {
  const t = S.tool;
  if (t.kind === "erase") {
    if (hit !== null) commit(() => removeHit(hit));
    return;
  }
  if (t.kind === "bond") {
    commit(() => {
      if (hit?.kind === "bond") {
        const b = S.scene.bonds.find((x) => x.id === hit.id);
        if (!b) return;
        if (t.stereo !== "none") {
          if (b.stereo === t.stereo) [b.a, b.b] = [b.b, b.a];
          b.stereo = t.stereo;
          b.order = 1;
        } else if (t.order === 1) {
          b.stereo = "none";
          b.order = b.order === 1 ? 2 : b.order === 2 ? 3 : 1;
        } else {
          b.order = t.order;
          b.stereo = "none";
        }
      } else {
        const a = addAtom(p.x, p.y);
        growFrom(a, t.order, t.stereo);
      }
    });
    return;
  }
  if (t.kind === "ring") {
    commit(() => placeRing(t.size, t.aromatic, p, hit));
    return;
  }
  if (t.kind === "element") {
    commit(() => {
      if (hit?.kind === "atom") {
        const a = atom(hit.id);
        if (a) setElement(a, t.el);
      } else setElement(addAtom(p.x, p.y), t.el);
    });
    return;
  }
  if (t.kind === "charge" && hit?.kind === "atom") {
    commit(() => {
      const a = atom(hit.id);
      if (a) a.charge += t.delta;
    });
    return;
  }
  if (t.kind === "text") {
    if (hit?.kind === "label") editLabel(hit.id);
    else newLabel(p);
  }
}

function newLabel(p: { x: number; y: number }): void {
  const input = document.createElement("input");
  input.className = "inline-text";
  input.id = "inline-text";
  const svg = stage.querySelector("svg.doc") as SVGSVGElement;
  const ctm = svg.getScreenCTM();
  const r = stage.getBoundingClientRect();
  if (ctm) {
    const q = new DOMPoint(p.x, p.y).matrixTransform(ctm);
    input.style.left = `${q.x - r.left}px`;
    input.style.top = `${q.y - r.top - 14}px`;
  }
  stage.append(input);
  input.focus();
  const done = (keep: boolean): void => {
    const text = input.value.trim();
    input.remove();
    if (keep && text !== "")
      commit(() =>
        S.scene.labels.push({ id: nextId(S.scene), x: p.x, y: p.y, text }),
      );
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") done(true);
    if (e.key === "Escape") done(false);
    e.stopPropagation();
  });
  input.addEventListener("blur", () => done(true));
}
function editLabel(id: number): void {
  const l = S.scene.labels.find((x) => x.id === id);
  if (!l) return;
  commit(() => {
    S.scene.labels = S.scene.labels.filter((x) => x.id !== id);
  });
  newLabel({ x: l.x, y: l.y });
  const input = document.getElementById(
    "inline-text",
  ) as HTMLInputElement | null;
  if (input) input.value = l.text;
}

stage.addEventListener(
  "wheel",
  (ev) => {
    ev.preventDefault();
    if (ev.ctrlKey || ev.metaKey) {
      const p = toScene(ev);
      zoom(Math.exp(ev.deltaY * 0.01), p);
    } else {
      const u = unit();
      S.view.x += ev.deltaX * u;
      S.view.y += ev.deltaY * u;
      render(false);
    }
  },
  { passive: false },
);

function zoom(f: number, about?: { x: number; y: number }): void {
  const c = about ?? { x: S.view.x + S.view.w / 2, y: S.view.y + S.view.h / 2 };
  const w = Math.min(4000, Math.max(30, S.view.w * f));
  const k = w / S.view.w;
  S.view = {
    x: c.x - (c.x - S.view.x) * k,
    y: c.y - (c.y - S.view.y) * k,
    w,
    h: S.view.h * k,
  };
  render(false);
}

function fit(): void {
  const r = stage.getBoundingClientRect();
  const aspect = Math.max(r.height, 1) / Math.max(r.width, 1);
  const xs = [
    ...S.scene.atoms.map((a) => a.x),
    ...S.scene.arrows.flatMap((a) => [a.x1, a.x2]),
    ...S.scene.labels.map((l) => l.x),
  ];
  const ys = [
    ...S.scene.atoms.map((a) => a.y),
    ...S.scene.arrows.flatMap((a) => [a.y1, a.y2]),
    ...S.scene.labels.map((l) => l.y),
  ];
  if (xs.length === 0) {
    S.view = { x: 0, y: 0, w: 400, h: 400 * aspect };
  } else {
    const pad = bondLength() * 2;
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    let w = Math.max(maxX - minX, (maxY - minY) / aspect, bondLength() * 14);
    const h = w * aspect;
    w = h / aspect;
    S.view = {
      x: (minX + maxX) / 2 - w / 2,
      y: (minY + maxY) / 2 - h / 2,
      w,
      h,
    };
  }
  render(false);
}

// ---- keyboard (ChemDraw-style hotkeys over the hovered atom/bond) ---------------

let spaceDown = false;
const HOTKEYS: Record<string, string> = {
  c: "C",
  n: "N",
  o: "O",
  s: "S",
  p: "P",
  f: "F",
  h: "H",
  i: "I",
  l: "Cl",
  b: "Br",
  r: "R",
};
window.addEventListener("keyup", (e) => {
  if (e.key === " ") spaceDown = false;
});
window.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement;
  if (target.closest("input, textarea, select")) return;
  if (e.key === " ") spaceDown = true;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
    return;
  }
  if (mod && e.key.toLowerCase() === "y") {
    e.preventDefault();
    redo();
    return;
  }
  if (mod && e.key.toLowerCase() === "a") {
    e.preventDefault();
    S.selection = new Set(S.scene.atoms.map((a) => a.id));
    setTool({ kind: "select" });
    return;
  }
  if (mod) return;
  const hv = S.hover;
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    if (S.selection.size > 0)
      commit(() => [...S.selection].forEach(removeAtom));
    else if (hv !== null) commit(() => removeHit(hv));
    return;
  }
  if (e.key === "Escape") {
    S.selection.clear();
    render();
    return;
  }
  if (hv?.kind === "atom") {
    const a = atom(hv.id);
    if (!a) return;
    const el = HOTKEYS[e.key.toLowerCase()];
    if (el !== undefined) {
      commit(() => setElement(a, el));
      return;
    }
    if (e.key === "+" || e.key === "=" || e.key === "-") {
      commit(() => (a.charge += e.key === "-" ? -1 : 1));
      return;
    }
    if (e.key === "1" || e.key === "2" || e.key === "3") {
      const order = Number(e.key);
      commit(() => growFrom(a, order, "none"));
      return;
    }
  }
  if (hv?.kind === "bond" && ["1", "2", "3"].includes(e.key)) {
    commit(() => {
      const b = S.scene.bonds.find((x) => x.id === hv.id);
      if (b) {
        b.order = Number(e.key);
        b.stereo = "none";
      }
    });
    return;
  }
  const quick: Record<string, Tool> = {
    v: { kind: "select" },
    e: { kind: "erase" },
    "6": { kind: "ring", size: 6, aromatic: true },
    "5": { kind: "ring", size: 5, aromatic: false },
    a: { kind: "arrow" },
    t: { kind: "text" },
  };
  const q = quick[e.key];
  if (q !== undefined && hv === null) setTool(q);
});

// ---- toolbar -------------------------------------------------------------------

const ICON = {
  select: '<path d="M6 3l12 9-6 1-3 6z"/>',
  erase: '<path d="M4 15l8-8 7 7-5 5H8z M10 19h10"/>',
  single: '<path d="M5 18L19 6"/>',
  double: '<path d="M4 16L16 5 M8 19L20 8"/>',
  triple: '<path d="M3 15L14 5 M6 18L17 8 M9 21L20 11"/>',
  wedge: '<path d="M5 19L19 6.5 17 4.5z" fill="currentColor"/>',
  hash: '<path d="M7 17l1.5 1.5 M10 13.5l2.6 2.6 M13 10l3.6 3.6 M16 6.5l4.6 4.6"/>',
  wavy: '<path d="M4 18c2-1 1-4 3-5s3 1 5-1 0-4 2-5 3 1 5-1"/>',
  benzene:
    '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><circle cx="12" cy="12" r="4.4"/>',
  hexane: '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/>',
  pentane: '<path d="M12 3.5l8.5 6.2-3.3 10H6.8L3.5 9.7z"/>',
  propane: '<path d="M12 5l8 13.5H4z"/>',
  arrow: '<path d="M3 12h16 M14 7l5 5-5 5"/>',
  text: '<path d="M5 6h14 M12 6v13"/>',
  plus: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>',
  minus: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8"/>',
};
const svgIcon = (d: string): string =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

const TOOLS: Array<
  | { id: string; label: string; tool: Tool; icon?: string; text?: string }
  | "sep"
> = [
  {
    id: "select",
    label: "Select and move (V)",
    tool: { kind: "select" },
    icon: ICON.select,
  },
  {
    id: "erase",
    label: "Eraser (E)",
    tool: { kind: "erase" },
    icon: ICON.erase,
  },
  "sep",
  {
    id: "b1",
    label: "Single bond — click a bond to cycle 1/2/3",
    tool: { kind: "bond", order: 1, stereo: "none" },
    icon: ICON.single,
  },
  {
    id: "b2",
    label: "Double bond",
    tool: { kind: "bond", order: 2, stereo: "none" },
    icon: ICON.double,
  },
  {
    id: "b3",
    label: "Triple bond",
    tool: { kind: "bond", order: 3, stereo: "none" },
    icon: ICON.triple,
  },
  {
    id: "bw",
    label: "Wedge (click again to flip)",
    tool: { kind: "bond", order: 1, stereo: "wedge" },
    icon: ICON.wedge,
  },
  {
    id: "bh",
    label: "Hashed wedge",
    tool: { kind: "bond", order: 1, stereo: "hash" },
    icon: ICON.hash,
  },
  {
    id: "bv",
    label: "Wavy bond",
    tool: { kind: "bond", order: 1, stereo: "wavy" },
    icon: ICON.wavy,
  },
  "sep",
  {
    id: "r6a",
    label: "Benzene (6)",
    tool: { kind: "ring", size: 6, aromatic: true },
    icon: ICON.benzene,
  },
  {
    id: "r6",
    label: "Cyclohexane",
    tool: { kind: "ring", size: 6, aromatic: false },
    icon: ICON.hexane,
  },
  {
    id: "r5",
    label: "Cyclopentane (5)",
    tool: { kind: "ring", size: 5, aromatic: false },
    icon: ICON.pentane,
  },
  {
    id: "r3",
    label: "Cyclopropane",
    tool: { kind: "ring", size: 3, aromatic: false },
    icon: ICON.propane,
  },
  "sep",
  ...["C", "N", "O", "S", "P", "F", "Cl", "Br", "I", "H", "R"].map((el) => ({
    id: `el-${el}`,
    label:
      el === "R"
        ? "R-group label (R1, R2…)"
        : `Atom ${el} — or hover an atom and press ${el === "Cl" ? "L" : el === "Br" ? "B" : el}`,
    tool: { kind: "element", el } as Tool,
    text: el,
  })),
  "sep",
  {
    id: "q+",
    label: "Charge +",
    tool: { kind: "charge", delta: 1 },
    icon: ICON.plus,
  },
  {
    id: "q-",
    label: "Charge −",
    tool: { kind: "charge", delta: -1 },
    icon: ICON.minus,
  },
  {
    id: "arrow",
    label: "Reaction arrow (A) — drag",
    tool: { kind: "arrow" },
    icon: ICON.arrow,
  },
  {
    id: "text",
    label: "Caption text (T)",
    tool: { kind: "text" },
    icon: ICON.text,
  },
];

const HINTS: Record<Tool["kind"], string> = {
  select:
    "Drag atoms to move · drag on empty space to select · Delete removes the selection",
  erase: "Click an atom, bond, arrow or caption to delete it",
  bond: "Click empty space or an atom to grow a bond · drag from an atom to aim · click a bond to change it",
  ring: "Click empty space for a ring · click an atom for spiro · click a bond to fuse",
  element: "Click an atom to change its element, or empty space to add one",
  charge: "Click an atom to change its charge",
  arrow: "Drag to draw a reaction arrow",
  text: "Click to type a caption · Enter to finish",
};

function buildToolbar(): void {
  const nav = $("tools");
  nav.innerHTML = "";
  for (const t of TOOLS) {
    if (t === "sep") {
      nav.append(document.createElement("hr"));
      continue;
    }
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tool";
    b.id = `tool-${t.id}`;
    b.title = t.label;
    b.setAttribute("aria-label", t.label);
    b.innerHTML = t.icon !== undefined ? svgIcon(t.icon) : (t.text ?? "");
    b.addEventListener("click", () => setTool(t.tool));
    nav.append(b);
  }
}
function setTool(t: Tool): void {
  S.tool = t;
  for (const def of TOOLS) {
    if (def === "sep") continue;
    document
      .getElementById(`tool-${def.id}`)
      ?.setAttribute(
        "aria-pressed",
        String(JSON.stringify(def.tool) === JSON.stringify(t)),
      );
  }
  $("hint").textContent = HINTS[t.kind];
  render(false);
}

// ---- rendering -------------------------------------------------------------------

function render(panels = true): void {
  const warnings = new Set(valenceWarnings(S.scene).map((w) => w.atomId));
  let svg = renderSvg(S.scene, { viewBox: S.view, highlight: S.selection });
  const extra: string[] = [];
  for (const id of warnings) {
    const a = atom(id);
    if (a)
      extra.push(
        `<rect x="${a.x - 6}" y="${a.y - 6}" width="12" height="12" fill="none" stroke="#d62828" stroke-width="0.8"/>`,
      );
  }
  const hv = S.hover;
  if (hv?.kind === "atom") {
    const a = atom(hv.id);
    if (a)
      extra.push(
        `<circle cx="${a.x}" cy="${a.y}" r="5" fill="#0b6e66" fill-opacity="0.18" stroke="#0b6e66" stroke-width="0.6"/>`,
      );
  } else if (hv?.kind === "bond") {
    const b = S.scene.bonds.find((x) => x.id === hv.id);
    const p = b && atom(b.a);
    const q = b && atom(b.b);
    if (p && q)
      extra.push(
        `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="#0b6e66" stroke-opacity="0.3" stroke-width="5" stroke-linecap="round"/>`,
      );
  } else if (hv?.kind === "arrow" || hv?.kind === "label") {
    extra.push("");
  }
  if (S.preview) {
    const p = S.preview;
    extra.push(
      `<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" stroke="#0b6e66" stroke-width="0.8" stroke-dasharray="2,2"/>`,
    );
  }
  if (S.marquee) {
    const m = S.marquee;
    extra.push(
      `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" fill="#2563eb" fill-opacity="0.08" stroke="#2563eb" stroke-width="0.5" stroke-dasharray="3,2"/>`,
    );
  }
  svg = svg
    .replace(
      / width="[^"]*pt" height="[^"]*pt"/,
      ' class="doc" preserveAspectRatio="xMidYMid meet"',
    )
    .replace(/<\/svg>$/, `${extra.join("")}</svg>`);
  const old = stage.querySelector("svg.doc");
  const holder = document.createElement("div");
  holder.innerHTML = svg;
  const fresh = holder.firstElementChild;
  if (fresh) {
    if (old) old.replaceWith(fresh);
    else stage.prepend(fresh);
  }
  $<HTMLButtonElement>("undo").disabled = S.past.length === 0;
  $<HTMLButtonElement>("redo").disabled = S.future.length === 0;
  $("badge").textContent =
    S.source !== null
      ? `${S.source.name} · unchanged since opening · exports keep the whole original document`
      : `${S.scene.atoms.length} atoms · ${S.scene.bonds.length} bonds`;
  if (panels) renderPane();
}

// ---- side panel -------------------------------------------------------------------

const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const formulaHtml = (f: string): string =>
  esc(f).replace(/(\d+)(?=[A-Z+-]|$)/g, "<sub>$1</sub>");

function subScene(ids: Set<number>): Scene {
  return {
    atoms: S.scene.atoms.filter((a) => ids.has(a.id)),
    bonds: S.scene.bonds.filter((b) => ids.has(b.a) && ids.has(b.b)),
    arrows: [],
    labels: [],
  };
}

function renderPane(): void {
  document
    .querySelectorAll<HTMLButtonElement>(".tabs button")
    .forEach((b) =>
      b.setAttribute("aria-selected", String(b.dataset["tab"] === S.tab)),
    );
  if (S.tab === "analysis") paneAnalysis();
  else if (S.tab === "formats") paneFormats();
  else if (S.tab === "bio") paneBio();
  else paneRGroups();
}

function paneAnalysis(): void {
  const scope = S.selection.size > 0 ? subScene(S.selection) : S.scene;
  const a = analyze(scope);
  const counts = new Map<string, number>();
  let total = 0;
  for (const at of scope.atoms) {
    const el = elementBySymbol(at.el);
    if (!el || at.pseudo) continue;
    counts.set(at.el, (counts.get(at.el) ?? 0) + el.weight);
    total += el.weight;
    const h = implicitHydrogens(scope, at);
    const H = elementBySymbol("H");
    if (h > 0 && H) {
      counts.set("H", (counts.get("H") ?? 0) + h * H.weight);
      total += h * H.weight;
    }
  }
  const bars = [...counts]
    .sort((x, y) => y[1] - x[1])
    .map(([el, w]) => {
      const pct = total > 0 ? (100 * w) / total : 0;
      return `<div><span>${el}</span><i style="width:${pct.toFixed(1)}%"></i><span>${pct.toFixed(2)}%</span></div>`;
    })
    .join("");
  const warnings = valenceWarnings(scope);
  pane.innerHTML = `
    <div><h2>${S.selection.size > 0 ? "Selection" : "Whole drawing"}</h2>
      <div class="formula">${a.formula === "" ? "—" : formulaHtml(a.formula)}</div></div>
    <dl class="kv">
      <dt>Molecular weight</dt><dd>${a.weight.toFixed(3)} g/mol</dd>
      <dt>Exact mass</dt><dd>${a.exactMass.toFixed(4)}</dd>
      <dt>m/z [M+H]⁺</dt><dd>${a.formula === "" ? "—" : (a.exactMass + 1.007276).toFixed(4)}</dd>
      <dt>Heavy atoms</dt><dd>${a.heavyAtoms}</dd>
      <dt>Fragments</dt><dd>${a.components}</dd>
      <dt>Net charge</dt><dd>${a.charge > 0 ? "+" : ""}${a.charge}</dd>
    </dl>
    <div><h2>Elemental analysis</h2><div class="bars">${bars || '<p class="hint">Draw a structure to see its composition.</p>'}</div></div>
    <div><h2>Chemical warnings</h2>${
      warnings.length === 0
        ? '<p class="ok">No valence problems found.</p>'
        : warnings
            .map((w) => `<div class="warn">${esc(w.message)}</div>`)
            .join("")
    }</div>
    <p class="hint">Masses use IUPAC standard atomic weights (2024 values for Gd, Lu, Zr). Implicit hydrogens follow default valences. Select atoms to analyze part of the drawing.</p>`;
}

function paneFormats(): void {
  let smiles = "";
  try {
    smiles = toSmiles(S.scene);
  } catch {
    smiles = "";
  }
  pane.innerHTML = `
    <div><h2>SMILES</h2><textarea id="fmt-smiles" rows="3" spellcheck="false">${esc(smiles)}</textarea>
      <div class="row" style="margin-top:6px"><button type="button" id="fmt-apply">Replace drawing</button><button type="button" id="fmt-add">Add to drawing</button></div>
      <p class="hint" id="fmt-err">Type or paste SMILES, then replace or add. Stereo descriptors are ignored.</p></div>
    <div><h2>MOL V2000</h2><textarea id="fmt-mol" rows="8" spellcheck="false" readonly>${esc(toMolfile(S.scene, "CDX Bench"))}</textarea></div>
    <div><h2>CDXML (first 2,000 characters)</h2><textarea id="fmt-cdxml" rows="8" spellcheck="false" readonly>${esc(currentCdxml().slice(0, 2000))}</textarea></div>
    <p class="hint">Use "Copy as" for the full text of any format, or Save → All formats for a .zip with .cdx, .cdxml, .mol, .smi and .svg files.</p>`;
  const apply = (replace: boolean): void => {
    const r = parseSmiles(
      ($("fmt-smiles") as HTMLTextAreaElement).value.trim(),
    );
    if ("error" in r) {
      $("fmt-err").textContent =
        `Could not read SMILES: ${r.error.message} (character ${r.error.at + 1}).`;
      return;
    }
    commit(() => mergeScene(r.scene, replace));
    fit();
  };
  $("fmt-apply").addEventListener("click", () => apply(true));
  $("fmt-add").addEventListener("click", () => apply(false));
}

let helmText =
  "PEPTIDE1{G.I.V.E.Q.C.C.T.S.I.C.S.L.Y.Q.L.E.N.Y.C.N}|PEPTIDE2{F.V.N.Q.H.L.C.G.S.H.L.V.E.A.L.Y.L.V.C.G.E.R.G.F.F.Y.T.P.K.T}$PEPTIDE1,PEPTIDE2,7:R3-7:R3|PEPTIDE1,PEPTIDE2,20:R3-19:R3|PEPTIDE1,PEPTIDE1,6:R3-11:R3$$$V2.0";
function paneBio(): void {
  const h = parseHelm(helmText);
  const body =
    "error" in h
      ? `<div class="warn">${esc(h.error)}</div>`
      : `<div class="beads">${renderHelmSvg(h)}</div>
         <dl class="kv">${h.polymers
           .map((p) => {
             const w = peptideWeight(p);
             return `<dt>${p.id}</dt><dd>${p.monomers.length} monomers${w !== null ? ` · ${w.toFixed(2)} g/mol` : ""}</dd>`;
           })
           .join("")}<dt>Connections</dt><dd>${h.connections.length}</dd></dl>`;
  pane.innerHTML = `
    <div><h2>HELM</h2><textarea id="helm" rows="5" spellcheck="false">${esc(helmText)}</textarea>
      <p class="hint">Example: human insulin A and B chains with three disulfide bridges. Peptide weights are average masses of the linear chains; bridges are not subtracted.</p></div>
    ${body}`;
  $("helm").addEventListener("input", (e) => {
    helmText = (e.target as HTMLTextAreaElement).value;
    clearTimeout(helmTimer);
    helmTimer = setTimeout(paneBio, 300);
  });
}
let helmTimer: ReturnType<typeof setTimeout> | undefined;

let rScaffold = "[*:1]c1ccc(cc1)C(=O)N[*:2]";
let rLists = "R1: [*]F, [*]Cl, [*]OC\nR2: [*]C, [*]CC";
function paneRGroups(): void {
  pane.innerHTML = `
    <div><h2>Scaffold</h2><input type="text" id="r-scaffold" value="${esc(rScaffold)}" spellcheck="false">
      <p class="hint">Mark attachment points as [*:1], [*:2]… in SMILES.</p></div>
    <div><h2>Substituents</h2><textarea id="r-lists" rows="4" spellcheck="false">${esc(rLists)}</textarea>
      <p class="hint">One line per R number. Each substituent attaches through its [*].</p></div>
    <div class="row"><button type="button" class="primary" id="r-run">Enumerate</button></div>
    <div id="r-out"></div>`;
  $("r-run").addEventListener("click", () => {
    rScaffold = ($("r-scaffold") as HTMLInputElement).value.trim();
    rLists = ($("r-lists") as HTMLTextAreaElement).value;
    const groups: Record<number, string[]> = {};
    for (const line of rLists.split("\n")) {
      const m = /^\s*R(\d+)\s*:\s*(.+)$/.exec(line);
      if (m)
        groups[Number(m[1])] = (m[2] ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    }
    const out = enumerateRGroups(rScaffold, groups, 60);
    const target = $("r-out");
    if ("error" in out) {
      target.innerHTML = `<div class="warn">${esc(out.error)}</div>`;
      return;
    }
    target.innerHTML = `<h2>${out.length} products</h2><div class="grid-cards">${out
      .map((e, i) => {
        const r = parseSmiles(e.smiles);
        const svg =
          "error" in r
            ? ""
            : renderSvg(r.scene).replace(
                / width="[^"]*pt" height="[^"]*pt"/,
                "",
              );
        return `<button type="button" class="card" data-i="${i}">${svg}<span>${esc(analyze("error" in r ? emptyScene() : r.scene).formula)}</span></button>`;
      })
      .join(
        "",
      )}</div><p class="hint">Click a product to open it in the drawing.</p>`;
    target.querySelectorAll<HTMLButtonElement>(".card").forEach((b) =>
      b.addEventListener("click", () => {
        const e = out[Number(b.dataset["i"])];
        const r = e && parseSmiles(e.smiles);
        if (r && !("error" in r)) {
          commit(() => mergeScene(r.scene, true));
          fit();
        }
      }),
    );
  });
  $("r-run").click();
}

document.querySelectorAll<HTMLButtonElement>(".tabs button").forEach((b) =>
  b.addEventListener("click", () => {
    S.tab = b.dataset["tab"] ?? "analysis";
    renderPane();
  }),
);

// ---- import / export -----------------------------------------------------------

function mergeScene(add: Scene, replace: boolean): void {
  if (replace) {
    S.scene = add;
    S.selection.clear();
    return;
  }
  const offset = nextId(S.scene) + 1;
  const maxX = Math.max(
    0,
    ...S.scene.atoms.map((a) => a.x),
    ...S.scene.arrows.map((a) => Math.max(a.x1, a.x2)),
  );
  const minX = Math.min(...add.atoms.map((a) => a.x));
  const dx = S.scene.atoms.length > 0 ? maxX + bondLength() * 3 - minX : 0;
  S.scene.atoms.push(
    ...add.atoms.map((a) => ({ ...a, id: a.id + offset, x: a.x + dx })),
  );
  S.scene.bonds.push(
    ...add.bonds.map((b) => ({
      ...b,
      id: b.id + offset,
      a: b.a + offset,
      b: b.b + offset,
    })),
  );
}

function currentCdx(): CdxDocument {
  return S.source?.doc ?? sceneToCdx(S.scene);
}
function currentCdxml(): string {
  return toCdxml(currentCdx()).text;
}
function standaloneSvg(): string {
  return renderSvg(S.scene);
}

function toast(msg: string): void {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

function loadDoc(doc: CdxDocument, name: string): void {
  const scene = sceneFromCdx(doc);
  S.past.push(snapshot());
  S.future = [];
  S.scene = scene;
  S.selection.clear();
  S.source = { doc, name };
  fit();
  render();
  toast(
    `Opened ${name}: ${scene.atoms.length} atoms, ${scene.bonds.length} bonds`,
  );
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function openBytes(bytes: Uint8Array, name: string): Promise<void> {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 8));
  if (head.startsWith("PK") || (bytes[0] === 0xd0 && bytes[1] === 0xcf)) {
    const found = await extractChemDrawObjects(bytes, inflate);
    if (!found.ok)
      return toast(`Could not read ${name}: ${found.error.message}`);
    if (found.value.length === 0)
      return toast(`${name} contains no ChemDraw objects`);
    if (found.value.length === 1 && found.value[0])
      return openEmbedded(found.value[0], name);
    return chooseEmbedded(found.value, name);
  }
  const cdx = unwrapCdx(bytes);
  if (cdx.ok) {
    const doc = readCdx(cdx.value);
    return doc.ok
      ? loadDoc(doc.value, name)
      : toast(`Could not read ${name}: ${doc.error.message}`);
  }
  openText(new TextDecoder().decode(bytes), name);
}

function openEmbedded(d: EmbeddedDrawing, name: string): void {
  const doc = readCdx(d.cdx);
  if (doc.ok)
    loadDoc(doc.value, `${name} › ${d.part.split("/").pop() ?? d.part}`);
  else toast(`Embedded object is damaged: ${doc.error.message}`);
}

function chooseEmbedded(list: EmbeddedDrawing[], name: string): void {
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `<div role="dialog" aria-label="Choose a drawing"><h2 style="margin:0;font-size:16px">${list.length} ChemDraw objects in ${esc(name)}</h2><div class="grid-cards"></div><div class="row"><button type="button" id="modal-close">Cancel</button></div></div>`;
  const grid = modal.querySelector(".grid-cards");
  list.forEach((d) => {
    const doc = readCdx(d.cdx);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "card";
    b.innerHTML = `${doc.ok ? renderSvg(sceneFromCdx(doc.value)).replace(/ width="[^"]*pt" height="[^"]*pt"/, "") : ""}<span>${esc(d.part)}</span>`;
    b.addEventListener("click", () => {
      modal.remove();
      openEmbedded(d, name);
    });
    grid?.append(b);
  });
  document.body.append(modal);
  modal
    .querySelector("#modal-close")
    ?.addEventListener("click", () => modal.remove());
}

function openText(text: string, name: string): void {
  const t = text.trim();
  if (t.startsWith("<")) {
    const r = fromCdxml(t);
    if (r.ok) return loadDoc(r.value.doc, name);
    return toast(`Could not read CDXML: ${r.error.message}`);
  }
  if (/V2000/.test(t)) {
    const mol = parseMolfile(text);
    if ("error" in mol) return toast(mol.error);
    commit(() => mergeScene(mol, true));
    fit();
    return;
  }
  if (/^(PEPTIDE|RNA|CHEM|BLOB)\d+\{/.test(t)) {
    helmText = t;
    S.tab = "bio";
    renderPane();
    return;
  }
  const r = parseSmiles(t.split(/\s+/)[0] ?? "");
  if ("error" in r)
    return toast(`Not a recognized structure: ${r.error.message}`);
  commit(() => mergeScene(r.scene, S.scene.atoms.length === 0));
  fit();
}

$<HTMLInputElement>("open").addEventListener("change", async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  await openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
  input.value = "";
});
stage.addEventListener("dragover", (e) => e.preventDefault());
stage.addEventListener("drop", async (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files[0];
  if (file)
    await openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
});
window.addEventListener("paste", (e) => {
  if ((e.target as HTMLElement).closest("input, textarea")) return;
  const text = e.clipboardData?.getData("text") ?? "";
  if (text.trim() !== "") {
    e.preventDefault();
    if (text.trim().startsWith("VmpDRDAx"))
      void openBytes(new TextEncoder().encode(text.trim()), "pasted CDX");
    else openText(text, "pasted text");
  }
});

function formatText(kind: string): string {
  if (kind === "smiles") return toSmiles(S.scene);
  if (kind === "mol") return toMolfile(S.scene, "CDX Bench");
  if (kind === "cdxml") return currentCdxml();
  if (kind === "b64cdx") return toBase64(writeCdx(currentCdx()));
  return standaloneSvg();
}

async function copyText(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast(`Copied ${what}`);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    Object.assign(ta.style, { position: "fixed", left: "-9999px" });
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    toast(
      ok
        ? `Copied ${what}`
        : "Copying is blocked here: use the Formats tab and select the text",
    );
  }
}

function toggleMenu(btn: string, menu: string): void {
  const m = $(menu);
  const open = m.hidden;
  document
    .querySelectorAll<HTMLElement>(".menu > div")
    .forEach((x) => (x.hidden = true));
  m.hidden = !open;
  $(btn).setAttribute("aria-expanded", String(open));
}
$("copy-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  toggleMenu("copy-btn", "copy-menu");
});
$("save-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  toggleMenu("save-btn", "save-menu");
});
document.addEventListener("click", () =>
  document
    .querySelectorAll<HTMLElement>(".menu > div")
    .forEach((x) => (x.hidden = true)),
);
document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((b) =>
  b.addEventListener("click", () => {
    const kind = b.dataset["copy"] ?? "smiles";
    void copyText(
      formatText(kind),
      b.textContent?.replace(/\s+\.\w+$/, "").trim() ?? kind,
    );
  }),
);

interface Downloads {
  save(req: {
    filename: string;
    data: string | Blob | ArrayBuffer | ArrayBufferView;
  }): Promise<{ status: string }>;
}
let downloads: Downloads | null = null;
const claudeApi = (
  window as unknown as { claude?: { use(name: string): Promise<unknown> } }
).claude;
if (claudeApi?.use) {
  void claudeApi.use("downloads").then((d) => {
    downloads = (d as Downloads | null) ?? null;
    $("save-wrap").hidden = downloads === null;
  });
}
document.querySelectorAll<HTMLButtonElement>("[data-save]").forEach((b) =>
  b.addEventListener("click", async () => {
    if (downloads === null) return;
    const kind = b.dataset["save"];
    const enc = new TextEncoder();
    try {
      if (kind === "svg") {
        await downloads.save({
          filename: "structure.svg",
          data: standaloneSvg(),
        });
      } else {
        const zip = buildZip([
          { name: "structure.cdx", data: writeCdx(currentCdx()) },
          { name: "structure.cdxml", data: enc.encode(currentCdxml()) },
          {
            name: "structure.mol",
            data: enc.encode(toMolfile(S.scene, "CDX Bench")),
          },
          { name: "structure.smi", data: enc.encode(`${toSmiles(S.scene)}\n`) },
          { name: "structure.svg", data: enc.encode(standaloneSvg()) },
        ]);
        await downloads.save({ filename: "structure.zip", data: zip });
      }
      toast("Saved");
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "declined") toast(`Could not save (${code ?? "error"})`);
    }
  }),
);

$("new").addEventListener("click", () => {
  commit(() => {
    S.scene = emptyScene();
    S.selection.clear();
  });
  fit();
});
$("undo").addEventListener("click", undo);
$("redo").addEventListener("click", redo);
$("clean").addEventListener("click", () => {
  commit(() => {
    const keep = { arrows: S.scene.arrows, labels: S.scene.labels };
    const minX = Math.min(...S.scene.atoms.map((a) => a.x));
    const minY = Math.min(...S.scene.atoms.map((a) => a.y));
    layout(S.scene, bondLength());
    const nx = Math.min(...S.scene.atoms.map((a) => a.x));
    const ny = Math.min(...S.scene.atoms.map((a) => a.y));
    for (const a of S.scene.atoms) {
      a.x += minX - nx;
      a.y += minY - ny;
    }
    Object.assign(S.scene, keep);
  });
  fit();
});
$("zoom-in").addEventListener("click", () => zoom(1 / 1.25));
$("zoom-out").addEventListener("click", () => zoom(1.25));
$("zoom-fit").addEventListener("click", fit);
window.addEventListener("resize", () => fit());

// ---- start: an example reaction ----------------------------------------------

function example(): Scene {
  const parts = ["OC(=O)c1ccccc1O", "CC(=O)OC(C)=O", "CC(=O)Oc1ccccc1C(=O)O"];
  const scene = emptyScene();
  let x = 0;
  let id = 1;
  parts.forEach((smi, i) => {
    const r = parseSmiles(smi);
    if ("error" in r) return;
    const s = r.scene;
    const minX = Math.min(...s.atoms.map((a) => a.x));
    const maxX = Math.max(...s.atoms.map((a) => a.x));
    const cy =
      (Math.min(...s.atoms.map((a) => a.y)) +
        Math.max(...s.atoms.map((a) => a.y))) /
      2;
    const map = new Map<number, number>();
    for (const a of s.atoms) {
      map.set(a.id, id);
      scene.atoms.push({
        ...a,
        id: id++,
        x: a.x - minX + x,
        y: a.y - cy + 100,
      });
    }
    for (const b of s.bonds)
      scene.bonds.push({
        ...b,
        id: id++,
        a: map.get(b.a) ?? 0,
        b: map.get(b.b) ?? 0,
      });
    x += maxX - minX;
    if (i === 0) {
      scene.labels.push({ id: id++, x: x + 14, y: 104, text: "+" });
      x += 36;
    } else if (i === 1) {
      scene.arrows.push({ id: id++, x1: x + 16, y1: 100, x2: x + 76, y2: 100 });
      scene.labels.push({ id: id++, x: x + 22, y: 92, text: "H2SO4 (cat.)" });
      x += 96;
    }
  });
  scene.labels.push({
    id: id++,
    x: 0,
    y: 160,
    text: "Example: acetylation of salicylic acid to aspirin",
  });
  return scene;
}

buildToolbar();
S.scene = example();
setTool({ kind: "bond", order: 1, stereo: "none" });
requestAnimationFrame(() => fit());
render();
