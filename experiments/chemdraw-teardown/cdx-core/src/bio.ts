// P4 basics: HELM (v2 core) sequences and Markush R-group enumeration.
//
// HELM: simple polymers PEPTIDE/RNA/CHEM with "." separated monomers,
// [bracketed] multi-letter monomers, RNA "R(A)P" groupings, and the
// connection section "P1,P2,3:R3-7:R3". Ad-hoc SMILES monomers, repeats,
// annotations and polymer groups are kept as text but not interpreted.
//
// R-groups: a scaffold SMILES with [*:1], [*:2]... attachment points and,
// per R number, a list of substituent SMILES whose own attachment is "[*]".

import {
  emptyScene,
  layout,
  neighborOf,
  parseSmiles,
  toSmiles,
  type Scene,
} from "./chem.ts";

export interface HelmPolymer {
  id: string;
  type: "PEPTIDE" | "RNA" | "CHEM" | "BLOB";
  /** Monomer codes in order; RNA groups are flattened ("R", "A", "P"). */
  monomers: string[];
}
export interface HelmConnection {
  from: string;
  fromMonomer: number;
  fromAttachment: string;
  to: string;
  toMonomer: number;
  toAttachment: string;
}
export interface Helm {
  polymers: HelmPolymer[];
  connections: HelmConnection[];
  /** Remaining sections (groups, annotations, version) kept verbatim. */
  rest: string[];
}

/** Split on a separator that is not inside [...] or (...) or "..." . */
function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = false;
  let cur = "";
  for (const ch of s) {
    if (ch === '"') quote = !quote;
    if (!quote && (ch === "[" || ch === "(" || ch === "{")) depth += 1;
    if (!quote && (ch === "]" || ch === ")" || ch === "}")) depth -= 1;
    if (ch === sep && depth === 0 && !quote) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseHelm(text: string): Helm | { error: string } {
  const sections = splitTop(text.trim(), "$");
  const [polySection = "", connSection = "", ...rest] = sections;
  const polymers: HelmPolymer[] = [];
  for (const p of splitTop(polySection, "|")) {
    const m = /^(PEPTIDE|RNA|CHEM|BLOB)(\d+)\{(.*)\}(?:".*")?$/.exec(p.trim());
    if (m === null) return { error: `bad polymer "${p}"` };
    const monomers: string[] = [];
    for (const unit of splitTop(m[3] ?? "", ".")) {
      // RNA unit like R(A)P or [dR](A)P: split into sugar, base, phosphate
      const rna =
        /^(\[[^\]]+\]|[A-Za-z])\((\[[^\]]+\]|[A-Za-z])\)(\[[^\]]+\]|[A-Za-z])?$/.exec(
          unit,
        );
      if (rna !== null)
        monomers.push(
          ...[rna[1], rna[2], rna[3]].filter(
            (x): x is string => x !== undefined,
          ),
        );
      else if (unit !== "") monomers.push(unit);
    }
    polymers.push({
      id: `${m[1]}${m[2]}`,
      type: m[1] as HelmPolymer["type"],
      monomers,
    });
  }
  const connections: HelmConnection[] = [];
  for (const c of connSection === "" ? [] : splitTop(connSection, "|")) {
    const m = /^(\w+),(\w+),(\d+):(R\d+)-(\d+):(R\d+)$/.exec(c.trim());
    if (m === null) return { error: `unsupported connection "${c}"` };
    connections.push({
      from: m[1] ?? "",
      to: m[2] ?? "",
      fromMonomer: Number(m[3]),
      fromAttachment: m[4] ?? "",
      toMonomer: Number(m[5]),
      toAttachment: m[6] ?? "",
    });
  }
  return { polymers, connections, rest };
}

export function toHelm(h: Helm): string {
  const poly = h.polymers
    .map((p) => `${p.id}{${p.monomers.join(".")}}`)
    .join("|");
  const conn = h.connections
    .map(
      (c) =>
        `${c.from},${c.to},${c.fromMonomer}:${c.fromAttachment}-${c.toMonomer}:${c.toAttachment}`,
    )
    .join("|");
  return [poly, conn, ...(h.rest.length > 0 ? h.rest : ["", "", "V2.0"])].join(
    "$",
  );
}

/** Average residue masses (free acid minus water) for the 20 amino acids. */
const RESIDUE: Record<string, number> = {
  A: 71.0788,
  R: 156.1875,
  N: 114.1038,
  D: 115.0886,
  C: 103.1388,
  E: 129.1155,
  Q: 128.1307,
  G: 57.0519,
  H: 137.1411,
  I: 113.1594,
  L: 113.1594,
  K: 128.1741,
  M: 131.1926,
  F: 147.1766,
  P: 97.1167,
  S: 87.0782,
  T: 101.1051,
  W: 186.2132,
  Y: 163.176,
  V: 99.1326,
};
const WATER = 18.01528;

export function peptideWeight(p: HelmPolymer): number | null {
  if (p.type !== "PEPTIDE") return null;
  let m = WATER;
  for (const code of p.monomers) {
    const r = RESIDUE[code];
    if (r === undefined) return null;
    m += r;
  }
  return m;
}

