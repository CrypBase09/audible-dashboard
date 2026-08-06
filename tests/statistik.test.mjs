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
test("Mehrfach-Sprecher werden einzeln gezählt, nicht als eine Gruppe", () => {
  const s = berechneStatistik([
    { asin: "A", autor: "Kling", sprecher: "Bodo Primus, Chris Nonnast", genre: "Comedy", dauer_min: 60 },
    { asin: "B", autor: "Feuerbach, Hennen", sprecher: "Bodo Primus", genre: "Fantasy", dauer_min: 60 },
  ]);
  assert.deepEqual(s.topSprecher[0], { name: "Bodo Primus", anzahl: 2 });
  assert.ok(s.topAutoren.some((a) => a.name === "Hennen" && a.anzahl === 1));
});
test("formatiereDauer: unbekannte Dauer wird benannt statt als 0 gezeigt", () => {
  assert.equal(formatiereDauer(null), "Dauer unbekannt");
  assert.equal(formatiereDauer(0), "Dauer unbekannt");
});
test("Statistik ignoriert Bücher ohne Spieldauer bei Summe und Rekorden", () => {
  const s = berechneStatistik([
    { asin: "A", autor: "X", sprecher: "S", genre: "Comedy", dauer_min: 120 },
    { asin: "B", autor: "Y", sprecher: "S", genre: "Comedy", dauer_min: null },
  ]);
  assert.equal(s.anzahl, 2);
  assert.equal(s.gesamt_min, 120);
  assert.equal(s.laengstes.asin, "A");
  assert.equal(s.kuerzestes.asin, "A");
});
