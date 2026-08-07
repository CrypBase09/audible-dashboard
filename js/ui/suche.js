import { sucheImVorrat, sichtbareEmpfehlungen } from "../lib/empfehlungs-filter.js";
import { formuliereAuftrag, istLeer } from "../lib/suchauftrag.js";
import { empfKarte } from "./empf-karte.js";

const STIMMUNGEN = ["spannend", "herzerwärmend", "witzig", "düster", "entspannend"];
const ANLAESSE = ["zum Einschlafen", "fürs Auto", "beim Bügeln", "mit den Kindern", "lange Reise"];
const FORMEN = ["Lesung", "Hörspiel", "Bühnenprogramm", "Podcast"];
const LAENGEN = { kurz: "Kurz (unter 8 Std.)", mittel: "Mittel", episch: "Episch (über 20 Std.)" };

const auswahl = { stimmung: [], anlass: [], themen: [], form: [], sprecher: [], laenge: null, aehnlichWie: null, freitext: "" };
let pollTimer = null;

export function initSuche(App) {
  const wurzel = document.getElementById("suche");
  wurzel.innerHTML = `
    <h2>Finde etwas Neues</h2>
    <p class="gedaempft">Wähle aus, wonach dir ist — ich zeige sofort, was schon da ist, und suche auf Wunsch frisch danach.</p>
    <div id="such-gruppen" class="such-gruppen"></div>
    <label class="such-frei"><span class="gedaempft">Sonst noch etwas?</span>
      <textarea id="such-freitext" rows="2" placeholder="z.B. „nichts Politisches“ oder „gern von einer Frau gelesen“"></textarea></label>
    <div class="such-fuss">
      <p id="such-anzahl" class="gedaempft"></p>
      <button id="such-neu" class="primaer">Danach richtig suchen</button>
    </div>
    <div id="such-treffer" class="empf-liste"></div>
    <ul id="auftrag-liste"></ul>`;

  wurzel.querySelector("#such-freitext").addEventListener("input", (e) => {
    auswahl.freitext = e.target.value;
    zeichneFuss(App);
  });
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

function gruppe(titel, werte, gewaehlt, mehrfach, beiKlick) {
  const box = document.createElement("div");
  box.className = "such-gruppe";
  const h = document.createElement("h4");
  h.textContent = titel;
  const chips = document.createElement("div");
  chips.className = "chips";
  for (const wert of werte) {
    const chip = document.createElement("button");
    const aktiv = mehrfach ? gewaehlt.includes(wert) : gewaehlt === wert;
    chip.className = "chip" + (aktiv ? " aktiv" : "");
    chip.textContent = wert;
    chip.setAttribute("aria-pressed", String(aktiv));
    chip.addEventListener("click", () => beiKlick(wert, aktiv));
    chips.append(chip);
  }
  box.append(h, chips);
  return box;
}

function zeichne(App) {
  const ziel = document.getElementById("such-gruppen");
  const pool = sichtbareEmpfehlungen(App.pool(), App.daten.library, App.zustand, App.profil);
  const umschalten = (feld) => (wert, aktiv) => {
    if (aktiv) auswahl[feld] = auswahl[feld].filter((w) => w !== wert);
    else auswahl[feld] = [...auswahl[feld], wert];
    zeichne(App);
  };

  ziel.replaceChildren();
  ziel.append(gruppe("Stimmung", STIMMUNGEN, auswahl.stimmung, true, umschalten("stimmung")));
  ziel.append(gruppe("Anlass", ANLAESSE, auswahl.anlass, true, umschalten("anlass")));

  const themen = [...new Set(pool.flatMap((e) => e.tags?.themen ?? []))].sort((a, b) => a.localeCompare(b, "de"));
  if (themen.length) ziel.append(gruppe("Thema", themen, auswahl.themen, true, umschalten("themen")));

  ziel.append(gruppe("Erzählform", FORMEN, auswahl.form, true, umschalten("form")));

  // Sprecher: die häufigsten aus den eigenen Büchern, damit die Auswahl nach ihr klingt.
  const eigene = App.meineBuecher();
  const zaehler = new Map();
  for (const b of eigene) {
    for (const s of String(b.sprecher ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
      zaehler.set(s, (zaehler.get(s) ?? 0) + 1);
    }
  }
  const topSprecher = [...zaehler.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n]) => n);
  if (topSprecher.length) {
    const box = gruppe("Sprecher", topSprecher, auswahl.sprecher, true, umschalten("sprecher"));
    const frei = document.createElement("input");
    frei.type = "search";
    frei.placeholder = "andere Stimme suchen …";
    frei.className = "sprecher-frei";
    frei.value = auswahl.sprecher.find((s) => !topSprecher.includes(s)) ?? "";
    frei.addEventListener("change", (e) => {
      auswahl.sprecher = auswahl.sprecher.filter((s) => topSprecher.includes(s));
      if (e.target.value.trim()) auswahl.sprecher.push(e.target.value.trim());
      zeichne(App);
    });
    box.append(frei);
    ziel.append(box);
  }

  ziel.append(gruppe("Länge", Object.values(LAENGEN), auswahl.laenge ? LAENGEN[auswahl.laenge] : null, false,
    (anzeige, aktiv) => {
      auswahl.laenge = aktiv ? null : Object.keys(LAENGEN).find((k) => LAENGEN[k] === anzeige);
      zeichne(App);
    }));

  const lieblinge = App.meinProfil().lieblinge
    .map((asin) => App.daten.library.find((b) => b.asin === asin)).filter(Boolean);
  if (lieblinge.length) {
    const aktuellerTitel = lieblinge.find((b) => b.asin === auswahl.aehnlichWie)?.titel ?? null;
    ziel.append(gruppe("Ähnlich wie", lieblinge.slice(0, 12).map((b) => b.titel), aktuellerTitel, false,
      (titel, aktiv) => {
        auswahl.aehnlichWie = aktiv ? null : lieblinge.find((b) => b.titel === titel)?.asin ?? null;
        zeichne(App);
      }));
  }

  zeichneTreffer(App, pool);
  zeichneFuss(App);
  zeichneAuftraege(App);
}

