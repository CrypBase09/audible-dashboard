import { holeProfil } from "./profil.js";

const namen = (wert) => String(wert ?? "").split(",").map((n) => n.trim()).filter(Boolean);

export function meineBuecher(library, state, profilName) {
  const meine = holeProfil(state, profilName).meine;
  return library.filter((b) => meine.includes(b.asin));
}

// Sechs Sichtbarkeitsregeln aus der v2-Spec, alle zur Laufzeit ausgewertet.
export function sichtbareEmpfehlungen(pool, library, state, profilName) {
  const p = holeProfil(state, profilName);
  const besitzt = new Set(library.map((b) => b.asin));
  const eigene = meineBuecher(library, state, profilName);
  const nochNichtsMarkiert = eigene.length === 0;
  const eigeneNamen = new Set(eigene.flatMap((b) => [...namen(b.autor), ...namen(b.sprecher)]));
  const eigeneGenres = new Set(eigene.map((b) => b.genre).filter(Boolean));

  return pool.filter((e) => {
    if (e.asin && besitzt.has(e.asin)) return false;
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
