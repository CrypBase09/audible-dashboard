import { sichtbareEmpfehlungen } from "../lib/empfehlungs-filter.js";
import { chipLeiste, platzhalterStil } from "./komponenten.js";
import { filterEmpfehlungen } from "../lib/filter.js";

const REGAL_TITEL = {
  "wunsch-antwort": "Deine Wünsche — beantwortet",
  "serien-fortsetzung": "Fortsetzungen deiner Reihen",
  "lieblingsautor": "Neues von deinen Autoren & Sprechern",
  "geschmacks-match": "Das trifft deinen Geschmack",
};
const STIMMUNGEN = ["spannend", "herzerwärmend", "witzig", "düster", "entspannend"];
const LAENGEN = { kurz: "Kurz (< 8 Std.)", mittel: "Mittel", episch: "Episch (> 20 Std.)" };
const filterUi = { stimmung: null, genre: null, laenge: null, aehnlichWie: null };
let pollTimer = null;

export function initEntdecken(App) {
  const wurzel = document.getElementById("entdecken");
  wurzel.innerHTML = `
    <h2>Neues entdecken</h2>
    <p id="entdecken-hinweis" class="gedaempft"></p>
    <div id="regale"></div>
    <h3>Finde dein nächstes Hörbuch</h3>
    <p class="gedaempft">Wähle, wonach dir gerade ist:</p>
    <div id="finder-filter"></div>
    <div id="finder-treffer" class="empf-liste"></div>
    <div class="wunschbox">
      <h3>Wünsch dir was</h3>
      <p class="gedaempft">Sag mir, was dir fehlt — ich suche sofort los.</p>
      <textarea id="wunsch-text" rows="2" placeholder="z.B. „mehr Ruhrpott-Kabarett“ oder „etwas Kurzes zum Einschlafen“"></textarea>
      <button id="wunsch-senden" class="primaer">Frische Vorschläge anfordern</button>
      <ul id="wunsch-liste"></ul>
    </div>`;

  wurzel.querySelector("#wunsch-senden").addEventListener("click", () => {
    const feld = wurzel.querySelector("#wunsch-text");
    const text = feld.value.trim() || "Überrasch mich mit frischen Vorschlägen!";
    App.meinProfil().wishes.push({
      id: crypto.randomUUID(), text,
      datum: new Date().toISOString().slice(0, 10), status: "offen",
    });
    feld.value = "";
    App.speichern();
  });

  document.addEventListener("zustand-geaendert", () => zeichne(App));
  zeichne(App);
}

function empfKarte(App, e) {
  const p = App.meinProfil();
  const gemerkt = p.wishlist.includes(e.id);
  const el = document.createElement("article");
  el.className = "empf";
  el.innerHTML = `
    <div class="empf-cover" style="${platzhalterStil(e.titel)}"><span>${e.titel}</span></div>
    <div class="empf-text">
      <h4>${e.titel}</h4>
      <p class="gedaempft">${e.autor}${e.sprecher ? ` · ${e.sprecher}` : ""}</p>
      <p class="begruendung">${e.begruendung}</p>
      <div class="empf-aktionen">
        <button class="merken" aria-pressed="${gemerkt}">${gemerkt ? "✓ Gemerkt" : "+ Merken"}</button>
        <button class="kenne">Kenn ich schon</button>
        <button class="ablehnen">Lehne ich ab</button>
        <a href="${e.audible_url}" target="_blank" rel="noopener">Bei Audible ↗</a>
      </div>
    </div>`;
  el.querySelector(".merken").addEventListener("click", () => {
    const i = p.wishlist.indexOf(e.id);
    if (i >= 0) p.wishlist.splice(i, 1); else p.wishlist.push(e.id);
    App.speichern();
  });
  el.querySelector(".kenne").addEventListener("click", () => {
    if (!p.gehoert.includes(e.id)) p.gehoert.push(e.id);
    App.speichern();
  });
  el.querySelector(".ablehnen").addEventListener("click", () => {
    if (!p.abgelehnt.includes(e.id)) p.abgelehnt.push(e.id);
    const i = p.wishlist.indexOf(e.id);
    if (i >= 0) p.wishlist.splice(i, 1);
    App.speichern();
  });
  return el;
}

