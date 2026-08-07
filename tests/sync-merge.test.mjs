import test from "node:test";
import assert from "node:assert/strict";
import { mergeState, LEERE_TOMBSTONES } from "../js/lib/sync-merge.js";
import { normalisiereState } from "../js/lib/profil.js";

const mitSie = (felder) => normalisiereState({ version: 1, profile: { sie: felder, er: {} } });

test("null-Seiten fallen auf die andere Seite bzw. leeren State zurück", () => {
  const s = mitSie({ meine: ["A"] });
  assert.deepEqual(mergeState(null, s).profile.sie.meine, ["A"]);
  assert.deepEqual(mergeState(s, null).profile.sie.meine, ["A"]);
  assert.deepEqual(mergeState(null, null).profile.sie.meine, []);
});

test("Markierungen beider Seiten werden vereinigt, je Profil getrennt", () => {
  const lokal = normalisiereState({ version: 2, profile: { sie: { meine: ["A", "B"], lieblinge: ["A"] }, er: { meine: ["X"] } } });
  const remote = normalisiereState({ version: 5, profile: { sie: { meine: ["B", "C"] }, er: { meine: ["Y"] } } });
  const m = mergeState(lokal, remote);
  assert.deepEqual(m.profile.sie.meine.sort(), ["A", "B", "C"]);
  assert.deepEqual(m.profile.sie.lieblinge, ["A"]);
  assert.deepEqual(m.profile.er.meine.sort(), ["X", "Y"]);
  assert.equal(m.version, 5);
});

test("Wunschlisten-Tombstones wirken nur im eigenen Profil", () => {
  const lokal = normalisiereState({ profile: { sie: { wishlist: ["r1"] }, er: { wishlist: ["r1"] } } });
  const remote = normalisiereState({ profile: { sie: { wishlist: ["r1", "r2"] }, er: { wishlist: ["r1"] } } });
  const m = mergeState(lokal, remote, { ...LEERE_TOMBSTONES, sie: { wishlist: ["r1"] } });
  assert.deepEqual(m.profile.sie.wishlist, ["r2"]);
  assert.deepEqual(m.profile.er.wishlist, ["r1"]);
});

test("Ablehnungen bleiben erhalten, auch wenn nur eine Seite sie kennt", () => {
  const lokal = normalisiereState({ profile: { sie: { abgelehnt: ["r9"] }, er: {} } });
  const remote = normalisiereState({ profile: { sie: {}, er: {} } });
  assert.deepEqual(mergeState(lokal, remote).profile.sie.abgelehnt, ["r9"]);
});

test("Wunsch-Status: beantwortet schlägt abgebrochen schlägt in_arbeit schlägt offen", () => {
  const w = (status) => normalisiereState({ profile: { sie: { wishes: [{ id: "x", text: "t", datum: "2026-08-01", status }] }, er: {} } });
  assert.equal(mergeState(w("offen"), w("in_arbeit")).profile.sie.wishes[0].status, "in_arbeit");
  assert.equal(mergeState(w("in_arbeit"), w("abgebrochen")).profile.sie.wishes[0].status, "abgebrochen");
  assert.equal(mergeState(w("abgebrochen"), w("beantwortet")).profile.sie.wishes[0].status, "beantwortet");
  assert.equal(mergeState(w("beantwortet"), w("offen")).profile.sie.wishes[0].status, "beantwortet");
});

test("frische Empfehlungen werden über die id vereinigt", () => {
  const lokal = normalisiereState({ frisch: [{ id: "r-A", fuer: "sie" }] });
  const remote = normalisiereState({ frisch: [{ id: "r-A", fuer: "sie" }, { id: "r-B", fuer: "er" }] });
  assert.deepEqual(mergeState(lokal, remote).frisch.map((f) => f.id).sort(), ["r-A", "r-B"]);
});
