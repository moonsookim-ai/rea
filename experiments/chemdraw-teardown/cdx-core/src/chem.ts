// Editable chemistry model shared by the editor, renderer and converters:
// element data, valence/implicit hydrogens, formula and masses, SMILES and
// MOL V2000 I/O, a simple 2D layout, and conversion to/from CDX documents.
//
// Scope (P1 MVP): organic-subset chemistry with charges, isotopes, explicit
// H counts, aromatic (1.5) bonds and wedge/hash display. Stereo perception
// (CIP), canonical SMILES and query features are not implemented here.

import {
  newDocument,
  type CdxDocument,
  type CdxObject,
  type CdxProperty,
} from "./binary.ts";
import {
  children,
  getProperty,
  objectName,
  propertyTag,
  walk,
} from "./model.ts";
import { COORDINATE_UNIT, encodeValue, type CdxValue } from "./values.ts";

// ---- element data ---------------------------------------------------------

/** Symbol, standard atomic weight (IUPAC abridged, 2024 values for Gd/Lu/Zr), monoisotopic mass, default valences. */
const ELEMENT_ROWS: Array<[string, number, number, number[]]> = [
  ["H", 1.008, 1.007825, [1]],
  ["He", 4.0026, 4.002603, [0]],
  ["Li", 6.94, 7.016003, [1]],
  ["Be", 9.0122, 9.012183, [2]],
  ["B", 10.81, 11.009305, [3]],
  ["C", 12.011, 12, [4]],
  ["N", 14.007, 14.003074, [3, 5]],
  ["O", 15.999, 15.994915, [2]],
  ["F", 18.998, 18.998403, [1]],
  ["Ne", 20.18, 19.99244, [0]],
  ["Na", 22.99, 22.98977, [1]],
  ["Mg", 24.305, 23.985042, [2]],
  ["Al", 26.982, 26.981538, [3]],
  ["Si", 28.085, 27.976927, [4]],
  ["P", 30.974, 30.973762, [3, 5]],
  ["S", 32.06, 31.972071, [2, 4, 6]],
  ["Cl", 35.45, 34.968853, [1, 3, 5, 7]],
  ["Ar", 39.95, 39.962383, [0]],
  ["K", 39.098, 38.963707, [1]],
  ["Ca", 40.078, 39.962591, [2]],
  ["Sc", 44.956, 44.95591, []],
  ["Ti", 47.867, 47.947947, []],
  ["V", 50.942, 50.943964, []],
  ["Cr", 51.996, 51.940512, []],
  ["Mn", 54.938, 54.938045, []],
  ["Fe", 55.845, 55.934942, []],
  ["Co", 58.933, 58.933195, []],
  ["Ni", 58.693, 57.935343, []],
  ["Cu", 63.546, 62.929598, []],
  ["Zn", 65.38, 63.929142, []],
  ["Ga", 69.723, 68.925574, [3]],
  ["Ge", 72.63, 73.921178, [4]],
  ["As", 74.922, 74.921597, [3, 5]],
  ["Se", 78.971, 79.916521, [2, 4, 6]],
  ["Br", 79.904, 78.918337, [1]],
  ["Kr", 83.798, 83.911507, [0]],
  ["Rb", 85.468, 84.911789, [1]],
  ["Sr", 87.62, 87.905612, [2]],
  ["Y", 88.906, 88.905848, []],
  ["Zr", 91.222, 89.904704, []],
  ["Nb", 92.906, 92.906378, []],
  ["Mo", 95.95, 97.905408, []],
  ["Tc", 97, 97.907216, []],
  ["Ru", 101.07, 101.904349, []],
  ["Rh", 102.91, 102.905504, []],
  ["Pd", 106.42, 105.903486, []],
  ["Ag", 107.87, 106.905097, []],
  ["Cd", 112.41, 113.903358, []],
  ["In", 114.82, 114.903878, [3]],
  ["Sn", 118.71, 119.902194, [2, 4]],
  ["Sb", 121.76, 120.903815, [3, 5]],
  ["Te", 127.6, 129.906224, [2, 4, 6]],
  ["I", 126.9, 126.904473, [1, 3, 5, 7]],
  ["Xe", 131.29, 131.904153, [0]],
  ["Cs", 132.91, 132.905451, [1]],
  ["Ba", 137.33, 137.905247, [2]],
  ["La", 138.91, 138.906353, []],
  ["Ce", 140.12, 139.905438, []],
  ["Pr", 140.91, 140.907652, []],
  ["Nd", 144.24, 141.907723, []],
  ["Pm", 145, 144.912749, []],
  ["Sm", 150.36, 151.919732, []],
  ["Eu", 151.96, 152.92123, []],
  ["Gd", 157.249, 157.924103, []],
  ["Tb", 158.93, 158.925346, []],
  ["Dy", 162.5, 163.929174, []],
  ["Ho", 164.93, 164.930322, []],
  ["Er", 167.26, 165.930293, []],
  ["Tm", 168.93, 168.934213, []],
  ["Yb", 173.05, 173.938862, []],
  ["Lu", 174.9668, 174.940771, []],
  ["Hf", 178.49, 179.94655, []],
  ["Ta", 180.95, 180.947996, []],
  ["W", 183.84, 183.950931, []],
  ["Re", 186.21, 186.955753, []],
  ["Os", 190.23, 191.96148, []],
  ["Ir", 192.22, 192.962926, []],
  ["Pt", 195.08, 194.964791, []],
  ["Au", 196.97, 196.966569, []],
  ["Hg", 200.59, 201.970643, []],
  ["Tl", 204.38, 204.974428, [1, 3]],
  ["Pb", 207.2, 207.976652, [2, 4]],
  ["Bi", 208.98, 208.980399, [3, 5]],
];

export interface ElementInfo {
  readonly symbol: string;
  readonly number: number;
  readonly weight: number;
  readonly mono: number;
  readonly valences: readonly number[];
}
export const ELEMENTS: readonly ElementInfo[] = ELEMENT_ROWS.map(
  ([symbol, weight, mono, valences], i) => ({
    symbol,
    number: i + 1,
    weight,
    mono,
    valences,
  }),
);
const BY_SYMBOL = new Map(ELEMENTS.map((e) => [e.symbol, e]));
export const elementBySymbol = (s: string): ElementInfo | undefined =>
  BY_SYMBOL.get(s);
export const elementByNumber = (n: number): ElementInfo | undefined =>
  ELEMENTS[n - 1];

// ---- model ----------------------------------------------------------------

export type Stereo = "none" | "wedge" | "hash" | "wavy";

export interface Atom {
  id: number;
  /** Element symbol, or a label for pseudo atoms ("R1", "OMe", "*"). */
  el: string;
  x: number;
  y: number;
  charge: number;
  isotope: number;
  /** Explicit hydrogen count; null means "compute from valence". */
  hCount: number | null;
  /** True when `el` is not an element (R-group, abbreviation, attachment). */
  pseudo: boolean;
}

