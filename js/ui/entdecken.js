import { filterEmpfehlungen } from "../lib/filter.js";
import { chipLeiste, platzhalterStil } from "./komponenten.js";

const REGAL_TITEL = {
  "wunsch-antwort": "Deine Wünsche — beantwortet",
  "serien-fortsetzung": "Fortsetzungen deiner Serien",
  "lieblingsautor": "Neues von deinen Autoren & Sprechern",
  "geschmacks-match": "Das trifft deinen Geschmack",
};
const STIMMUNGEN = ["spannend", "herzerwärmend", "witzig", "düster", "entspannend"];
const LAENGEN = { kurz: "Kurz (< 8 Std.)", mittel: "Mittel", episch: "Episch (> 20 Std.)" };
const filterUi = { stimmung: null, genre: null, laenge: null, aehnlichWie: null };

export function initEntdecken(App) {
  const wurzel = document.getElementById("entdecken");
  wurzel.innerHTML = `
    <h2>Neues entdecken</h2>
    <div id="regale"></div>
    <h3>Finde dein nächstes Hörbuch</h3>
    <p class="gedaempft">Wähle, wonach dir gerade ist:</p>
    <div id="finder-filter"></div>
    <div id="finder-treffer" class="empf-liste"></div>
    <div class="wunschbox">
      <h3>Wünsch dir was</h3>
      <p class="gedaempft">Sag mir, was dir fehlt — beim nächsten Lauf bekommst du passende Vorschläge.</p>
      <textarea id="wunsch-text" rows="2" placeholder="z.B. „mehr Küstenkrimis“ oder „etwas wie die Nebelkrone, aber kürzer“"></textarea>
      <button id="wunsch-senden" class="primaer">Frische Vorschläge anfordern</button>
      <ul id="wunsch-liste"></ul>
    </div>`;
  document.addEventListener("zustand-geaendert", () => zeichne(App));
  wurzel.querySelector("#wunsch-senden").addEventListener("click", () => {
    const feld = wurzel.querySelector("#wunsch-text");
    const text = feld.value.trim() || "Überrasch mich mit frischen Vorschlägen!";
    App.zustand.wishes.push({ id: crypto.randomUUID(), text, datum: new Date().toISOString().slice(0, 10), status: "offen" });
    feld.value = "";
    App.speichern();
  });
  zeichne(App);
}

function empfKarte(App, e) {
  const inWunschliste = App.zustand.wishlist.includes(e.id);
  const el = document.createElement("article");
  el.className = "empf";
  el.innerHTML = `
    <div class="empf-cover" style="${platzhalterStil(e.titel)}"><span>${e.titel}</span></div>
    <div class="empf-text">
      <h4>${e.titel}</h4>
      <p class="gedaempft">${e.autor}${e.sprecher ? ` · ${e.sprecher}` : ""}</p>
      <p class="begruendung">${e.begruendung}</p>
      <div class="empf-aktionen">
        <button class="merken" aria-pressed="${inWunschliste}">${inWunschliste ? "✓ Gemerkt" : "+ Merken"}</button>
        <button class="kenne">Kenn ich schon</button>
        <a href="${e.audible_url}" target="_blank" rel="noopener">Bei Audible ↗</a>
      </div>
    </div>`;
  el.querySelector(".merken").addEventListener("click", () => {
    const i = App.zustand.wishlist.indexOf(e.id);
    if (i >= 0) App.zustand.wishlist.splice(i, 1); else App.zustand.wishlist.push(e.id);
    App.speichern();
  });
  el.querySelector(".kenne").addEventListener("click", () => {
    if (!App.zustand.gehoert.includes(e.id)) App.zustand.gehoert.push(e.id);
    App.speichern();
  });
  return el;
}

function zeichne(App) {
  const pool = filterEmpfehlungen(App.daten.recommendations, {}, App.zustand.gehoert);
  const regale = document.getElementById("regale");
  regale.replaceChildren();
  for (const regal of Object.keys(REGAL_TITEL)) {
    const eintraege = pool.filter((e) => e.regal === regal);
    if (!eintraege.length) continue;
    const h = document.createElement("h3");
    h.textContent = REGAL_TITEL[regal];
    const liste = document.createElement("div");
    liste.className = "empf-liste";
    liste.append(...eintraege.map((e) => empfKarte(App, e)));
    regale.append(h, liste);
  }

  const filterZiel = document.getElementById("finder-filter");
  filterZiel.replaceChildren();
  filterZiel.append(chipLeiste(STIMMUNGEN, filterUi.stimmung, (w) => { filterUi.stimmung = w; zeichne(App); }));
  const genres = [...new Set(App.daten.recommendations.flatMap((e) => e.tags.genres))].sort((a, b) => a.localeCompare(b, "de"));
  filterZiel.append(chipLeiste(genres, filterUi.genre, (w) => { filterUi.genre = w; zeichne(App); }));
  const laengenChips = chipLeiste(Object.values(LAENGEN),
    filterUi.laenge ? LAENGEN[filterUi.laenge] : null,
    (anzeige) => {
      filterUi.laenge = Object.keys(LAENGEN).find((k) => LAENGEN[k] === anzeige) ?? null;
      zeichne(App);
    });
  filterZiel.append(laengenChips);
  const favTitel = App.zustand.favorites
    .map((asin) => App.daten.library.find((b) => b.asin === asin)).filter(Boolean);
  if (favTitel.length) {
    const p = document.createElement("p");
    p.className = "gedaempft aehnlich-hinweis";
    p.textContent = "… oder ähnlich wie einer deiner Lieblinge:";
    filterZiel.append(p, chipLeiste(favTitel.map((b) => b.titel),
      favTitel.find((b) => b.asin === filterUi.aehnlichWie)?.titel ?? null,
      (titel) => { filterUi.aehnlichWie = favTitel.find((b) => b.titel === titel)?.asin ?? null; zeichne(App); }));
  }

  const referenz = App.daten.library.find((b) => b.asin === filterUi.aehnlichWie);
  const treffer = filterEmpfehlungen(pool, { ...filterUi, aehnlichWieGenre: referenz?.genre }, []);
  const ziel = document.getElementById("finder-treffer");
  const aktiv = filterUi.stimmung || filterUi.genre || filterUi.laenge || filterUi.aehnlichWie;
  ziel.replaceChildren(...(aktiv ? treffer.map((e) => empfKarte(App, e)) : []));
  if (aktiv && !treffer.length) ziel.innerHTML = `<p class="gedaempft">Dafür habe ich gerade nichts Passendes — wünsch es dir unten, dann suche ich beim nächsten Lauf danach!</p>`;

  const wunschListe = document.getElementById("wunsch-liste");
  wunschListe.replaceChildren(...App.zustand.wishes.map((w) => {
    const li = document.createElement("li");
    li.innerHTML = `„${w.text}“ — <span class="${w.status}">${w.status === "offen" ? "wird beim nächsten Lauf beantwortet" : "beantwortet ✓"}</span>`;
    return li;
  }));
}
