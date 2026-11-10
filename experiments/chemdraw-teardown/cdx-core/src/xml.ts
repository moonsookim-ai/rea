// Small, dependency-free XML reader/writer sufficient for CDXML.
//
// Supports the prolog, DOCTYPE (with an internal subset), comments,
// processing instructions, CDATA, character/entity references and
// attributes in either quote style. Attribute and child order are kept.
// No DTD validation and no external entities (they are never fetched).

import { fail, ok, type Result } from "./result.ts";

export interface XmlElement {
  name: string;
  attrs: Array<[string, string]>;
  children: XmlNode[];
}
export type XmlNode = XmlElement | string;

const ENTITIES: Record<string, string> = {
  lt: "<",
  gt: ">",
  amp: "&",
  quot: '"',
  apos: "'",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, ref: string) => {
    if (ref.startsWith("#x"))
      return String.fromCodePoint(Number.parseInt(ref.slice(2), 16));
    if (ref.startsWith("#"))
      return String.fromCodePoint(Number.parseInt(ref.slice(1), 10));
    return ENTITIES[ref] ?? m;
  });
}

const NAME = /[A-Za-z_:][-A-Za-z0-9_:.]*/y;
const SPACE = /\s*/y;

export function parseXml(text: string): Result<XmlElement> {
  let pos = 0;
  const err = (msg: string): Result<XmlElement> => fail("not-xml", msg, pos);
  const skipSpace = (): void => {
    SPACE.lastIndex = pos;
    SPACE.exec(text);
    pos = SPACE.lastIndex;
  };
  const readName = (): string | null => {
    NAME.lastIndex = pos;
    const m = NAME.exec(text);
    if (m === null) return null;
    pos = NAME.lastIndex;
    return m[0];
  };
  const skipMisc = (): boolean => {
    for (;;) {
      skipSpace();
      if (text.startsWith("<?", pos)) {
        const end = text.indexOf("?>", pos);
        if (end < 0) return false;
        pos = end + 2;
      } else if (text.startsWith("<!--", pos)) {
        const end = text.indexOf("-->", pos);
        if (end < 0) return false;
        pos = end + 3;
      } else if (text.startsWith("<!DOCTYPE", pos)) {
        let depth = 0;
        while (pos < text.length) {
          const c = text[pos];
          pos += 1;
          if (c === "[") depth += 1;
          else if (c === "]") depth -= 1;
          else if (c === ">" && depth === 0) break;
        }
      } else return true;
    }
  };

  if (text.charCodeAt(0) === 0xfeff) pos = 1;
  if (!skipMisc() || text[pos] !== "<") return err("no root element");

  const root: XmlElement = { name: "", attrs: [], children: [] };
  const stack: XmlElement[] = [root];
  while (pos < text.length) {
    const parent = stack[stack.length - 1];
    if (parent === undefined) break;
    if (stack.length === 1 && parent.children.length > 0) break; // root closed
    const lt = text.indexOf("<", pos);
    if (lt < 0) {
      if (text.slice(pos).trim() !== "") return err("text after root");
      break;
    }
    if (lt > pos && stack.length > 1)
      parent.children.push(decodeEntities(text.slice(pos, lt)));
    pos = lt;
    if (text.startsWith("<!--", pos) || text.startsWith("<?", pos)) {
      const close = text.startsWith("<!--", pos) ? "-->" : "?>";
      const end = text.indexOf(close, pos);
      if (end < 0) return err("unterminated comment/PI");
      pos = end + close.length;
      continue;
    }
    if (text.startsWith("<![CDATA[", pos)) {
      const end = text.indexOf("]]>", pos);
      if (end < 0) return err("unterminated CDATA");
      parent.children.push(text.slice(pos + 9, end));
      pos = end + 3;
      continue;
    }
    if (text.startsWith("</", pos)) {
      pos += 2;
      const name = readName();
      skipSpace();
      if (name !== parent.name || text[pos] !== ">")
        return err(`mismatched </${name ?? "?"}>`);
      pos += 1;
      stack.pop();
      continue;
    }
    pos += 1;
    const name = readName();
    if (name === null) return err("bad element name");
    const el: XmlElement = { name, attrs: [], children: [] };
    for (;;) {
      skipSpace();
      if (text.startsWith("/>", pos)) {
        pos += 2;
        parent.children.push(el);
        break;
      }
      if (text[pos] === ">") {
        pos += 1;
        parent.children.push(el);
        stack.push(el);
        break;
      }
      const attr = readName();
      if (attr === null) return err(`bad attribute in <${name}>`);
      skipSpace();
      if (text[pos] !== "=") return err(`missing = after ${attr}`);
      pos += 1;
      skipSpace();
      const quote = text[pos];
      if (quote !== '"' && quote !== "'") return err(`unquoted ${attr}`);
      const end = text.indexOf(quote, pos + 1);
      if (end < 0) return err(`unterminated ${attr}`);
      el.attrs.push([attr, decodeEntities(text.slice(pos + 1, end))]);
      pos = end + 1;
    }
  }
  if (stack.length > 1)
    return err(`unclosed <${stack[stack.length - 1]?.name ?? ""}>`);
  const top = root.children[0];
  if (top === undefined || typeof top === "string")
    return err("no root element");
  return ok(top);
}

const escapeAttr = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "&#10;")
    .replace(/\r/g, "&#13;");
const escapeText = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Serialize in the layout ChemDraw uses: one attribute per line for objects,
 * attributes on one line for the small elements listed in `inline`
 * (ChemDraw writes <s font=".." size="..">, <font .../>, <color .../> that way).
 */
export function writeXml(
  root: XmlElement,
  prolog: string,
  inline: ReadonlySet<string> = new Set(),
): string {
  const out: string[] = [prolog];
  const emit = (el: XmlElement): void => {
    const one = inline.has(el.name);
    out.push(`<${el.name}`);
    for (const [k, v] of el.attrs)
      out.push(`${one ? " " : "\n "}${k}="${escapeAttr(v)}"`);
    if (el.children.length === 0) {
      out.push(el.attrs.length > 0 && !one ? "\n/>" : "/>");
      return;
    }
    out.push(el.attrs.length > 0 && !one ? "\n>" : ">");
    for (const c of el.children) {
      if (typeof c === "string") out.push(escapeText(c));
      else emit(c);
    }
    out.push(`</${el.name}>`);
  };
  emit(root);
  return out.join("");
}

export const childElements = (el: XmlElement): XmlElement[] =>
  el.children.filter((c): c is XmlElement => typeof c !== "string");

export const textContent = (el: XmlElement): string =>
  el.children.map((c) => (typeof c === "string" ? c : textContent(c))).join("");
