#!/usr/bin/env python3
"""Regenerate cdx_tags.json from Revvity's CDXConstants.h (BSD-3).

Evaluates the C++ enums the way a compiler would (implicit +1, explicit
``= 0x..``, ``= kOtherName`` and ``= kOtherName + n``) instead of trusting
the hex in trailing comments, which is wrong in a few places (e.g. the
comment for kCDXProp_Transparent says 0x0011, the enum value is 0x0012).
The trailing ``(Type)`` and description of each property are kept.

Usage: python3 -I extract_tags.py path/to/CDXConstants.h > cdx_tags.json
"""
import json
import re
import sys


def eval_enum(body: str, symbols: dict):
    out = []
    current = -1
    section = None
    for line in body.splitlines():
        sec = re.match(r"\s*//\s*(.+?)\.?\s*$", line)
        if sec and not re.match(r"\s*k\w+", line):
            section = sec.group(1)
            continue
        m = re.match(r"\s*(k\w+)\s*(?:=\s*([^,/]+?))?\s*,?\s*(?://\s*(.*))?$", line)
        if not m:
            continue
        name, expr, comment = m.group(1), m.group(2), m.group(3) or ""
        if expr:
            expr = expr.strip()
            parts = re.match(r"(-?\w+)\s*(?:([+-])\s*(\w+))?$", expr)
            if not parts:
                continue
            base = parts.group(1)
            val = int(base, 0) if re.match(r"^-?(0x[0-9a-fA-F]+|\d+)$", base) else symbols[base]
            if parts.group(2):
                delta = int(parts.group(3), 0)
                val = val + delta if parts.group(2) == "+" else val - delta
            current = val
        else:
            current += 1
        symbols[name] = current
        typ = re.search(r"\(([A-Za-z0-9_ ,]+)\)\s*$", comment)
        desc = re.sub(r"^0x[0-9A-Fa-f]+\s*", "", comment).strip()
        out.append({"name": name, "value": current, "section": section,
                    "type": typ.group(1) if typ else None, "description": desc})
    return out


def main(path):
    src = open(path, encoding="latin-1").read()
    symbols = {}
    for m in re.finditer(r"(k\w+)\s*=\s*(0x[0-9A-Fa-f]+)\s*[,;]", src):
        symbols.setdefault(m.group(1), int(m.group(2), 16))
    for m in re.finditer(r"const\s+\w+\s+(k\w+)\s*=\s*(0x[0-9A-Fa-f]+)", src):
        symbols[m.group(1)] = int(m.group(2), 16)
    m = re.search(r"enum\s+CDXDatumID\s*\{(.*?)\};", src, re.S)
    if not m:
        raise SystemExit("enum CDXDatumID not found")
    items = eval_enum(m.group(1), symbols)
    props = [i for i in items if i["name"].startswith("kCDXProp_")]
    objs = [i for i in items if i["name"].startswith("kCDXObj_")]
    result = {
        "source": "Revvity open-source ChemDraw file format code, chemdraw/CDXConstants.h (BSD-3-Clause)",
        "objects": {f"0x{o['value']:04x}": o["name"].replace("kCDXObj_", "") for o in objs},
        "properties": {},
    }
    for p in props:
        if not p["name"].startswith("kCDXProp_"):
            continue
        key = f"0x{p['value']:04x}"
        entry = {"name": p["name"][9:], "section": p["section"], "type": p["type"],
                 "description": p["description"][:200]}
        if key in result["properties"]:
            result["properties"][key].setdefault("aliases", []).append(entry["name"])
        else:
            result["properties"][key] = entry
    json.dump(result, sys.stdout, indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main(sys.argv[1])
