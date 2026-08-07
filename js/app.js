import { LEERER_STATE, PROFILE, normalisiereState, holeProfil, setzeHerz, setzeStern } from "./lib/profil.js";
import { meineBuecher } from "./lib/empfehlungs-filter.js";
import { malWiederHeute } from "./lib/heute.js";
import { initEntdecken } from "./ui/entdecken.js";
import { initSuche } from "./ui/suche.js";
import { initMerkliste } from "./ui/merkliste.js";
import { initBibliothek } from "./ui/bibliothek.js";
import { frageProfilAb, setzeWelt } from "./ui/profil-wahl.js";
import { initSync } from "./sync.js";

const BESCHRIFTUNG = { sie: "Für sie", er: "Für ihn" };

export const App = {
  daten: { library: [], recommendations: [], meta: {} },
  zustand: structuredClone(LEERER_STATE),
  profil: "sie",

  meinProfil() { return holeProfil(this.zustand, this.profil); },
  meineBuecher() { return meineBuecher(this.daten.library, this.zustand, this.profil); },
  // Der Vorrat ist die Datei plus die Sofort-Antworten des Wächters für dieses Profil.
  pool() {
    const frisch = (this.zustand.frisch ?? []).filter((f) => f.fuer === this.profil);
    const bekannt = new Set(this.daten.recommendations.map((e) => e.id));
    return [...frisch.filter((f) => !bekannt.has(f.id)), ...this.daten.recommendations];
  },

  speichern() {
    this.zustand.version = Date.now();
    try { localStorage.setItem("hb:state", JSON.stringify(this.zustand)); } catch {}
    this.syncSpeichern?.(this.zustand);
    document.dispatchEvent(new CustomEvent("zustand-geaendert"));
  },
  istHerz(asin) { return this.meinProfil().meine.includes(asin); },
  istStern(asin) { return this.meinProfil().lieblinge.includes(asin); },
  toggleHerz(asin) { setzeHerz(this.zustand, this.profil, asin, !this.istHerz(asin)); this.speichern(); },
  toggleStern(asin) { setzeStern(this.zustand, this.profil, asin, !this.istStern(asin)); this.speichern(); },

  async wechsleProfil() {
    this.profil = await frageProfilAb({ erzwingen: true, aktuell: this.profil });
    localStorage.setItem("hb:profil", this.profil);
    setzeWelt(this.profil);
    zeichneKopf();
    document.dispatchEvent(new CustomEvent("profil-gewechselt"));
    document.dispatchEvent(new CustomEvent("zustand-geaendert"));
  },
};

async function ladeJson(pfad) { return (await fetch(pfad)).json(); }

function zeichneKopf() {
  const eigene = App.meineBuecher();
  document.getElementById("gruss").innerHTML = eigene.length
    ? `Schön, dass du da bist —<br><strong>hier wartet neuer Hörstoff.</strong>`
    : `Schön, dass du da bist —<br><strong>zeig mir, was dir gefällt.</strong>`;
  const m = App.daten.meta;
  const d = (iso) => iso ? new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : "–";
  const anzahl = App.pool().length;
  document.getElementById("stand").textContent =
    `${anzahl} Vorschläge im Vorrat · zuletzt aufgefrischt ${d(m.letzter_lauf)} · nächster Lauf ${d(m.naechster_lauf)}`;
  const schalter = document.getElementById("profil-schalter");
  schalter.hidden = false;
  schalter.textContent = `${BESCHRIFTUNG[App.profil]} · wechseln`;
}

function zeichneMalWieder() {
  const ziel = document.getElementById("malwieder");
  const p = App.meinProfil();
  const auswahl = p.lieblinge.length ? p.lieblinge : p.meine;
  const asin = malWiederHeute(new Date().toISOString().slice(0, 10), auswahl);
  const buch = App.daten.library.find((b) => b.asin === asin);
  if (!buch) { ziel.replaceChildren(); return; }
  ziel.innerHTML = `<article class="malwieder-karte">
      <img src="${buch.cover}" alt="" loading="lazy">
      <div><p class="etikett">Lange nicht gehört</p>
      <h2>Zeit für „${buch.titel}“?</h2>
      <p class="gedaempft">${buch.autor}${buch.sprecher ? ` · gelesen von ${buch.sprecher}` : ""}</p></div>
    </article>`;
  ziel.querySelector("img")?.addEventListener("error", (e) => e.target.remove());
}

async function start() {
  App.profil = localStorage.getItem("hb:profil") ?? await frageProfilAb({});
  if (!PROFILE.includes(App.profil)) App.profil = "sie";
  localStorage.setItem("hb:profil", App.profil);
  setzeWelt(App.profil);

  try { App.zustand = normalisiereState(JSON.parse(localStorage.getItem("hb:state"))); } catch {}

  const [library, recommendations, meta] = await Promise.all([
    ladeJson("data/library.json"), ladeJson("data/recommendations.json"), ladeJson("data/meta.json"),
  ]);
  App.daten = { library, recommendations, meta };

  zeichneKopf();
  zeichneMalWieder();
  initEntdecken(App);
  initSuche(App);
  initMerkliste(App);
  initBibliothek(App);
  document.getElementById("profil-schalter").addEventListener("click", () => App.wechsleProfil());
  document.addEventListener("zustand-geaendert", () => { zeichneKopf(); zeichneMalWieder(); });
  initSync(App);
}
start();
