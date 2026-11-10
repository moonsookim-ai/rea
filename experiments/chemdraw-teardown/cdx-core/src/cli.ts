// cdx-core command line.
//
//   node src/cli.ts dump FILE            indented object tree with decoded values
//   node src/cli.ts canonical FILE       canonical JSON tree (for cross-checking)
//   node src/cli.ts molecules FILE       atoms/bonds per Fragment, skeleton formula
//   node src/cli.ts roundtrip FILE...    read -> write -> compare bytes; exit 1 on any mismatch
//
// FILE may be binary CDX or base64-wrapped CDX.

import { readFileSync } from "node:fs";
import { readCdx, unwrapCdx, writeCdx, type CdxDocument } from "./binary.ts";
import { canonicalTree, dumpText, objectCounts } from "./dump.ts";
import { molecules, skeletonFormula } from "./model.ts";
import type { Result } from "./result.ts";

function load(path: string): Result<{ bytes: Uint8Array; doc: CdxDocument }> {
  const unwrapped = unwrapCdx(new Uint8Array(readFileSync(path)));
  if (!unwrapped.ok) return unwrapped;
  const doc = readCdx(unwrapped.value);
  if (!doc.ok) return doc;
  return { ok: true, value: { bytes: unwrapped.value, doc: doc.value } };
}

function firstDiff(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}

function main(argv: string[]): number {
  const [command, ...files] = argv;
  if (command === undefined || files.length === 0) {
    console.error("usage: cli.ts dump|canonical|molecules|roundtrip FILE...");
    return 2;
  }
  let failures = 0;
  for (const file of files) {
    const loaded = load(file);
    if (!loaded.ok) {
      console.log(
        `${file}\tERROR\t${loaded.error.code}\t${loaded.error.message} @${loaded.error.offset}`,
      );
      failures += 1;
      continue;
    }
    const { bytes, doc } = loaded.value;
    switch (command) {
      case "dump":
        console.log(dumpText(doc));
        console.log(`\nobject counts: ${JSON.stringify(objectCounts(doc))}`);
        break;
      case "canonical":
        console.log(JSON.stringify(canonicalTree(doc.root)));
        break;
      case "molecules":
        for (const m of molecules(doc)) {
          console.log(
            `Fragment#${m.fragmentId}\t${skeletonFormula(m) || "-"}\tatoms=${m.atoms.length}\tbonds=${m.bonds.length}\tdangling=${m.danglingBonds}`,
          );
        }
        break;
      case "roundtrip": {
        const written = writeCdx(doc);
        const at = firstDiff(bytes, written);
        console.log(
          `${file}\t${at === -1 ? "IDENTICAL" : `DIFF@${at}`}\t${bytes.length}B`,
        );
        if (at !== -1) failures += 1;
        break;
      }
      default:
        console.error(`unknown command ${command}`);
        return 2;
    }
  }
  return failures === 0 ? 0 : 1;
}

process.exitCode = main(process.argv.slice(2));
