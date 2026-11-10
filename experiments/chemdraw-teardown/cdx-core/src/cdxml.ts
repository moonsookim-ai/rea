// CDX <-> CDXML conversion over the shared CdxDocument model.
//
// Names and enum texts come from Revvity's own tables
// (cdxml.tables.generated.ts); value text formats follow CDXObject.cpp:
//   coordinates   points with at most 2 decimals ("131.23")
//   CDXPoint2D    "x y"           CDXRectangle  "left top right bottom"
//   booleans      "yes" / "no"    id arrays     space separated
//   CDXString     attribute text, except a <t>'s Text which becomes <s> runs
//   font/color    <fonttable>/<colortable> children of <CDXML>
//   LabelStyle    LabelFont/LabelSize/LabelFace/LabelColor attributes
//
// Anything without a CDXML spelling is kept as `x-cdx-XXXX="hex"` so our own
// CDX -> CDXML -> CDX trip loses nothing beyond the 0.01 pt coordinate
// rounding that ChemDraw's CDXML has as well.

import {
  DOCUMENT_TAG,
  newDocument,
  type ByteOrder,
  type CdxDocument,
  type CdxObject,
  type CdxProperty,
} from "./binary.ts";
import {
  CDXML_ATTRIBUTES,
  CDXML_BINDINGS,
  CDXML_ELEMENTS,
  CDXML_ENUMS,
  CDXML_SCALES,
} from "./cdxml.tables.generated.ts";
import { fail, ok, type Result } from "./result.ts";
import { PROPERTY_TAGS } from "./tags.generated.ts";
import {
  COORDINATE_UNIT,
  declaredType,
  decodeValue,
  encodeValue,
  type CdxValue,
  type StyleRun,
} from "./values.ts";
import { childElements, parseXml, writeXml, type XmlElement } from "./xml.ts";
import { fromHex, toHex } from "./bytes.ts";

const TAG = (name: string): number => {
  for (const [tag, info] of PROPERTY_TAGS) if (info.name === name) return tag;
  throw new Error(`no CDX property ${name}`);
};
const P = {
  Text: TAG("Text"),
  FontTable: TAG("FontTable"),
  ColorTable: TAG("ColorTable"),
  LabelStyle: TAG("LabelStyle"),
  CaptionStyle: TAG("CaptionStyle"),
};
const STYLE_PARTS: Record<number, readonly [number, number, number, number]> = {
  [P.LabelStyle]: [
    TAG("LabelStyleFont"),
    TAG("LabelStyleFace"),
    TAG("LabelStyleSize"),
    TAG("LabelStyleColor"),
  ],
  [P.CaptionStyle]: [
    TAG("CaptionStyleFont"),
    TAG("CaptionStyleFace"),
    TAG("CaptionStyleSize"),
    TAG("CaptionStyleColor"),
  ],
};
const TEXT_OBJECT = 0x8006;
/** kCDXLineHeight_Variable = 0, kCDXLineHeight_Automatic = 1 (CDXConstants.h). */
const LINE_HEIGHTS = new Set([
  TAG("LineHeight"),
  TAG("LabelLineHeight"),
  TAG("CaptionLineHeight"),
]);
const RAW_PREFIX = "x-cdx-";

const ELEMENT_TAGS = new Map(
  [...CDXML_ELEMENTS].map(([tag, name]) => [name, tag]),
);
const ATTRIBUTE_TAGS = new Map<string, number>();
for (const [tag, name] of CDXML_ATTRIBUTES)
  if (!ATTRIBUTE_TAGS.has(name)) ATTRIBUTE_TAGS.set(name, tag);
const CHARSETS = CDXML_ENUMS["sXMLCharSetValues"] ?? [];

// ---- windows-1252 (CDX text bytes) ----------------------------------------

const CP1252_HIGH = "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ";
const win1252 = new TextDecoder("windows-1252");
function encode1252(s: string): Uint8Array {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 63;
    const hi = CP1252_HIGH.indexOf(ch);
    out.push(hi >= 0 ? 0x80 + hi : c < 256 ? c : 63);
  }
  return new Uint8Array(out);
}

