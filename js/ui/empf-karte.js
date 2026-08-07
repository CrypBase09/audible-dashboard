import { platzhalterStil } from "./komponenten.js";

// Eine Empfehlungskarte mit den drei Aktionen. Wird von Regalen und Suche gleichermaßen benutzt.
export function empfKarte(App, e) {
  const p = App.meinProfil();
  const gemerkt = p.wishlist.includes(e.id);
  const el = document.createElement("article");
  el.className = "empf";
  const marken = [e.tags?.form, ...(e.tags?.themen ?? []).slice(0, 2)].filter(Boolean);
  el.innerHTML = `
    <div class="empf-cover" style="${platzhalterStil(e.titel)}"><span>${e.titel}</span></div>
    <div class="empf-text">
      <h4>${e.titel}</h4>
      <p class="gedaempft">${e.autor}${e.sprecher ? ` · ${e.sprecher}` : ""}</p>
      <p class="begruendung">${e.begruendung}</p>
      <p class="empf-marken">${marken.map((m) => `<span>${m}</span>`).join("")}</p>
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
