import test from "node:test";
import assert from "node:assert/strict";
import { istBesessen, besitzIndex } from "../js/lib/empfehlungs-filter.js";

const library = [
  { asin: "L1", titel: "Die Känguru-Chroniken: Die Känguru-Werke, Band 1", autor: "Marc-Uwe Kling" },
  { asin: "L2", titel: "Kaltes Ufer", autor: "Jonas Reht" },
  { asin: "L3", titel: "Der letzte Herzschlag: Der Ritter und der Knappe, Band 2", autor: "Sam Feuerbach, Bernhard Hennen" },
];
const index = besitzIndex(library);

test("gleiche ASIN gilt als besessen", () => {
  assert.equal(istBesessen({ asin: "L2", titel: "Irgendwas", autor: "X" }, index), true);
});

test("neue Ausgabe mit anderer ASIN wird über Titel und Autor erkannt", () => {
  assert.equal(istBesessen({ asin: "NEU9", titel: "Die Känguru-Chroniken", autor: "Marc-Uwe Kling" }, index), true);
  assert.equal(istBesessen({ asin: "NEU8", titel: "Kaltes Ufer: Neuauflage", autor: "Jonas Reht" }, index), true);
});

test("Titelgleichheit allein reicht nicht — der Autor muss passen", () => {
  assert.equal(istBesessen({ asin: "NEU7", titel: "Kaltes Ufer", autor: "Ganz Anders" }, index), false);
});

test("Ko-Autor genügt für die Erkennung", () => {
  assert.equal(istBesessen({ asin: "NEU6", titel: "Der letzte Herzschlag", autor: "Bernhard Hennen" }, index), true);
});

test("ein anderer Band derselben Reihe gilt nicht als besessen", () => {
  assert.equal(istBesessen({ asin: "NEU3", titel: "Die Elftausend Jungfrauen", autor: "Sam Feuerbach" }, index), false);
  assert.equal(istBesessen({ asin: "NEU2", titel: "Der Ritter und der Knappe", autor: "Sam Feuerbach" }, index), false);
});

test("Umlaute, Bindestriche und Groß-Klein-Schreibung stören nicht", () => {
  assert.equal(istBesessen({ asin: "NEU5", titel: "die kaenguru chroniken", autor: "marc-uwe kling" }, index), true);
});

test("fremder Titel bleibt fremd", () => {
  assert.equal(istBesessen({ asin: "NEU4", titel: "Radio Heimat", autor: "Frank Goosen" }, index), false);
});