export interface Bond {
  id: number;
  a: number;
  b: number;
  /** 1, 2, 3 or 1.5 (aromatic). */
  order: number;
  stereo: Stereo;
}

export interface Arrow {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Label {
  id: number;
  x: number;
  y: number;
  text: string;
}

/** Positions are in points (y grows downwards, like CDX). */
export interface Scene {
  atoms: Atom[];
  bonds: Bond[];
  arrows: Arrow[];
  labels: Label[];
}

export const emptyScene = (): Scene => ({
  atoms: [],
  bonds: [],
  arrows: [],
  labels: [],
});

export function nextId(scene: Scene): number {
  let max = 0;
  for (const list of [scene.atoms, scene.bonds, scene.arrows, scene.labels]) {
    for (const o of list) max = Math.max(max, o.id);
  }
  return max + 1;
}

export function bondsOf(scene: Scene, atomId: number): Bond[] {
  return scene.bonds.filter((b) => b.a === atomId || b.b === atomId);
}

export const neighborOf = (bond: Bond, atomId: number): number =>
  bond.a === atomId ? bond.b : bond.a;

/** ACS Document 1996 bond length in points. */
export const BOND_LENGTH = 14.4;

// ---- valence --------------------------------------------------------------

function bondOrderSum(scene: Scene, atom: Atom): number {
  return bondsOf(scene, atom.id).reduce((s, b) => s + b.order, 0);
}

/** Default valences shifted by charge (N+ -> 4, O- -> 1, C+/- -> 3, B- -> 4). */
function allowedValences(el: ElementInfo, charge: number): number[] {
  if (charge === 0) return [...el.valences];
  const group15or16 = ["N", "P", "As", "O", "S", "Se", "Te"].includes(
    el.symbol,
  );
  if (group15or16) {
    const shifted = el.valences.map((v) => v + charge);
    // period 3+ anions may expand their octet (PF6-, SbF6-)
    const expanded =
      el.number > 10 ? el.valences.map((v) => v + Math.abs(charge)) : [];
    return [...new Set([...shifted, ...expanded])]
      .filter((v) => v >= 0)
      .sort((a, b) => a - b);
  }
  if (el.symbol === "B" || el.symbol === "Al")
    return el.valences.map((v) => v - charge);
  if (["C", "Si", "Ge", "Sn"].includes(el.symbol))
    return el.valences.map((v) => v - Math.abs(charge));
  return el.valences.map((v) => v - Math.abs(charge)).filter((v) => v >= 0);
}

export function implicitHydrogens(scene: Scene, atom: Atom): number {
  if (atom.hCount !== null) return atom.hCount;
  if (atom.pseudo) return 0;
  const el = elementBySymbol(atom.el);
  if (el === undefined || el.valences.length === 0) return 0;
  const used = Math.round(bondOrderSum(scene, atom));
  const target = allowedValences(el, atom.charge).find((v) => v >= used);
  return target === undefined ? 0 : target - used;
}

export interface Warning {
  atomId: number;
  message: string;
}

export function valenceWarnings(input: Scene): Warning[] {
  // judge aromatic (1.5) bonds on a Kekulé structure: a fusion carbon with
  // three aromatic bonds has valence 4, not 4.5
  const scene = kekulize(input);
  const out: Warning[] = [];
  for (const atom of scene.atoms) {
    if (atom.pseudo) continue;
    const el = elementBySymbol(atom.el);
    if (el === undefined) {
      out.push({ atomId: atom.id, message: `unknown element "${atom.el}"` });
      continue;
    }
    if (el.valences.length === 0) continue;
    const used = bondOrderSum(scene, atom) + (atom.hCount ?? 0);
    const allowed = allowedValences(el, atom.charge);
    const max = Math.max(...allowed, 0);
    if (used > max + 1e-9)
      out.push({
        atomId: atom.id,
        message: `${atom.el}: valence ${used} exceeds ${max}`,
      });
  }
  return out;
}

// ---- formula and masses -----------------------------------------------------

export interface Analysis {
  formula: string;
  weight: number;
  exactMass: number;
  charge: number;
  heavyAtoms: number;
  components: number;
}

export function analyze(scene: Scene): Analysis {
  const counts = new Map<string, number>();
  let weight = 0;
  let mono = 0;
  let charge = 0;
  let heavy = 0;
  const add = (sym: string, n: number): void => {
    counts.set(sym, (counts.get(sym) ?? 0) + n);
  };
  const H = elementBySymbol("H");
  for (const atom of scene.atoms) {
    if (atom.pseudo) continue;
    const el = elementBySymbol(atom.el);
    if (el === undefined) continue;
    add(atom.el, 1);
    weight += el.weight;
    mono += atom.isotope > 0 ? atom.isotope : el.mono;
    const h = implicitHydrogens(scene, atom);
    if (h > 0 && H !== undefined) {
      add("H", h);
      weight += h * H.weight;
      mono += h * H.mono;
    }
    if (atom.el !== "H") heavy += 1;
    charge += atom.charge;
  }
  const electron = 0.000548579909;
  mono -= charge * electron;
  const keys = [...counts.keys()].sort((a, b) => {
    const rank = (s: string): number =>
      counts.has("C") ? (s === "C" ? 0 : s === "H" ? 1 : 2) : 2;
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  let formula = keys
    .map((k) => `${k}${counts.get(k) === 1 ? "" : String(counts.get(k))}`)
    .join("");
  if (charge !== 0)
    formula += `${Math.abs(charge) === 1 ? "" : String(Math.abs(charge))}${charge > 0 ? "+" : "-"}`;
  return {
    formula,
    weight,
    exactMass: mono,
    charge,
    heavyAtoms: heavy,
    components: components(scene).length,
  };
}

export function components(scene: Scene): number[][] {
  const seen = new Set<number>();
  const out: number[][] = [];
  for (const start of scene.atoms) {
    if (seen.has(start.id)) continue;
    const comp: number[] = [];
    const stack = [start.id];
    seen.add(start.id);
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined) break;
      comp.push(id);
      for (const b of bondsOf(scene, id)) {
        const n = neighborOf(b, id);
        if (!seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    out.push(comp);
  }
  return out;
}

/** Smallest rings found by BFS from every bond (good enough for depiction). */
export function rings(scene: Scene): number[][] {
  const found = new Map<string, number[]>();
  for (const bond of scene.bonds) {
    // shortest path from b back to a without using this bond
    const prev = new Map<number, number>([[bond.b, -1]]);
    const queue = [bond.b];
    while (queue.length > 0 && !prev.has(bond.a)) {
      const cur = queue.shift();
      if (cur === undefined) break;
      for (const nb of bondsOf(scene, cur)) {
        if (nb === bond) continue;
        const n = neighborOf(nb, cur);
        if (!prev.has(n)) {
          prev.set(n, cur);
          queue.push(n);
        }
      }
    }
    if (!prev.has(bond.a)) continue;
    const ring: number[] = [];
    for (
      let at: number | undefined = bond.a;
      at !== undefined && at !== -1;
      at = prev.get(at)
    )
      ring.push(at);
    if (ring.length > 8) continue;
    const key = [...ring].sort((x, y) => x - y).join(",");
    if (!found.has(key)) found.set(key, ring);
  }
  return [...found.values()];
}

// ---- SMILES -----------------------------------------------------------------

const ORGANIC = new Set(["B", "C", "N", "O", "P", "S", "F", "Cl", "Br", "I"]);
const AROMATIC = new Set(["b", "c", "n", "o", "p", "s", "se", "as"]);

export interface SmilesError {
  message: string;
  at: number;
}

export function parseSmiles(
  smiles: string,
): { scene: Scene } | { error: SmilesError } {
  const scene = emptyScene();
  let id = 1;
  const aromatic = new Set<number>();
  let prev: number | null = null;
  let pendingBond: { order: number; explicit: boolean } | null = null;
  const branch: Array<number | null> = [];
  const ringOpen = new Map<number, { atom: number; order: number | null }>();
  const bondSym: Record<string, number> = {
    "-": 1,
    "=": 2,
    "#": 3,
    ":": 1.5,
    $: 3,
    "/": 1,
    "\\": 1,
  };
  let i = 0;
  const addAtom = (
    atom: Omit<Atom, "id" | "x" | "y">,
    isAromatic: boolean,
  ): number => {
    const a: Atom = { id: id++, x: 0, y: 0, ...atom };
    scene.atoms.push(a);
    if (isAromatic) aromatic.add(a.id);
    if (prev !== null) {
      const order =
        pendingBond?.order ?? (isAromatic && aromatic.has(prev) ? 1.5 : 1);
      scene.bonds.push({ id: id++, a: prev, b: a.id, order, stereo: "none" });
    }
    pendingBond = null;
    prev = a.id;
    return a.id;
  };
  while (i < smiles.length) {
    const c = smiles[i] ?? "";
    if (c === "(") {
      branch.push(prev);
      i += 1;
    } else if (c === ")") {
      if (branch.length === 0)
        return { error: { message: "unbalanced ')'", at: i } };
      prev = branch.pop() ?? null;
      i += 1;
    } else if (c in bondSym) {
      pendingBond = { order: bondSym[c] ?? 1, explicit: true };
      i += 1;
    } else if (c === ".") {
      prev = null;
      pendingBond = null;
      i += 1;
    } else if (/[0-9%]/.test(c)) {
      let num: number;
      if (c === "%") {
        num = Number(smiles.slice(i + 1, i + 3));
        i += 3;
      } else {
        num = Number(c);
        i += 1;
      }
      if (prev === null)
        return { error: { message: "ring bond without atom", at: i } };
      const open = ringOpen.get(num);
      if (open === undefined) {
        ringOpen.set(num, { atom: prev, order: pendingBond?.order ?? null });
      } else {
        const both = aromatic.has(open.atom) && aromatic.has(prev);
        const order = pendingBond?.order ?? open.order ?? (both ? 1.5 : 1);
        scene.bonds.push({
          id: id++,
          a: open.atom,
          b: prev,
          order,
          stereo: "none",
        });
        ringOpen.delete(num);
      }
      pendingBond = null;
    } else if (c === "[") {
      const end = smiles.indexOf("]", i);
      if (end < 0) return { error: { message: "unclosed '['", at: i } };
      const m =
        /^(\d*)([A-Z][a-z]?|[a-z][a-z]?|\*)(@*)(H\d*)?([+-]+\d*|[+-]\d+)?(?::\d+)?$/.exec(
          smiles.slice(i + 1, end),
        );
      if (m === null)
        return {
          error: {
            message: `bad bracket atom ${smiles.slice(i, end + 1)}`,
            at: i,
          },
        };
      const sym = m[2] ?? "C";
      const isAro = AROMATIC.has(sym);
      const el =
        sym === "*" ? "*" : isAro ? sym[0]?.toUpperCase() + sym.slice(1) : sym;
      let charge = 0;
      const ch = m[5];
      if (ch !== undefined) {
        const digits = ch.replace(/[+-]/g, "");
        charge =
          (ch[0] === "+" ? 1 : -1) *
          (digits !== "" ? Number(digits) : ch.length);
      }
      const h = m[4];
      addAtom(
        {
          el,
          charge,
          isotope: m[1] !== "" ? Number(m[1]) : 0,
          hCount: h === undefined ? 0 : h.length > 1 ? Number(h.slice(1)) : 1,
          pseudo: sym === "*",
        },
        isAro,
      );
      i = end + 1;
    } else {
      const two = smiles.slice(i, i + 2);
      let sym: string;
      if (two === "Cl" || two === "Br") sym = two;
      else if (c === "*" || ORGANIC.has(c) || AROMATIC.has(c)) sym = c;
      else return { error: { message: `unexpected '${c}'`, at: i } };
      const isAro = AROMATIC.has(sym);
      addAtom(
        {
          el: sym === "*" ? "*" : isAro ? sym.toUpperCase() : sym,
          charge: 0,
          isotope: 0,
          hCount: null,
          pseudo: sym === "*",
        },
        isAro,
      );
      i += sym.length;
    }
  }
  if (branch.length > 0)
    return { error: { message: "unclosed '('", at: smiles.length } };
  if (ringOpen.size > 0)
    return { error: { message: "unclosed ring bond", at: smiles.length } };
  // Aromatic atoms keep 1.5 bonds; implicit H then follows from valence
  // (pyridine n -> 0 H, benzene c -> 1 H); pyrrole needs an explicit [nH].
  layout(scene);
  return { scene };
}

function atomSmiles(scene: Scene, atom: Atom): string {
  if (atom.pseudo) return atom.el === "*" ? "*" : "[*]";
  const aromatic = bondsOf(scene, atom.id).some((b) => b.order === 1.5);
  const sym =
    aromatic && ["C", "N", "O", "S", "P", "B"].includes(atom.el)
      ? atom.el.toLowerCase()
      : atom.el;
  const h = implicitHydrogens(scene, atom);
  const plainOk =
    ORGANIC.has(atom.el) &&
    atom.charge === 0 &&
    atom.isotope === 0 &&
    (atom.hCount === null || aromatic === false);
  if (plainOk && !(aromatic && atom.el === "N" && h > 0)) return sym;
  const charge =
    atom.charge === 0
      ? ""
      : `${atom.charge > 0 ? "+" : "-"}${Math.abs(atom.charge) > 1 ? Math.abs(atom.charge) : ""}`;
  return `[${atom.isotope > 0 ? atom.isotope : ""}${sym}${h > 0 ? `H${h > 1 ? h : ""}` : ""}${charge}]`;
}

const BOND_CHAR: Record<number, string> = { 1: "", 2: "=", 3: "#", 1.5: "" };

/** Non-canonical SMILES via DFS with ring-closure digits (no stereo). */
export function toSmiles(scene: Scene): string {
  const byId = new Map(scene.atoms.map((a) => [a.id, a]));
  const visited = new Set<number>();
  const parts: string[] = [];
  for (const comp of components(scene)) {
    const start = comp[0];
    if (start === undefined) continue;
    // find ring-closure bonds with a first DFS
    const order: number[] = [];
    const treeBonds = new Set<Bond>();
    const seen = new Set<number>();
    const dfs = (id: number): void => {
      seen.add(id);
      order.push(id);
      for (const b of bondsOf(scene, id)) {
        const n = neighborOf(b, id);
        if (!seen.has(n)) {
          treeBonds.add(b);
          dfs(n);
        }
      }
    };
    dfs(start);
    const closures = scene.bonds.filter(
      (b) => !treeBonds.has(b) && seen.has(b.a),
    );
    const ringDigits = new Map<number, Array<{ digit: number; bond: Bond }>>();
    let digit = 1;
    for (const b of closures) {
      const d = digit++;
      for (const end of [b.a, b.b]) {
        const list = ringDigits.get(end) ?? [];
        list.push({ digit: d, bond: b });
        ringDigits.set(end, list);
      }
    }
    const opened = new Set<Bond>();
    const write = (id: number, from: Bond | null): string => {
      visited.add(id);
      const atom = byId.get(id);
      if (atom === undefined) return "";
      let s =
        (from !== null ? (BOND_CHAR[from.order] ?? "") : "") +
        atomSmiles(scene, atom);
      for (const { digit: d, bond } of ringDigits.get(id) ?? []) {
        const label = d > 9 ? `%${d}` : String(d);
        if (!opened.has(bond)) {
          opened.add(bond);
          s += (BOND_CHAR[bond.order] ?? "") + label;
        } else s += label;
      }
      const next = bondsOf(scene, id).filter(
        (b) => treeBonds.has(b) && !visited.has(neighborOf(b, id)),
      );
      next.forEach((b, i) => {
        const sub = write(neighborOf(b, id), b);
        s += i < next.length - 1 ? `(${sub})` : sub;
      });
      return s;
    };
    parts.push(write(start, null));
  }
  return parts.join(".");
}

// ---- kekulization -----------------------------------------------------------

/**
 * Replace aromatic (1.5) bonds with alternating single/double bonds by a
 * maximum matching over aromatic atoms that still have a free valence.
 * Explicit H ([nH]) and charges are honoured. Returns a copy; atoms whose
 * double bond cannot be placed are left with single bonds.
 */
export function kekulize(scene: Scene): Scene {
  const out: Scene = structuredClone(scene);
  const aro = out.bonds.filter((b) => b.order === 1.5);
  if (aro.length === 0) return out;
  const byId = new Map(out.atoms.map((a) => [a.id, a]));
  const needs = new Set<number>();
  for (const atom of out.atoms) {
    const mine = bondsOf(out, atom.id);
    if (!mine.some((b) => b.order === 1.5)) continue;
    const el = elementBySymbol(atom.el);
    if (el === undefined) continue;
    const used =
      mine.reduce((s, b) => s + (b.order === 1.5 ? 1 : b.order), 0) +
      (atom.hCount ?? 0);
    const max = Math.min(
      ...allowedValences(el, atom.charge).filter((v) => v >= used),
      99,
    );
    const aromaticCarbonH =
      atom.hCount === null && atom.el === "C" && mine.length === 2 ? 1 : 0;
    if (max - used - aromaticCarbonH >= 1) needs.add(atom.id);
  }
  const mate = new Map<number, Bond>();
  const tryAugment = (u: number, seen: Set<number>): boolean => {
    for (const b of aro) {
      if (b.a !== u && b.b !== u) continue;
      const v = neighborOf(b, u);
      if (!needs.has(v) || seen.has(v)) continue;
      seen.add(v);
      const other = mate.get(v);
      if (other === undefined || tryAugment(neighborOf(other, v), seen)) {
        mate.set(u, b);
        mate.set(v, b);
        return true;
      }
    }
    return false;
  };
  for (const u of needs) if (!mate.has(u)) tryAugment(u, new Set([u]));
  const doubles = new Set(mate.values());
  for (const b of aro) b.order = doubles.has(b) ? 2 : 1;
  for (const atom of out.atoms) {
    // aromatic N/P without a double bond and without explicit H keeps 0 H
    if (
      needs.has(atom.id) &&
      !mate.has(atom.id) &&
      byId.get(atom.id)?.hCount === null &&
      atom.el !== "C"
    )
      atom.hCount = 0;
  }
  return out;
}

// ---- MOL V2000 --------------------------------------------------------------

/** 1 Å in points: ACS 14.4 pt bond length ~ 1.5 Å. */
const PT_PER_ANGSTROM = BOND_LENGTH / 1.5;

export function toMolfile(input: Scene, title = ""): string {
  const scene = kekulize(input);
  const pad = (s: string | number, n: number): string => String(s).padStart(n);
  const idx = new Map(scene.atoms.map((a, i) => [a.id, i + 1]));
  const lines = [title, "  cdx-core          2D", ""];
  lines.push(
    `${pad(scene.atoms.length, 3)}${pad(scene.bonds.length, 3)}  0  0  0  0  0  0  0  0999 V2000`,
  );
  for (const a of scene.atoms) {
    const x = (a.x / PT_PER_ANGSTROM).toFixed(4);
    const y = (-a.y / PT_PER_ANGSTROM).toFixed(4);
    const sym = a.pseudo ? (/^R\d*$/.test(a.el) ? "R#" : "*") : a.el;
    lines.push(
      `${pad(x, 10)}${pad(y, 10)}${pad("0.0000", 10)} ${sym.padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`,
    );
  }
  for (const b of scene.bonds) {
    const order = b.order === 1.5 ? 4 : b.order;
    const stereo =
      b.stereo === "wedge"
        ? 1
        : b.stereo === "hash"
          ? 6
          : b.stereo === "wavy"
            ? 4
            : 0;
    lines.push(
      `${pad(idx.get(b.a) ?? 0, 3)}${pad(idx.get(b.b) ?? 0, 3)}${pad(order, 3)}${pad(stereo, 3)}`,
    );
  }
  const charged = scene.atoms.filter((a) => a.charge !== 0);
  for (let i = 0; i < charged.length; i += 8) {
    const chunk = charged.slice(i, i + 8);
    lines.push(
      `M  CHG${pad(chunk.length, 3)}${chunk.map((a) => `${pad(idx.get(a.id) ?? 0, 4)}${pad(a.charge, 4)}`).join("")}`,
    );
  }
  const iso = scene.atoms.filter((a) => a.isotope > 0);
  for (let i = 0; i < iso.length; i += 8) {
    const chunk = iso.slice(i, i + 8);
    lines.push(
      `M  ISO${pad(chunk.length, 3)}${chunk.map((a) => `${pad(idx.get(a.id) ?? 0, 4)}${pad(a.isotope, 4)}`).join("")}`,
    );
  }
  lines.push("M  END");
  return `${lines.join("\n")}\n`;
}

export function parseMolfile(text: string): Scene | { error: string } {
  const lines = text.split(/\r?\n/);
  const counts = lines[3];
  if (counts === undefined || !counts.includes("V2000"))
    return { error: "only MOL V2000 is supported" };
  const na = Number(counts.slice(0, 3));
  const nb = Number(counts.slice(3, 6));
  const scene = emptyScene();
  for (let i = 0; i < na; i += 1) {
    const l = lines[4 + i] ?? "";
    const sym = l.slice(31, 34).trim();
    const pseudo = !elementBySymbol(sym);
    const legacyCharge = Number(l.slice(36, 39)) || 0;
    scene.atoms.push({
      id: i + 1,
      el: sym === "R#" ? "R" : sym,
      x: Number(l.slice(0, 10)) * PT_PER_ANGSTROM,
      y: -Number(l.slice(10, 20)) * PT_PER_ANGSTROM,
      charge: legacyCharge === 0 ? 0 : 4 - legacyCharge,
      isotope: 0,
      hCount: null,
      pseudo,
    });
  }
  for (let i = 0; i < nb; i += 1) {
    const l = lines[4 + na + i] ?? "";
    const order = Number(l.slice(6, 9));
    const stereo = Number(l.slice(9, 12));
    scene.bonds.push({
      id: na + i + 1,
      a: Number(l.slice(0, 3)),
      b: Number(l.slice(3, 6)),
      order: order === 4 ? 1.5 : order,
      stereo:
        stereo === 1
          ? "wedge"
          : stereo === 6
            ? "hash"
            : stereo === 4
              ? "wavy"
              : "none",
    });
  }
  for (const l of lines.slice(4 + na + nb)) {
    const m = /^M {2}(CHG|ISO)\s*(\d+)(.*)$/.exec(l);
    if (m === null) continue;
    const nums = (m[3] ?? "").trim().split(/\s+/).map(Number);
    for (let k = 0; k + 1 < nums.length; k += 2) {
      const atom = scene.atoms[(nums[k] ?? 0) - 1];
      if (atom === undefined) continue;
      if (m[1] === "CHG") atom.charge = nums[k + 1] ?? 0;
      else atom.isotope = nums[k + 1] ?? 0;
    }
  }
  return scene;
}

// ---- 2D layout --------------------------------------------------------------

/**
 * Ring-aware 2D depiction for structures without coordinates: ring systems
 * as regular polygons (fused rings reflected across the shared edge, spiro
 * rings opposite), chains in 120° zig-zag, sp centres linear, substituents
 * spread through the largest free angle. Bridged systems are approximate.
 */
export function layout(scene: Scene, L = BOND_LENGTH): void {
  const pos = new Map<number, { x: number; y: number }>();
  const nbrs = (id: number): number[] =>
    bondsOf(scene, id).map((b) => neighborOf(b, id));
  const ringList = rings(scene)
    .sort((a, b) => b.length - a.length)
    .sort((a, b) => (a.length === 6 ? -1 : b.length === 6 ? 1 : 0));
  // group rings into ring systems (rings sharing atoms)
  const systems: number[][][] = [];
  for (const ring of ringList) {
    const hits = systems.filter((sys) =>
      sys.some((r) => r.some((id) => ring.includes(id))),
    );
    const merged = hits.flat();
    for (const h of hits) systems.splice(systems.indexOf(h), 1);
    systems.push([...merged, ring]);
  }
  const systemOf = new Map<number, number[][]>();
  for (const sys of systems)
    for (const r of sys) for (const id of r) systemOf.set(id, sys);

  /** Lay a ring system out in its own frame (first ring centered at origin). */
  const placeSystem = (
    sys: number[][],
  ): Map<number, { x: number; y: number }> => {
    const local = new Map<number, { x: number; y: number }>();
    const placedRings = new Set<number[]>();
    const polygon = (
      ring: number[],
      start: number,
      cx: number,
      cy: number,
      a0: number,
      dir: number,
    ): void => {
      const n = ring.length;
      const R = L / (2 * Math.sin(Math.PI / n));
      for (let k = 0; k < n; k += 1) {
        const id = ring[(start + k) % n] ?? 0;
        if (local.has(id)) continue;
        const ang = a0 + (dir * 2 * Math.PI * k) / n;
        local.set(id, { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) });
      }
    };
    const first = sys[0];
    if (first === undefined) return local;
    polygon(first, 0, 0, 0, -Math.PI / 2 + Math.PI / first.length, 1);
    placedRings.add(first);
    let progress = true;
    while (progress) {
      progress = false;
      for (const ring of sys) {
        if (placedRings.has(ring)) continue;
        const shared = ring.filter((id) => local.has(id));
        if (shared.length === 0) continue;
        const n = ring.length;
        const R = L / (2 * Math.sin(Math.PI / n));
        if (shared.length >= 2) {
          // fused: find two adjacent ring atoms that are both placed
          let i0 = -1;
          for (let k = 0; k < n; k += 1) {
            if (local.has(ring[k] ?? -1) && local.has(ring[(k + 1) % n] ?? -1))
              i0 = k;
          }
          if (i0 < 0) continue;
          const a = local.get(ring[i0] ?? 0) ?? { x: 0, y: 0 };
          const b = local.get(ring[(i0 + 1) % n] ?? 0) ?? { x: 0, y: 0 };
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          // centroid of already placed neighbours decides which side is taken
          const placed = [...local.values()];
          const px = placed.reduce((s, p) => s + p.x, 0) / placed.length;
          const py = placed.reduce((s, p) => s + p.y, 0) / placed.length;
          let nx = -(b.y - a.y);
          let ny = b.x - a.x;
          const nl = Math.hypot(nx, ny) || 1;
          nx /= nl;
          ny /= nl;
          if ((px - mx) * nx + (py - my) * ny > 0) {
            nx = -nx;
            ny = -ny;
          }
          const apothem = R * Math.cos(Math.PI / n);
          const cx = mx + nx * apothem;
          const cy = my + ny * apothem;
          const angA = Math.atan2(a.y - cy, a.x - cx);
          const angB = Math.atan2(b.y - cy, b.x - cx);
          let dir = Math.sign(Math.sin(angB - angA)) || 1;
          // walk from a (index i0) backwards so that ring order matches direction
          dir = -dir;
          for (let k = 0; k < n; k += 1) {
            const id = ring[(i0 - k + n) % n] ?? 0;
            if (local.has(id)) continue;
            const ang = angA + (dir * 2 * Math.PI * k) / n;
            local.set(id, {
              x: cx + R * Math.cos(ang),
              y: cy + R * Math.sin(ang),
            });
          }
        } else {
          // spiro: put the new ring on the far side of the shared atom
          const s = shared[0] ?? 0;
          const p = local.get(s) ?? { x: 0, y: 0 };
          const placed = [...local.values()];
          const px = placed.reduce((acc, q) => acc + q.x, 0) / placed.length;
          const py = placed.reduce((acc, q) => acc + q.y, 0) / placed.length;
          const ang = Math.atan2(p.y - py, p.x - px);
          const cx = p.x + R * Math.cos(ang);
          const cy = p.y + R * Math.sin(ang);
          polygon(ring, ring.indexOf(s), cx, cy, ang + Math.PI, 1);
        }
        placedRings.add(ring);
        progress = true;
      }
    }
    return local;
  };

  const isLinear = (id: number): boolean => {
    const bs = bondsOf(scene, id);
    return (
      bs.some((b) => b.order === 3) ||
      bs.filter((b) => b.order === 2).length === 2
    );
  };

  let offsetX = 0;
  for (const comp of components(scene)) {
    const start = comp.find((id) => systemOf.has(id)) ?? comp[0];
    if (start === undefined) continue;
    const local = new Map<number, { x: number; y: number }>();
    const queue: number[] = [];
    const attachSystem = (
      sys: number[][],
      anchor: number,
      at: { x: number; y: number },
      dir: number,
    ): void => {
      const frame = placeSystem(sys);
      const p0 = frame.get(anchor) ?? { x: 0, y: 0 };
      const pts = [...frame.values()];
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const rot = dir - Math.atan2(cy - p0.y, cx - p0.x);
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      for (const [id, p] of frame) {
        if (local.has(id)) continue;
        const dx = p.x - p0.x;
        const dy = p.y - p0.y;
        local.set(id, { x: at.x + dx * c - dy * s, y: at.y + dx * s + dy * c });
        queue.push(id);
      }
    };
    const startSys = systemOf.get(start);
    if (startSys !== undefined)
      attachSystem(startSys, start, { x: 0, y: 0 }, 0);
    else {
      local.set(start, { x: 0, y: 0 });
      queue.push(start);
    }
    const lastDir = new Map<number, number>();
    let turn = 1;
    while (queue.length > 0) {
      const id = queue.shift();
      if (id === undefined) break;
      const p = local.get(id) ?? { x: 0, y: 0 };
      const placedN = nbrs(id).filter((n) => local.has(n));
      const fresh = nbrs(id).filter((n) => !local.has(n));
      if (fresh.length === 0) continue;
      const used = placedN.map((n) => {
        const q = local.get(n) ?? p;
        return Math.atan2(q.y - p.y, q.x - p.x);
      });
      let angles: number[];
      if (used.length === 0) {
        angles = fresh.map(
          (_, k) => -Math.PI / 6 + (2 * Math.PI * k) / fresh.length,
        );
      } else if (used.length === 1 && fresh.length === 1) {
        const back = used[0] ?? 0;
        if (isLinear(id)) angles = [back + Math.PI];
        else {
          // zig-zag: alternate the turn, unless the other side is less crowded
          const prevTurn = lastDir.get(placedN[0] ?? -1) ?? turn;
          let t = -prevTurn;
          const clearance = (ang: number): number => {
            const x = p.x + L * Math.cos(ang);
            const y = p.y + L * Math.sin(ang);
            let best = Infinity;
            for (const [other, q] of local)
              if (other !== id)
                best = Math.min(best, Math.hypot(q.x - x, q.y - y));
            return best;
          };
          const want = back + (t * (2 * Math.PI)) / 3;
          const alt = back - (t * (2 * Math.PI)) / 3;
          if (clearance(want) < 0.75 * L && clearance(alt) > clearance(want))
            t = -t;
          angles = [back + (t * (2 * Math.PI)) / 3];
          lastDir.set(id, t);
          turn = t;
        }
      } else {
        // spread new bonds evenly inside the largest free angular gap
        const sorted = [...used]
          .map((a) => (a + 2 * Math.PI) % (2 * Math.PI))
          .sort((a, b) => a - b);
        let gapStart = 0;
        let gapSize = -1;
        sorted.forEach((a, i) => {
          const next =
            i + 1 < sorted.length
              ? (sorted[i + 1] ?? 0)
              : (sorted[0] ?? 0) + 2 * Math.PI;
          if (next - a > gapSize) {
            gapSize = next - a;
            gapStart = a;
          }
        });
        angles = fresh.map(
          (_, k) => gapStart + (gapSize * (k + 1)) / (fresh.length + 1),
        );
        // a single substituent on a crowded centre: take the clearest gap midpoint
        if (fresh.length === 1 && sorted.length >= 2) {
          const mids = sorted.map((a, i) => {
            const next =
              i + 1 < sorted.length
                ? (sorted[i + 1] ?? 0)
                : (sorted[0] ?? 0) + 2 * Math.PI;
            return { mid: (a + next) / 2, size: next - a };
          });
          const score = (ang: number): number => {
            const x = p.x + L * Math.cos(ang);
            const y = p.y + L * Math.sin(ang);
            let best = Infinity;
            for (const [other, q] of local)
              if (other !== id)
                best = Math.min(best, Math.hypot(q.x - x, q.y - y));
            return best;
          };
          const pick = mids
            .filter((m) => m.size > Math.PI / 2)
            .sort((a, b) => score(b.mid) - score(a.mid))[0];
          if (pick !== undefined) angles = [pick.mid];
        }
      }
      fresh.forEach((n, k) => {
        if (local.has(n)) return;
        const ang = angles[k] ?? 0;
        const at = { x: p.x + L * Math.cos(ang), y: p.y + L * Math.sin(ang) };
        const sys = systemOf.get(n);
        if (sys !== undefined && !sys.some((r) => r.some((x) => local.has(x))))
          attachSystem(sys, n, at, ang);
        else {
          local.set(n, at);
          queue.push(n);
        }
      });
    }
    const pts = comp.map((id) => local.get(id) ?? { x: 0, y: 0 });
    const minX = Math.min(...pts.map((q) => q.x));
    const maxX = Math.max(...pts.map((q) => q.x));
    for (const id of comp) {
      const q = local.get(id) ?? { x: 0, y: 0 };
      pos.set(id, { x: q.x - minX + offsetX, y: q.y });
    }
    offsetX += maxX - minX + 2 * L;
  }
  for (const a of scene.atoms) {
    const p = pos.get(a.id);
    if (p !== undefined) {
      a.x = p.x + 100;
      a.y = p.y + 100;
    }
  }
  resolveClashes(scene, L);
}

/** Atoms on v's side of the acyclic bond u-v. */
function branch(scene: Scene, u: number, v: number): Set<number> {
  const out = new Set<number>([v]);
  const stack = [v];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined) break;
    for (const b of bondsOf(scene, id)) {
      const n = neighborOf(b, id);
      if (n === u && id === v) continue;
      if (!out.has(n)) {
        out.add(n);
        stack.push(n);
      }
    }
  }
  return out;
}

function clashScore(scene: Scene, L: number): number {
  let score = 0;
  const bonded = new Set(
    scene.bonds.map((b) => `${Math.min(b.a, b.b)}-${Math.max(b.a, b.b)}`),
  );
  for (let i = 0; i < scene.atoms.length; i += 1) {
    for (let j = i + 1; j < scene.atoms.length; j += 1) {
      const a = scene.atoms[i];
      const b = scene.atoms[j];
      if (a === undefined || b === undefined) continue;
      if (bonded.has(`${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`))
        continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 0.9 * L) score += (0.9 * L - d) ** 2;
    }
  }
  return score;
}