/** Sequence beads as SVG (one row per polymer, connections as arcs). */
export function renderHelmSvg(h: Helm): string {
  const R = 11;
  const gap = 26;
  const rowH = 48;
  const colors: Record<HelmPolymer["type"], string> = {
    PEPTIDE: "#bfdbfe",
    RNA: "#fde68a",
    CHEM: "#e9d5ff",
    BLOB: "#e5e7eb",
  };
  const parts: string[] = [];
  const at = new Map<string, { x: number; y: number }>();
  let width = 0;
  h.polymers.forEach((p, row) => {
    const y = 30 + row * rowH;
    parts.push(
      `<text x="4" y="${y + 4}" font-family="Arial" font-size="10" fill="#555">${p.id}</text>`,
    );
    p.monomers.forEach((m, i) => {
      const x = 80 + i * gap;
      at.set(`${p.id}:${i + 1}`, { x, y });
      if (i > 0)
        parts.push(
          `<line x1="${x - gap + R}" y1="${y}" x2="${x - R}" y2="${y}" stroke="#555" stroke-width="1.2"/>`,
        );
      const label = m.replace(/^\[|\]$/g, "");
      parts.push(
        `<circle cx="${x}" cy="${y}" r="${R}" fill="${colors[p.type]}" stroke="#333" stroke-width="0.8"/><text x="${x}" y="${y + 3.5}" text-anchor="middle" font-family="Arial" font-size="${label.length > 2 ? 7 : 10}">${label.slice(0, 4)}</text>`,
      );
      width = Math.max(width, x + R + 10);
    });
  });
  for (const c of h.connections) {
    const a = at.get(`${c.from}:${c.fromMonomer}`);
    const b = at.get(`${c.to}:${c.toMonomer}`);
    if (a === undefined || b === undefined) continue;
    const lift = a.y === b.y ? -R - 18 : 0;
    parts.push(
      `<path d="M${a.x},${a.y - R} C${a.x},${a.y + lift} ${b.x},${b.y + lift} ${b.x},${b.y - R}" fill="none" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="3,2"/>`,
    );
  }
  const height = 30 + h.polymers.length * rowH;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.max(width, 200)} ${height}" width="${Math.max(width, 200)}" height="${height}">${parts.join("")}</svg>`;
}

// ---- Markush / R-group enumeration ----------------------------------------------

export interface Enumerated {
  smiles: string;
  /** Substituent chosen for each R number. */
  choice: Record<number, string>;
}

/** Map number of a "[*:n]" pseudo atom, read from the SMILES text order. */
function attachmentMaps(smiles: string): number[] {
  const out: number[] = [];
  for (const m of smiles.matchAll(
    /\[(\*|[A-Z][a-z]?)[^\]]*?(?::(\d+))?\]|\*|Cl|Br|[BCNOPSFI]|[bcnops]/g,
  )) {
    if (m[0].startsWith("[*") || m[0] === "*")
      out.push(m[2] !== undefined ? Number(m[2]) : 0);
    else out.push(-1);
  }
  return out;
}

function joinAt(scaffold: Scene, rAtom: number, sub: Scene): Scene | null {
  const subStar = sub.atoms.find((a) => a.pseudo);
  if (subStar === undefined) return null;
  const scaffoldBond = scaffold.bonds.find(
    (b) => b.a === rAtom || b.b === rAtom,
  );
  const subBond = sub.bonds.find(
    (b) => b.a === subStar.id || b.b === subStar.id,
  );
  if (scaffoldBond === undefined || subBond === undefined) return null;
  const anchor = neighborOf(scaffoldBond, rAtom);
  const first = neighborOf(subBond, subStar.id);
  const out = emptyScene();
  const offset =
    Math.max(
      0,
      ...scaffold.atoms.map((a) => a.id),
      ...scaffold.bonds.map((b) => b.id),
    ) + 1;
  out.atoms = [
    ...scaffold.atoms.filter((a) => a.id !== rAtom),
    ...sub.atoms
      .filter((a) => a.id !== subStar.id)
      .map((a) => ({ ...a, id: a.id + offset })),
  ];
  out.bonds = [
    ...scaffold.bonds.filter((b) => b !== scaffoldBond),
    ...sub.bonds
      .filter((b) => b !== subBond)
      .map((b) => ({
        ...b,
        id: b.id + offset,
        a: b.a + offset,
        b: b.b + offset,
      })),
    {
      id: offset * 3,
      a: anchor,
      b: first + offset,
      order: scaffoldBond.order,
      stereo: "none",
    },
  ];
  return out;
}

export function enumerateRGroups(
  scaffoldSmiles: string,
  groups: Record<number, string[]>,
  limit = 500,
): Enumerated[] | { error: string } {
  const parsed = parseSmiles(scaffoldSmiles);
  if ("error" in parsed) return { error: `scaffold: ${parsed.error.message}` };
  const maps = attachmentMaps(scaffoldSmiles);
  const pseudo = parsed.scene.atoms
    .map((a, i) => ({ atom: a, map: maps[i] ?? -1 }))
    .filter((x) => x.atom.pseudo);
  const numbers = [...new Set(pseudo.map((p) => p.map))].sort((a, b) => a - b);
  for (const n of numbers)
    if (groups[n] === undefined) return { error: `no substituents for R${n}` };
  let combos: Array<Record<number, string>> = [{}];
  for (const n of numbers) {
    combos = combos.flatMap((c) =>
      (groups[n] ?? []).map((s) => ({ ...c, [n]: s })),
    );
    if (combos.length > limit) combos = combos.slice(0, limit);
  }
  const out: Enumerated[] = [];
  for (const choice of combos) {
    let scene: Scene | null = structuredClone(parsed.scene);
    for (const { atom, map } of pseudo) {
      if (scene === null) break;
      const sub = parseSmiles(choice[map] ?? "");
      if ("error" in sub) return { error: `R${map}: ${sub.error.message}` };
      scene = joinAt(scene, atom.id, sub.scene);
    }
    if (scene === null)
      return { error: "substituents need exactly one [*] attachment" };
    layout(scene);
    out.push({ smiles: toSmiles(scene), choice });
  }
  return out;
}
