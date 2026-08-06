import { berechneStatistik, formatiereDauer } from "../lib/statistik.js";
import { platzhalterStil } from "./komponenten.js";

export function initWunschliste(App) {
  document.addEventListener("zustand-geaendert", () => zeichne(App));
  zeichne(App);
}

function zeichne(App) {
  const wurzel = document.getElementById("wunschliste-statistik");
  const p = App.meinProfil();
  const pool = App.pool();
  const gemerkt = p.wishlist.map((id) => pool.find((e) => e.id === id)).filter(Boolean);
  const inBibliothek = new Set(App.daten.library.map((b) => b.asin));

  const eigene = App.meineBuecher();
  const basis = eigene.length ? eigene : App.daten.library;
  const s = berechneStatistik(basis);
  const titel = eigene.length ? "Deine Hörwelt in Zahlen" : "Die Bibliothek in Zahlen";

  wurzel.innerHTML = `
    <h2>Deine Merkliste</h2>
    <div id="merkliste">${gemerkt.length ? "" : `<p class="gedaempft">Noch leer — merke dir oben Empfehlungen mit „+ Merken“.</p>`}</div>
    <h2>${titel}</h2>
    <div class="statistik">
      <div class="stat-karte"><h3>Genres</h3><div id="genre-donut"></div></div>
      <div class="stat-karte"><h3>Top-Autoren</h3><div id="top-autoren"></div></div>
      <div class="stat-karte"><h3>Top-Sprecher</h3><div id="top-sprecher"></div></div>
      <div class="stat-karte"><h3>Rekorde</h3>
        <p>Längstes: <strong>${s.laengstes?.titel ?? "–"}</strong> <span class="gedaempft">${s.laengstes ? `(${formatiereDauer(s.laengstes.dauer_min)})` : ""}</span></p>
        <p>Kürzestes: <strong>${s.kuerzestes?.titel ?? "–"}</strong> <span class="gedaempft">${s.kuerzestes ? `(${formatiereDauer(s.kuerzestes.dauer_min)})` : ""}</span></p>
      </div>
    </div>`;

  const merkZiel = wurzel.querySelector("#merkliste");
  for (const e of gemerkt) {
    const el = document.createElement("div");
    el.className = "merk-eintrag";
    const gekauft = e.asin && inBibliothek.has(e.asin);
    el.innerHTML = `
      <div class="empf-cover klein" style="${platzhalterStil(e.titel)}"><span>${e.titel}</span></div>
      <div><strong>${e.titel}</strong><p class="gedaempft">${e.autor}</p>
      ${gekauft ? `<p class="etikett">Ist inzwischen in eurer Bibliothek</p>` : ""}</div>
      <div class="merk-aktionen">
        <a href="${e.audible_url}" target="_blank" rel="noopener">Audible ↗</a>
        <button class="entfernen" aria-label="Von Merkliste entfernen">✕</button>
      </div>`;
    el.querySelector(".entfernen").addEventListener("click", () => {
      p.wishlist = p.wishlist.filter((id) => id !== e.id);
      App.zustand.profile[App.profil].wishlist = p.wishlist;
      merkeTombstone(App.profil, e.id);
      App.speichern();
    });
    merkZiel.append(el);
  }

  zeichneDonut(wurzel.querySelector("#genre-donut"), s.genres);
  zeichneBalken(wurzel.querySelector("#top-autoren"), s.topAutoren);
  zeichneBalken(wurzel.querySelector("#top-sprecher"), s.topSprecher);
}

function merkeTombstone(profil, id) {
  try {
    const t = JSON.parse(localStorage.getItem("hb:tombstones") ?? '{"sie":{"wishlist":[]},"er":{"wishlist":[]}}');
    t[profil] ??= { wishlist: [] };
    if (!t[profil].wishlist.includes(id)) t[profil].wishlist.push(id);
    localStorage.setItem("hb:tombstones", JSON.stringify(t));
  } catch {}
}

const SERIEN_FARBEN = [1, 2, 3, 4, 5, 6].map((n) => `var(--serie-${n})`);

function zeichneDonut(ziel, genres) {
  if (!genres.length) { ziel.innerHTML = `<p class="gedaempft">Noch keine Daten.</p>`; return; }
  const summe = genres.reduce((sum, g) => sum + g.anzahl, 0) || 1;
  const umfang = 2 * Math.PI * 42;
  const luecke = 3;
  let offset = 0;
  const ringe = genres.slice(0, 6).map((g, i) => {
    const anteil = g.anzahl / summe;
    const laenge = Math.max(1, anteil * umfang - luecke);
    const strich = `stroke-dasharray="${laenge} ${umfang}" stroke-dashoffset="${-offset * umfang}"`;
    offset += anteil;
    return `<circle r="42" cx="60" cy="60" fill="none" stroke="${SERIEN_FARBEN[i]}" stroke-width="20" stroke-linecap="butt" ${strich} transform="rotate(-90 60 60)"/>`;
  }).join("");
  ziel.innerHTML = `<div class="donut-zeile"><svg viewBox="0 0 120 120" role="img" aria-label="Genre-Verteilung">${ringe}</svg>
    <ul class="donut-legende">${genres.slice(0, 6).map((g, i) =>
      `<li><span class="punkt" style="background:${SERIEN_FARBEN[i]}"></span>${g.name} <span class="gedaempft">(${g.anzahl})</span></li>`).join("")}</ul></div>`;
}

function zeichneBalken(ziel, eintraege) {
  if (!eintraege.length) { ziel.innerHTML = `<p class="gedaempft">Noch keine Daten.</p>`; return; }
  const max = eintraege[0].anzahl || 1;
  ziel.innerHTML = eintraege.map((e) =>
    `<div class="balken-zeile"><span class="balken-name" title="${e.name}">${e.name}</span>
     <div class="balken"><div style="width:${(e.anzahl / max) * 100}%"></div></div>
     <span class="gedaempft">${e.anzahl}</span></div>`).join("");
}