// ---- number formatting ----------------------------------------------------

/** CDXValueToString: fixed precision with trailing zeros removed. */
export function fixed(v: number, precision: number): string {
  const s = v.toFixed(precision);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}
const pt = (units: number): string => fixed(units / COORDINATE_UNIT, 2);
const units = (points: string): number =>
  Math.round(Number.parseFloat(points) * COORDINATE_UNIT);
const hex = (b: Uint8Array): string => toHex(b).toUpperCase();
const unhex = (s: string): Uint8Array => fromHex(s);

function enumText(tag: number, value: number): string | undefined {
  const binding = CDXML_BINDINGS.get(tag);
  const table = binding === undefined ? undefined : CDXML_ENUMS[binding.table];
  if (binding === undefined || table === undefined) return undefined;
  const exact = table.find(([v]) => v === value);
  if (exact !== undefined) return exact[1];
  if (!binding.tokens) return undefined;
  const parts = table.filter(([v]) => v !== 0 && (value & v) === v);
  const covered = parts.reduce((acc, [v]) => acc | v, 0);
  return covered === value && parts.length > 0
    ? parts.map(([, t]) => t).join(" ")
    : undefined;
}

function enumValue(tag: number, text: string): number | undefined {
  const binding = CDXML_BINDINGS.get(tag);
  const table = binding === undefined ? undefined : CDXML_ENUMS[binding.table];
  if (binding === undefined || table === undefined) return undefined;
  const one = (t: string): number | undefined =>
    table.find(([, label]) => label === t)?.[0];
  const exact = one(text);
  if (exact !== undefined) return exact;
  if (!binding.tokens) return undefined;
  let acc = 0;
  for (const t of text.trim().split(/\s+/)) {
    const v = one(t);
    if (v === undefined) return undefined;
    acc |= v;
  }
  return acc;
}

// ---- CDX -> CDXML -----------------------------------------------------------

function valueText(tag: number, value: CdxValue): string | undefined {
  const type = declaredType(tag);
  const scale = CDXML_SCALES.get(tag);
  if (value.type === "raw" && scale === "hex") return hex(value.bytes);
  if (
    value.type === "int" &&
    LINE_HEIGHTS.has(tag) &&
    (value.value === 0 || value.value === 1)
  ) {
    return value.value === 1 ? "auto" : "variable";
  }
  if (value.type === "int") {
    const label = enumText(tag, value.value);
    if (label !== undefined) return label;
    if (CDXML_BINDINGS.has(tag)) return undefined; // value outside the table
    if (scale === "tenths") return fixed(value.value / 10, 1);
    if (scale === "angle") return fixed(value.value / COORDINATE_UNIT, 2);
    if (type === "CDXCoordinate" || scale === "coordinate")
      return pt(value.value);
    if (type !== null && type.startsWith("CDXBoolean"))
      return value.value !== 0 ? "yes" : "no";
    return String(value.value);
  }
  switch (value.type) {
    case "implied-true":
      return "yes";
    case "float64":
      return String(value.value);
    case "point2d":
      return `${pt(value.raw.x)} ${pt(value.raw.y)}`;
    case "point3d":
      return `${pt(value.raw.x)} ${pt(value.raw.y)} ${pt(value.raw.z)}`;
    case "rectangle":
      return `${pt(value.left)} ${pt(value.top)} ${pt(value.right)} ${pt(value.bottom)}`;
    case "id-array":
      return value.ids.join(" ");
    case "counted-list":
      return `${value.count < 0 ? "NOT " : ""}${value.items.join(" ")}`;
    case "string":
      return value.text;
    case "curve-points":
      return value.points.map(pt).join(" ");
    case "raw":
      return type === "Unformatted" ? hex(value.bytes) : undefined;
    default:
      return undefined;
  }
}

