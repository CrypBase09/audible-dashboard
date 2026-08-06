// Baut data/recommendations.json aus recherchierten Zeilen.
// Eingabeformat je Zeile: regal|ASIN|Titel|Autor|Sprecher|Begründung|genres|stimmung|laenge
// Aufruf: node tools/baue-empfehlungen.mjs <roh.txt> [datum]
import { readFileSync, writeFileSync } from "node:fs";

const [rohPfad, datumArg] = process.argv.slice(2);
if (!rohPfad) {
  console.error("Aufruf: node tools/baue-empfehlungen.mjs <roh.txt> [YYYY-MM-DD]");
  process.exit(2);
}
const datum = datumArg ?? "1970-01-01";

const library = JSON.parse(readFileSync("data/library.json", "utf8"));
const besitztAsin = new Set(library.map((b) => b.asin));
const besitztTitel = new Set(library.map((b) => b.titel.toLowerCase().split(":")[0].trim()));
// Für "aehnlich_wie": pro Autor ein vorhandenes Buch als Anker.
const ankerJeAutor = new Map();
for (const b of library) {
  for (const name of b.autor.split(",").map((n) => n.trim())) {
    if (!ankerJeAutor.has(name)) ankerJeAutor.set(name, b.asin);
  }
}

const uebersprungen = [];
const gesehen = new Set();
const empfehlungen = [];

for (const zeile of readFileSync(rohPfad, "utf8").split(/\r?\n/)) {
  if (!zeile.trim() || zeile.trimStart().startsWith("#")) continue;
  const [regal, asin, titel, autor, sprecher, begruendung, genres, stimmung, laenge] =
    zeile.split("|").map((f) => f.trim());
  if (!asin || !titel) { uebersprungen.push(`unvollständig: ${zeile.slice(0, 60)}`); continue; }
  if (besitztAsin.has(asin)) { uebersprungen.push(`schon in Bibliothek (ASIN): ${titel}`); continue; }
  if (besitztTitel.has(titel.toLowerCase().split(":")[0].trim())) {
    uebersprungen.push(`schon in Bibliothek (Titel): ${titel}`); continue;
  }
  if (gesehen.has(asin)) { uebersprungen.push(`doppelt: ${titel}`); continue; }
  gesehen.add(asin);

  const anker = autor.split(",").map((n) => n.trim()).map((n) => ankerJeAutor.get(n)).find(Boolean) ?? null;
  empfehlungen.push({
    id: `r-${asin}`,
    asin,
    titel,
    autor,
    sprecher: sprecher || null,
    begruendung,
    tags: {
      genres: genres.split(",").map((g) => g.trim()).filter(Boolean),
      stimmung: stimmung.split(",").map((s) => s.trim()).filter(Boolean),
      laenge,
    },
    aehnlich_wie: anker,
    audible_url: `https://www.audible.de/pd/${asin}`,
    regal,
    aufgenommen_am: datum,
  });
}

writeFileSync("data/recommendations.json", JSON.stringify(empfehlungen, null, 1) + "\n", "utf8");
const jeRegal = {};
for (const e of empfehlungen) jeRegal[e.regal] = (jeRegal[e.regal] ?? 0) + 1;
console.log(`OK: ${empfehlungen.length} Empfehlungen geschrieben`);
console.log(`Regale: ${Object.entries(jeRegal).map(([k, v]) => `${k}=${v}`).join(", ")}`);
if (uebersprungen.length) console.log(`Übersprungen (${uebersprungen.length}):\n  ${uebersprungen.join("\n  ")}`);
