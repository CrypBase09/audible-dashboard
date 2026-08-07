import { sichtbareEmpfehlungen } from "../lib/empfehlungs-filter.js";
import { empfKarte } from "./empf-karte.js";
import { listeMitMehr, SCHRITT } from "./mehr-liste.js";

// Wie viele Einträge je Regal gerade offen sind. Bleibt über das Neuzeichnen hinweg stehen,
// damit ein „Merken“-Klick die aufgeklappte Liste nicht wieder zusammenklappt.
const gezeigt = new Map();

const REGAL_TITEL = {
  "wunsch-antwort": "Auf deine Suche hin gefunden",
  "serien-fortsetzung": "Fortsetzungen deiner Reihen",
  "lieblingsautor": "Neues von deinen Autoren & Sprechern",
  "geschmacks-match": "Das trifft deinen Geschmack",
};

export function initEntdecken(App) {
  document.addEventListener("zustand-geaendert", () => zeichne(App));
  document.addEventListener("profil-gewechselt", () => { gezeigt.clear(); zeichne(App); });
  zeichne(App);
}

function zeichne(App) {
  const wurzel = document.getElementById("entdecken");
  const sichtbar = sichtbareEmpfehlungen(App.pool(), App.daten.library, App.zustand, App.profil);
  const eigene = App.meineBuecher();

  wurzel.innerHTML = `<h2>Für dich gefunden</h2>
    <p id="entdecken-hinweis" class="gedaempft"></p>
    <div id="regale"></div>`;

  document.getElementById("entdecken-hinweis").textContent = eigene.length
    ? `${sichtbar.length} Vorschläge, abgestimmt auf deine ${eigene.length} markierten Bücher.`
    : "Markier unten in der Bibliothek deine Bücher mit ♥ — dann werden diese Vorschläge persönlich.";

  const regale = document.getElementById("regale");
  for (const regal of Object.keys(REGAL_TITEL)) {
    const eintraege = sichtbar.filter((e) => e.regal === regal);
    if (!eintraege.length) continue;
    const h = document.createElement("h3");
    h.textContent = eintraege.length > SCHRITT
      ? `${REGAL_TITEL[regal]} (${eintraege.length})`
      : REGAL_TITEL[regal];
    regale.append(h, listeMitMehr({
      eintraege,
      gezeigt: gezeigt.get(regal) ?? SCHRITT,
      karte: (e) => empfKarte(App, e),
      beiMehr: (neu) => { gezeigt.set(regal, neu); zeichne(App); },
    }));
  }
  if (!sichtbar.length) {
    const leer = document.createElement("p");
    leer.className = "gedaempft";
    leer.textContent = "Gerade nichts Neues — such dir unten etwas aus, dann suche ich sofort danach.";
    regale.append(leer);
  }
}
