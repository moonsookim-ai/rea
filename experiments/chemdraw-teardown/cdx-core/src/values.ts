// Typed decoding of CDX property payloads, driven by the data type that
// CDXConstants.h names for each property tag.
//
// Every decoded value keeps what it needs to re-encode the original bytes
// (integer width, string style runs, raw text bytes), and `encodeValue`
// is tested to be the exact inverse of `decodeValue` on real files. A
// payload whose length does not fit its declared type is returned as
// `{ type: "raw" }` with a reason instead of being guessed at.

import type { ByteOrder, CdxProperty } from "./binary.ts";
import { PROPERTY_TAGS } from "./tags.generated.ts";
import { toHex } from "./bytes.ts";

/** CDX coordinates are fixed point: 1 unit = 1/65536 point. */
export const COORDINATE_UNIT = 65536;

export interface Point2D {
  readonly x: number;
  readonly y: number;
}
export interface Point3D extends Point2D {
  readonly z: number;
}

export interface StyleRun {
  /** The 10 raw bytes: start(u16) font(u16) face(u16) size(u16) color(u16). */
  readonly raw: Uint8Array;
  readonly start: number;
  readonly font: number;
  readonly face: number;
  /** Size in 1/20 point. */
  readonly size: number;
  readonly color: number;
}

export interface FontEntry {
  readonly id: number;
  readonly charset: number;
  readonly name: string;
  readonly nameBytes: Uint8Array;
}

export type CdxValue =
  | {
      readonly type: "int";
      readonly signed: boolean;
      readonly width: 1 | 2 | 4;
      readonly value: number;
    }
  | { readonly type: "float64"; readonly value: number }
  | { readonly type: "implied-true" }
  | {
      readonly type: "font-style";
      readonly font: number;
      readonly face: number;
      /** Size in 1/20 point. */
      readonly size: number;
      readonly color: number;
    }
  | { readonly type: "point2d"; readonly raw: Point2D }
  | { readonly type: "point3d"; readonly raw: Point3D }
  | {
      readonly type: "rectangle";
      readonly top: number;
      readonly left: number;
      readonly bottom: number;
      readonly right: number;
    }
  | { readonly type: "id-array"; readonly ids: readonly number[] }
  | {
      readonly type: "counted-list";
      readonly itemWidth: 2 | 4;
      readonly signedCount: boolean;
      readonly count: number;
      readonly items: readonly number[];
    }
  | {
      readonly type: "string";
      readonly runs: readonly StyleRun[];
      readonly textBytes: Uint8Array;
      /** windows-1252 view of textBytes; the font charset may differ. */
      readonly text: string;
    }
  | {
      readonly type: "font-table";
      readonly platform: number;
      readonly fonts: readonly FontEntry[];
    }
  | {
      readonly type: "color-table";
      readonly colors: ReadonlyArray<readonly [number, number, number]>;
    }
  | {
      readonly type: "date";
      readonly parts: readonly number[]; // year, month, day, hour, minute, second, ms
    }
  | {
      readonly type: "curve-points";
      readonly dims: 2 | 3;
      readonly points: readonly number[];
    }
  | {
      readonly type: "raw";
      readonly bytes: Uint8Array;
      readonly reason: string;
    };

const INT_TYPES: Record<string, boolean> = {
  INT8: true,
  INT16: true,
  INT32: true,
  int: true,
  UINT8: false,
  UINT16: false,
  UINT32: false,
  CDXObjectID: false,
  CDXCoordinate: true,
  bool: false,
};

/** Booleans: a zero-length payload means true, otherwise GetUINT(size). */
const BOOLEAN_TYPES = new Set([
  "CDXBoolean",
  "CDXBooleanImplied",
  "CDXBoolean, deleted",
]);

/**
 * Properties whose CDXConstants.h comment names no type, typed from how
 * Revvity's reader parses them (CDXDocument.cpp ReadAttribute: the
 * kCDXProp_ChemicalProperty* cases call CDXString::Read).
 */
const CHEMICAL_PROPERTY_STRINGS = new Set(
  [
    "Name",
    "ID",
    "FragmentLabel",
    "Formula",
    "ExactMass",
    "MolWeight",
    "MOverZ",
    "Analysis",
    "BoilingPoint",
    "MeltingPoint",
    "CriticalTemp",
    "CriticalPressure",
    "CriticalVolume",
    "GibbsEnergy",
    "LogP",
    "MR",
    "HenrysLaw",
    "HeatOfForm",
    "tPSA",
    "CLogP",
    "CMR",
    "LogS",
    "PKa",
  ].map((n) => `ChemicalProperty${n}`),
);

