#!/usr/bin/env python3
"""Extract the CDXML naming and enum tables from Revvity's BSD-3 ChemDraw
file-format code into cdxml_tables.json.

Collected, all by static reading of the C++ sources (nothing is built or run):
  objects     CDX object tag -> CDXML element name
              (CDXMLParser.cpp m_idMap first; then CDXFoo::XMLObjectName()
              returning a kCDXML_* macro from
              CDXMLNames.h; CDXFoo::GetTag() returns the kCDXObj_* tag)
  attributes  CDX property tag -> CDXML attribute name
              (sCDXMLAttributeNames[kCDXProp_*] = "..." in CDXObject.cpp)
  enums       XMLPutEnum tables: numeric value -> CDXML text
              (XMLPutEnum<T>::Value sFooValues[] = {{kValue, "text"}, ...})
  scales      property tag -> value scaling used by the XML writers
              (m_x / 10.0, CdxAngleToDegrees, CDXCoordinateToString, BinaryToHex)
  bindings    property tag -> enum table, from the XMLStoreAttribute case
              blocks that call sFoo.lookup(...) or sFoo.lookupTokens(...)

Usage: python3 -I extract_cdxml.py path/to/chemdraw > cdxml_tables.json
"""
import glob
import json
import os
import re
import sys

from extract_tags import eval_enum  # same directory


def read(path):
    return open(path, encoding="latin-1").read()


def enum_symbols(sources):
    """Evaluate every enum in every header/source to resolve kCDX* names."""
    symbols = {}
    for src in sources:
        for m in re.finditer(r"const\s+\w+\s+(k\w+)\s*=\s*(0x[0-9A-Fa-f]+|\d+)\s*;", src):
            symbols[m.group(1)] = int(m.group(2), 0)
    for _ in range(3):  # enums can refer to enums defined later
        for src in sources:
            for m in re.finditer(r"enum\s*\w*\s*(?::\s*\w+\s*)?\{(.*?)\}", src, re.S):
                try:
                    eval_enum(m.group(1), symbols)
                except KeyError:
                    pass
    return symbols


