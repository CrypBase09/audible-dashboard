import test from "node:test";
import assert from "node:assert/strict";
import { sichtbareEmpfehlungen, meineBuecher } from "../js/lib/empfehlungs-filter.js";
import { normalisiereState, setzeHerz } from "../js/lib/profil.js";

const library = [
  { asin: "L1", titel: "Känguru 1", autor: "Marc-Uwe Kling", sprecher: "Marc-Uwe Kling", genre: "Comedy" },
  { asin: "L2", titel: "Ritter Band 2", autor: "Sam Feuerbach", sprecher: "Robert Frank", genre: "Fantasy" },
  { asin: "L3", titel: "Darm-Hirn", autor: "Gregor Hasler", sprecher: "Olaf Pessler", genre: "Sachbuch" },
];
const pool = [
  { id: "s1", asin: "N1", autor: "Sam Feuerbach", sprecher: "Robert Frank", tags: { genres: ["Fantasy"] }, aehnlich_wie: "L2", regal: "serien-fortsetzung" },
  { id: "a1", asin: "N2", autor: "Marc-Uwe Kling", sprecher: "Marc-Uwe Kling", tags: { genres: ["Comedy"] }, aehnlich_wie: "L1", regal: "lieblingsautor" },
  { id: "g1", asin: "N3", autor: "Horst Evers", sprecher: "Horst Evers", tags: { genres: ["Comedy"] }, aehnlich_wie: null, regal: "geschmacks-match" },
  { id: "g2", asin: "N4", autor: "Anna Neu", sprecher: "Anna Neu", tags: { genres: ["Sachbuch"] }, aehnlich_wie: null, regal: "geschmacks-match" },
  { id: "b1", asin: "L1", autor: "Marc-Uwe Kling", sprecher: "Marc-Uwe Kling", tags: { genres: ["Comedy"] }, aehnlich_wie: null, regal: "geschmacks-match" },
];

const mitHerzen = (...asins) => {
  const s = normalisiereState(null);
  for (const a of asins) setzeHerz(s, "sie", a, true);
  return s;
};

test("ohne Markierungen wird der ganze Pool gezeigt, außer Besessenem", () => {
  const sichtbar = sichtbareEmpfehlungen(pool, library, normalisiereState(null), "sie");
  assert.deepEqual(sichtbar.map((e) => e.id), ["s1", "a1", "g1", "g2"]);
});

test("Titel aus der Bibliothek erscheinen nie", () => {
  const sichtbar = sichtbareEmpfehlungen(pool, library, mitHerzen("L1"), "sie");
  assert.ok(!sichtbar.some((e) => e.id === "b1"));
});

test("Fortsetzung nur, wenn der Ankerband ein Herz hat", () => {
  assert.ok(!sichtbareEmpfehlungen(pool, library, mitHerzen("L1"), "sie").some((e) => e.id === "s1"));
  assert.ok(sichtbareEmpfehlungen(pool, library, mitHerzen("L2"), "sie").some((e) => e.id === "s1"));
});

test("Lieblingsautor nur bei Übereinstimmung mit eigenen Autoren oder Sprechern", () => {
  assert.ok(sichtbareEmpfehlungen(pool, library, mitHerzen("L1"), "sie").some((e) => e.id === "a1"));
  assert.ok(!sichtbareEmpfehlungen(pool, library, mitHerzen("L3"), "sie").some((e) => e.id === "a1"));
});

test("Geschmacks-Match folgt den Genres der eigenen Bücher", () => {
  const nurComedy = sichtbareEmpfehlungen(pool, library, mitHerzen("L1"), "sie").map((e) => e.id);
  assert.ok(nurComedy.includes("g1"));
  assert.ok(!nurComedy.includes("g2"));
});

test("Abgelehntes und Gehörtes verschwindet", () => {
  const s = mitHerzen("L1");
  s.profile.sie.abgelehnt.push("g1");
  s.profile.sie.gehoert.push("a1");
  const sichtbar = sichtbareEmpfehlungen(pool, library, s, "sie").map((e) => e.id);
  assert.deepEqual(sichtbar, []);
});

test("Profile beeinflussen sich nicht", () => {
  const s = mitHerzen("L2");
  const ihr = sichtbareEmpfehlungen(pool, library, s, "sie").map((e) => e.id);
  const sein = sichtbareEmpfehlungen(pool, library, s, "er").map((e) => e.id);
  assert.ok(ihr.includes("s1"));
  assert.deepEqual(sein, ["s1", "a1", "g1", "g2"]);
});

test("meineBuecher liefert nur die markierten Titel des Profils", () => {
  const s = mitHerzen("L1", "L3");
  assert.deepEqual(meineBuecher(library, s, "sie").map((b) => b.asin), ["L1", "L3"]);
  assert.deepEqual(meineBuecher(library, s, "er"), []);
});
