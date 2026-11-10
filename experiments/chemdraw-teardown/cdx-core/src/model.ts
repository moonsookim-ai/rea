// Read-only views over a CDX object tree: names, typed property lookup and
// a molecule-graph projection of Fragment objects.

import type { CdxDocument, CdxObject, CdxProperty } from "./binary.ts";
import { OBJECT_TAGS, PROPERTY_TAGS } from "./tags.generated.ts";
import { COORDINATE_UNIT, decodeValue, type CdxValue } from "./values.ts";

const PROPERTY_BY_NAME: ReadonlyMap<string, number> = new Map(
  [...PROPERTY_TAGS].map(([tag, info]) => [info.name, tag]),
);

export const objectName = (tag: number): string =>
  OBJECT_TAGS.get(tag) ??
  `${(tag & 0x4000) !== 0 ? "UserObject" : "UnknownObject"}_0x${tag.toString(16)}`;

export const propertyName = (tag: number): string =>
  PROPERTY_TAGS.get(tag)?.name ??
  `${(tag & 0x4000) !== 0 ? "UserProperty" : "UnknownProperty"}_0x${tag.toString(16).padStart(4, "0")}`;

export function propertyTag(name: string): number {
  const tag = PROPERTY_BY_NAME.get(name);
  if (tag === undefined) throw new Error(`unknown CDX property name ${name}`);
  return tag;
}

export function* walk(
  root: CdxObject,
): Generator<{ object: CdxObject; depth: number; parent: CdxObject | null }> {
  const stack: Array<{
    object: CdxObject;
    depth: number;
    parent: CdxObject | null;
  }> = [{ object: root, depth: 0, parent: null }];
  while (stack.length > 0) {
    const entry = stack.pop();
    if (entry === undefined) break;
    yield entry;
    const children = entry.object.items.filter(
      (i): i is CdxObject => i.kind === "object",
    );
    for (let i = children.length - 1; i >= 0; i -= 1) {
      const child = children[i];
      if (child !== undefined) {
        stack.push({
          object: child,
          depth: entry.depth + 1,
          parent: entry.object,
        });
      }
    }
  }
}

export const properties = (obj: CdxObject): CdxProperty[] =>
  obj.items.filter((i): i is CdxProperty => i.kind === "property");

export const children = (obj: CdxObject, name?: string): CdxObject[] =>
  obj.items.filter(
    (i): i is CdxObject =>
      i.kind === "object" && (name === undefined || objectName(i.tag) === name),
  );

export function getProperty(
  obj: CdxObject,
  name: string,
  doc?: CdxDocument,
): CdxValue | undefined {
  const tag = propertyTag(name);
  const prop = obj.items.find(
    (i): i is CdxProperty => i.kind === "property" && i.tag === tag,
  );
  return prop === undefined ? undefined : decodeValue(prop, doc?.byteOrder);
}

const intOf = (v: CdxValue | undefined, fallback: number): number =>
  v?.type === "int" ? v.value : fallback;

// ---- molecule projection --------------------------------------------------

/** CDXNodeType enum (CDXConstants.h). */
export const NODE_TYPES = [
  "Unspecified",
  "Element",
  "ElementList",
  "ElementListNickname",
  "Nickname",
  "Fragment",
  "Formula",
  "GenericNickname",
  "AnonymousAlternativeGroup",
  "NamedAlternativeGroup",
  "MultiAttachment",
  "VariableAttachment",
  "ExternalConnectionPoint",
  "LinkNode",
  "Monomer",
] as const;

export interface Atom {
  readonly id: number;
  /** Atomic number; CDX defaults an absent Node_Element to carbon (6). */
  readonly element: number;
  readonly charge: number;
  readonly nodeType: string;
  /** Position in points, or null when the node has no 2D position. */
  readonly position: { x: number; y: number } | null;
  /** Number of Fragment objects nested in this node (abbreviations, groups). */
  readonly nestedFragments: number;
}

export interface Bond {
  readonly id: number;
  readonly begin: number;
  readonly end: number;
  /** CDXBondOrder bit flags; absent means single (1). */
  readonly order: number;
}

export interface Molecule {
  readonly fragmentId: number;
  readonly atoms: Atom[];
  readonly bonds: Bond[];
  /** Bonds whose ends are not direct atoms of this fragment. */
  readonly danglingBonds: number;
}

