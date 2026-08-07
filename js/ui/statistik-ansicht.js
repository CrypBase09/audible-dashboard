import { formatiereDauer } from "../lib/statistik.js";

const SERIEN_FARBEN = [1, 2, 3, 4, 5, 6].map((n) => `var(--serie-${n})`);

export function zeichneStatistik(ziel, s) {
  ziel.innerHTML = `
    <div class="stat-karte"><h3>Genres</h3><div id="genre-donut"></div></div>
    <div class="stat-karte"><h3>Top-Autoren</h3><div id="top-autoren"></div></div>
    <div class="stat-karte"><h3>Top-Sprecher</h3><div id="top-sprecher"></div></div>
    <div class="stat-karte"><h3>Rekorde</h3>
      <p>Längstes: <strong>${s.laengstes?.titel ?? "–"}</strong> <span class="gedaempft">${s.laengstes ? `(${formatiereDauer(s.laengstes.dauer_min)})` : ""}</span></p>
      <p>Kürzestes: <strong>${s.kuerzestes?.titel ?? "–"}</strong> <span class="gedaempft">${s.kuerzestes ? `(${formatiereDauer(s.kuerzestes.dauer_min)})` : ""}</span></p>
    </div>`;
  zeichneDonut(ziel.querySelector("#genre-donut"), s.genres);
  zeichneBalken(ziel.querySelector("#top-autoren"), s.topAutoren);
  zeichneBalken(ziel.querySelector("#top-sprecher"), s.topSprecher);
}

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
