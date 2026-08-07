import { sucheImVorrat, sichtbareEmpfehlungen } from "../lib/empfehlungs-filter.js";
import { formuliereAuftrag, istLeer } from "../lib/suchauftrag.js";
import { empfKarte } from "./empf-karte.js";
import { listeMitMehr, SCHRITT } from "./mehr-liste.js";

const STIMMUNGEN = ["spannend", "herzerwärmend", "witzig", "düster", "entspannend"];
const ANLAESSE = ["zum Einschlafen", "fürs Auto", "beim Bügeln", "mit den Kindern", "lange Reise"];
const FORMEN = ["Lesung", "Hörspiel", "Bühnenprogramm", "Podcast"];
const LAENGEN = { kurz: "kurz", mittel: "mittel", episch: "episch" };

const auswahl = { stimmung: [], anlass: [], themen: [], form: [], sprecher: [], laenge: null, aehnlichWie: null, freitext: "" };
let pollTimer = null;
let trefferGezeigt = SCHRITT;

export function initSuche(App) {
  const wurzel = document.getElementById("suche");
  wurzel.innerHTML = `
    <h2>Finde etwas Neues</h2>
    <div class="such-karte">
      <div id="such-gewaehlt" class="such-gewaehlt" hidden></div>
      <div id="such-zeilen" class="such-zeilen"></div>
      <div class="such-leiste">
        <p id="such-anzahl" class="gedaempft"></p>
        <button id="such-neu" class="primaer">Richtig suchen</button>
      </div>
    </div>
    <div id="such-treffer"></div>
    <ul id="auftrag-liste" class="auftrag-liste"></ul>`;

  wurzel.querySelector("#such-neu").addEventListener("click", () => {
    const titel = App.daten.library.find((b) => b.asin === auswahl.aehnlichWie)?.titel;
    App.meinProfil().wishes.push({
      id: crypto.randomUUID(),
      text: formuliereAuftrag({ ...auswahl, aehnlichWieTitel: titel }),
      datum: new Date().toISOString().slice(0, 10),
      status: "offen",
    });
    App.speichern();
  });

  document.addEventListener("zustand-geaendert", () => zeichne(App));
  zeichne(App);
}

// Eine Zeile je Kriterium: Beschriftung links, Auswahl rechts in einer seitlich wischbaren
// Reihe. So bleibt die Höhe fest, statt dass die Pillen über mehrere Reihen umbrechen.
function zeile(beschriftung, inhalt) {
  const z = document.createElement("div");
  z.className = "such-zeile";
  const b = document.createElement("span");
  b.className = "such-label";
  b.textContent = beschriftung;
  z.append(b, inhalt);
  return z;
}

function chipReihe(werte, istGewaehlt, beiKlick) {
  const reihe = document.createElement("div");
  reihe.className = "such-chips";
  for (const wert of werte) {
    const chip = document.createElement("button");
    const aktiv = istGewaehlt(wert);
    chip.className = "such-chip" + (aktiv ? " aktiv" : "");
    chip.textContent = wert;
    chip.setAttribute("aria-pressed", String(aktiv));
    chip.addEventListener("click", () => beiKlick(wert, aktiv));
    reihe.append(chip);
  }
  return reihe;
}

