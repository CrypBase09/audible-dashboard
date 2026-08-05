import test from "node:test";
import assert from "node:assert/strict";
import { mergeState, LEERER_STATE } from "../js/lib/sync-merge.js";

test("null-Seiten fallen auf die andere Seite bzw. LEERER_STATE zurück", () => {
  const s = { ...LEERER_STATE, favorites: ["A"] };
  assert.deepEqual(mergeState(null, s), s);
  assert.deepEqual(mergeState(s, null), s);
  assert.deepEqual(mergeState(null, null), LEERER_STATE);
});
test("Herzen vereinigen, Wunschlisten-Tombstones gewinnen, version = max", () => {
  const lokal = { version: 2, favorites: ["A", "B"], wishlist: ["w1", "w2"], gehoert: ["g1"], wishes: [] };
  const remote = { version: 5, favorites: ["B", "C"], wishlist: ["w2", "w3"], gehoert: [], wishes: [] };
  const m = mergeState(lokal, remote, { wishlist: ["w3"] });
  assert.deepEqual(m.favorites.sort(), ["A", "B", "C"]);
  assert.deepEqual(m.wishlist.sort(), ["w1", "w2"]);
  assert.deepEqual(m.gehoert, ["g1"]);
  assert.equal(m.version, 5);
});
test("wishes: beantwortet gewinnt über offen", () => {
  const lokal = { ...LEERER_STATE, wishes: [{ id: "x", text: "t", datum: "2026-08-01", status: "offen" }] };
  const remote = { ...LEERER_STATE, wishes: [{ id: "x", text: "t", datum: "2026-08-01", status: "beantwortet" }] };
  assert.equal(mergeState(lokal, remote).wishes[0].status, "beantwortet");
  assert.equal(mergeState(remote, lokal).wishes[0].status, "beantwortet");
});