function zeichneTreffer(App, pool) {
  const ziel = document.getElementById("such-treffer");
  if (istLeer(auswahl)) { ziel.replaceChildren(); return; }
  const treffer = sucheImVorrat(pool, auswahl);
  ziel.replaceChildren(...treffer.map((e) => empfKarte(App, e)));
}

function zeichneFuss(App) {
  const anzahl = document.getElementById("such-anzahl");
  const knopf = document.getElementById("such-neu");
  const offen = App.meinProfil().wishes.some((w) => w.status === "offen" || w.status === "in_arbeit");

  if (istLeer(auswahl)) {
    anzahl.textContent = "Noch nichts gewählt — oben stehen deine Vorschläge.";
    knopf.classList.remove("hervor");
  } else {
    const pool = sichtbareEmpfehlungen(App.pool(), App.daten.library, App.zustand, App.profil);
    const n = sucheImVorrat(pool, auswahl).length;
    anzahl.textContent = n === 0
      ? "Im Vorrat ist nichts dabei — soll ich richtig danach suchen?"
      : `${n} ${n === 1 ? "Treffer" : "Treffer"} im Vorrat — oder richtig danach suchen?`;
    knopf.classList.toggle("hervor", n === 0);
  }

  knopf.textContent = offen ? "Suche läuft …" : "Danach richtig suchen";
  knopf.disabled = offen;

  clearTimeout(pollTimer);
  if (offen && App.syncLaden) pollTimer = setTimeout(() => App.syncLaden(), 30000);
}

function zeichneAuftraege(App) {
  const TEXT = { offen: "wird gerade gesucht …", in_arbeit: "ich recherchiere gerade …", beantwortet: "beantwortet ✓" };
  const liste = document.getElementById("auftrag-liste");
  liste.replaceChildren(...App.meinProfil().wishes.slice(-5).map((w) => {
    const li = document.createElement("li");
    li.innerHTML = `„${w.text}“ — <span class="${w.status}">${TEXT[w.status] ?? w.status}</span>`;
    return li;
  }));
}
