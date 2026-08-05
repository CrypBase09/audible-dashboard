import { readFileSync } from "node:fs";
import { pruefeBuch, pruefeEmpfehlung } from "../js/lib/daten-schema.js";

let fehlerGesamt = 0;
const melde = (datei, index, fehler) => {
  for (const f of fehler) { console.error(`${datei}[${index}]: ${f}`); fehlerGesamt++; }
};
const lib = JSON.parse(readFileSync("data/library.json", "utf8"));
lib.forEach((b, i) => melde("library", i, pruefeBuch(b)));
const doppelte = lib.map((b) => b.asin).filter((a, i, arr) => arr.indexOf(a) !== i);
if (doppelte.length) { console.error(`library: doppelte ASINs: ${doppelte.join(", ")}`); fehlerGesamt++; }
const recs = JSON.parse(readFileSync("data/recommendations.json", "utf8"));
recs.forEach((e, i) => melde("recommendations", i, pruefeEmpfehlung(e)));
console.log(fehlerGesamt === 0 ? `OK: ${lib.length} Bücher, ${recs.length} Empfehlungen` : `${fehlerGesamt} Fehler`);
process.exit(fehlerGesamt === 0 ? 0 : 1);
