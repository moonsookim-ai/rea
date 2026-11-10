#!/usr/bin/env python3
"""Minimal, dependency-free ChemDraw CDX (binary) tree dumper.

Built for the ChemDraw teardown from the public CDX specification and the
tag table in Revvity's BSD-3 ChemDraw file-format code (CDXConstants.h).
The tag table is regenerated into ``cdx_tags.json`` by ``extract_tags.py``.

Format (little-endian):
  header : 28 bytes = "VjCD0100" + 04 03 02 01 + 10 reserved bytes + 6 bytes
           that modern writers fill with the Document tag (00 80) and id and
           legacy (CD5-compatible) writers leave zero. Either way the
           Document's properties follow directly (Revvity CDXIO.cpp /
           CDXDocument.cpp: "pretend there was a document object").
  item   : tag:u16
           tag & 0x8000 -> object  : id:u32, then nested items until tag 0x0000
           otherwise    -> property: len:u16 (0xFFFF => len:u32 follows), data
  end    : 00 00 closes the Document; writers append one more 00 00

Payloads are decoded only from the (Type) annotation that CDXConstants.h
gives each property; anything else is reported as hex so the dump never
invents meaning the specification does not give.

Usage: python3 -I cdx_dump.py FILE.cdx [--json | --canonical]
  --canonical  prints {o: tag, i: id, p: [[tag, hex], ...], c: [...]} in file
               order, the format cdx-core's `canonical` command prints, so the
               two independent readers can be compared.
FILE may also be base64-wrapped CDX (".b64cdx").
"""
from __future__ import annotations

import base64
import json
import os
import struct
import sys

HEADER = b"VjCD0100"
HERE = os.path.dirname(os.path.abspath(__file__))
TAGS = json.load(open(os.path.join(HERE, "cdx_tags.json"), encoding="utf-8"))
OBJ = {int(k, 16): v for k, v in TAGS["objects"].items()}
PROP = {int(k, 16): v["name"] for k, v in TAGS["properties"].items()}
PTYPE = {v["name"]: (v.get("type") or "") for v in TAGS["properties"].values()}

# Fixed-width scalar types named in CDXConstants.h comments.
SCALARS = {"INT8": "<b", "UINT8": "<B", "INT16": "<h", "UINT16": "<H",
           "INT32": "<i", "UINT32": "<I", "FLOAT64": "<d", "CDXObjectID": "<I",
           "CDXCoordinate": "<i", "CDXBoolean": "<B"}


class CDXError(ValueError):
    pass


def _decode(name: str, data: bytes):
    """Decode by the (Type) named in CDXConstants.h; fall back to hex."""
    typ = PTYPE.get(name, "")
    if typ == "CDXPoint2D" and len(data) == 8:
        y, x = struct.unpack("<ii", data)  # CDX stores y before x, 1/65536 pt
        return {"x_pt": round(x / 65536, 3), "y_pt": round(y / 65536, 3)}
    if typ == "CDXRectangle" and len(data) == 16:
        t, l, btm, r = (v / 65536 for v in struct.unpack("<iiii", data))
        return {"top": round(t, 2), "left": round(l, 2), "bottom": round(btm, 2), "right": round(r, 2)}
    if typ == "CDXBooleanImplied":
        return True
    if typ == "CDXObjectIDArray" and len(data) % 4 == 0:
        return list(struct.unpack(f"<{len(data) // 4}I", data))
    fmt = SCALARS.get(typ)
    if fmt and struct.calcsize(fmt) == len(data):
        return struct.unpack(fmt, data)[0]
    if typ == "CDXString" and len(data) >= 2:
        runs = struct.unpack("<H", data[:2])[0]  # u16 style runs, 10 bytes each
        return data[2 + runs * 10:].decode("latin-1", errors="replace")
    return "hex:" + data[:32].hex() + ("..." if len(data) > 32 else "")


def parse(buf: bytes):
    if buf[:8] != HEADER:
        raise CDXError("not a CDX file (bad magic)")
    pos = 28
    # Header bytes 22..27 hold the Document tag and id in modern files.
    doc_tag, doc_id = struct.unpack_from("<HI", buf, 22)
    root = {"object": "Document", "tag": "0x8000", "id": doc_id if doc_tag == 0x8000 else 0,
            "props": {}, "raw": [], "children": []}
    stack = [root]

    def need(n):
        if pos + n > len(buf):
            raise CDXError(f"truncated at offset {pos}")

    while pos < len(buf):
        need(2)
        tag = struct.unpack_from("<H", buf, pos)[0]
        pos += 2
        if tag == 0:
            if len(stack) == 1:
                break  # end of document
            stack.pop()
            continue
        if tag & 0x8000:
            need(4)
            oid = struct.unpack_from("<I", buf, pos)[0]
            pos += 4
            node = {"object": OBJ.get(tag, f"user/unknown 0x{tag:04x}"),
                    "tag": f"0x{tag:04x}", "id": oid, "props": {}, "raw": [], "children": []}
            stack[-1]["children"].append(node)
            stack.append(node)
            continue
        need(2)
        length = struct.unpack_from("<H", buf, pos)[0]
        pos += 2
        if length == 0xFFFF:
            need(4)
            length = struct.unpack_from("<I", buf, pos)[0]
            pos += 4
        need(length)
        data = buf[pos:pos + length]
        pos += length
        name = PROP.get(tag, f"0x{tag:04x}")
        stack[-1]["props"][name] = _decode(name, data)
        stack[-1]["raw"].append([tag, data.hex()])
    return [root]


def canonical(node) -> dict:
    return {"o": int(node["tag"], 16), "i": node["id"], "p": node["raw"],
            "c": [canonical(c) for c in node["children"]]}


def load(path: str) -> bytes:
    buf = open(path, "rb").read()
    if buf[:8] == b"VmpDRDAx":  # base64("VjCD01")
        buf = base64.b64decode(b"".join(buf.split()))
    return buf


def summarize(tree) -> dict:
    counts: dict = {}

    def walk(nodes):
        for n in nodes:
            counts[n["object"]] = counts.get(n["object"], 0) + 1
            walk(n["children"])

    walk(tree)
    return counts


def render(nodes, depth=0, out=None):
    out = out if out is not None else []
    for n in nodes:
        props = ", ".join(f"{k}={v}" for k, v in n["props"].items())
        out.append(f"{'  ' * depth}{n['object']}#{n['id']} [{n['tag']}] {props}")
        render(n["children"], depth + 1, out)
    return out


def _all(nodes):
    for n in nodes:
        yield n
        yield from _all(n["children"])


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    tree = parse(load(argv[1]))
    if "--canonical" in argv:
        print(json.dumps(canonical(tree[0]), separators=(",", ":")))
    elif "--json" in argv:
        for n in _all(tree):
            n.pop("raw", None)
        print(json.dumps({"summary": summarize(tree), "tree": tree}, indent=1))
    else:
        print("\n".join(render(tree)))
        print("\nobject counts:", summarize(tree))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
