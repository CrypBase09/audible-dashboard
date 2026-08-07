import { holeProfil } from "./profil.js";

const namen = (wert) => String(wert ?? "").split(",").map((n) => n.trim()).filter(Boolean);
const liste = (w) => (Array.isArray(w) ? w.filter(Boolean) : w ? [w] : []);

// Titel und Namen so vereinheitlichen, dass Schreibweisen nicht auseinanderlaufen:
// Untertitel ab dem ersten Doppelpunkt weg, Umlaute aufgelöst, alles Nicht-Wörtliche zu Leerzeichen.
function normalisiere(text) {
  return String(text ?? "")
    .split(":")[0]
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function besitzIndex(library) {
  const asins = new Set(library.map((b) => b.asin));
  const nachTitel = new Map();
  for (const b of library) {
    const schluessel = normalisiere(b.titel);
    const autoren = new Set(namen(b.autor).map(normalisiere));
    if (nachTitel.has(schluessel)) {
      for (const a of autoren) nachTitel.get(schluessel).add(a);
    } else {
      nachTitel.set(schluessel, autoren);
    }
  }
  return { asins, nachTitel };
}

// Besessen ist, was dieselbe ASIN hat — oder denselben Titel bei mindestens einem gleichen
// Autor. Der Autorenvergleich verhindert Fehlalarme bei Allerweltstiteln.
export function istBesessen(empfehlung, index) {
  if (empfehlung.asin && index.asins.has(empfehlung.asin)) return true;
  const autoren = index.nachTitel.get(normalisiere(empfehlung.titel));
  if (!autoren) return false;
  return namen(empfehlung.autor).map(normalisiere).some((a) => autoren.has(a));
}

export function meineBuecher(library, state, profilName) {
  const meine = holeProfil(state, profilName).meine;
  return library.filter((b) => meine.includes(b.asin));
}

// Die Sichtbarkeitsregeln aus der v2-Spec, ergänzt um den Titelabgleich aus v3.
export function sichtbareEmpfehlungen(pool, library, state, profilName) {
  const p = holeProfil(state, profilName);
  const index = besitzIndex(library);
  const eigene = meineBuecher(library, state, profilName);
  const nochNichtsMarkiert = eigene.length === 0;
  const eigeneNamen = new Set(eigene.flatMap((b) => [...namen(b.autor), ...namen(b.sprecher)]));
  const eigeneGenres = new Set(eigene.map((b) => b.genre).filter(Boolean));

  return pool.filter((e) => {
    if (istBesessen(e, index)) return false;
    if (p.abgelehnt.includes(e.id) || p.gehoert.includes(e.id)) return false;
    if (nochNichtsMarkiert) return true;
    if (e.regal === "serien-fortsetzung") return p.meine.includes(e.aehnlich_wie);
    if (e.regal === "lieblingsautor") {
      return [...namen(e.autor), ...namen(e.sprecher)].some((n) => eigeneNamen.has(n));
    }
    if (e.regal === "geschmacks-match") {
      return (e.tags?.genres ?? []).some((g) => eigeneGenres.has(g));
    }
    return true;
  });
}

// Suche über die sieben Gruppen: innerhalb einer Gruppe ODER, zwischen Gruppen UND.
// Fehlt einem Eintrag ein Schlagwort-Feld, fällt er nur aus dieser einen Gruppe heraus.
export function sucheImVorrat(pool, auswahl = {}) {
  const passt = (werte, vorhanden) => {
    const gesucht = liste(werte);
    if (!gesucht.length) return true;
    const da = liste(vorhanden).map((v) => String(v).toLowerCase());
    return gesucht.some((g) => da.includes(String(g).toLowerCase()));
  };
  return pool.filter((e) => {
    const t = e.tags ?? {};
    if (!passt(auswahl.stimmung, t.stimmung)) return false;
    if (!passt(auswahl.themen, t.themen)) return false;
    if (!passt(auswahl.anlass, t.anlass)) return false;
    if (!passt(auswahl.form, t.form)) return false;
    if (!passt(auswahl.genres, t.genres)) return false;
    if (auswahl.laenge && t.laenge !== auswahl.laenge) return false;
    if (liste(auswahl.sprecher).length) {
      const spr = namen(e.sprecher).map((s) => s.toLowerCase());
      const gesucht = liste(auswahl.sprecher).map((s) => s.toLowerCase());
      if (!gesucht.some((g) => spr.some((s) => s.includes(g)))) return false;
    }
    if (auswahl.aehnlichWie && e.aehnlich_wie !== auswahl.aehnlichWie) return false;
    return true;
  });
}
