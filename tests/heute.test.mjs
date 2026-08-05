import test from "node:test";
import assert from "node:assert/strict";
import { malWiederHeute } from "../js/lib/heute.js";

test("deterministisch pro Datum, wechselt über Tage, null ohne Favoriten", () => {
  const favs = ["A", "B", "C"];
  const heute = malWiederHeute("2026-08-05", favs);
  assert.equal(malWiederHeute("2026-08-05", favs), heute);
  assert.ok(favs.includes(heute));
  const tage = ["2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08"];
  assert.ok(new Set(tage.map((t) => malWiederHeute(t, favs))).size > 1);
  assert.equal(malWiederHeute("2026-08-05", []), null);
});
