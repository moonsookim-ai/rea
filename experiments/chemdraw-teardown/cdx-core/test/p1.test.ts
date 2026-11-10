// P1–P4 tests: CDXML, chemistry, rendering, Office extraction, HELM, R-groups.
// Run: node --test test/

import assert from "node:assert/strict";
import { test } from "node:test";
import { inflateRawSync } from "node:zlib";
import { readCdx, writeCdx } from "../src/binary.ts";
import {
  enumerateRGroups,
  parseHelm,
  peptideWeight,
  renderHelmSvg,
  toHelm,
} from "../src/bio.ts";
import { fromCdxml, toCdxml } from "../src/cdxml.ts";
import {
  analyze,
  kekulize,
  parseMolfile,
  parseSmiles,
  sceneFromCdx,
  sceneToCdx,
  toMolfile,
  toSmiles,
  valenceWarnings,
  type Scene,
} from "../src/chem.ts";
import { chemistryDifference } from "../src/model.ts";
import { extractChemDrawObjects, listZip, readCfb } from "../src/office.ts";
import { renderSvg } from "../src/render.ts";
import { parseXml, writeXml } from "../src/xml.ts";
import { buildCfb, buildZip } from "./fixtures.ts";

const smiles = (s: string): Scene => {
  const r = parseSmiles(s);
  if ("error" in r) throw new Error(r.error.message);
  return r.scene;
};
const inflate = async (b: Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(inflateRawSync(b));

test("formula, average and monoisotopic mass of known drugs", () => {
  const cases: Array<[string, string, number, number]> = [
    ["CC(=O)Oc1ccccc1C(=O)O", "C9H8O4", 180.159, 180.0423], // aspirin
    ["CN1C=NC2=C1C(=O)N(C(=O)N2C)C", "C8H10N4O2", 194.194, 194.0804], // caffeine
    ["CC(C)Cc1ccc(cc1)C(C)C(=O)O", "C13H18O2", 206.285, 206.1307], // ibuprofen
    ["C[N+](C)(C)C", "C4H12N+", 74.147, 74.0964],
  ];
  for (const [s, formula, mw, exact] of cases) {
    const a = analyze(smiles(s));
    assert.equal(a.formula, formula, s);
    assert.ok(Math.abs(a.weight - mw) < 0.01, `${s} MW ${a.weight}`);
    assert.ok(
      Math.abs(a.exactMass - exact) < 0.001,
      `${s} exact ${a.exactMass}`,
    );
  }
});

test("SMILES, MOL V2000 and CDX conversions preserve the formula", () => {
  for (const s of [
    "c1cc[nH]c1",
    "OC(=O)C1CC1",
    "[13CH4]",
    "C#N",
    "[O-]C(=O)C.[Na+]",
    "Oc1ccc2ccccc2c1",
  ]) {
    const scene = smiles(s);
    const f = analyze(scene).formula;
    assert.equal(analyze(smiles(toSmiles(scene))).formula, f, `smiles ${s}`);
    const mol = parseMolfile(toMolfile(scene));
    assert.ok(!("error" in mol));
    if (!("error" in mol)) assert.equal(analyze(mol).formula, f, `mol ${s}`);
    const cdx = readCdx(writeCdx(sceneToCdx(scene)));
    assert.ok(cdx.ok);
    if (cdx.ok)
      assert.equal(analyze(sceneFromCdx(cdx.value)).formula, f, `cdx ${s}`);
  }
});

test("kekulization places alternating double bonds and respects [nH]", () => {
  const benzene = kekulize(smiles("c1ccccc1"));
  assert.equal(benzene.bonds.filter((b) => b.order === 2).length, 3);
  const pyrrole = kekulize(smiles("c1cc[nH]c1"));
  assert.equal(pyrrole.bonds.filter((b) => b.order === 2).length, 2);
});

test("valence warnings flag pentavalent carbon only", () => {
  assert.equal(valenceWarnings(smiles("CC(C)(C)(C)C")).length, 1);
  assert.equal(valenceWarnings(smiles("CC(C)(C)C")).length, 0);
  // fused aromatic carbons (three 1.5 bonds) are fine
  assert.equal(valenceWarnings(smiles("c1ccc2ccccc2c1")).length, 0);
  assert.equal(valenceWarnings(smiles("c1ccc2[nH]ccc2c1")).length, 0);
});

test("SMILES errors are reported with a position", () => {
  const r = parseSmiles("C1CC(");
  assert.ok("error" in r);
});

test("layout gives every bond the ACS length and keeps atoms apart", () => {
  for (const s of [
    "CC(=O)Oc1ccccc1C(=O)O",
    "CC12CCC3C(C1CCC2O)CCC4=CC(=O)CCC34C",
    "C1CCC2(CC1)CCOC2",
  ]) {
    const sc = smiles(s);
    const pos = new Map(sc.atoms.map((a) => [a.id, a]));
    for (const b of sc.bonds) {
      const p = pos.get(b.a);
      const q = pos.get(b.b);
      assert.ok(p && q);
      if (p && q)
        assert.ok(
          Math.abs(Math.hypot(p.x - q.x, p.y - q.y) - 14.4) < 1.5,
          `${s} bond length`,
        );
    }
    for (let i = 0; i < sc.atoms.length; i += 1) {
      for (let j = i + 1; j < sc.atoms.length; j += 1) {
        const p = sc.atoms[i];
        const q = sc.atoms[j];
        if (p && q)
          assert.ok(
            Math.hypot(p.x - q.x, p.y - q.y) > 4,
            `${s} atoms ${p.id}/${q.id} overlap`,
          );
      }
    }
  }
});

test("SVG rendering uses ACS 1996 widths and labels heteroatoms", () => {
  const svg = renderSvg(smiles("CC(=O)O"));
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(svg, /stroke-width="0.6"/);
  assert.match(svg, /<tspan>O<\/tspan>/);
  assert.ok(parseXml(svg).ok, "well-formed");
});

test("CDXML: CDX -> CDXML -> CDX keeps chemistry; ChemDraw spellings are used", () => {
  const doc = sceneToCdx(smiles("CC(=O)Oc1ccccc1C(=O)O"));
  const { text } = toCdxml(doc);
  assert.match(text, /<CDXML/);
  assert.match(text, /BondLength="14.4"/);
  assert.match(text, /BondSpacing="18"/);
  assert.match(text, /<n\n id="/);
  assert.match(text, /Order="2"/);
  const back = fromCdxml(text);
  assert.ok(back.ok);
  if (back.ok) {
    assert.equal(chemistryDifference(doc, back.value.doc), null);
    assert.deepEqual(back.value.report.skipped, []);
  }
});

test("CDXML: text runs, enums, line heights and malformed input", () => {
  const xml = `<?xml version="1.0"?><!DOCTYPE CDXML><CDXML BondLength="30"><page id="1"><t id="5" p="10 20" LineHeight="auto" Justification="Right"><s font="3" size="10" face="96">N</s><s font="3" size="7.5" face="32">H2</s></t><fragment id="2"><n id="3" p="1 2" Element="7" NodeType="Nickname"/><b id="4" B="3" E="3" Order="1 2" Display="WedgeBegin"/></fragment></page></CDXML>`;
  const r = fromCdxml(xml);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(r.value.report.skipped, []);
  const again = toCdxml(r.value.doc).text;
  assert.match(again, /LineHeight="auto"/);
  assert.match(again, /Justification="Right"/);
  assert.match(again, /NodeType="Nickname"/);
  assert.match(again, /Order="1 2"/);
  assert.match(again, /Display="WedgeBegin"/);
  assert.match(again, /<s font="3" size="7.5" face="32">H2<\/s>/);
  assert.equal(fromCdxml("<CDXML><n id='1'></CDXML>").ok, false);
  assert.equal(fromCdxml("<html/>").ok, false);
});

test("XML writer escapes and round-trips attributes and text", () => {
  const el = {
    name: "a",
    attrs: [["x", 'q"<&\n'] as [string, string]],
    children: ["1 < 2 & 3", { name: "b", attrs: [], children: [] }],
  };
  const back = parseXml(writeXml(el, ""));
  assert.ok(back.ok);
  if (back.ok) assert.deepEqual(back.value, el);
});

test("Office: ChemDraw OLE objects are found in a PPTX (stored and deflated) and a bare OLE file", async () => {
  const cdx = writeCdx(sceneToCdx(smiles("c1ccccc1O")));
  const ole = buildCfb([
    { name: "\u0001CompObj", data: new Uint8Array(76) },
    { name: "CONTENTS", data: cdx },
  ]);
  const streams = readCfb(ole);
  assert.ok(streams.ok);
  if (streams.ok)
    assert.deepEqual(
      streams.value.map((s) => s.path).sort(),
      ["CONTENTS", "\u0001CompObj"].sort(),
    );
  const pptx = buildZip([
    {
      name: "[Content_Types].xml",
      data: new TextEncoder().encode("<Types/>"),
      deflate: true,
    },
    { name: "ppt/embeddings/oleObject1.bin", data: ole },
    { name: "ppt/embeddings/oleObject2.bin", data: ole, deflate: true },
  ]);
  assert.ok(listZip(pptx).ok);
  const found = await extractChemDrawObjects(pptx, inflate);
  assert.ok(found.ok);
  if (!found.ok) return;
  assert.equal(found.value.length, 2);
  for (const f of found.value) {
    assert.equal(f.stream, "CONTENTS");
    assert.deepEqual(f.cdx, cdx);
  }
  const bare = await extractChemDrawObjects(ole, inflate);
  assert.ok(bare.ok && bare.value.length === 1);
  const notZip = await extractChemDrawObjects(
    new Uint8Array([1, 2, 3]),
    inflate,
  );
  assert.equal(notZip.ok, false);
});

test("HELM: parse, weigh, render and write back", () => {
  const h = parseHelm(
    "PEPTIDE1{G.C.[Orn].C}|RNA1{R(A)P.R(U)}$PEPTIDE1,PEPTIDE1,2:R3-4:R3$$$V2.0",
  );
  assert.ok(!("error" in h));
  if ("error" in h) return;
  assert.deepEqual(h.polymers[0]?.monomers, ["G", "C", "[Orn]", "C"]);
  assert.deepEqual(h.polymers[1]?.monomers, ["R", "A", "P", "R", "U"]);
  assert.equal(h.connections[0]?.fromAttachment, "R3");
  const gly = parseHelm("PEPTIDE1{G.G}$$$$V2.0");
  if (!("error" in gly))
    assert.ok(
      Math.abs(
        (peptideWeight(
          gly.polymers[0] ?? { id: "", type: "PEPTIDE", monomers: [] },
        ) ?? 0) - 132.12,
      ) < 0.01,
    );
  assert.match(renderHelmSvg(h), /<circle/);
  assert.match(toHelm(h), /^PEPTIDE1\{G\.C\.\[Orn\]\.C\}/);
  assert.ok("error" in parseHelm("XYZ{A}"));
});

test("R-group enumeration joins substituents at the attachment points", () => {
  const out = enumerateRGroups("c1ccccc1[*:1]", {
    1: ["[*]C", "[*]O", "[*]N"],
  });
  assert.ok(!("error" in out));
  if ("error" in out) return;
  assert.deepEqual(
    out.map((e) => analyze(smiles(e.smiles)).formula),
    ["C7H8", "C6H6O", "C6H7N"],
  );
  const two = enumerateRGroups("[*:1]CC[*:2]", {
    1: ["[*]O", "[*]Cl"],
    2: ["[*]C", "[*]Br"],
  });
  assert.ok(!("error" in two) && two.length === 4);
  assert.ok("error" in enumerateRGroups("C[*:1]", {}));
});