/** Mirror acyclic branches across their bond axis while that reduces overlaps. */
export function resolveClashes(scene: Scene, L = BOND_LENGTH): void {
  const ringBonds = new Set<Bond>();
  for (const ring of rings(scene)) {
    for (const b of scene.bonds)
      if (ring.includes(b.a) && ring.includes(b.b)) ringBonds.add(b);
  }
  const byId = new Map(scene.atoms.map((a) => [a.id, a]));
  for (let pass = 0; pass < 3; pass += 1) {
    let improved = false;
    for (const bond of scene.bonds) {
      if (ringBonds.has(bond)) continue;
      for (const [u, v] of [
        [bond.a, bond.b],
        [bond.b, bond.a],
      ] as const) {
        const side = branch(scene, u, v);
        if (side.has(u) || side.size > scene.atoms.length / 2) continue;
        const A = byId.get(u);
        const B = byId.get(v);
        if (A === undefined || B === undefined) continue;
        const before = clashScore(scene, L);
        if (before === 0) return;
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const len2 = dx * dx + dy * dy || 1;
        const saved = [...side].map((id) => {
          const p = byId.get(id);
          return { id, x: p?.x ?? 0, y: p?.y ?? 0 };
        });
        for (const id of side) {
          const p = byId.get(id);
          if (p === undefined) continue;
          const t = ((p.x - A.x) * dx + (p.y - A.y) * dy) / len2;
          const fx = A.x + t * dx;
          const fy = A.y + t * dy;
          p.x = 2 * fx - p.x;
          p.y = 2 * fy - p.y;
        }
        if (clashScore(scene, L) < before - 1e-6) improved = true;
        else
          for (const s0 of saved) {
            const p = byId.get(s0.id);
            if (p !== undefined) {
              p.x = s0.x;
              p.y = s0.y;
            }
          }
      }
    }
    if (!improved) break;
  }
}

