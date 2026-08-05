import test from "node:test";
import assert from "node:assert/strict";
import { pruefeBuch, pruefeEmpfehlung } from "../js/lib/daten-schema.js";

test("gültiges Buch → keine Fehler; kaputtes Buch → benannte Fehler", () => {
  const ok = { asin: "X1", titel: "T", autor: "A", sprecher: "S", serie: null, band: null, dauer_min: 60, genre: "Krimi", cover: "covers/X1.jpg", audible_url: "https://www.audible.de/pd/X1", hinzugefuegt: null };
  assert.deepEqual(pruefeBuch(ok), []);
  const fehler = pruefeBuch({ asin: "", titel: "T", dauer_min: "60" });
  assert.ok(fehler.some((f) => f.includes("asin")));
  assert.ok(fehler.some((f) => f.includes("dauer_min")));
  assert.ok(fehler.some((f) => f.includes("audible_url")));
});
test("Empfehlung: Regal und Tags werden geprüft", () => {
  const ok = { id: "r9", asin: null, titel: "T", autor: "A", sprecher: null, begruendung: "Weil.", tags: { genres: ["Krimi"], stimmung: ["spannend"], laenge: "kurz" }, aehnlich_wie: null, audible_url: "https://www.audible.de/pd/Y", regal: "geschmacks-match", aufgenommen_am: "2026-08-05" };
  assert.deepEqual(pruefeEmpfehlung(ok), []);
  assert.ok(pruefeEmpfehlung({ ...ok, regal: "quatsch" }).some((f) => f.includes("regal")));
  assert.ok(pruefeEmpfehlung({ ...ok, tags: { genres: [], stimmung: [], laenge: "riesig" } }).some((f) => f.includes("laenge")));
});