function styleRunsToXml(
  value: Extract<CdxValue, { type: "string" }>,
): XmlElement[] {
  const s = (
    attrs: Array<[string, string]>,
    from: number,
    to: number,
  ): XmlElement => ({
    name: "s",
    attrs,
    children: [win1252.decode(value.textBytes.subarray(from, to))],
  });
  if (value.runs.length === 0) return [s([], 0, value.textBytes.length)];
  const out: XmlElement[] = [];
  const first = value.runs[0];
  if (first !== undefined && first.start > 0) out.push(s([], 0, first.start));
  value.runs.forEach((r, i) => {
    const end = value.runs[i + 1]?.start ?? value.textBytes.length;
    out.push(
      s(
        // CDXText.cpp XMLWriteCDXString: color omitted when 3, face when 0
        [
          ["font", String(r.font === 0xffff ? -1 : r.font)],
          ["size", String(r.size / 20)],
          ...(r.color !== 3
            ? ([["color", String(r.color)]] as Array<[string, string]>)
            : []),
          ...(r.face !== 0
            ? ([["face", String(r.face)]] as Array<[string, string]>)
            : []),
        ],
        r.start,
        end,
      ),
    );
  });
  return out;
}

export interface CdxmlReport {
  /** Properties written as x-cdx-* because CDXML has no spelling for them. */
  preserved: number;
  /** CDXML attributes that could not be mapped back to CDX properties. */
  skipped: string[];
}

function objectToXml(
  obj: CdxObject,
  byteOrder: ByteOrder,
  report: CdxmlReport,
): XmlElement {
  const name =
    obj.tag === DOCUMENT_TAG
      ? "CDXML"
      : (CDXML_ELEMENTS.get(obj.tag) ?? `${RAW_PREFIX}object`);
  const el: XmlElement = { name, attrs: [], children: [] };
  if (!CDXML_ELEMENTS.has(obj.tag))
    el.attrs.push([`${RAW_PREFIX}tag`, obj.tag.toString(16)]);
  if (obj.tag !== DOCUMENT_TAG) el.attrs.push(["id", String(obj.id)]);
  const leading: XmlElement[] = [];
  for (const item of obj.items) {
    if (item.kind === "object") {
      el.children.push(objectToXml(item, byteOrder, report));
      continue;
    }
    const value = decodeValue(item, byteOrder);
    if (
      item.tag === P.Text &&
      obj.tag === TEXT_OBJECT &&
      value.type === "string"
    ) {
      el.children.push(...styleRunsToXml(value));
      continue;
    }
    if (item.tag === P.FontTable && value.type === "font-table") {
      leading.push({
        name: "fonttable",
        attrs: [],
        children: value.fonts.map((f) => ({
          name: "font",
          attrs: [
            ["id", String(f.id)],
            [
              "charset",
              CHARSETS.find(([v]) => v === f.charset)?.[1] ?? String(f.charset),
            ],
            ["name", f.name],
          ],
          children: [],
        })),
      });
      continue;
    }
    if (item.tag === P.ColorTable && value.type === "color-table") {
      leading.push({
        name: "colortable",
        attrs: [],
        children: value.colors.map(([r, g, b]) => ({
          name: "color",
          attrs: [
            ["r", fixed(r / 65535, 4)],
            ["g", fixed(g / 65535, 4)],
            ["b", fixed(b / 65535, 4)],
          ],
          children: [],
        })),
      });
      continue;
    }
    const parts = STYLE_PARTS[item.tag];
    if (parts !== undefined && value.type === "font-style") {
      const [font, face, size, color] = parts;
      el.attrs.push([CDXML_ATTRIBUTES.get(font) ?? "", String(value.font)]);
      el.attrs.push([
        CDXML_ATTRIBUTES.get(size) ?? "",
        fixed(value.size / 20, 2),
      ]);
      el.attrs.push([CDXML_ATTRIBUTES.get(face) ?? "", String(value.face)]);
      if (value.color !== 0xffff)
        el.attrs.push([CDXML_ATTRIBUTES.get(color) ?? "", String(value.color)]);
      continue;
    }
    const attr = CDXML_ATTRIBUTES.get(item.tag);
    const text = attr === undefined ? undefined : valueText(item.tag, value);
    if (attr !== undefined && text !== undefined) {
      el.attrs.push([attr, text]);
    } else {
      el.attrs.push([
        `${RAW_PREFIX}${item.tag.toString(16).padStart(4, "0")}`,
        hex(item.data),
      ]);
      report.preserved += 1;
    }
  }
  el.children.unshift(...leading);
  return el;
}