export function molecules(doc: CdxDocument): Molecule[] {
  const result: Molecule[] = [];
  for (const { object, parent } of walk(doc.root)) {
    if (objectName(object.tag) !== "Fragment") continue;
    // Fragments nested inside a Node are abbreviation contents, not molecules.
    if (parent !== null && objectName(parent.tag) === "Node") continue;
    const atoms: Atom[] = children(object, "Node").map((node) => {
      const pos = getProperty(node, "2DPosition", doc);
      return {
        id: node.id,
        element: intOf(getProperty(node, "Node_Element", doc), 6),
        charge: intOf(getProperty(node, "Atom_Charge", doc), 0),
        nodeType:
          NODE_TYPES[intOf(getProperty(node, "Node_Type", doc), 1)] ??
          "Unknown",
        position:
          pos?.type === "point2d"
            ? { x: pos.raw.x / COORDINATE_UNIT, y: pos.raw.y / COORDINATE_UNIT }
            : null,
        nestedFragments: children(node, "Fragment").length,
      };
    });
    const atomIds = new Set(atoms.map((a) => a.id));
    let danglingBonds = 0;
    const bonds: Bond[] = children(object, "Bond").map((bond) => {
      const b = {
        id: bond.id,
        begin: intOf(getProperty(bond, "Bond_Begin", doc), 0),
        end: intOf(getProperty(bond, "Bond_End", doc), 0),
        order: intOf(getProperty(bond, "Bond_Order", doc), 1),
      };
      if (!atomIds.has(b.begin) || !atomIds.has(b.end)) danglingBonds += 1;
      return b;
    });
    result.push({ fragmentId: object.id, atoms, bonds, danglingBonds });
  }
  return result;
}

const SYMBOLS =
  "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr".split(
    " ",
  );

/**
 * Hill-order formula of the explicit "Element" nodes only. Implicit
 * hydrogens and abbreviation contents are not expanded, so this is a
 * heavy-atom skeleton summary, not a molecular formula.
 */
export function skeletonFormula(mol: Molecule): string {
  const counts = new Map<string, number>();
  for (const atom of mol.atoms) {
    if (atom.nodeType !== "Element") continue;
    const sym = SYMBOLS[atom.element - 1] ?? `Z${atom.element}`;
    counts.set(sym, (counts.get(sym) ?? 0) + 1);
  }
  const order = [...counts.keys()].sort((a, b) => {
    const rank = (s: string): number => (s === "C" ? 0 : s === "H" ? 1 : 2);
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  return order
    .map((s) => `${s}${counts.get(s) === 1 ? "" : String(counts.get(s))}`)
    .join("");
}

/**
 * Describe the first chemistry difference between two documents, or return
 * null when they agree: same fragments, atom ids/elements/charges/node
 * types, bond ends and orders, and positions within `tolerancePt` points.
 */
export function chemistryDifference(
  a: CdxDocument,
  b: CdxDocument,
  tolerancePt = 0.006,
): string | null {
  const ma = molecules(a);
  const mb = molecules(b);
  if (ma.length !== mb.length) return `fragments ${ma.length} != ${mb.length}`;
  for (let i = 0; i < ma.length; i += 1) {
    const x = ma[i];
    const y = mb[i];
    if (x === undefined || y === undefined) return `fragment ${i} missing`;
    if (
      x.atoms.length !== y.atoms.length ||
      x.bonds.length !== y.bonds.length
    ) {
      return `fragment ${x.fragmentId}: ${x.atoms.length}/${x.bonds.length} vs ${y.atoms.length}/${y.bonds.length} atoms/bonds`;
    }
    for (let j = 0; j < x.atoms.length; j += 1) {
      const p = x.atoms[j];
      const q = y.atoms[j];
      if (p === undefined || q === undefined) return `atom ${j} missing`;
      const far =
        (p.position === null) !== (q.position === null) ||
        (p.position !== null &&
          q.position !== null &&
          (Math.abs(p.position.x - q.position.x) > tolerancePt ||
            Math.abs(p.position.y - q.position.y) > tolerancePt));
      if (
        p.id !== q.id ||
        p.element !== q.element ||
        p.charge !== q.charge ||
        p.nodeType !== q.nodeType ||
        far
      ) {
        return `atom ${p.id}: ${JSON.stringify(p)} vs ${JSON.stringify(q)}`;
      }
    }
    for (let j = 0; j < x.bonds.length; j += 1) {
      const p = x.bonds[j];
      const q = y.bonds[j];
      if (JSON.stringify(p) !== JSON.stringify(q))
        return `bond ${j}: ${JSON.stringify(p)} vs ${JSON.stringify(q)}`;
    }
  }
  return null;
}
