import { LEERER_STATE } from "./lib/sync-merge.js";
import { berechneStatistik, formatiereDauer } from "./lib/statistik.js";
import { malWiederHeute } from "./lib/heute.js";
import { initBibliothek } from "./ui/bibliothek.js";

export const App = {
  daten: { library: [], recommendations: [], meta: {} },
  zustand: structuredClone(LEERER_STATE),
  speichern() {
    this.zustand.version = Date.now();
    try { localStorage.setItem("hb:state", JSON.stringify(this.zustand)); } catch {}
    document.dispatchEvent(new CustomEvent("zustand-geaendert"));
  },
  istFavorit(asin) { return this.zustand.favorites.includes(asin); },
  toggleFavorit(asin) {
    const i = this.zustand.favorites.indexOf(asin);
    if (i >= 0) this.zustand.favorites.splice(i, 1);
    else this.zustand.favorites.push(asin);
    this.speichern();
  },
};

async function ladeJson(pfad) { return (await fetch(pfad)).json(); }

function zeigeKopf() {
  const s = berechneStatistik(App.daten.library);
  document.getElementById("kopf-zahlen").innerHTML =
    `<div class="zahl"><strong>${s.anzahl}</strong><span>Hörbücher</span></div>
     <div class="zahl"><strong>${formatiereDauer(s.gesamt_min)}</strong><span>Hörzeit</span></div>
     <div class="zahl"><strong>${App.zustand.favorites.length}</strong><span>Lieblinge ♥</span></div>`;
  const m = App.daten.meta;
  const d = (iso) => iso ? new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : "–";
  document.getElementById("stand").textContent =
    `Zuletzt aufgefrischt: ${d(m.letzter_lauf)} · Nächster Lauf: ${d(m.naechster_lauf)}`;
}

function zeigeMalWieder() {
  const ziel = document.getElementById("malwieder");
  const asin = malWiederHeute(new Date().toISOString().slice(0, 10), App.zustand.favorites);
  const buch = App.daten.library.find((b) => b.asin === asin);
  ziel.innerHTML = buch
    ? `<article class="malwieder-karte">
         <img src="${buch.cover}" alt="" loading="lazy">
         <div><p class="etikett">Lange nicht gehört</p>
         <h2>Zeit für „${buch.titel}“?</h2>
         <p class="gedaempft">${buch.autor} · gelesen von ${buch.sprecher}</p></div>
       </article>`
    : `<article class="malwieder-karte leer"><p class="etikett">Mal wieder hören</p>
       <p>Markiere unten deine Lieblinge mit ♥ — dann schlage ich dir hier täglich einen vor.</p></article>`;
  ziel.querySelector("img")?.addEventListener("error", (e) => e.target.remove());
}

async function start() {
  try { App.zustand = { ...structuredClone(LEERER_STATE), ...JSON.parse(localStorage.getItem("hb:state")) }; } catch {}
  const [library, recommendations, meta] = await Promise.all([
    ladeJson("data/library.json"), ladeJson("data/recommendations.json"), ladeJson("data/meta.json"),
  ]);
  App.daten = { library, recommendations, meta };
  zeigeKopf();
  zeigeMalWieder();
  initBibliothek(App);
  document.addEventListener("zustand-geaendert", () => { zeigeKopf(); zeigeMalWieder(); });
  document.dispatchEvent(new CustomEvent("daten-bereit"));
}
start();