export function toCdxml(doc: CdxDocument): {
  text: string;
  report: CdxmlReport;
} {
  const report: CdxmlReport = { preserved: 0, skipped: [] };
  const root = objectToXml(doc.root, doc.byteOrder, report);
  const prolog =
    '<?xml version="1.0" encoding="UTF-8" ?>\n<!DOCTYPE CDXML SYSTEM "http://www.cambridgesoft.com/xml/cdxml.dtd" >\n';
  return {
    text: writeXml(root, prolog, new Set(["s", "font", "color"])),
    report,
  };
}

// ---- CDXML -> CDX -----------------------------------------------------------

const WIDTH: Record<string, 1 | 2 | 4> = {
  INT8: 1,
  UINT8: 1,
  INT16: 2,
  UINT16: 2,
  INT32: 4,
  UINT32: 4,
  int: 4,
  CDXObjectID: 4,
  CDXCoordinate: 4,
  CDXBoolean: 1,
  "CDXBoolean, deleted": 1,
  bool: 1,
};
const SIGNED = new Set(["INT8", "INT16", "INT32", "int", "CDXCoordinate"]);

const numbers = (text: string): number[] =>
  text.trim() === ""
    ? []
    : text
        .trim()
        .split(/[\s,]+/)
        .map(Number);

function parseValue(tag: number, text: string): CdxValue | undefined {
  const type = declaredType(tag) ?? "";
  const fromEnum = enumValue(tag, text);
  if (fromEnum !== undefined || CDXML_BINDINGS.has(tag)) {
    if (fromEnum === undefined) return undefined;
    const width = WIDTH[type] ?? 2;
    const signed = SIGNED.has(type) || fromEnum < 0;
    return { type: "int", signed, width, value: fromEnum };
  }
  const n = numbers(text);
  const allNumbers = n.length > 0 && n.every(Number.isFinite);
  const scale = CDXML_SCALES.get(tag);
  const width0 = WIDTH[type] ?? 4;
  if (LINE_HEIGHTS.has(tag) && (text === "auto" || text === "variable")) {
    return {
      type: "int",
      signed: false,
      width: width0,
      value: text === "auto" ? 1 : 0,
    };
  }
  if (allNumbers && n.length === 1 && scale !== undefined && scale !== "hex") {
    const v = n[0] ?? 0;
    const value =
      scale === "tenths" ? Math.round(v * 10) : Math.round(v * COORDINATE_UNIT);
    return { type: "int", signed: true, width: width0, value };
  }
  if (scale === "hex" && /^[0-9A-Fa-f]*$/.test(text))
    return { type: "raw", bytes: unhex(text), reason: "hex" };
  if (type === "CDXBooleanImplied")
    return text === "no"
      ? { type: "int", signed: false, width: 1, value: 0 }
      : { type: "implied-true" };
  if (type.startsWith("CDXBoolean") || type === "bool") {
    return {
      type: "int",
      signed: false,
      width: 1,
      value: text === "yes" || text === "1" ? 1 : 0,
    };
  }
  if (type === "CDXCoordinate" && allNumbers)
    return { type: "int", signed: true, width: 4, value: units(text) };
  const width = WIDTH[type];
  if (width !== undefined && allNumbers && n.length === 1) {
    return {
      type: "int",
      signed: SIGNED.has(type) || (n[0] ?? 0) < 0,
      width,
      value: Math.trunc(n[0] ?? 0),
    };
  }
  const xs = text.trim().split(/\s+/);
  switch (type) {
    case "FLOAT64":
      return allNumbers ? { type: "float64", value: n[0] ?? 0 } : undefined;
    case "CDXPoint2D":
      return n.length === 2
        ? {
            type: "point2d",
            raw: { x: units(xs[0] ?? ""), y: units(xs[1] ?? "") },
          }
        : undefined;
    case "CDXPoint3D":
      return n.length === 3
        ? {
            type: "point3d",
            raw: {
              x: units(xs[0] ?? ""),
              y: units(xs[1] ?? ""),
              z: units(xs[2] ?? ""),
            },
          }
        : undefined;
    case "CDXRectangle":
      return n.length === 4
        ? {
            type: "rectangle",
            left: units(xs[0] ?? ""),
            top: units(xs[1] ?? ""),
            right: units(xs[2] ?? ""),
            bottom: units(xs[3] ?? ""),
          }
        : undefined;
    case "CDXObjectIDArray":
      return { type: "id-array", ids: numbers(text) };
    case "CDXObjectIDArrayWithCounts":
    case "INT16ListWithCounts": {
      const items = numbers(text);
      return {
        type: "counted-list",
        itemWidth: type === "INT16ListWithCounts" ? 2 : 4,
        signedCount: false,
        count: items.length,
        items,
      };
    }
    case "CDXElementList": {
      const not = text.trim().startsWith("NOT");
      const items = numbers(text.replace(/^\s*NOT/, ""));
      return {
        type: "counted-list",
        itemWidth: 2,
        signedCount: true,
        count: not ? -items.length : items.length,
        items,
      };
    }
    case "CDXString":
      return { type: "string", runs: [], textBytes: encode1252(text), text };
    case "Unformatted":
      return /^[0-9A-Fa-f]*$/.test(text) && text.length % 2 === 0
        ? { type: "raw", bytes: unhex(text), reason: "Unformatted" }
        : undefined;
    case "CDXCurvePoints":
    case "CDXCurvePoints3D":
      return allNumbers
        ? {
            type: "curve-points",
            dims: type === "CDXCurvePoints" ? 2 : 3,
            points: xs.map(units),
          }
        : undefined;
    default:
      return undefined;
  }
}