// ---- CDX <-> Scene ----------------------------------------------------------

const ORDER_FROM_CDX: Record<number, number> = { 1: 1, 2: 2, 4: 3, 0x80: 1.5 };
const ORDER_TO_CDX: Record<number, number> = { 1: 1, 2: 2, 3: 4, 1.5: 0x80 };
/** CDXBondDisplay values (CDXConstants.h). */
const DISPLAY = {
  Solid: 0,
  WedgedHashBegin: 3,
  WedgeBegin: 6,
  Wavy: 8,
  WedgedHashEnd: 4,
  WedgeEnd: 7,
};

const intOf = (v: CdxValue | undefined, d: number): number =>
  v?.type === "int" ? v.value : d;
const ptOf = (v: CdxValue | undefined): { x: number; y: number } | null =>
  v?.type === "point2d"
    ? { x: v.raw.x / COORDINATE_UNIT, y: v.raw.y / COORDINATE_UNIT }
    : null;

function textOf(obj: CdxObject, doc: CdxDocument): string {
  const t = children(obj, "Text")[0];
  const v = t === undefined ? undefined : getProperty(t, "Text", doc);
  return v?.type === "string" ? v.text : "";
}

/** Project a CDX document onto the editable scene (fragments, arrows, captions). */
export function sceneFromCdx(doc: CdxDocument): Scene {
  const scene = emptyScene();
  for (const { object, parent } of walk(doc.root)) {
    const name = objectName(object.tag);
    const parentName = parent === null ? "" : objectName(parent.tag);
    if (name === "Node" && parentName === "Fragment") {
      const p = ptOf(getProperty(object, "2DPosition", doc));
      const type = intOf(getProperty(object, "Node_Type", doc), 1);
      const num = intOf(getProperty(object, "Node_Element", doc), 6);
      const label = textOf(object, doc);
      const isElement = type === 0 || type === 1;
      const nested = children(object, "Fragment").length > 0 || !isElement;
      const el = isElement
        ? (elementByNumber(num)?.symbol ?? "C")
        : label || (type === 12 ? "*" : "R");
      const hv = getProperty(object, "Atom_NumHydrogens", doc);
      scene.atoms.push({
        id: object.id,
        el,
        x: p?.x ?? 0,
        y: p?.y ?? 0,
        charge: intOf(getProperty(object, "Atom_Charge", doc), 0),
        isotope: intOf(getProperty(object, "Atom_Isotope", doc), 0),
        hCount: hv?.type === "int" && isElement ? hv.value : null,
        pseudo: nested && !isElement,
      });
    } else if (name === "Bond" && parentName === "Fragment") {
      const order = intOf(getProperty(object, "Bond_Order", doc), 1);
      const display = intOf(getProperty(object, "Bond_Display", doc), 0);
      let a = intOf(getProperty(object, "Bond_Begin", doc), 0);
      let b = intOf(getProperty(object, "Bond_End", doc), 0);
      if (display === DISPLAY.WedgeEnd || display === DISPLAY.WedgedHashEnd)
        [a, b] = [b, a];
      scene.bonds.push({
        id: object.id,
        a,
        b,
        order: ORDER_FROM_CDX[order] ?? 1,
        stereo:
          display === DISPLAY.WedgeBegin || display === DISPLAY.WedgeEnd
            ? "wedge"
            : display === DISPLAY.WedgedHashBegin ||
                display === DISPLAY.WedgedHashEnd
              ? "hash"
              : display === DISPLAY.Wavy
                ? "wavy"
                : "none",
      });
    } else if (
      name === "Arrow" ||
      (name === "Graphic" &&
        intOf(getProperty(object, "Arrow_Type", doc), 0) !== 0)
    ) {
      const head = getProperty(object, "3DHead", doc);
      const tail = getProperty(object, "3DTail", doc);
      const box = getProperty(object, "BoundingBox", doc);
      if (head?.type === "point3d" && tail?.type === "point3d") {
        scene.arrows.push({
          id: object.id,
          x1: tail.raw.x / COORDINATE_UNIT,
          y1: tail.raw.y / COORDINATE_UNIT,
          x2: head.raw.x / COORDINATE_UNIT,
          y2: head.raw.y / COORDINATE_UNIT,
        });
      } else if (box?.type === "rectangle") {
        // Graphic lines store head (top,left) and tail (bottom,right) in the box
        scene.arrows.push({
          id: object.id,
          x1: box.right / COORDINATE_UNIT,
          y1: box.bottom / COORDINATE_UNIT,
          x2: box.left / COORDINATE_UNIT,
          y2: box.top / COORDINATE_UNIT,
        });
      }
    } else if (
      name === "Text" &&
      (parentName === "Page" || parentName === "Group")
    ) {
      const p = ptOf(getProperty(object, "2DPosition", doc));
      const v = getProperty(object, "Text", doc);
      if (p !== null && v?.type === "string" && v.text.trim() !== "") {
        scene.labels.push({ id: object.id, x: p.x, y: p.y, text: v.text });
      }
    }
  }
  const atomIds = new Set(scene.atoms.map((a) => a.id));
  scene.bonds = scene.bonds.filter((b) => atomIds.has(b.a) && atomIds.has(b.b));
  return scene;
}

