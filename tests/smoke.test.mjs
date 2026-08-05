import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Fixture-Daten sind gültiges JSON mit Pflichtfeldern", () => {
  const lib = JSON.parse(readFileSync("data/library.json", "utf8"));
  assert.ok(lib.length >= 1);
  for (const b of lib) for (const f of ["asin", "titel", "autor", "genre", "dauer_min"]) assert.ok(f in b, f);
  const recs = JSON.parse(readFileSync("data/recommendations.json", "utf8"));
  for (const r of recs) for (const f of ["id", "titel", "begruendung", "tags", "regal"]) assert.ok(f in r, f);
});
