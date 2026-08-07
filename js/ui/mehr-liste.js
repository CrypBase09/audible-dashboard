export const SCHRITT = 5;

// Zeigt eine Liste stückweise: erst SCHRITT Einträge, dann auf Knopfdruck jeweils SCHRITT weitere.
// Die Zählerstände liegen beim Aufrufer, damit ein Neuzeichnen (etwa nach dem Merken eines
// Titels) die aufgeklappte Liste nicht wieder zusammenfallen lässt.
export function listeMitMehr({ eintraege, gezeigt, karte, beiMehr, klasse = "empf-liste" }) {
  const huelle = document.createDocumentFragment();
  const liste = document.createElement("div");
  liste.className = klasse;
  const sichtbar = eintraege.slice(0, gezeigt);
  liste.append(...sichtbar.map(karte));
  huelle.append(liste);

  const rest = eintraege.length - sichtbar.length;
  if (rest > 0) {
    const knopf = document.createElement("button");
    knopf.className = "mehr-knopf";
    const naechste = Math.min(SCHRITT, rest);
    knopf.innerHTML = `${naechste} weitere zeigen <span class="gedaempft">· noch ${rest}</span>`;
    knopf.addEventListener("click", () => beiMehr(gezeigt + SCHRITT));
    huelle.append(knopf);
  }
  return huelle;
}
