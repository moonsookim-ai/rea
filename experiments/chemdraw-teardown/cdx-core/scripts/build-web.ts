// Bundle web/app.ts (with the cdx-core library) into one self-contained HTML
// page: web/page.html with the script inlined at <!--APP-->.
//
// Usage: node scripts/build-web.ts [out.html]   (default: web/dist/index.html)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = resolve(process.argv[2] ?? join(root, "web", "dist", "index.html"));

const result = await build({
  entryPoints: [join(root, "web", "app.ts")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  write: false,
  legalComments: "none",
});
const js = result.outputFiles[0]?.text ?? "";
const page = readFileSync(join(root, "web", "page.html"), "utf8");
const html = page.replace(
  "<!--APP-->",
  () => `<script>${js.replace(/<\/script/gi, "<\\/script")}</script>`,
);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(
  `wrote ${out} (${(html.length / 1024).toFixed(1)} KiB, script ${(js.length / 1024).toFixed(1)} KiB)`,
);
