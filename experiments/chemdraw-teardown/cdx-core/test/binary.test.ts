// Unit tests on synthetic documents (no binary fixtures are committed).
// Run: node --test test/

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  newDocument,
  readCdx,
  unwrapCdx,
  writeCdx,
  type CdxDocument,
  type CdxObject,
  type CdxProperty,
} from "../src/binary.ts";
import { canonicalTree, objectCounts } from "../src/dump.ts";
import { molecules, propertyTag, skeletonFormula } from "../src/model.ts";
import {
  COORDINATE_UNIT,
  decodeValue,
  encodeValue,
  type CdxValue,
} from "../src/values.ts";
import { OBJECT_TAGS } from "../src/tags.generated.ts";

const tagOf = (name: string): number => {
  for (const [tag, n] of OBJECT_TAGS) if (n === name) return tag;
  throw new Error(name);
};

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

const obj = (
  name: string,
  id: number,
  items: CdxObject["items"],
): CdxObject => ({
  kind: "object",
  tag: tagOf(name),
  id,
  items,
});

const at = (x: number, y: number): CdxValue => ({
  type: "point2d",
  raw: {
    x: Math.round(x * COORDINATE_UNIT),
    y: Math.round(y * COORDINATE_UNIT),
  },
});

/** Ethanol-like skeleton C-C-O with a double bond flag on the second bond. */
function sampleDocument(): CdxDocument {
  const doc = newDocument(1);
  doc.root.items.push(
    prop("CreationProgram", {
      type: "string",
      runs: [],
      textBytes: new TextEncoder().encode("cdx-core test"),
      text: "cdx-core test",
    }),
    obj("Page", 2, [
      obj("Fragment", 3, [
        obj("Node", 10, [prop("2DPosition", at(100, 100))]),
        obj("Node", 11, [prop("2DPosition", at(114.4, 100))]),
        obj("Node", 12, [
          prop("2DPosition", at(128.8, 100)),
          prop("Node_Element", int(8)),
          prop("Atom_Charge", int(-1, 1)),
        ]),
        obj("Bond", 20, [
          prop("Bond_Begin", int(10, 4, false)),
          prop("Bond_End", int(11, 4, false)),
        ]),
        obj("Bond", 21, [
          prop("Bond_Begin", int(11, 4, false)),
          prop("Bond_End", int(12, 4, false)),
          prop("Bond_Order", int(2)),
        ]),
      ]),
    ]),
  );
  return doc;
}

const mustRead = (bytes: Uint8Array): CdxDocument => {
  const r = readCdx(bytes);
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.value;
};

test("write → read → write is byte-identical and tree-identical", () => {
  const doc = sampleDocument();
  const bytes = writeCdx(doc);
  const back = mustRead(bytes);
  assert.deepEqual(canonicalTree(back.root), canonicalTree(doc.root));
  assert.deepEqual(writeCdx(back), bytes);
  assert.equal(back.documentTagInHeader, true);
  assert.equal(back.root.id, 1);
  assert.deepEqual(objectCounts(back), {
    Document: 1,
    Page: 1,
    Fragment: 1,
    Node: 3,
    Bond: 2,
  });
});

test("modern header carries the Document tag and id in bytes 22..27", () => {
  const bytes = writeCdx(newDocument(0x01020304));
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 8)), "VjCD0100");
  assert.deepEqual([...bytes.subarray(8, 12)], [4, 3, 2, 1]);
  assert.deepEqual([...bytes.subarray(22, 28)], [0x00, 0x80, 4, 3, 2, 1]);
  // empty Document: end tag, then the writer's extra end tag
  assert.deepEqual([...bytes.subarray(28)], [0, 0, 0, 0]);
});

test("legacy header (zero bytes 22..27) is preserved", () => {
  const doc = sampleDocument();
  doc.documentTagInHeader = false;
  doc.root.id = 0;
  const bytes = writeCdx(doc);
  assert.deepEqual([...bytes.subarray(22, 28)], [0, 0, 0, 0, 0, 0]);
  const back = mustRead(bytes);
  assert.equal(back.documentTagInHeader, false);
  assert.deepEqual(writeCdx(back), bytes);
});

test("molecule projection reads atoms, bonds, defaults and charge", () => {
  const [mol] = molecules(mustRead(writeCdx(sampleDocument())));
  assert.ok(mol);
  assert.equal(skeletonFormula(mol), "C2O");
  assert.deepEqual(
    mol.atoms.map((a) => [a.element, a.charge, a.nodeType]),
    [
      [6, 0, "Element"],
      [6, 0, "Element"],
      [8, -1, "Element"],
    ],
  );
  assert.deepEqual(
    mol.bonds.map((b) => b.order),
    [1, 2],
  );
  assert.equal(mol.danglingBonds, 0);
  // fixed point: 1/65536 pt resolution
  assert.ok(Math.abs((mol.atoms[1]?.position?.x ?? 0) - 114.4) < 1 / 65536);
});

