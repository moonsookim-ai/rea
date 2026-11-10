#!/usr/bin/env python3
"""Condense REA `analyze-javascript-application --format json --full-output`
results into small, committable summaries.

The full Evidence (30–60 MB each) stays local; the summary keeps the
evidence_id and artifact digest so it can be traced back to the full run.

Usage: python3 -I summarize_rea_js.py OUT_DIR RESULT.json [RESULT.json ...]
"""
import collections
import json
import os
import sys


def summarize(path):
    env = json.load(open(path, encoding="utf-8"))
    meta = env.get("meta", {})
    if not env.get("ok", True):
        err = env.get("error", {})
        ev = (err.get("details") or {}).get("partial_observation")
        status = f"partial ({err.get('code')})"
    else:
        ev = env.get("data", env)
        status = "complete"
    if not ev:
        return {"status": status, "duration": meta.get("duration")}
    nr = ev["normalized_result"]
    sg = nr.get("semantic_graph") or {}
    graph = nr.get("graph") or {}
    count = lambda xs, key: dict(collections.Counter(x.get(key) for x in xs).most_common())
    modules = collections.Counter()
    endpoints = []
    for n in graph.get("nodes", []):
        ident = n.get("identity", {})
        if n.get("kind") == "javascript-module":
            modules[ident.get("namespace", "?")] += 1
        if n.get("kind") == "endpoint":
            endpoints.append(ident.get("key"))
    specifiers = sorted({
        (o.get("properties") or {}).get("specifier")
        for n in graph.get("nodes", []) for o in n.get("observations", [])
        if (o.get("properties") or {}).get("specifier")
    })
    return {
        "status": status,
        "duration": meta.get("duration"),
        "evidence_id": ev.get("evidence_id"),
        "subject": {k: ev["subject"].get(k) for k in ("name", "digest")},
        "source_selection": nr.get("source_selection"),
        "statistics": nr.get("statistics"),
        "application_graph": {
            "nodes": len(graph.get("nodes", [])),
            "edges": len(graph.get("edges", [])),
            "module_nodes_by_namespace": dict(modules),
            "import_specifiers": specifiers[:80],
            "endpoints": endpoints[:40],
        },
        "semantic_graph": {
            "nodes": len(sg.get("nodes", [])),
            "node_kinds": count(sg.get("nodes", []), "kind"),
            "relations": len(sg.get("relations", [])),
            "relation_kinds": count(sg.get("relations", []), "relation"),
            "function_fingerprints": len(sg.get("fingerprints", [])),
            "unknowns": len(sg.get("unknowns", [])),
            "unknown_families": count(sg.get("unknowns", []), "family"),
        },
        "limitations": ev.get("limitations", [])[:12],
    }


def main(out_dir, paths):
    os.makedirs(out_dir, exist_ok=True)
    for p in paths:
        name = os.path.basename(p).replace(".js.json", "")
        s = summarize(p)
        json.dump(s, open(os.path.join(out_dir, name + ".summary.json"), "w"), indent=1)
        sg = s.get("semantic_graph", {})
        print(f"{name}: {s['status']} {s.get('duration')} nodes={sg.get('nodes')} "
              f"relations={sg.get('relations')} fns={sg.get('function_fingerprints')} unknowns={sg.get('unknowns')}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