const prop = (name: string, value: CdxValue): CdxProperty => ({
  kind: "property",
  tag: propertyTag(name),
  data: encodeValue(value),
  longLength: false,
});
const int = (value: number, width: 1 | 2 | 4 = 2, signed = true): CdxValue => ({
  type: "int",
  signed,
  width,
  value,
});
const point = (x: number, y: number): CdxValue => ({
  type: "point2d",
  raw: {
    x: Math.round(x * COORDINATE_UNIT),
    y: Math.round(y * COORDINATE_UNIT),
  },
});
const cdxString = (text: string, font = 3, size = 200, face = 96): CdxValue => {
  const textBytes = new Uint8Array(
    [...text].map((c) => c.charCodeAt(0) & 0xff),
  );
  const raw = new Uint8Array(10);
  const v = new DataView(raw.buffer);
  [0, font, face, size, 3].forEach((x, i) => v.setUint16(i * 2, x, true));
  return {
    type: "string",
    runs: [{ raw, start: 0, font, face, size, color: 3 }],
    textBytes,
    text,
  };
};

/** Build a CDX document (ACS 1996 settings, one Page) from a scene. */
export function sceneToCdx(input: Scene): CdxDocument {
  const scene = kekulize(input);
  const doc = newDocument(1);
  let id = Math.max(1000, nextId(scene) + 1000);
  const fresh = (): number => id++;
  doc.root.items.push(
    prop("CreationProgram", {
      type: "string",
      runs: [],
      textBytes: new Uint8Array([..."cdx-core"].map((c) => c.charCodeAt(0))),
      text: "cdx-core",
    }),
    prop("BondLength", int(Math.round(BOND_LENGTH * COORDINATE_UNIT), 4)),
    prop("LineWidth", int(Math.round(0.6 * COORDINATE_UNIT), 4)),
    prop("BoldWidth", int(Math.round(2 * COORDINATE_UNIT), 4)),
    prop("HashSpacing", int(Math.round(2.5 * COORDINATE_UNIT), 4)),
    prop("MarginWidth", int(Math.round(1.6 * COORDINATE_UNIT), 4)),
    prop("BondSpacing", int(180)),
    prop("FontTable", {
      type: "font-table",
      platform: 0,
      fonts: [
        {
          id: 3,
          charset: 1252,
          name: "Arial",
          nameBytes: new Uint8Array([..."Arial"].map((c) => c.charCodeAt(0))),
        },
      ],
    }),
  );
  const page: CdxObject = {
    kind: "object",
    tag: 0x8001,
    id: fresh(),
    items: [],
  };
  doc.root.items.push(page);
  for (const comp of components(scene)) {
    const frag: CdxObject = {
      kind: "object",
      tag: 0x8003,
      id: fresh(),
      items: [],
    };
    const set = new Set(comp);
    for (const atom of scene.atoms.filter((a) => set.has(a.id))) {
      const node: CdxObject = {
        kind: "object",
        tag: 0x8004,
        id: atom.id,
        items: [prop("2DPosition", point(atom.x, atom.y))],
      };
      if (atom.pseudo) {
        node.items.push(
          prop(
            "Node_Type",
            int(/^R\d*$/.test(atom.el) ? 7 : atom.el === "*" ? 12 : 4),
          ),
        );
      } else if (atom.el !== "C") {
        node.items.push(
          prop("Node_Element", int(elementBySymbol(atom.el)?.number ?? 6)),
        );
      }
      if (atom.charge !== 0)
        node.items.push(prop("Atom_Charge", int(atom.charge, 1)));
      if (atom.isotope !== 0)
        node.items.push(prop("Atom_Isotope", int(atom.isotope)));
      if (atom.hCount !== null)
        node.items.push(prop("Atom_NumHydrogens", int(atom.hCount, 2, false)));
      const showLabel =
        atom.el !== "C" ||
        atom.charge !== 0 ||
        atom.isotope !== 0 ||
        bondsOf(scene, atom.id).length === 0;
      if (showLabel) {
        const h = implicitHydrogens(scene, atom);
        const label = `${atom.el}${h > 0 && !atom.pseudo ? `H${h > 1 ? h : ""}` : ""}`;
        node.items.push({
          kind: "object",
          tag: 0x8006,
          id: fresh(),
          items: [
            prop("2DPosition", point(atom.x - 3.5, atom.y + 3.5)),
            prop("Text", cdxString(label)),
          ],
        });
      }
      frag.items.push(node);
    }
    for (const bond of scene.bonds.filter((b) => set.has(b.a))) {
      const items = [
        prop("Bond_Begin", int(bond.a, 4, false)),
        prop("Bond_End", int(bond.b, 4, false)),
      ];
      if (bond.order !== 1)
        items.push(prop("Bond_Order", int(ORDER_TO_CDX[bond.order] ?? 1)));
      const display =
        bond.stereo === "wedge"
          ? DISPLAY.WedgeBegin
          : bond.stereo === "hash"
            ? DISPLAY.WedgedHashBegin
            : bond.stereo === "wavy"
              ? DISPLAY.Wavy
              : 0;
      if (display !== 0) items.push(prop("Bond_Display", int(display)));
      frag.items.push({ kind: "object", tag: 0x8005, id: bond.id, items });
    }
    page.items.push(frag);
  }
  for (const arrow of scene.arrows) {
    page.items.push({
      kind: "object",
      tag: 0x8021,
      id: arrow.id,
      items: [
        prop("3DHead", {
          type: "point3d",
          raw: {
            x: Math.round(arrow.x2 * COORDINATE_UNIT),
            y: Math.round(arrow.y2 * COORDINATE_UNIT),
            z: 0,
          },
        }),
        prop("3DTail", {
          type: "point3d",
          raw: {
            x: Math.round(arrow.x1 * COORDINATE_UNIT),
            y: Math.round(arrow.y1 * COORDINATE_UNIT),
            z: 0,
          },
        }),
        prop("Arrowhead_Head", int(2)),
        prop("Arrowhead_Type", int(1)),
      ],
    });
  }
  for (const label of scene.labels) {
    page.items.push({
      kind: "object",
      tag: 0x8006,
      id: label.id,
      items: [
        prop("2DPosition", point(label.x, label.y)),
        prop("Text", cdxString(label.text, 3, 200, 0)),
      ],
    });
  }
  return doc;
}
