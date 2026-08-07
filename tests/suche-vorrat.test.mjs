import test from "node:test";
import assert from "node:assert/strict";
import { sucheImVorrat } from "../js/lib/empfehlungs-filter.js";

const pool = [
  { id: "a", sprecher: "Uve Teschner", aehnlich_wie: "L1",
    tags: { genres: ["Krimi"], stimmung: ["spannend"], laenge: "kurz", themen: ["Ruhrpott"], anlass: ["fürs Auto"], form: "Hörspiel" } },
  { id: "b", sprecher: "Marc-Uwe Kling", aehnlich_wie: null,
    tags: { genres: ["Comedy"], stimmung: ["witzig"], laenge: "mittel", themen: ["Familie", "Alltag"], anlass: ["zum Einschlafen"], form: "Lesung" } },
  { id: "c", sprecher: "Torsten Sträter", aehnlich_wie: null,
    tags: { genres: ["Comedy"], stimmung: ["witzig"], laenge: "kurz", themen: ["Alltag"], anlass: [], form: "Bühnenprogramm" } },
  { id: "alt", sprecher: "Wer Auchimmer", aehnlich_wie: null,
    tags: { genres: ["Comedy"], stimmung: ["witzig"], laenge: "kurz" } },
];

const ids = (a) => sucheImVorrat(pool, a).map((e) => e.id);

test("leere Auswahl liefert alles", () => {
  assert.deepEqual(ids({}), ["a", "b", "c", "alt"]);
});

test("innerhalb einer Gruppe gilt oder", () => {
  assert.deepEqual(ids({ themen: ["Ruhrpott", "Familie"] }), ["a", "b"]);
});

test("zwischen Gruppen gilt und", () => {
  assert.deepEqual(ids({ stimmung: ["witzig"], laenge: "kurz", form: ["Bühnenprogramm"] }), ["c"]);
  assert.deepEqual(ids({ stimmung: ["witzig"], form: ["Hörspiel"] }), []);
});

test("Anlass filtert", () => {
  assert.deepEqual(ids({ anlass: ["zum Einschlafen"] }), ["b"]);
});

test("Sprecher trifft auch bei Teilnamen", () => {
  assert.deepEqual(ids({ sprecher: ["teschner"] }), ["a"]);
  assert.deepEqual(ids({ sprecher: ["Kling", "Sträter"] }), ["b", "c"]);
});

test("Ähnlich-wie greift auf den Anker", () => {
  assert.deepEqual(ids({ aehnlichWie: "L1" }), ["a"]);
});

test("Eintrag ohne neue Schlagworte fällt nur aus diesen Gruppen, nicht aus allen", () => {
  assert.ok(ids({ stimmung: ["witzig"] }).includes("alt"));
  assert.ok(!ids({ themen: ["Alltag"] }).includes("alt"));
});
