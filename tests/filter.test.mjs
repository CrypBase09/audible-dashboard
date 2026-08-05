import test from "node:test";
import assert from "node:assert/strict";
import { filterBibliothek, filterEmpfehlungen } from "../js/lib/filter.js";

const buecher = [
  { asin: "A", titel: "Zebra", autor: "B Autor", genre: "Fantasy", serie: "S1", dauer_min: 100, hinzugefuegt: "2026-01-01" },
  { asin: "B", titel: "Apfel", autor: "A Autor", genre: "Krimi", serie: null, dauer_min: 300, hinzugefuegt: "2026-05-01" },
  { asin: "C", titel: "Mitte", autor: "C Autor", genre: "Fantasy", serie: "S1", dauer_min: 200, hinzugefuegt: null },
];
const pool = [
  { id: "r1", tags: { genres: ["Fantasy"], stimmung: ["spannend"], laenge: "episch" }, aehnlich_wie: "A" },
  { id: "r2", tags: { genres: ["Krimi"], stimmung: ["düster", "spannend"], laenge: "kurz" }, aehnlich_wie: null },
];

test("Genre-Filter + Default-Sortierung nach Titel", () => {
  assert.deepEqual(filterBibliothek(buecher, { genre: "Fantasy" }).map(b => b.asin), ["C", "A"]);
});
test("Serien-Filter", () => {
  assert.deepEqual(filterBibliothek(buecher, { serie: "S1" }).map(b => b.asin), ["C", "A"]);
});
test("nurFavoriten nutzt Favoritenliste", () => {
  assert.deepEqual(filterBibliothek(buecher, { nurFavoriten: true, favoriten: ["B"] }).map(b => b.asin), ["B"]);
});
test("Sortierung dauer = längste zuerst, neueste = jüngstes Datum zuerst", () => {
  assert.deepEqual(filterBibliothek(buecher, { sortierung: "dauer" }).map(b => b.asin), ["B", "C", "A"]);
  assert.deepEqual(filterBibliothek(buecher, { sortierung: "neueste" }).map(b => b.asin), ["B", "A", "C"]);
});
test("Empfehlungen: Stimmung UND Länge", () => {
  assert.deepEqual(filterEmpfehlungen(pool, { stimmung: "spannend", laenge: "kurz" }).map(r => r.id), ["r2"]);
});
test("Empfehlungen: gehört wird ausgeblendet", () => {
  assert.deepEqual(filterEmpfehlungen(pool, {}, ["r2"]).map(r => r.id), ["r1"]);
});
test("aehnlichWie: direkter Bezug oder Genre-Fallback", () => {
  assert.deepEqual(filterEmpfehlungen(pool, { aehnlichWie: "A" }).map(r => r.id), ["r1"]);
  assert.deepEqual(filterEmpfehlungen(pool, { aehnlichWie: "X", aehnlichWieGenre: "Krimi" }).map(r => r.id), ["r2"]);
});