function zeichne(App) {
  const p = App.meinProfil();
  const sichtbar = sichtbareEmpfehlungen(App.pool(), App.daten.library, App.zustand, App.profil);
  const eigene = App.meineBuecher();

  document.getElementById("entdecken-hinweis").textContent = eigene.length
    ? `Abgestimmt auf deine ${eigene.length} markierten Bücher.`
    : "Markier zuerst deine Bücher mit ♥ — dann werden die Vorschläge persönlich.";

  const regale = document.getElementById("regale");
  regale.replaceChildren();
  for (const regal of Object.keys(REGAL_TITEL)) {
    const eintraege = sichtbar.filter((e) => e.regal === regal);
    if (!eintraege.length) continue;
    const h = document.createElement("h3");
    h.textContent = REGAL_TITEL[regal];
    const liste = document.createElement("div");
    liste.className = "empf-liste";
    liste.append(...eintraege.map((e) => empfKarte(App, e)));
    regale.append(h, liste);
  }
  if (!sichtbar.length) {
    const leer = document.createElement("p");
    leer.className = "gedaempft";
    leer.textContent = "Gerade nichts Neues — wünsch dir unten etwas, dann suche ich sofort los.";
    regale.append(leer);
  }

  const filterZiel = document.getElementById("finder-filter");
  filterZiel.replaceChildren();
  filterZiel.append(chipLeiste(STIMMUNGEN, filterUi.stimmung, (w) => { filterUi.stimmung = w; zeichne(App); }));
  const genres = [...new Set(sichtbar.flatMap((e) => e.tags.genres))].sort((a, b) => a.localeCompare(b, "de"));
  filterZiel.append(chipLeiste(genres, filterUi.genre, (w) => { filterUi.genre = w; zeichne(App); }));
  filterZiel.append(chipLeiste(Object.values(LAENGEN),
    filterUi.laenge ? LAENGEN[filterUi.laenge] : null,
    (anzeige) => { filterUi.laenge = Object.keys(LAENGEN).find((k) => LAENGEN[k] === anzeige) ?? null; zeichne(App); }));

  const favTitel = p.lieblinge.map((asin) => App.daten.library.find((b) => b.asin === asin)).filter(Boolean);
  if (favTitel.length) {
    const hinweis = document.createElement("p");
    hinweis.className = "gedaempft aehnlich-hinweis";
    hinweis.textContent = "… oder ähnlich wie einer deiner Lieblinge:";
    filterZiel.append(hinweis, chipLeiste(favTitel.map((b) => b.titel),
      favTitel.find((b) => b.asin === filterUi.aehnlichWie)?.titel ?? null,
      (titel) => { filterUi.aehnlichWie = favTitel.find((b) => b.titel === titel)?.asin ?? null; zeichne(App); }));
  }

  const referenz = App.daten.library.find((b) => b.asin === filterUi.aehnlichWie);
  const treffer = filterEmpfehlungen(sichtbar, { ...filterUi, aehnlichWieGenre: referenz?.genre }, []);
  const ziel = document.getElementById("finder-treffer");
  const aktiv = filterUi.stimmung || filterUi.genre || filterUi.laenge || filterUi.aehnlichWie;
  ziel.replaceChildren(...(aktiv ? treffer.map((e) => empfKarte(App, e)) : []));
  if (aktiv && !treffer.length) {
    ziel.innerHTML = `<p class="gedaempft">Dafür habe ich gerade nichts — wünsch es dir unten, dann suche ich danach.</p>`;
  }

  zeichneWuensche(App, p);
}

function zeichneWuensche(App, p) {
  const liste = document.getElementById("wunsch-liste");
  const TEXT = {
    offen: "wird gerade gesucht …",
    in_arbeit: "ich recherchiere gerade …",
    beantwortet: "beantwortet ✓",
  };
  liste.replaceChildren(...p.wishes.map((w) => {
    const li = document.createElement("li");
    li.innerHTML = `„${w.text}“ — <span class="${w.status}">${TEXT[w.status] ?? w.status}</span>`;
    return li;
  }));

  const offen = p.wishes.some((w) => w.status === "offen" || w.status === "in_arbeit");
  const knopf = document.getElementById("wunsch-senden");
  knopf.textContent = offen ? "Suche läuft …" : "Frische Vorschläge anfordern";
  knopf.disabled = offen;

  // Nur solange etwas offen ist, wird nachgeschaut — sonst ruht die Seite.
  clearTimeout(pollTimer);
  if (offen && App.syncLaden) pollTimer = setTimeout(() => App.syncLaden(), 30000);
}
