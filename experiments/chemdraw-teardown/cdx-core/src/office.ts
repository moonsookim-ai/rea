// Extract embedded ChemDraw objects from Office documents (P3, read side).
//
// ChemDraw's OLE server stores the drawing as CDX bytes in the "CONTENTS"
// stream of the embedded object's compound file (observed in Ketcher's PPTX
// import, which looks for the base64 prefix "VmpDRDAxMDAEAw" = "VjCD0100\x04\x03").
// Office Open XML packages (.pptx/.docx/.xlsx) are ZIP files that keep those
// compound files as */embeddings/*.bin.
//
// Implemented: ZIP central directory (stored + deflate via an injected
// inflater), CFB v3/v4 with FAT, DIFAT, MiniFAT and the mini stream.
// Not implemented: writing edited drawings back (OLE + preview metafile).

import { fail, ok, type Result } from "./result.ts";

export type Inflate = (data: Uint8Array) => Promise<Uint8Array>;

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  offset: number;
}

const u16 = (b: Uint8Array, o: number): number =>
  (b[o] ?? 0) | ((b[o + 1] ?? 0) << 8);
const u32 = (b: Uint8Array, o: number): number =>
  (u16(b, o) | (u16(b, o + 2) << 16)) >>> 0;

export function listZip(bytes: Uint8Array): Result<ZipEntry[]> {
  // End of central directory: signature 0x06054b50 within the last 64 KiB
  let eocd = -1;
  for (
    let i = bytes.length - 22;
    i >= Math.max(0, bytes.length - 65557);
    i -= 1
  ) {
    if (u32(bytes, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0)
    return fail("not-zip", "no end-of-central-directory record", bytes.length);
  const count = u16(bytes, eocd + 10);
  let at = u32(bytes, eocd + 16);
  const entries: ZipEntry[] = [];
  for (let i = 0; i < count; i += 1) {
    if (u32(bytes, at) !== 0x02014b50)
      return fail("not-zip", "bad central directory entry", at);
    const nameLen = u16(bytes, at + 28);
    const extraLen = u16(bytes, at + 30);
    const commentLen = u16(bytes, at + 32);
    entries.push({
      name: new TextDecoder().decode(
        bytes.subarray(at + 46, at + 46 + nameLen),
      ),
      method: u16(bytes, at + 10),
      compressedSize: u32(bytes, at + 20),
      size: u32(bytes, at + 24),
      offset: u32(bytes, at + 42),
    });
    at += 46 + nameLen + extraLen + commentLen;
  }
  return ok(entries);
}

export async function readZipEntry(
  bytes: Uint8Array,
  entry: ZipEntry,
  inflate: Inflate,
): Promise<Result<Uint8Array>> {
  const h = entry.offset;
  if (u32(bytes, h) !== 0x04034b50)
    return fail("not-zip", "bad local header", h);
  const start = h + 30 + u16(bytes, h + 26) + u16(bytes, h + 28);
  const data = bytes.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return ok(data);
  if (entry.method === 8) return ok(await inflate(data));
  return fail("not-zip", `unsupported compression method ${entry.method}`, h);
}

// ---- Compound File Binary (OLE2) -------------------------------------------

export interface CfbStream {
  /** Path from the root storage, e.g. "CONTENTS" or "Ole10Native". */
  path: string;
  data: Uint8Array;
}

const FREESECT = 0xffffffff;
const ENDOFCHAIN = 0xfffffffe;

export function readCfb(bytes: Uint8Array): Result<CfbStream[]> {
  const sig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  if (!sig.every((v, i) => bytes[i] === v))
    return fail("not-cfb", "missing compound file signature", 0);
  const sectorSize = 1 << u16(bytes, 0x1e);
  const miniSectorSize = 1 << u16(bytes, 0x20);
  const numFat = u32(bytes, 0x2c);
  const dirStart = u32(bytes, 0x30);
  const miniCutoff = u32(bytes, 0x38);
  const miniFatStart = u32(bytes, 0x3c);
  let difatStart = u32(bytes, 0x44);
  const sector = (n: number): Uint8Array =>
    bytes.subarray((n + 1) * sectorSize, (n + 2) * sectorSize);

  const fatSectors: number[] = [];
  for (let i = 0; i < 109 && fatSectors.length < numFat; i += 1)
    fatSectors.push(u32(bytes, 0x4c + i * 4));
  let guard = 0;
  while (
    fatSectors.length < numFat &&
    difatStart !== ENDOFCHAIN &&
    difatStart !== FREESECT &&
    guard++ < 1e5
  ) {
    const s = sector(difatStart);
    for (
      let i = 0;
      i < sectorSize / 4 - 1 && fatSectors.length < numFat;
      i += 1
    )
      fatSectors.push(u32(s, i * 4));
    difatStart = u32(s, sectorSize - 4);
  }
  const fat: number[] = [];
  for (const fs of fatSectors) {
    const s = sector(fs);
    for (let i = 0; i < sectorSize / 4; i += 1) fat.push(u32(s, i * 4));
  }
  const chain = (start: number, table: number[]): number[] => {
    const out: number[] = [];
    const seen = new Set<number>();
    for (
      let n = start;
      n !== ENDOFCHAIN && n !== FREESECT && n < table.length;
      n = table[n] ?? ENDOFCHAIN
    ) {
      if (seen.has(n)) break; // cycle in a damaged file
      seen.add(n);
      out.push(n);
    }
    return out;
  };
  const readChain = (start: number, size: number): Uint8Array => {
    const parts = chain(start, fat).map(sector);
    const out = new Uint8Array(parts.length * sectorSize);
    parts.forEach((p, i) => out.set(p, i * sectorSize));
    return out.subarray(0, size);
  };

  const dirBytes = readChain(
    dirStart,
    chain(dirStart, fat).length * sectorSize,
  );
  interface Dir {
    name: string;
    type: number;
    left: number;
    right: number;
    child: number;
    start: number;
    size: number;
  }
  const dirs: Dir[] = [];
  for (let at = 0; at + 128 <= dirBytes.length; at += 128) {
    const nameLen = Math.max(0, u16(dirBytes, at + 64) - 2);
    let name = "";
    for (let i = 0; i < nameLen; i += 2)
      name += String.fromCharCode(u16(dirBytes, at + i));
    dirs.push({
      name,
      type: dirBytes[at + 66] ?? 0,
      left: u32(dirBytes, at + 68),
      right: u32(dirBytes, at + 72),
      child: u32(dirBytes, at + 76),
      start: u32(dirBytes, at + 116),
      size: u32(dirBytes, at + 120),
    });
  }
  const root = dirs[0];
  if (root === undefined || root.type !== 5)
    return fail("not-cfb", "no root storage", 0);
  const miniStream = readChain(root.start, root.size);
  const miniFat: number[] = [];
  for (const s of chain(miniFatStart, fat)) {
    const sec = sector(s);
    for (let i = 0; i < sectorSize / 4; i += 1) miniFat.push(u32(sec, i * 4));
  }
  const readMini = (start: number, size: number): Uint8Array => {
    const parts = chain(start, miniFat);
    const out = new Uint8Array(parts.length * miniSectorSize);
    parts.forEach((n, i) =>
      out.set(
        miniStream.subarray(n * miniSectorSize, (n + 1) * miniSectorSize),
        i * miniSectorSize,
      ),
    );
    return out.subarray(0, size);
  };

  const streams: CfbStream[] = [];
  const visit = (index: number, prefix: string, depth: number): void => {
    const d = dirs[index];
    if (d === undefined || index === FREESECT || depth > 64) return;
    visit(d.left, prefix, depth + 1);
    visit(d.right, prefix, depth + 1);
    const path = prefix === "" ? d.name : `${prefix}/${d.name}`;
    if (d.type === 2) {
      streams.push({
        path,
        data:
          d.size < miniCutoff
            ? readMini(d.start, d.size)
            : readChain(d.start, d.size),
      });
    } else if (d.type === 1) visit(d.child, path, depth + 1);
  };
  visit(root.child, "", 0);
  return ok(streams);
}

// ---- ChemDraw objects in Office packages ------------------------------------

export interface EmbeddedDrawing {
  /** Package part holding the OLE object, e.g. "ppt/embeddings/oleObject1.bin". */
  part: string;
  /** CFB stream that held the CDX bytes. */
  stream: string;
  cdx: Uint8Array;
}

const isCdx = (b: Uint8Array): boolean =>
  new TextDecoder("latin1").decode(b.subarray(0, 8)) === "VjCD0100";

/** Find ChemDraw drawings in a .pptx/.docx/.xlsx (or a bare OLE .bin). */
export async function extractChemDrawObjects(
  bytes: Uint8Array,
  inflate: Inflate,
): Promise<Result<EmbeddedDrawing[]>> {
  const found: EmbeddedDrawing[] = [];
  const scan = (part: string, data: Uint8Array): void => {
    if (isCdx(data)) {
      found.push({ part, stream: "", cdx: data });
      return;
    }
    const cfb = readCfb(data);
    if (!cfb.ok) return;
    for (const s of cfb.value)
      if (isCdx(s.data)) found.push({ part, stream: s.path, cdx: s.data });
  };
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
    scan("(compound file)", bytes);
    return ok(found);
  }
  const entries = listZip(bytes);
  if (!entries.ok) return entries;
  for (const e of entries.value) {
    if (!/\/embeddings\/|\.bin$|\.cdx$/i.test(e.name)) continue;
    const data = await readZipEntry(bytes, e, inflate);
    if (data.ok) scan(e.name, data.value);
  }
  return ok(found);
}

// ---- ZIP writer (stored entries) --------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (const x of b) c = (CRC_TABLE[(c ^ x) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Build a ZIP of stored (uncompressed) entries. `compressed` lets callers
 * pass pre-deflated bodies (method 8) together with the original data.
 */
export function buildZip(
  entries: Array<{ name: string; data: Uint8Array; compressed?: Uint8Array }>,
): Uint8Array {
  const out: number[] = [];
  const central: number[] = [];
  const le = (n: number, bytes: number): number[] =>
    Array.from({ length: bytes }, (_, i) => (n >>> (8 * i)) & 0xff);
  for (const e of entries) {
    const name = [...new TextEncoder().encode(e.name)];
    const body = e.compressed ?? e.data;
    const method = e.compressed === undefined ? 0 : 8;
    const crc = crc32(e.data);
    const offset = out.length;
    const common = [
      ...le(method, 2),
      ...le(0, 4),
      ...le(crc, 4),
      ...le(body.length, 4),
      ...le(e.data.length, 4),
      ...le(name.length, 2),
    ];
    out.push(
      ...le(0x04034b50, 4),
      ...le(20, 2),
      ...le(0x0800, 2),
      ...common,
      ...le(0, 2),
      ...name,
    );
    for (const x of body) out.push(x);
    central.push(
      ...le(0x02014b50, 4),
      ...le(20, 2),
      ...le(20, 2),
      ...le(0x0800, 2),
      ...common,
    );
    central.push(
      ...le(0, 2),
      ...le(0, 2),
      ...le(0, 2),
      ...le(0, 2),
      ...le(0, 4),
      ...le(offset, 4),
      ...name,
    );
  }
  const cdStart = out.length;
  out.push(...central);
  out.push(
    ...le(0x06054b50, 4),
    ...le(0, 4),
    ...le(entries.length, 2),
    ...le(entries.length, 2),
  );
  out.push(...le(central.length, 4), ...le(cdStart, 4), ...le(0, 2));
  return new Uint8Array(out);
}