const win1252 = new TextDecoder("windows-1252");

const raw = (bytes: Uint8Array, reason: string): CdxValue => ({
  type: "raw",
  bytes,
  reason,
});

export function declaredType(tag: number): string | null {
  const info = PROPERTY_TAGS.get(tag);
  if (info === undefined) return null;
  if (info.type === null && CHEMICAL_PROPERTY_STRINGS.has(info.name))
    return "CDXString";
  return info.type;
}

// ---- decoding -------------------------------------------------------------

/** Bounds-unaware cursor; every decoder checks the payload length first. */
class Cursor {
  readonly view: DataView;
  readonly le: boolean;
  at = 0;
  constructor(bytes: Uint8Array, le: boolean) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.le = le;
  }
  u16(): number {
    const v = this.view.getUint16(this.at, this.le);
    this.at += 2;
    return v;
  }
  i16(): number {
    const v = this.view.getInt16(this.at, this.le);
    this.at += 2;
    return v;
  }
  i32(): number {
    const v = this.view.getInt32(this.at, this.le);
    this.at += 4;
    return v;
  }
  u32(): number {
    const v = this.view.getUint32(this.at, this.le);
    this.at += 4;
    return v;
  }
  i32s(n: number): number[] {
    return Array.from({ length: n }, () => this.i32());
  }
}

type Decoder = (d: Uint8Array, c: Cursor, type: string) => CdxValue;

const fixed =
  (size: number, build: (c: Cursor) => CdxValue): Decoder =>
  (d, c, type) =>
    d.length === size ? build(c) : raw(d, `${type} with ${d.length} bytes`);

const decodeInt: Decoder = (d, c, type) => {
  const signed = INT_TYPES[type] ?? false;
  const v = c.view;
  if (d.length === 1)
    return {
      type: "int",
      signed,
      width: 1,
      value: signed ? v.getInt8(0) : v.getUint8(0),
    };
  if (d.length === 2)
    return { type: "int", signed, width: 2, value: signed ? c.i16() : c.u16() };
  if (d.length === 4)
    return { type: "int", signed, width: 4, value: signed ? c.i32() : c.u32() };
  return raw(d, `${type} with ${d.length} bytes`);
};

const decodeBoolean: Decoder = (d, c, type) =>
  d.length === 0 ? { type: "implied-true" } : decodeInt(d, c, type);

const countedList =
  (itemWidth: 2 | 4, signedCount: boolean): Decoder =>
  (d, c) => {
    if (d.length < 2) return raw(d, "short counted list");
    const count = signedCount ? c.i16() : c.u16();
    const n = Math.abs(count);
    if (d.length !== 2 + n * itemWidth)
      return raw(d, "counted list length mismatch");
    const items = Array.from({ length: n }, () =>
      itemWidth === 2 ? c.i16() : c.u32(),
    );
    return { type: "counted-list", itemWidth, signedCount, count, items };
  };

const decodeString: Decoder = (d, c) => {
  if (d.length < 2) return raw(d, "short CDXString");
  const n = c.u16();
  const textAt = 2 + n * 10;
  if (textAt > d.length) return raw(d, "CDXString style runs overrun");
  const runs: StyleRun[] = Array.from({ length: n }, () => {
    const start = c.at;
    return {
      raw: d.slice(start, start + 10),
      start: c.u16(),
      font: c.u16(),
      face: c.u16(),
      size: c.u16(),
      color: c.u16(),
    };
  });
  const textBytes = d.slice(textAt);
  return { type: "string", runs, textBytes, text: win1252.decode(textBytes) };
};

const decodeFontTable: Decoder = (d, c) => {
  if (d.length < 4) return raw(d, "short font table");
  const platform = c.u16();
  const n = c.u16();
  const fonts: FontEntry[] = [];
  for (let i = 0; i < n; i += 1) {
    if (c.at + 6 > d.length) return raw(d, "font table entry overrun");
    const id = c.u16();
    const charset = c.u16();
    const len = c.u16();
    if (c.at + len > d.length) return raw(d, "font name overrun");
    const nameBytes = d.slice(c.at, c.at + len);
    c.at += len;
    fonts.push({ id, charset, name: win1252.decode(nameBytes), nameBytes });
  }
  return c.at === d.length
    ? { type: "font-table", platform, fonts }
    : raw(d, "font table trailing bytes");
};