def main(root):
    files = sorted(glob.glob(os.path.join(root, "*.h")) + glob.glob(os.path.join(root, "*.cpp")))
    text = {os.path.basename(f): read(f) for f in files}
    symbols = enum_symbols(text.values())
    # bitwise-or enum members (kCDXBondOrder_SingleOrDouble = A | B)
    for src in text.values():
        for m in re.finditer(r"(k\w+)\s*=\s*(k\w+)\s*\|\s*(k\w+)", src):
            if m.group(2) in symbols and m.group(3) in symbols:
                symbols[m.group(1)] = symbols[m.group(2)] | symbols[m.group(3)]

    macros = dict(re.findall(r'#define\s+(kCDXML_\w+)\s+"([^"]*)"', text["CDXMLNames.h"]))

    class_tag = {}
    class_element = {}
    for src in text.values():
        for m in re.finditer(r"class\s+(?:CORE_CHEMISTRY_API\s+)?(CDX\w+)\b[^;{]*\{(.*?)\n\};", src, re.S):
            t = re.search(r"GetTag\s*\(\s*\)\s*const[^{]*\{\s*return\s+(kCDXObj_\w+)", m.group(2))
            if t:
                class_tag[m.group(1)] = t.group(1)
        for m in re.finditer(r"(CDX\w+)::GetTag\s*\(\s*\)\s*const\s*\{\s*return\s+(kCDXObj_\w+)", src):
            class_tag[m.group(1)] = m.group(2)
        for m in re.finditer(r"(?:std::)?string\s+(CDX\w+)::XMLObjectName\s*\(\s*\)\s*const\s*\{\s*return\s+(kCDXML_\w+)", src):
            class_element[m.group(1)] = macros.get(m.group(2))
    objects = {}
    # CDXMLParser.cpp's element -> object map is what the reader uses.
    for macro, tag in re.findall(r"m_idMap\.insert\(IDMap::value_type\((kCDXML_\w+),\s*(kCDXObj_\w+)\)\)", text["CDXMLParser.cpp"]):
        if tag in symbols and macro in macros:
            objects.setdefault(f"0x{symbols[tag]:04x}", macros[macro])
    for cls, element in class_element.items():
        tag = class_tag.get(cls)
        if tag and element and tag in symbols:
            objects.setdefault(f"0x{symbols[tag]:04x}", element)

    attributes = {}
    for name, xml in re.findall(r'sCDXMLAttributeNames\[(kCDXProp_\w+)\]\s*=\s*"([^"]*)"', text["CDXObject.cpp"]):
        if name in symbols:
            attributes[f"0x{symbols[name]:04x}"] = xml

    enums = {}
    for src in text.values():
        for m in re.finditer(r"XMLPutEnum<(\w+)>::Value\s+(\w+)\s*\[\s*\]\s*=\s*\{(.*?)\};", src, re.S):
            values = []
            for k, label in re.findall(r"\{\s*(\w+)\s*,\s*\"([^\"]*)\"\s*\}", m.group(3)):
                v = symbols.get(k)
                if v is None and re.fullmatch(r"-?\d+", k):
                    v = int(k)
                if v is not None:
                    values.append([v, label])
            enums[m.group(2)] = {"cpp_type": m.group(1), "values": values}
    tables = {}
    for src in text.values():
        for m in re.finditer(r"XMLPutEnum<\w+>\s+(\w+)\s*\(\s*(\w+)\s*,", src):
            if m.group(2) in enums:
                tables[m.group(1)] = m.group(2)

    bindings = {}
    for src in text.values():
        for body in re.findall(r"XMLStoreAttribute\s*\([^)]*\)\s*\{(.*?)\n\}", src, re.S):
            for block in re.split(r"\n\s*(?=case\s+kCDXProp_)", body):
                cases = re.findall(r"case\s+(kCDXProp_\w+)\s*:", block)
                use = re.search(r"\b(s\w+)\.(lookupTokens|lookup)\s*\(", block)
                if not cases or not use or use.group(1) not in tables:
                    continue
                for c in cases:
                    if c in symbols:
                        bindings[f"0x{symbols[c]:04x}"] = {
                            "table": tables[use.group(1)],
                            "tokens": use.group(2) == "lookupTokens",
                        }

    # Value scaling applied by the XML writers:
    #   CDXMLPutAttribute(sink_arg, kCDXProp_X, m_x / 10.0)            -> "tenths"
    #   CDXMLPutAttribute(sink_arg, kCDXProp_X, CdxAngleToDegrees(..))  -> "angle"
    #   CDXMLPutAttribute(sink_arg, kCDXProp_X, CDXCoordinateToString(..)) -> "coordinate"
    #   CDXMLPutAttribute(sink_arg, kCDXProp_X, BinaryToHex(..))        -> "hex"
    scales = {}
    for src in text.values():
        for m in re.finditer(r"CDXMLPutAttribute\s*\(\s*\w+\s*,\s*(kCDXProp_\w+)\s*,([^;]*)\)\s*;", src):
            expr = m.group(2)
            kind = ("tenths" if re.search(r"/\s*10(\.0)?\b", expr) else
                    "angle" if "CdxAngleToDegrees" in expr else
                    "coordinate" if "CDXCoordinateToString" in expr else
                    "hex" if "BinaryToHex" in expr else None)
            if kind and m.group(1) in symbols:
                scales[f"0x{symbols[m.group(1)]:04x}"] = kind

    json.dump({
        "source": "Revvity open-source ChemDraw file format code (BSD-3-Clause), chemdraw/*.cpp|h",
        "objects": dict(sorted(objects.items())),
        "attributes": dict(sorted(attributes.items())),
        "enums": dict(sorted(enums.items())),
        "bindings": dict(sorted(bindings.items())),
        "scales": dict(sorted(scales.items())),
    }, sys.stdout, indent=1, ensure_ascii=False)


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    main(sys.argv[1])
