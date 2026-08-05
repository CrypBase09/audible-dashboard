import test from "node:test";
import assert from "node:assert/strict";
import { berechneStatistik, formatiereDauer } from "../js/lib/statistik.js";

const buecher = [
  { asin: "A", autor: "X", sprecher: "S1", genre: "Fantasy", dauer_min: 600 },
  { asin: "B", autor: "X", sprecher: "S2", genre: "Fantasy", dauer_min: 300 },
  { asin: "C", autor: "Y", sprecher: "S1", genre: "Krimi", dauer_min: 900 },
];

test("Statistik: Summen, Reihenfolge, Rekorde", () => {
  const s = berechneStatistik(buecher);
  assert.equal(s.anzahl, 3);
  assert.equal(s.gesamt_min, 1800);
  assert.deepEqual(s.genres[0], { name: "Fantasy", anzahl: 2 });
  assert.deepEqual(s.topAutoren[0], { name: "X", anzahl: 2 });
  assert.equal(s.laengstes.asin, "C");
  assert.equal(s.kuerzestes.asin, "B");
});
test("Statistik: leere Bibliothek crasht nicht", () => {
  const s = berechneStatistik([]);
  assert.equal(s.anzahl, 0);
  assert.equal(s.laengstes, null);
});
test("formatiereDauer", () => {
  assert.equal(formatiereDauer(5250), "87 Std. 30 Min.");
  assert.equal(formatiereDauer(144720), "2.412 Std.");
});