const decodeColorTable: Decoder = (d, c) => {
  if (d.length < 2) return raw(d, "short color table");
  const n = c.u16();
  if (d.length !== 2 + n * 6) return raw(d, "color table length mismatch");
  const colors = Array.from(
    { length: n },
    () => [c.u16(), c.u16(), c.u16()] as const,
  );
  return { type: "color-table", colors };
};

const decodeCurve =
  (dims: 2 | 3): Decoder =>
  (d, c) => {
    if (d.length < 2) return raw(d, "short curve");
    const n = c.u16();
    if (d.length !== 2 + n * dims * 4) return raw(d, "curve length mismatch");
    return { type: "curve-points", dims, points: c.i32s(n * dims) };
  };

const DECODERS: Record<string, Decoder> = {
  FLOAT64: fixed(8, (c) => ({
    type: "float64",
    value: c.view.getFloat64(0, c.le),
  })),
  // stored y, x
  CDXPoint2D: fixed(8, (c) => ({
    type: "point2d",
    raw: { y: c.i32(), x: c.i32() },
  })),
  // stored z, y, x
  CDXPoint3D: fixed(12, (c) => ({
    type: "point3d",
    raw: { z: c.i32(), y: c.i32(), x: c.i32() },
  })),
  CDXRectangle: fixed(16, (c) => ({
    type: "rectangle",
    top: c.i32(),
    left: c.i32(),
    bottom: c.i32(),
    right: c.i32(),
  })),
  CDXFontStyle: fixed(8, (c) => ({
    type: "font-style",
    font: c.u16(),
    face: c.u16(),
    size: c.u16(),
    color: c.u16(),
  })),
  CDXDate: fixed(14, (c) => ({
    type: "date",
    parts: Array.from({ length: 7 }, () => c.u16()),
  })),
  CDXObjectIDArray: (d, c) =>
    d.length % 4 === 0
      ? {
          type: "id-array",
          ids: Array.from({ length: d.length / 4 }, () => c.u32()),
        }
      : raw(d, "id array not a multiple of 4"),
  CDXObjectIDArrayWithCounts: countedList(4, false),
  INT16ListWithCounts: countedList(2, false),
  // INT16 count (negative = "NOT" list), then INT16 atomic numbers
  CDXElementList: countedList(2, true),
  CDXString: decodeString,
  CDXFontTable: decodeFontTable,
  CDXColorTable: decodeColorTable,
  CDXCurvePoints: decodeCurve(2),
  CDXCurvePoints3D: decodeCurve(3),
};
for (const t of Object.keys(INT_TYPES)) DECODERS[t] = decodeInt;
for (const t of BOOLEAN_TYPES) DECODERS[t] = decodeBoolean;

export function decodeValue(
  prop: CdxProperty,
  byteOrder: ByteOrder = "little",
): CdxValue {
  const type = declaredType(prop.tag);
  if (type === null) return raw(prop.data, "no declared type");
  const decoder = DECODERS[type];
  if (decoder === undefined)
    return raw(prop.data, `type "${type}" kept as bytes`);
  return decoder(
    prop.data,
    new Cursor(prop.data, byteOrder === "little"),
    type,
  );
}

// ---- encoding -------------------------------------------------------------

class Builder {
  private readonly parts: number[][] = [];
  private readonly le: boolean;
  constructor(le: boolean) {
    this.le = le;
  }
  private put(size: number, write: (v: DataView) => void): this {
    const b = new Uint8Array(size);
    write(new DataView(b.buffer));
    this.parts.push([...b]);
    return this;
  }
  u8(n: number, signed = false): this {
    return this.put(1, (v) => (signed ? v.setInt8(0, n) : v.setUint8(0, n)));
  }
  u16(n: number, signed = false): this {
    return this.put(2, (v) =>
      signed ? v.setInt16(0, n, this.le) : v.setUint16(0, n, this.le),
    );
  }
  u32(n: number, signed = false): this {
    return this.put(4, (v) =>
      signed ? v.setInt32(0, n, this.le) : v.setUint32(0, n, this.le),
    );
  }
  f64(n: number): this {
    return this.put(8, (v) => v.setFloat64(0, n, this.le));
  }
  bytes(b: Uint8Array): this {
    this.parts.push([...b]);
    return this;
  }
  done(): Uint8Array {
    return new Uint8Array(this.parts.flat());
  }
}

