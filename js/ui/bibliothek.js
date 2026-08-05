import { sucheBuecher } from "../lib/suche.js";
import { filterBibliothek } from "../lib/filter.js";
import { buchKarte, chipLeiste, oeffneModal } from "./komponenten.js";
import { formatiereDauer } from "../lib/statistik.js";

const zustandUi = { anfrage: "", genre: null, serie: null, nurFavoriten: false, sortierung: "titel" };

export function initBibliothek(App) {
  const wurzel = document.getElementById("bibliothek");
  wurzel.innerHTML = `
    <h2>Deine Bibliothek</h2>
    <input id="suche" type="search" placeholder="Titel, Autor oder Sprecher suchen …">
    <div id="bib-filter"></div>
    <div class="werkzeuge">
      <label class="gedaempft">Sortieren:
        <select id="sortierung">
          <option value="titel">Titel</option><option value="autor">Autor</option>
          <option value="dauer">Dauer</option><option value="neueste">Neueste</option>
        </select></label>
      <button id="nur-favs" aria-pressed="false">♥ nur Lieblinge</button>
    </div>
    <p id="bib-anzahl" class="gedaempft"></p>
    <div id="bib-grid" class="grid"></div>`;

  wurzel.querySelector("#suche").addEventListener("input", (e) => { zustandUi.anfrage = e.target.value; zeichne(App); });
  wurzel.querySelector("#sortierung").addEventListener("change", (e) => { zustandUi.sortierung = e.target.value; zeichne(App); });
  wurzel.querySelector("#nur-favs").addEventListener("click", (e) => {
    zustandUi.nurFavoriten = !zustandUi.nurFavoriten;
    e.target.setAttribute("aria-pressed", String(zustandUi.nurFavoriten));
    zeichne(App);
  });
  document.addEventListener("zustand-geaendert", () => zeichne(App));
  zeichne(App);
}

function zeichne(App) {
  const genres = [...new Set(App.daten.library.map((b) => b.genre))].sort((a, b) => a.localeCompare(b, "de"));
  const filterZiel = document.getElementById("bib-filter");
  filterZiel.replaceChildren(chipLeiste(genres, zustandUi.genre, (g) => { zustandUi.genre = g; zeichne(App); }));
  const serien = [...new Set(App.daten.library.map((b) => b.serie).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "de"));
  if (serien.length) filterZiel.append(chipLeiste(serien, zustandUi.serie, (s) => { zustandUi.serie = s; zeichne(App); }));

  const treffer = filterBibliothek(
    sucheBuecher(App.daten.library, zustandUi.anfrage),
    { genre: zustandUi.genre, serie: zustandUi.serie, nurFavoriten: zustandUi.nurFavoriten, favoriten: App.zustand.favorites, sortierung: zustandUi.sortierung },
  );
  document.getElementById("bib-anzahl").textContent =
    treffer.length === App.daten.library.length ? `${treffer.length} Hörbücher` : `${treffer.length} Treffer`;

  const grid = document.getElementById("bib-grid");
  grid.replaceChildren(...treffer.map((b) => buchKarte(b, { favorit: App.istFavorit(b.asin) })));
  grid.querySelectorAll(".herz").forEach((h) =>
    h.addEventListener("click", (e) => { e.stopPropagation(); App.toggleFavorit(h.dataset.asin); }));
  grid.querySelectorAll(".buch").forEach((karte, i) =>
    karte.addEventListener("click", (e) => { if (!e.target.closest(".herz")) zeigeDetail(App, treffer[i]); }));
}

function zeigeDetail(App, buch) {
  const inhalt = document.createElement("div");
  inhalt.className = "detail";
  const serie = buch.serie ? `<p class="etikett">${buch.serie}${buch.band ? ` · Band ${buch.band}` : ""}</p>` : "";
  inhalt.innerHTML = `${serie}<h2>${buch.titel}</h2>
    <p>${buch.autor} · gelesen von ${buch.sprecher}</p>
    <p class="gedaempft">${formatiereDauer(buch.dauer_min)}</p>
    <a class="knopf-link" href="${buch.audible_url}" target="_blank" rel="noopener">Bei Audible öffnen ↗</a>`;
  oeffneModal(inhalt);
}
