// Corpus regression: every real CDX file must round-trip byte-for-byte, and
// every property payload must survive typed decode → encode unchanged.
//
// Binary fixtures are not committed. Point CDX_CORPUS_LIST at a file with
// one path per line (see ../README.md for how the corpus was assembled):
//   CDX_CORPUS_LIST=/path/list.txt node --test test/
// Without it the test is skipped.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { readCdx, unwrapCdx, writeCdx, type CdxObject } from "../src/binary.ts";
import { propertyName } from "../src/model.ts";
import { decodeValue, encodeValue } from "../src/values.ts";

const listPath = process.env["CDX_CORPUS_LIST"];
const files =
  listPath === undefined
    ? []
    : readFileSync(listPath, "utf8")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

test(
  "corpus round trip",
  { skip: files.length === 0 ? "CDX_CORPUS_LIST not set" : false },
  () => {
    let identical = 0;
    let rejected = 0;
    let properties = 0;
    const rawReasons = new Map<string, number>();
    for (const file of files) {
      const unwrapped = unwrapCdx(new Uint8Array(readFileSync(file)));
      const doc = unwrapped.ok ? readCdx(unwrapped.value) : unwrapped;
      if (!doc.ok || !unwrapped.ok) {
        rejected += 1;
        continue;
      }
      assert.deepEqual(
        writeCdx(doc.value),
        unwrapped.value,
        `byte round trip: ${file}`,
      );
      identical += 1;
      const stack: CdxObject[] = [doc.value.root];
      while (stack.length > 0) {
        const o = stack.pop();
        if (o === undefined) break;
        for (const item of o.items) {
          if (item.kind === "object") {
            stack.push(item);
            continue;
          }
          properties += 1;
          const value = decodeValue(item, doc.value.byteOrder);
          assert.deepEqual(
            encodeValue(value, doc.value.byteOrder),
            item.data,
            `typed round trip ${propertyName(item.tag)} in ${file}`,
          );
          if (value.type === "raw") {
            rawReasons.set(
              value.reason,
              (rawReasons.get(value.reason) ?? 0) + 1,
            );
          }
        }
      }
    }
    const rawTotal = [...rawReasons.values()].reduce((a, b) => a + b, 0);
    console.log(
      JSON.stringify({
        files: files.length,
        identical,
        rejected,
        properties,
        typed: properties - rawTotal,
        raw: Object.fromEntries([...rawReasons].sort((a, b) => b[1] - a[1])),
      }),
    );
    assert.ok(identical > 0);
  },
);