const property = (tag: number, value: CdxValue): CdxProperty => ({
  kind: "property",
  tag,
  data: encodeValue(value),
  longLength: false,
});

function sRunsToText(el: XmlElement): CdxProperty {
  const runs: StyleRun[] = [];
  const bytes: number[] = [];
  for (const s of childElements(el).filter((c) => c.name === "s")) {
    const text = encode1252(
      s.children.map((c) => (typeof c === "string" ? c : "")).join(""),
    );
    const get = (k: string): string | undefined =>
      s.attrs.find(([a]) => a === k)?.[1];
    const font = get("font");
    if (
      font !== undefined ||
      get("size") !== undefined ||
      get("face") !== undefined
    ) {
      const run = {
        start: bytes.length,
        font: font === undefined || font === "-1" ? 0xffff : Number(font),
        face: Number(get("face") ?? 0),
        size: Math.round(Number(get("size") ?? 10) * 20),
        color: Number(get("color") ?? 3),
      };
      const raw = new Uint8Array(10);
      const v = new DataView(raw.buffer);
      [run.start, run.font, run.face, run.size, run.color].forEach((x, i) =>
        v.setUint16(i * 2, x, true),
      );
      runs.push({ ...run, raw });
    }
    bytes.push(...text);
  }
  const textBytes = new Uint8Array(bytes);
  return property(P.Text, {
    type: "string",
    runs,
    textBytes,
    text: win1252.decode(textBytes),
  });
}

