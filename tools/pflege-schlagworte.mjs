// Trägt themen, anlass und form aus data/schlagworte.tsv in data/recommendations.json ein.
// Aufruf: node tools/pflege-schlagworte.mjs
import { readFileSync, writeFileSync } from "node:fs";

const zeilen = readFileSync("data/schlagworte.tsv", "utf8")
  .split(/\r?\n/)
  .filter((z) => z.trim() && !z.startsWith("#"))
  .map((z) => z.split("\t"));

const nachAsin = new Map(zeilen.map(([asin, themen, anlass, form]) => [asin, {
  themen: (themen ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  anlass: (anlass ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  form: (form ?? "").trim(),
}]));

const rec = JSON.parse(readFileSync("data/recommendations.json", "utf8"));
const ohne = [];
for (const e of rec) {
  const s = nachAsin.get(e.asin);
  if (!s || !s.form || !s.themen.length) { ohne.push(`${e.asin} (${e.titel})`); continue; }
  e.tags.themen = s.themen;
  e.tags.anlass = s.anlass;
  e.tags.form = s.form;
}

writeFileSync("data/recommendations.json", JSON.stringify(rec, null, 1) + "\n", "utf8");
console.log(`${rec.length - ohne.length} von ${rec.length} Empfehlungen beschlagwortet`);
if (ohne.length) {
  console.error(`Ohne Schlagworte (${ohne.length}):\n  ${ohne.join("\n  ")}`);
  process.exit(1);
}