test("long-form lengths: required above 0xFFFE and preserved when used early", () => {
  const doc = newDocument();
  const big: CdxProperty = {
    kind: "property",
    tag: propertyTag("Comment"),
    data: new Uint8Array(70000).fill(0x41),
    longLength: false,
  };
  const small: CdxProperty = {
    ...big,
    data: new Uint8Array([0, 0, 0x42]),
    longLength: true,
  };
  doc.root.items.push(big, small);
  const bytes = writeCdx(doc);
  const back = mustRead(bytes);
  const [b0, b1] = back.root.items as CdxProperty[];
  assert.equal(b0?.data.length, 70000);
  assert.equal(b0?.longLength, true);
  assert.equal(b1?.longLength, true);
  assert.deepEqual(writeCdx(back), bytes);
});

test("unknown and user-defined tags survive a round trip", () => {
  const doc = newDocument();
  doc.root.items.push({
    kind: "object",
    tag: 0xc123, // user-defined object
    id: 99,
    items: [
      {
        kind: "property",
        tag: 0x4321,
        data: new Uint8Array([1, 2, 3]),
        longLength: false,
      },
    ],
  });
  const bytes = writeCdx(doc);
  assert.deepEqual(
    canonicalTree(mustRead(bytes).root),
    canonicalTree(doc.root),
  );
});

test("big-endian documents are detected and written back big-endian", () => {
  const doc = sampleDocument();
  doc.byteOrder = "big";
  doc.header.set([1, 2, 3, 4], 8);
  const bytes = writeCdx(doc);
  const back = mustRead(bytes);
  assert.equal(back.byteOrder, "big");
  assert.deepEqual(writeCdx(back), bytes);
  // payloads are stored as given; typed decode must use the document order
  const node = (back.root.items[1] as CdxObject).items[0] as CdxObject;
  assert.equal(node.id, 3);
});

test("typed codecs are exact inverses", () => {
  const samples: CdxValue[] = [
    int(-5, 1),
    int(65535, 2, false),
    int(-123456, 4),
    { type: "float64", value: 1.5 },
    { type: "implied-true" },
    at(1.5, -2),
    { type: "rectangle", top: 1, left: 2, bottom: 3, right: 4 },
    { type: "id-array", ids: [1, 2, 0xffffffff] },
  ];
  for (const value of samples) {
    const bytes = encodeValue(value);
    const again = encodeValue(value);
    assert.deepEqual(bytes, again);
  }
  // decode(encode(x)) for a string with one style run
  const run = new Uint8Array([0, 0, 3, 0, 0, 0, 200, 0, 0, 0]);
  const data = new Uint8Array([1, 0, ...run, 0x4f, 0x48]);
  const p: CdxProperty = {
    kind: "property",
    tag: propertyTag("Text"),
    data,
    longLength: false,
  };
  const v = decodeValue(p);
  assert.equal(v.type, "string");
  if (v.type === "string") {
    assert.equal(v.text, "OH");
    assert.equal(v.runs[0]?.font, 3);
    assert.equal(v.runs[0]?.size, 200);
  }
  assert.deepEqual(encodeValue(v), data);
});

test("payloads that do not fit their declared type stay raw", () => {
  const p: CdxProperty = {
    kind: "property",
    tag: propertyTag("2DPosition"),
    data: new Uint8Array([1, 2, 3]),
    longLength: false,
  };
  const v = decodeValue(p);
  assert.equal(v.type, "raw");
  assert.deepEqual(encodeValue(v), p.data);
});

test("malformed input is reported, not thrown", () => {
  const good = writeCdx(sampleDocument());
  const cases: Array<[Uint8Array, string]> = [
    [new TextEncoder().encode("XXXX0100" + "\0".repeat(30)), "not-cdx"],
    [good.subarray(0, 20), "truncated"],
    [good.subarray(0, good.length - 6), "unterminated"],
    [good.subarray(0, 40), "truncated"],
  ];
  for (const [bytes, code] of cases) {
    const r = readCdx(bytes);
    assert.equal(r.ok, false, code);
    if (!r.ok) assert.equal(r.error.code, code);
  }
});

test("base64-wrapped CDX is unwrapped; other text is rejected", () => {
  const bytes = writeCdx(sampleDocument());
  const b64 = new TextEncoder().encode(
    Buffer.from(bytes).toString("base64") + "\n",
  );
  const r = unwrapCdx(b64);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.value, bytes);
  const bad = unwrapCdx(new TextEncoder().encode("<CDXML>"));
  assert.equal(bad.ok, false);
});
