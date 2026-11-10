// Lossless ChemDraw CDX (binary) reader and writer.
//
// Layout (from Revvity's BSD-3 CDXIO.cpp / CDXDocument.cpp):
//   bytes 0..7    "VjCD0100"
//   bytes 8..11   byte-order mark: 04 03 02 01 = little-endian, 01 02 03 04 = big-endian
//   bytes 12..21  TOC pointer + reserved (zero)
//   bytes 22..27  modern writers: the Document object's tag (0x8000) and ID;
//                 legacy/CD5-compatible writers: zero. Readers treat all 28 bytes
//                 as header and "pretend there was a document object".
//   then          Document properties and child objects, closed by tag 0x0000
//   trailer       writers add another 0x0000 ("7.0 really wants it")
//
// Items: tag:u16. bit15 set -> object: id:u32, nested items, 0x0000.
//        otherwise -> property: len:u16 (0xFFFF -> len:u32 follows), data.
//
// Every byte is kept: the raw header, each property's payload and length
// encoding, object order and the trailer, so write(read(x)) === x.

import { fail, ok, type Result } from "./result.ts";
import { fromBase64 } from "./bytes.ts";

export const MAGIC = "VjCD0100";
export const HEADER_LENGTH = 28;
export const DOCUMENT_TAG = 0x8000;
export const END_TAG = 0x0000;
export const MAX_DEPTH = 4096;

export type ByteOrder = "little" | "big";

export interface CdxProperty {
  readonly kind: "property";
  tag: number;
  data: Uint8Array;
  /** Length was written in the 0xFFFF + u32 long form. */
  longLength: boolean;
}

export interface CdxObject {
  readonly kind: "object";
  tag: number;
  id: number;
  items: CdxItem[];
}

export type CdxItem = CdxProperty | CdxObject;

export interface CdxDocument {
  /** The 28 header bytes exactly as read (or as written by `newDocument`). */
  header: Uint8Array;
  byteOrder: ByteOrder;
  /** The Document object. Its tag/id come from header bytes 22..27 when present. */
  root: CdxObject;
  /** Header bytes 22..27 carried the Document tag and id (modern writers). */
  documentTagInHeader: boolean;
  /** Bytes after the Document's end tag (normally one extra 0x0000). */
  trailer: Uint8Array;
}

export const isObjectTag = (tag: number): boolean => (tag & 0x8000) !== 0;

const startsWithMagic = (bytes: Uint8Array): boolean => {
  if (bytes.length < MAGIC.length) return false;
  for (let i = 0; i < MAGIC.length; i += 1) {
    if (bytes[i] !== MAGIC.charCodeAt(i)) return false;
  }
  return true;
};

export function readCdx(bytes: Uint8Array): Result<CdxDocument> {
  if (!startsWithMagic(bytes)) {
    return fail("not-cdx", `missing "${MAGIC}" magic`, 0);
  }
  if (bytes.length < HEADER_LENGTH) {
    return fail("truncated", "header shorter than 28 bytes", bytes.length);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const byteOrder: ByteOrder =
    bytes[8] === 1 && bytes[9] === 2 && bytes[10] === 3 && bytes[11] === 4
      ? "big"
      : "little";
  const little = byteOrder === "little";
  const headerTag = view.getUint16(22, little);
  const documentTagInHeader = headerTag === DOCUMENT_TAG;
  const root: CdxObject = {
    kind: "object",
    tag: DOCUMENT_TAG,
    id: documentTagInHeader ? view.getUint32(24, little) : 0,
    items: [],
  };

  const stack: CdxObject[] = [root];
  let pos = HEADER_LENGTH;
  while (stack.length > 0) {
    if (pos + 2 > bytes.length) {
      return fail(
        "unterminated",
        `stream ended with ${stack.length} object(s) open`,
        pos,
      );
    }
    const tag = view.getUint16(pos, little);
    pos += 2;
    const parent = stack[stack.length - 1];
    if (parent === undefined) break;
    if (tag === END_TAG) {
      stack.pop();
      continue;
    }
    if (isObjectTag(tag)) {
      if (pos + 4 > bytes.length) {
        return fail("truncated", "object id cut off", pos);
      }
      const child: CdxObject = {
        kind: "object",
        tag,
        id: view.getUint32(pos, little),
        items: [],
      };
      pos += 4;
      parent.items.push(child);
      if (stack.length >= MAX_DEPTH) {
        return fail("too-deep", `nesting exceeds ${MAX_DEPTH}`, pos);
      }
      stack.push(child);
      continue;
    }
    if (pos + 2 > bytes.length) {
      return fail("truncated", "property length cut off", pos);
    }
    let length = view.getUint16(pos, little);
    pos += 2;
    let longLength = false;
    if (length === 0xffff) {
      if (pos + 4 > bytes.length) {
        return fail("truncated", "long property length cut off", pos);
      }
      length = view.getUint32(pos, little);
      pos += 4;
      longLength = true;
    }
    if (pos + length > bytes.length) {
      return fail(
        "truncated",
        `property 0x${tag.toString(16)} needs ${length} bytes`,
        pos,
      );
    }
    parent.items.push({
      kind: "property",
      tag,
      data: bytes.slice(pos, pos + length),
      longLength,
    });
    pos += length;
  }

  return ok({
    header: bytes.slice(0, HEADER_LENGTH),
    byteOrder,
    root,
    documentTagInHeader,
    trailer: bytes.slice(pos),
  });
}

class ByteSink {
  private chunks: Uint8Array[] = [];
  private size = 0;
  private readonly little: boolean;
  constructor(little: boolean) {
    this.little = little;
  }

  bytes(b: Uint8Array): void {
    this.chunks.push(b);
    this.size += b.length;
  }
  u16(v: number): void {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, v, this.little);
    this.bytes(b);
  }
  u32(v: number): void {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, v, this.little);
    this.bytes(b);
  }
  finish(): Uint8Array {
    const out = new Uint8Array(this.size);
    let at = 0;
    for (const c of this.chunks) {
      out.set(c, at);
      at += c.length;
    }
    return out;
  }
}