type Encoders = {
  [K in CdxValue["type"]]: (
    value: Extract<CdxValue, { type: K }>,
    b: Builder,
  ) => Builder;
};

const ENCODERS: Encoders = {
  int: (v, b) =>
    v.width === 1
      ? b.u8(v.value, v.signed)
      : v.width === 2
        ? b.u16(v.value, v.signed)
        : b.u32(v.value, v.signed),
  float64: (v, b) => b.f64(v.value),
  "implied-true": (_v, b) => b,
  "font-style": (v, b) => b.u16(v.font).u16(v.face).u16(v.size).u16(v.color),
  point2d: (v, b) => b.u32(v.raw.y, true).u32(v.raw.x, true),
  point3d: (v, b) => b.u32(v.raw.z, true).u32(v.raw.y, true).u32(v.raw.x, true),
  rectangle: (v, b) =>
    b.u32(v.top, true).u32(v.left, true).u32(v.bottom, true).u32(v.right, true),
  "id-array": (v, b) => v.ids.reduce((acc, id) => acc.u32(id), b),
  "counted-list": (v, b) =>
    v.items.reduce(
      (acc, item) => (v.itemWidth === 2 ? acc.u16(item, true) : acc.u32(item)),
      b.u16(v.count, v.signedCount),
    ),
  string: (v, b) =>
    v.runs
      .reduce((acc, r) => acc.bytes(r.raw), b.u16(v.runs.length))
      .bytes(v.textBytes),
  "font-table": (v, b) =>
    v.fonts.reduce(
      (acc, f) =>
        acc.u16(f.id).u16(f.charset).u16(f.nameBytes.length).bytes(f.nameBytes),
      b.u16(v.platform).u16(v.fonts.length),
    ),
  "color-table": (v, b) =>
    v.colors.reduce(
      (acc, [r, g, bl]) => acc.u16(r).u16(g).u16(bl),
      b.u16(v.colors.length),
    ),
  date: (v, b) => v.parts.reduce((acc, p) => acc.u16(p), b),
  "curve-points": (v, b) =>
    v.points.reduce(
      (acc, p) => acc.u32(p, true),
      b.u16(v.points.length / v.dims),
    ),
  raw: (v, b) => b.bytes(v.bytes),
};

/** Exact inverse of decodeValue. */
export function encodeValue(
  value: CdxValue,
  byteOrder: ByteOrder = "little",
): Uint8Array {
  const encode = ENCODERS[value.type] as (v: CdxValue, b: Builder) => Builder;
  return encode(value, new Builder(byteOrder === "little")).done();
}

/** Human-oriented rendering used by dumps; never used for re-encoding. */
export function formatValue(value: CdxValue): string {
  const pt = (n: number): string =>
    String(Math.round((n / COORDINATE_UNIT) * 1000) / 1000);
  switch (value.type) {
    case "int":
    case "float64":
      return String(value.value);
    case "implied-true":
      return "true";
    case "font-style":
      return `font=${value.font} face=${value.face} size=${value.size / 20}pt color=${value.color}`;
    case "point2d":
      return `(${pt(value.raw.x)}, ${pt(value.raw.y)})pt`;
    case "point3d":
      return `(${pt(value.raw.x)}, ${pt(value.raw.y)}, ${pt(value.raw.z)})pt`;
    case "rectangle":
      return `[t=${pt(value.top)} l=${pt(value.left)} b=${pt(value.bottom)} r=${pt(value.right)}]pt`;
    case "id-array":
      return `[${value.ids.join(" ")}]`;
    case "counted-list":
      return `${value.count < 0 ? "NOT " : ""}[${value.items.join(" ")}]`;
    case "string":
      return JSON.stringify(value.text);
    case "font-table":
      return value.fonts.map((f) => `${f.id}:${f.name}`).join(", ");
    case "color-table":
      return `${value.colors.length} colors`;
    case "date":
      return value.parts.join("-");
    case "curve-points":
      return `${value.points.length / value.dims} points`;
    case "raw": {
      const hex = toHex(value.bytes.subarray(0, 24));
      return `hex:${hex}${value.bytes.length > 24 ? "…" : ""}`;
    }
  }
}
