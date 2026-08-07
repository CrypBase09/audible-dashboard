import { platzhalterStil } from "./komponenten.js";

export function initMerkliste(App) {
  document.addEventListener("zustand-geaendert", () => zeichne(App));
  zeichne(App);
}

function zeichne(App) {
  const wurzel = document.getElementById("merkliste-bereich");
  const p = App.meinProfil();
  const pool = App.pool();
  const gemerkt = p.wishlist.map((id) => pool.find((e) => e.id === id)).filter(Boolean);
  const inBibliothek = new Set(App.daten.library.map((b) => b.asin));

  wurzel.innerHTML = `<h2>Deine Merkliste${gemerkt.length ? ` <span class="gedaempft">(${gemerkt.length})</span>` : ""}</h2>
    <div id="merkliste">${gemerkt.length ? "" : `<p class="gedaempft">Noch leer — merke dir oben Vorschläge mit „+ Merken“.</p>`}</div>`;

  const ziel = wurzel.querySelector("#merkliste");
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
      App.zustand.profile[App.profil].wishlist = p.wishlist.filter((id) => id !== e.id);
      merkeTombstone(App.profil, e.id);
      App.speichern();
    });
    ziel.append(el);
  }
}

function merkeTombstone(profil, id) {
  try {
    const t = JSON.parse(localStorage.getItem("hb:tombstones") ?? '{"sie":{"wishlist":[]},"er":{"wishlist":[]}}');
    t[profil] ??= { wishlist: [] };
    if (!t[profil].wishlist.includes(id)) t[profil].wishlist.push(id);
    localStorage.setItem("hb:tombstones", JSON.stringify(t));
  } catch {}
}