/**
 * Serialize a document. The header and trailer are written as stored, except
 * that header bytes 22..27 follow `documentTagInHeader` and `root.id`, so a
 * document built in memory gets the modern layout.
 */
export function writeCdx(doc: CdxDocument): Uint8Array {
  const little = doc.byteOrder === "little";
  const sink = new ByteSink(little);
  const header = new Uint8Array(HEADER_LENGTH);
  header.set(doc.header.subarray(0, HEADER_LENGTH));
  const hv = new DataView(header.buffer);
  if (doc.documentTagInHeader) {
    hv.setUint16(22, DOCUMENT_TAG, little);
    hv.setUint32(24, doc.root.id, little);
  }
  sink.bytes(header);

  // Iterative pre-order walk: [object, next item index]
  const stack: Array<[CdxObject, number]> = [[doc.root, 0]];
  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    if (top === undefined) break;
    const [obj, index] = top;
    const item = obj.items[index];
    if (item === undefined) {
      sink.u16(END_TAG);
      stack.pop();
      continue;
    }
    top[1] = index + 1;
    if (item.kind === "object") {
      sink.u16(item.tag);
      sink.u32(item.id);
      stack.push([item, 0]);
    } else {
      sink.u16(item.tag);
      if (item.longLength || item.data.length >= 0xffff) {
        sink.u16(0xffff);
        sink.u32(item.data.length);
      } else {
        sink.u16(item.data.length);
      }
      sink.bytes(item.data);
    }
  }
  sink.bytes(doc.trailer);
  return sink.finish();
}

/** A new, empty document in the modern layout ChemDraw 8+ writes. */
export function newDocument(id = 1): CdxDocument {
  const header = new Uint8Array(HEADER_LENGTH);
  for (let i = 0; i < MAGIC.length; i += 1) header[i] = MAGIC.charCodeAt(i);
  header.set([0x04, 0x03, 0x02, 0x01], 8);
  return {
    header,
    byteOrder: "little",
    root: { kind: "object", tag: DOCUMENT_TAG, id, items: [] },
    documentTagInHeader: true,
    trailer: new Uint8Array([0, 0]),
  };
}

const BASE64_MAGIC = "VmpDRDAx"; // base64("VjCD01")

/** Accept raw CDX bytes or a base64-wrapped CDX (".b64cdx", clipboard, Ketcher). */
export function unwrapCdx(input: Uint8Array): Result<Uint8Array> {
  if (startsWithMagic(input)) return ok(input);
  const head = new TextDecoder("latin1").decode(input.subarray(0, 8));
  if (head !== BASE64_MAGIC) {
    return fail("not-cdx", "neither CDX nor base64-wrapped CDX", 0);
  }
  const text = new TextDecoder("latin1").decode(input).replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) {
    return fail("not-base64", "invalid base64 alphabet", 0);
  }
  return ok(fromBase64(text));
}