function xmlToObject(
  el: XmlElement,
  report: CdxmlReport,
): CdxObject | undefined {
  const rawTag = el.attrs.find(([k]) => k === `${RAW_PREFIX}tag`)?.[1];
  const tag =
    el.name === "CDXML"
      ? DOCUMENT_TAG
      : rawTag !== undefined
        ? Number.parseInt(rawTag, 16)
        : ELEMENT_TAGS.get(el.name);
  if (tag === undefined) {
    report.skipped.push(`<${el.name}>`);
    return undefined;
  }
  const obj: CdxObject = { kind: "object", tag, id: 0, items: [] };
  const styles = new Map<number, [number, number, number, number]>();
  for (const [name, text] of el.attrs) {
    if (name === "id") {
      obj.id = Number(text) >>> 0;
      continue;
    }
    if (name === `${RAW_PREFIX}tag`) continue;
    if (name.startsWith(RAW_PREFIX)) {
      obj.items.push({
        kind: "property",
        tag: Number.parseInt(name.slice(RAW_PREFIX.length), 16),
        data: unhex(text),
        longLength: false,
      });
      continue;
    }
    const ptag = ATTRIBUTE_TAGS.get(name);
    const styleOwner = Object.entries(STYLE_PARTS).find(
      ([, parts]) => ptag !== undefined && parts.includes(ptag),
    );
    if (styleOwner !== undefined && ptag !== undefined) {
      const owner = Number(styleOwner[0]);
      const slot = styleOwner[1].indexOf(ptag);
      const cur = styles.get(owner) ?? [0xffff, 0, 200, 0xffff];
      cur[slot] =
        slot === 2 ? Math.round(Number(text) * 20) : Number(text) & 0xffff;
      styles.set(owner, cur);
      continue;
    }
    const value = ptag === undefined ? undefined : parseValue(ptag, text);
    if (ptag === undefined || value === undefined) {
      report.skipped.push(`${el.name}@${name}`);
      continue;
    }
    obj.items.push(property(ptag, value));
  }
  for (const [owner, [font, face, size, color]] of styles) {
    obj.items.push(
      property(owner, { type: "font-style", font, face, size, color }),
    );
  }
  for (const child of childElements(el)) {
    if (child.name === "s") continue;
    if (child.name === "fonttable") {
      const fonts = childElements(child).map((f) => {
        const get = (k: string): string =>
          f.attrs.find(([a]) => a === k)?.[1] ?? "";
        const cs = get("charset");
        const nameBytes = encode1252(get("name"));
        return {
          id: Number(get("id")),
          charset:
            CHARSETS.find(([, label]) => label === cs)?.[0] ??
            (Number(cs) || 0),
          name: get("name"),
          nameBytes,
        };
      });
      obj.items.push(
        property(P.FontTable, { type: "font-table", platform: 0, fonts }),
      );
      continue;
    }
    if (child.name === "colortable") {
      const colors = childElements(child).map((c) => {
        const get = (k: string): number =>
          Math.round(Number(c.attrs.find(([a]) => a === k)?.[1] ?? 0) * 65535);
        return [get("r"), get("g"), get("b")] as const;
      });
      obj.items.push(property(P.ColorTable, { type: "color-table", colors }));
      continue;
    }
    const o = xmlToObject(child, report);
    if (o !== undefined) obj.items.push(o);
  }
  if (tag === TEXT_OBJECT && childElements(el).some((c) => c.name === "s"))
    obj.items.push(sRunsToText(el));
  // CDX convention: properties before child objects
  obj.items.sort((a, b) =>
    a.kind === b.kind ? 0 : a.kind === "property" ? -1 : 1,
  );
  return obj;
}

export function fromCdxml(
  text: string,
): Result<{ doc: CdxDocument; report: CdxmlReport }> {
  const parsed = parseXml(text);
  if (!parsed.ok) return parsed;
  if (parsed.value.name !== "CDXML")
    return fail("not-cdxml", `root is <${parsed.value.name}>`, 0);
  const report: CdxmlReport = { preserved: 0, skipped: [] };
  const root = xmlToObject(parsed.value, report);
  if (root === undefined) return fail("not-cdxml", "root could not be read", 0);
  const doc = newDocument(1);
  doc.root = { ...root, id: root.id === 0 ? 1 : root.id };
  return ok({ doc, report });
}
