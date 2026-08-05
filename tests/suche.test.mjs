import test from "node:test";
import assert from "node:assert/strict";
import { normalisiere, sucheBuecher } from "../js/lib/suche.js";

const buecher = [
  { asin: "A", titel: "Die Nebelkrone", autor: "Mara Winter", sprecher: "Luise Helm", serie: "Nebelkrone" },
  { asin: "B", titel: "Kaltes Ufer", autor: "Jonas Reht", sprecher: "Uve Teschner", serie: null },
];

test("normalisiere: Kleinbuchstaben, Umlaute, ß", () => {
  assert.equal(normalisiere("Größe MÄRCHEN"), "grosse marchen");
});
test("leere Anfrage liefert alle", () => {
  assert.equal(sucheBuecher(buecher, "  ").length, 2);
});
test("findet über Autor, case-insensitiv", () => {
  assert.deepEqual(sucheBuecher(buecher, "mara").map(b => b.asin), ["A"]);
});
test("Tippfehler mit 1 Abweichung ab 5 Zeichen", () => {
  assert.deepEqual(sucheBuecher(buecher, "nebelkrune").map(b => b.asin), ["A"]);
});
test("kurze Wörter nur exakt als Teilstring", () => {
  assert.equal(sucheBuecher(buecher, "uve").length, 1);
  assert.equal(sucheBuecher(buecher, "uvi").length, 0);
});
test("mehrere Wörter: alle müssen treffen", () => {
  assert.equal(sucheBuecher(buecher, "winter ufer").length, 0);
});
