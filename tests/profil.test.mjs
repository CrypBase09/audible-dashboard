import test from "node:test";
import assert from "node:assert/strict";
import {
  LEERES_PROFIL, LEERER_STATE, normalisiereState, holeProfil,
  setzeHerz, setzeStern, hatMarkierungen,
} from "../js/lib/profil.js";

test("leerer State hat beide Profile mit allen Feldern", () => {
  const s = normalisiereState(null);
  assert.deepEqual(Object.keys(s.profile).sort(), ["er", "sie"]);
  for (const p of ["sie", "er"]) {
    assert.deepEqual(s.profile[p], LEERES_PROFIL);
  }
  assert.deepEqual(s.frisch, []);
});

test("v1-State (flaches favorites) wandert nach profile.sie.meine", () => {
  const alt = { version: 7, favorites: ["A", "B"], wishlist: ["r1"], gehoert: ["r2"], wishes: [{ id: "w", text: "t", datum: "2026-08-01", status: "offen" }] };
  const s = normalisiereState(alt);
  assert.deepEqual(s.profile.sie.meine, ["A", "B"]);
  assert.deepEqual(s.profile.sie.wishlist, ["r1"]);
  assert.deepEqual(s.profile.sie.gehoert, ["r2"]);
  assert.equal(s.profile.sie.wishes.length, 1);
  assert.deepEqual(s.profile.er, LEERES_PROFIL);
  assert.equal(s.version, 7);
});

test("unbekannte Profilnamen fallen auf sie zurück", () => {
  const s = normalisiereState(LEERER_STATE);
  assert.equal(holeProfil(s, "quatsch"), s.profile.sie);
  assert.equal(holeProfil(s, "er"), s.profile.er);
});

test("Stern setzt implizit das Herz", () => {
  const s = normalisiereState(null);
  setzeStern(s, "er", "A", true);
  assert.deepEqual(s.profile.er.lieblinge, ["A"]);
  assert.deepEqual(s.profile.er.meine, ["A"]);
});

test("Herz entfernen entfernt auch den Stern", () => {
  const s = normalisiereState(null);
  setzeStern(s, "sie", "A", true);
  setzeHerz(s, "sie", "A", false);
  assert.deepEqual(s.profile.sie.meine, []);
  assert.deepEqual(s.profile.sie.lieblinge, []);
});

test("Markierungen sind pro Profil getrennt", () => {
  const s = normalisiereState(null);
  setzeHerz(s, "sie", "A", true);
  assert.equal(hatMarkierungen(s, "sie"), true);
  assert.equal(hatMarkierungen(s, "er"), false);
  assert.deepEqual(s.profile.er.meine, []);
});

test("doppeltes Setzen erzeugt keine Duplikate", () => {
  const s = normalisiereState(null);
  setzeHerz(s, "sie", "A", true);
  setzeHerz(s, "sie", "A", true);
  assert.deepEqual(s.profile.sie.meine, ["A"]);
});
