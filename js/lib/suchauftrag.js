// Formt aus der Suchauswahl einen Satz, den der Rechercheur als Auftrag lesen kann.

const liste = (w) => (Array.isArray(w) ? w.filter(Boolean) : w ? [w] : []);
const oder = (werte) => werte.join(" oder ");

export function istLeer(auswahl) {
  const felder = ["stimmung", "anlass", "themen", "form", "sprecher"];
  const hatChips = felder.some((f) => liste(auswahl?.[f]).length > 0);
  return !hatChips && !auswahl?.laenge && !auswahl?.aehnlichWieTitel && !String(auswahl?.freitext ?? "").trim();
}

export function formuliereAuftrag(auswahl = {}) {
  if (istLeer(auswahl)) return "Überrasch mich mit frischen Vorschlägen!";

  const stimmung = liste(auswahl.stimmung);
  const form = liste(auswahl.form);
  const anlass = liste(auswahl.anlass);
  const themen = liste(auswahl.themen);
  const sprecher = liste(auswahl.sprecher);

  // Kern: „Etwas Witziges" oder „Ein Hörspiel"
  let kern;
  if (form.length) kern = `${form.length === 1 ? "Ein" : "Am liebsten"} ${oder(form)}`;
  else if (stimmung.length) kern = `Etwas ${oder(stimmung.map(beugeStimmung))}`;
  else kern = "Etwas";

  const teile = [];
  if (form.length && stimmung.length) teile.push(oder(stimmung.map((s) => s.toLowerCase())));
  if (anlass.length) teile.push(oder(anlass));
  if (themen.length) teile.push(`Thema ${oder(themen)}`);
  if (sprecher.length) teile.push(`gesprochen von ${oder(sprecher)}`);
  if (auswahl.laenge) teile.push(LAENGE_TEXT[auswahl.laenge] ?? auswahl.laenge);
  if (auswahl.aehnlichWieTitel) teile.push(`ähnlich wie „${auswahl.aehnlichWieTitel}”`);

  let satz = teile.length ? `${kern}, ${teile.join(", ")}.` : `${kern}.`;
  const frei = String(auswahl.freitext ?? "").trim();
  if (frei) satz += ` ${frei.endsWith(".") ? frei : frei + "."}`;
  return satz;
}

const LAENGE_TEXT = { kurz: "kurz (unter 8 Stunden)", mittel: "mittellang", episch: "episch lang" };

// „witzig" → „Witziges", damit „Etwas Witziges" statt „Etwas witzig" herauskommt.
function beugeStimmung(wort) {
  const gross = wort.charAt(0).toUpperCase() + wort.slice(1);
  return gross.endsWith("e") ? `${gross}s` : `${gross}es`;
}
