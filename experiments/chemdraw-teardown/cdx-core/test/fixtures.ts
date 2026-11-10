// Test-only writers for synthetic Office fixtures: a minimal CFB v3 file
// (streams < 4096 bytes in the mini stream) and a ZIP with stored or
// deflated entries. They exist so the readers in src/office.ts are tested
// against bytes we fully control; they are not part of the library.

import { deflateRawSync } from "node:zlib";
import { buildZip as buildZipLib } from "../src/office.ts";

const FREESECT = 0xffffffff;
const ENDOFCHAIN = 0xfffffffe;
const FATSECT = 0xfffffffd;

export function buildCfb(
  streams: Array<{ name: string; data: Uint8Array }>,
): Uint8Array {
  const S = 512;
  const M = 64;
  // mini stream: each stream padded to 64-byte mini sectors
  const miniFat: number[] = [];
  const starts: number[] = [];
  const mini: number[] = [];
  for (const s of streams) {
    if (s.data.length >= 4096)
      throw new Error("fixture streams must be < 4096 bytes");
    const n = Math.max(1, Math.ceil(s.data.length / M));
    const first = miniFat.length;
    starts.push(first);
    for (let i = 0; i < n; i += 1)
      miniFat.push(i === n - 1 ? ENDOFCHAIN : first + i + 1);
    const padded = new Uint8Array(n * M);
    padded.set(s.data);
    mini.push(...padded);
  }
  const miniSectors = Math.ceil(mini.length / S);
  // sectors: 0 FAT, 1 directory, 2 MiniFAT, 3.. mini stream
  const fat = new Array<number>(S / 4).fill(FREESECT);
  fat[0] = FATSECT;
  fat[1] = ENDOFCHAIN;
  fat[2] = ENDOFCHAIN;
  for (let i = 0; i < miniSectors; i += 1)
    fat[3 + i] = i === miniSectors - 1 ? ENDOFCHAIN : 4 + i;

  const out = new Uint8Array(S * (4 + miniSectors));
  const v = new DataView(out.buffer);
  [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].forEach(
    (b, i) => (out[i] = b),
  );
  v.setUint16(0x18, 0x3e, true);
  v.setUint16(0x1a, 3, true);
  v.setUint16(0x1c, 0xfffe, true);
  v.setUint16(0x1e, 9, true);
  v.setUint16(0x20, 6, true);
  v.setUint32(0x2c, 1, true); // FAT sectors
  v.setUint32(0x30, 1, true); // directory start
  v.setUint32(0x38, 4096, true); // mini cutoff
  v.setUint32(0x3c, 2, true); // MiniFAT start
  v.setUint32(0x40, 1, true); // MiniFAT sectors
  v.setUint32(0x44, ENDOFCHAIN, true);
  for (let i = 0; i < 109; i += 1)
    v.setUint32(0x4c + i * 4, i === 0 ? 0 : FREESECT, true);
  const sec = (n: number): number => (n + 1) * S;
  fat.forEach((x, i) => v.setUint32(sec(0) + i * 4, x, true));
  for (let i = 0; i < S / 4; i += 1)
    v.setUint32(sec(2) + i * 4, miniFat[i] ?? FREESECT, true);
  out.set(mini, sec(3));

  const dir = (
    index: number,
    name: string,
    type: number,
    left: number,
    right: number,
    child: number,
    start: number,
    size: number,
  ): void => {
    const at = sec(1) + index * 128;
    for (let i = 0; i < name.length; i += 1)
      v.setUint16(at + i * 2, name.charCodeAt(i), true);
    v.setUint16(at + 64, name.length === 0 ? 0 : (name.length + 1) * 2, true);
    out[at + 66] = type;
    out[at + 67] = 1; // black
    v.setUint32(at + 68, left, true);
    v.setUint32(at + 72, right, true);
    v.setUint32(at + 76, child, true);
    v.setUint32(at + 116, start, true);
    v.setUint32(at + 120, size, true);
  };
  dir(
    0,
    "Root Entry",
    5,
    FREESECT,
    FREESECT,
    streams.length > 0 ? 1 : FREESECT,
    miniSectors > 0 ? 3 : ENDOFCHAIN,
    mini.length,
  );
  streams.forEach((s, i) => {
    dir(
      i + 1,
      s.name,
      2,
      FREESECT,
      i + 2 <= streams.length ? i + 2 : FREESECT,
      FREESECT,
      starts[i] ?? 0,
      s.data.length,
    );
  });
  for (let i = streams.length + 1; i < 4; i += 1)
    dir(i, "", 0, FREESECT, FREESECT, FREESECT, 0, 0);
  return out;
}

/** ZIP with stored or deflated entries, via the library writer. */
export function buildZip(
  entries: Array<{ name: string; data: Uint8Array; deflate?: boolean }>,
): Uint8Array {
  return buildZipLib(
    entries.map((e) => ({
      name: e.name,
      data: e.data,
      ...(e.deflate === true
        ? { compressed: new Uint8Array(deflateRawSync(e.data)) }
        : {}),
    })),
  );
}
