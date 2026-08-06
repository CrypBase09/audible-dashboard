// Baut data/library.json aus der Roh-Auslese (TSV) + Anreicherung (TSV).
// Aufruf: node tools/baue-library.mjs <roh.tsv> <anreicherung.tsv>
import { readFileSync, writeFileSync } from "node:fs";

const [rohPfad, anreicherungPfad] = process.argv.slice(2);
if (!rohPfad || !anreicherungPfad) {
  console.error("Aufruf: node tools/baue-library.mjs <roh.tsv> <anreicherung.tsv>");
  process.exit(2);
}

const zeilen = (pfad) =>
  readFileSync(pfad, "utf8").split(/\r?\n/).filter((z) => z.trim().length > 0).map((z) => z.split("\t"));

const anreicherung = new Map(
  zeilen(anreicherungPfad).map(([asin, dauer, genre]) => [asin, { dauer: Number(dauer), genre }]),
);

const fehlend = [];
const ohneDauer = [];
const buecher = zeilen(rohPfad).map(([asin, titel, autor, sprecher, serie, band]) => {
  const extra = anreicherung.get(asin);
  if (!extra) fehlend.push(`${asin} (${titel})`);
  else if (!Number.isFinite(extra.dauer) || extra.dauer <= 0) ohneDauer.push(`${asin} (${titel})`);
  return {
    asin,
    titel,
    autor,
    sprecher: sprecher || null,
    serie: serie || null,
    band: band ? Number(band) : null,
    dauer_min: Number.isFinite(extra?.dauer) && extra.dauer > 0 ? extra.dauer : null,
    genre: extra?.genre ?? "Belletristik",
    cover: `covers/${asin}.jpg`,
    audible_url: `https://www.audible.de/pd/${asin}`,
    hinzugefuegt: null,
  };
});

if (fehlend.length) {
  console.error(`Ohne Anreicherungs-Eintrag (${fehlend.length}):\n  ${fehlend.join("\n  ")}`);
  process.exit(1);
}
if (ohneDauer.length) {
  console.log(`Hinweis: ${ohneDauer.length} Titel ohne Spieldauer (bei Audible nicht mehr gelistet):\n  ${ohneDauer.join("\n  ")}`);
}

writeFileSync("data/library.json", JSON.stringify(buecher, null, 1) + "\n", "utf8");
console.log(`OK: ${buecher.length} Bücher nach data/library.json geschrieben`);