function zeichne(App) {
  const ziel = document.getElementById("such-zeilen");
  const pool = sichtbareEmpfehlungen(App.pool(), App.daten.library, App.zustand, App.profil);
  const geaendert = () => { trefferGezeigt = SCHRITT; zeichne(App); };
  const umschalten = (feld) => (wert, aktiv) => {
    auswahl[feld] = aktiv ? auswahl[feld].filter((w) => w !== wert) : [...auswahl[feld], wert];
    geaendert();
  };
  const drin = (feld) => (wert) => auswahl[feld].includes(wert);

  ziel.replaceChildren();
  ziel.append(zeile("Stimmung", chipReihe(STIMMUNGEN, drin("stimmung"), umschalten("stimmung"))));
  ziel.append(zeile("Anlass", chipReihe(ANLAESSE, drin("anlass"), umschalten("anlass"))));

  const themen = [...new Set(pool.flatMap((e) => e.tags?.themen ?? []))].sort((a, b) => a.localeCompare(b, "de"));
  if (themen.length) ziel.append(zeile("Thema", chipReihe(themen, drin("themen"), umschalten("themen"))));

  ziel.append(zeile("Erzählform", chipReihe(FORMEN, drin("form"), umschalten("form"))));

  // Sprecher: die häufigsten Stimmen der eigenen Bücher, dahinter ein Feld für alles andere.
  const zaehler = new Map();
  for (const b of App.meineBuecher()) {
    for (const s of String(b.sprecher ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
      zaehler.set(s, (zaehler.get(s) ?? 0) + 1);
    }
  }
  const topSprecher = [...zaehler.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n]) => n);
  if (topSprecher.length) {
    const reihe = chipReihe(topSprecher, drin("sprecher"), umschalten("sprecher"));
    const frei = document.createElement("input");
    frei.type = "search";
    frei.className = "such-frei-feld";
    frei.placeholder = "andere Stimme …";
    frei.value = auswahl.sprecher.find((s) => !topSprecher.includes(s)) ?? "";
    frei.addEventListener("change", (e) => {
      auswahl.sprecher = auswahl.sprecher.filter((s) => topSprecher.includes(s));
      if (e.target.value.trim()) auswahl.sprecher.push(e.target.value.trim());
      geaendert();
    });
    reihe.append(frei);
    ziel.append(zeile("Sprecher", reihe));
  }

  ziel.append(zeile("Länge", chipReihe(Object.values(LAENGEN),
    (w) => auswahl.laenge === Object.keys(LAENGEN).find((k) => LAENGEN[k] === w),
    (anzeige, aktiv) => {
      auswahl.laenge = aktiv ? null : Object.keys(LAENGEN).find((k) => LAENGEN[k] === anzeige);
      geaendert();
    })));

  // Buchtitel sind zu lang für Pillen — hier gehört ein Auswahlfeld hin.
  const lieblinge = App.meinProfil().lieblinge
    .map((asin) => App.daten.library.find((b) => b.asin === asin)).filter(Boolean)
    .sort((a, b) => a.titel.localeCompare(b.titel, "de"));
  if (lieblinge.length) {
    const feld = document.createElement("select");
    feld.className = "such-select";
    feld.innerHTML = `<option value="">Buch wählen …</option>` +
      lieblinge.map((b) => `<option value="${b.asin}"${b.asin === auswahl.aehnlichWie ? " selected" : ""}>${b.titel}</option>`).join("");
    feld.addEventListener("change", (e) => { auswahl.aehnlichWie = e.target.value || null; geaendert(); });
    ziel.append(zeile("Ähnlich wie", feld));
  }

  const frei = document.createElement("input");
  frei.type = "text";
  frei.className = "such-frei-feld breit";
  frei.placeholder = "z.B. nichts Politisches";
  frei.value = auswahl.freitext;
  frei.addEventListener("input", (e) => { auswahl.freitext = e.target.value; zeichneLeiste(App); });
  ziel.append(zeile("Sonst noch", frei));

  zeichneGewaehlt(App);
  zeichneTreffer(App, pool);
  zeichneLeiste(App);
  zeichneAuftraege(App);
}

