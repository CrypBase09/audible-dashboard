import { sucheBuecher } from "../lib/suche.js";
import { filterBibliothek } from "../lib/filter.js";
import { buchKarte, chipLeiste, oeffneModal } from "./komponenten.js";
import { formatiereDauer } from "../lib/statistik.js";

const zustandUi = { anfrage: "", genre: null, serie: null, nurSterne: false, sortierung: "titel", alleZeigen: true };

export function initBibliothek(App) {
  // Der Modus wird einmal beim Laden festgelegt, nicht bei jedem Neuzeichnen:
  // sonst klappt die Ansicht beim allerersten Herz sofort auf ein Buch zusammen.
  zustandUi.alleZeigen = App.meineBuecher().length === 0;
  document.addEventListener("profil-gewechselt", () => {
    zustandUi.alleZeigen = App.meineBuecher().length === 0;
    zeichne(App);
  });
  const wurzel = document.getElementById("bibliothek");
  wurzel.innerHTML = `
    <h2>Deine Bibliothek</h2>
    <input id="suche" type="search" placeholder="Titel, Autor oder Sprecher suchen …">
    <div id="bib-filter"></div>
    <div class="werkzeuge">
      <button id="modus-schalter"></button>
      <button id="nur-sterne" aria-pressed="false">★ nur Lieblinge</button>
      <label class="gedaempft">Sortieren:
        <select id="sortierung">
          <option value="titel">Titel</option><option value="autor">Autor</option>
          <option value="dauer">Dauer</option><option value="neueste">Neueste</option>
        </select></label>
    </div>
    <p id="bib-anzahl" class="gedaempft"></p>
    <div id="bib-grid" class="grid"></div>`;

  wurzel.querySelector("#suche").addEventListener("input", (e) => { zustandUi.anfrage = e.target.value; zeichne(App); });
  wurzel.querySelector("#sortierung").addEventListener("change", (e) => { zustandUi.sortierung = e.target.value; zeichne(App); });
  wurzel.querySelector("#nur-sterne").addEventListener("click", (e) => {
    zustandUi.nurSterne = !zustandUi.nurSterne;
    e.target.setAttribute("aria-pressed", String(zustandUi.nurSterne));
    zeichne(App);
  });
  wurzel.querySelector("#modus-schalter").addEventListener("click", () => {
    zustandUi.alleZeigen = !zustandUi.alleZeigen;
    zeichne(App);
  });
  document.addEventListener("zustand-geaendert", () => zeichne(App));
  zeichne(App);
}

function zeichne(App) {
  const eigene = App.meineBuecher();
  // Ohne eigene Markierungen gibt es nichts zu filtern — dann immer die ganze Bibliothek.
  if (eigene.length === 0) zustandUi.alleZeigen = true;
  const zeigeAlle = zustandUi.alleZeigen;
  const basis = zeigeAlle ? App.daten.library : eigene;

  const schalter = document.getElementById("modus-schalter");
  schalter.textContent = zeigeAlle
    ? `Nur meine (${eigene.length})`
    : `Alle ${App.daten.library.length} anzeigen`;
  schalter.disabled = eigene.length === 0;

  const genres = [...new Set(basis.map((b) => b.genre))].sort((a, b) => a.localeCompare(b, "de"));
  const filterZiel = document.getElementById("bib-filter");
  filterZiel.replaceChildren(chipLeiste(genres, zustandUi.genre, (g) => { zustandUi.genre = g; zeichne(App); }));
  const serien = [...new Set(basis.map((b) => b.serie).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
  if (serien.length) filterZiel.append(chipLeiste(serien, zustandUi.serie, (s) => { zustandUi.serie = s; zeichne(App); }));

  let treffer = filterBibliothek(
    sucheBuecher(basis, zustandUi.anfrage),
    { genre: zustandUi.genre, serie: zustandUi.serie, sortierung: zustandUi.sortierung },
  );
  if (zustandUi.nurSterne) treffer = treffer.filter((b) => App.istStern(b.asin));

  document.getElementById("bib-anzahl").textContent =
    treffer.length === basis.length
      ? `${treffer.length} ${zeigeAlle ? "Hörbücher" : "eigene Titel"}`
      : `${treffer.length} Treffer`;

  const grid = document.getElementById("bib-grid");
  grid.replaceChildren(...treffer.map((b) =>
    buchKarte(b, { herz: App.istHerz(b.asin), stern: App.istStern(b.asin) })));

  grid.querySelectorAll(".herz").forEach((k) =>
    k.addEventListener("click", (e) => { e.stopPropagation(); k.classList.add("gesetzt"); App.toggleHerz(k.dataset.asin); }));
  grid.querySelectorAll(".stern").forEach((k) =>
    k.addEventListener("click", (e) => { e.stopPropagation(); k.classList.add("gesetzt"); App.toggleStern(k.dataset.asin); }));
  grid.querySelectorAll(".buch").forEach((karte, i) =>
    karte.addEventListener("click", (e) => { if (!e.target.closest(".marke")) zeigeDetail(treffer[i]); }));
}

function zeigeDetail(buch) {
  const inhalt = document.createElement("div");
  const serie = buch.serie ? `<p class="etikett">${buch.serie}${buch.band ? ` · Band ${buch.band}` : ""}</p>` : "";
  inhalt.innerHTML = `${serie}<h2>${buch.titel}</h2>
    <p>${buch.autor}${buch.sprecher ? ` · gelesen von ${buch.sprecher}` : ""}</p>
    <p class="gedaempft">${formatiereDauer(buch.dauer_min)} · ${buch.genre}</p>
    <a class="knopf-link" href="${buch.audible_url}" target="_blank" rel="noopener">Bei Audible öffnen ↗</a>`;
  oeffneModal(inhalt);
}
