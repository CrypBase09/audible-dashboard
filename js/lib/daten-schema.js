const REGALE = ["wunsch-antwort", "serien-fortsetzung", "lieblingsautor", "geschmacks-match"];
const LAENGEN = ["kurz", "mittel", "episch"];
const istText = (w) => typeof w === "string" && w.length > 0;
const istUrl = (w) => istText(w) && w.startsWith("https://www.audible.de/");

export function pruefeBuch(b) {
  const fehler = [];
  if (!istText(b.asin)) fehler.push("asin fehlt/leer");
  if (!istText(b.titel)) fehler.push("titel fehlt/leer");
  if (!istText(b.autor)) fehler.push("autor fehlt/leer");
  // null ist erlaubt: bei Titeln, die Audible nicht mehr verkauft, gibt es keine Spieldauer mehr.
  if (b.dauer_min !== null && (typeof b.dauer_min !== "number" || b.dauer_min <= 0)) {
    fehler.push("dauer_min muss Zahl > 0 oder null sein");
  }
  if (!istText(b.genre)) fehler.push("genre fehlt/leer");
  if (!istUrl(b.audible_url)) fehler.push("audible_url muss mit https://www.audible.de/ beginnen");
  return fehler;
}

export function pruefeEmpfehlung(e) {
  const fehler = [];
  if (!istText(e.id)) fehler.push("id fehlt/leer");
  if (!istText(e.titel)) fehler.push("titel fehlt/leer");
  if (!istText(e.begruendung)) fehler.push("begruendung fehlt/leer");
  if (!istUrl(e.audible_url)) fehler.push("audible_url muss mit https://www.audible.de/ beginnen");
  if (!REGALE.includes(e.regal)) fehler.push(`regal muss eins sein von: ${REGALE.join(", ")}`);
  if (!Array.isArray(e.tags?.genres)) fehler.push("tags.genres fehlt");
  if (!Array.isArray(e.tags?.stimmung)) fehler.push("tags.stimmung fehlt");
  if (!LAENGEN.includes(e.tags?.laenge)) fehler.push(`tags.laenge muss eins sein von: ${LAENGEN.join(", ")}`);
  return fehler;
}