// Die getroffene Auswahl als wegtippbare Marken — sonst muss man die Zeilen absuchen,
// um zu sehen, wonach gerade gefiltert wird.
function zeichneGewaehlt(App) {
  const ziel = document.getElementById("such-gewaehlt");
  const marken = [];
  const sammle = (feld, werte) => werte.forEach((w) => marken.push({ feld, wert: w, text: w }));
  sammle("stimmung", auswahl.stimmung);
  sammle("anlass", auswahl.anlass);
  sammle("themen", auswahl.themen);
  sammle("form", auswahl.form);
  sammle("sprecher", auswahl.sprecher);
  if (auswahl.laenge) marken.push({ feld: "laenge", wert: null, text: LAENGEN[auswahl.laenge] });
  if (auswahl.aehnlichWie) {
    const b = App.daten.library.find((x) => x.asin === auswahl.aehnlichWie);
    marken.push({ feld: "aehnlichWie", wert: null, text: `wie ${b?.titel.split(":")[0] ?? "…"}` });
  }

  ziel.hidden = marken.length === 0;
  if (!marken.length) return;

  ziel.replaceChildren();
  const titel = document.createElement("span");
  titel.className = "such-gewaehlt-titel";
  titel.textContent = "Gewählt";
  ziel.append(titel);

  for (const m of marken) {
    const knopf = document.createElement("button");
    knopf.className = "such-marke";
    knopf.innerHTML = `${m.text} <span aria-hidden="true">✕</span>`;
    knopf.setAttribute("aria-label", `${m.text} entfernen`);
    knopf.addEventListener("click", () => {
      if (m.wert === null) auswahl[m.feld] = null;
      else auswahl[m.feld] = auswahl[m.feld].filter((w) => w !== m.wert);
      trefferGezeigt = SCHRITT;
      zeichne(App);
    });
    ziel.append(knopf);
  }

  const zurueck = document.createElement("button");
  zurueck.className = "such-zuruecksetzen";
  zurueck.textContent = "zurücksetzen";
  zurueck.addEventListener("click", () => {
    Object.assign(auswahl, { stimmung: [], anlass: [], themen: [], form: [], sprecher: [], laenge: null, aehnlichWie: null, freitext: "" });
    trefferGezeigt = SCHRITT;
    zeichne(App);
  });
  ziel.append(zurueck);
}

function zeichneTreffer(App, pool) {
  const ziel = document.getElementById("such-treffer");
  if (istLeer(auswahl)) { ziel.replaceChildren(); return; }
  const treffer = sucheImVorrat(pool, auswahl);
  ziel.replaceChildren(listeMitMehr({
    eintraege: treffer,
    gezeigt: trefferGezeigt,
    karte: (e) => empfKarte(App, e),
    beiMehr: (neu) => { trefferGezeigt = neu; zeichne(App); },
  }));
}

function zeichneLeiste(App) {
  const anzahl = document.getElementById("such-anzahl");
  const knopf = document.getElementById("such-neu");
  const offen = App.meinProfil().wishes.some((w) => w.status === "offen" || w.status === "in_arbeit");

  if (istLeer(auswahl)) {
    anzahl.textContent = "Wähle aus, wonach dir ist.";
    knopf.classList.remove("hervor");
  } else {
    const pool = sichtbareEmpfehlungen(App.pool(), App.daten.library, App.zustand, App.profil);
    const n = sucheImVorrat(pool, auswahl).length;
    anzahl.textContent = n === 0 ? "Nichts im Vorrat dabei." : `${n} im Vorrat gefunden`;
    knopf.classList.toggle("hervor", n === 0);
  }

  knopf.textContent = offen ? "Suche läuft …" : "Richtig suchen";
  knopf.disabled = offen;

  clearTimeout(pollTimer);
  if (offen && App.syncLaden) pollTimer = setTimeout(() => App.syncLaden(), 30000);
}

function zeichneAuftraege(App) {
  const TEXT = { offen: "wird gesucht", in_arbeit: "wird recherchiert", beantwortet: "beantwortet" };
  const liste = document.getElementById("auftrag-liste");
  liste.replaceChildren(...App.meinProfil().wishes.slice(-4).reverse().map((w) => {
    const li = document.createElement("li");
    li.className = `auftrag ${w.status}`;
    li.innerHTML = `<span class="auftrag-punkt" aria-hidden="true"></span>
      <span class="auftrag-text">${w.text}</span>
      <span class="auftrag-status">${TEXT[w.status] ?? w.status}</span>`;
    return li;
  }));
}
