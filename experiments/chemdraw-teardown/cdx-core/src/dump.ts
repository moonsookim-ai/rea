// Text and canonical-JSON views of a CDX tree.
//
// `canonicalTree` is the comparison format shared with the independent
// Python reader (tools/cdx_dump.py --canonical): objects as
// {o: tag, i: id, p: [[tag, hex], ...], c: [...]}, properties in file order.

import type { CdxDocument, CdxObject } from "./binary.ts";
import { objectName, propertyName, walk } from "./model.ts";
import { decodeValue, formatValue } from "./values.ts";

export interface CanonicalObject {
  o: number;
  i: number;
  p: Array<[number, string]>;
  c: CanonicalObject[];
}

const hex = (b: Uint8Array): string => Buffer.from(b).toString("hex");

export function canonicalTree(root: CdxObject): CanonicalObject {
  const convert = (obj: CdxObject): CanonicalObject => {
    const node: CanonicalObject = { o: obj.tag, i: obj.id, p: [], c: [] };
    for (const item of obj.items) {
      if (item.kind === "property") node.p.push([item.tag, hex(item.data)]);
      else node.c.push(convert(item));
    }
    return node;
  };
  return convert(root);
}

export function dumpText(doc: CdxDocument, maxValueLength = 120): string {
  const lines: string[] = [];
  for (const { object, depth } of walk(doc.root)) {
    const props = object.items
      .filter((i) => i.kind === "property")
      .map((p) => {
        const value = formatValue(decodeValue(p, doc.byteOrder));
        const shown =
          value.length > maxValueLength
            ? `${value.slice(0, maxValueLength)}…`
            : value;
        return `${propertyName(p.tag)}=${shown}`;
      });
    lines.push(
      `${"  ".repeat(depth)}${objectName(object.tag)}#${object.id}${props.length > 0 ? ` ${props.join(", ")}` : ""}`,
    );
  }
  return lines.join("\n");
}

export function objectCounts(doc: CdxDocument): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { object } of walk(doc.root)) {
    const name = objectName(object.tag);
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
}
