import test from "node:test";
import assert from "node:assert/strict";
import { formuliereAuftrag, istLeer } from "../js/lib/suchauftrag.js";

test("leere Auswahl wird als leer erkannt", () => {
  assert.equal(istLeer({}), true);
  assert.equal(istLeer({ stimmung: [], themen: [], freitext: "  " }), true);
  assert.equal(istLeer({ stimmung: ["witzig"] }), false);
  assert.equal(istLeer({ freitext: "irgendwas" }), false);
});

test("einzelne Gruppe ergibt einen knappen Satz", () => {
  assert.equal(formuliereAuftrag({ stimmung: ["witzig"] }), "Etwas Witziges.");
});

test("mehrere Gruppen werden zu einem lesbaren Auftrag verbunden", () => {
  const a = formuliereAuftrag({
    form: ["Hörspiel"], anlass: ["zum Einschlafen"], themen: ["Ruhrpott"],
    sprecher: ["Uve Teschner"], laenge: "kurz",
  });
  assert.match(a, /Hörspiel/);
  assert.match(a, /zum Einschlafen/);
  assert.match(a, /Ruhrpott/);
  assert.match(a, /Uve Teschner/);
  assert.match(a, /kurz/i);
});

test("mehrere Werte einer Gruppe werden mit oder verbunden", () => {
  assert.match(formuliereAuftrag({ themen: ["Familie", "Reisen"] }), /Familie oder Reisen/);
});

test("Ähnlich-wie nennt den Titel", () => {
  assert.match(formuliereAuftrag({ aehnlichWieTitel: "Die Känguru-Chroniken" }), /ähnlich wie „Die Känguru-Chroniken”/);
});

test("Freitext hängt sich als eigener Satz an", () => {
  const a = formuliereAuftrag({ stimmung: ["witzig"], freitext: "bitte nichts Politisches" });
  assert.match(a, /Etwas Witziges/);
  assert.match(a, /bitte nichts Politisches/);
});

test("leere Auswahl ergibt einen brauchbaren Standardauftrag", () => {
  assert.match(formuliereAuftrag({}), /Überrasch mich/);
});
