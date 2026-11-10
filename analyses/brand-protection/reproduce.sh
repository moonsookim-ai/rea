#!/usr/bin/env bash
# Reproduce the REA passive web analysis used in this folder.
# Requires: built REA (npm ci && npm run build:cached), a Chromium binary, and network access.
# Only public pages are opened; no login, form submission or private API calls.
set -euo pipefail

CHROME="${CHROME:-chromium}"
OUT="${OUT:-$(mktemp -d)}"
REA="node $(git rev-parse --show-toplevel)/scripts/rea.mjs"
CDP=http://127.0.0.1:9222

"$CHROME" --headless=new --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 \
  --user-data-dir="$OUT/profile" --window-size=1440,900 about:blank >/dev/null 2>&1 &
trap 'kill %1' EXIT
sleep 3

for url in https://www.wegofair.com https://faikerz.com https://www.marqvision.com; do
  curl -s -X PUT "$CDP/json/new?$url" >/dev/null
done
sleep 10

$REA list-browser-targets "$CDP" --json > "$OUT/targets.json"

node -e '
const t=require(process.argv[1]).normalized_result.targets;
for (const x of t) console.log(new URL(x.url).hostname.replace(/^www\./,"").split(".")[0], x.target_id);
' "$OUT/targets.json" | while read -r name id; do
  $REA inspect-web-page "$CDP" "$id" --observation-ms 4000 --include-script-sources \
    --include-accessibility-text --include-storage-keys --command-timeout-ms 60000 --json > "$OUT/$name.capture.json"
  $REA export-web-scripts "$OUT/$name.capture.json" "$OUT/$name-scripts" --json > "$OUT/$name.export.json"
  $REA analyze-web-bundle "$CDP" "$id" --observation-ms 3000 --fetch-source-maps --command-timeout-ms 60000 --json > "$OUT/$name.bundle.json"
  $REA analyze-javascript-application "$OUT/$name-scripts/files" --json > "$OUT/$name.jsapp.json"
done

# Next.js route manifest (wegofair)
find "$OUT/wegofair-scripts" -name _buildManifest.js -exec grep -o 'sortedPages:\[[^]]*\]' {} \;
echo "results in $OUT"
