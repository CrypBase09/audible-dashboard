# Audible-Dashboard „Hörbuch-Cockpit" — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persönliches Hörbuch-Dashboard auf GitHub Pages mit Bibliotheksübersicht, kuratierter + interaktiver Empfehlungssuche, geräteübergreifendem Sync (Cloudflare KV) und geplantem Auffrisch-Lauf.

**Architecture:** Statische Vanilla-HTML/CSS/JS-Seite ohne Build-Prozess, Daten als JSON per fetch; reine Logik-Funktionen in `js/lib/` (getestet mit `node --test`); Cloudflare Worker als PIN-geschützter State-Speicher; lokaler geplanter Claude-Lauf pusht Aktualisierungen ins Repo.

**Tech Stack:** Vanilla ES-Module, Node ≥ 18 (nur Tests/Tools), Cloudflare Wrangler, PowerShell (Cover/Icons), gh CLI, Claude CLI (Auffrisch-Lauf).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-05-audible-dashboard-design.md` — bei Widerspruch gewinnt die Spec.
- Alles Nutzersichtbare auf **Deutsch**; Begrüßung **ohne Namen**.
- **Kein** Framework, **kein** Build-Schritt, **kein** Service Worker, **keine** Preisanzeigen, **keine** externen CDNs/Fonts.
- Mobile-first (375 px), Desktop ebenso sauber; hell + dunkel via `prefers-color-scheme`, dunkel ist Default-Ästhetik.
- PIN niemals ins Repo — nur Worker-Secret + `F:\Projekte\audible-dashboard-privat\pin.txt` (außerhalb des Repos).
- Datenschemata (verbindlich für alle Tasks):
  - **Buch:** `{asin, titel, autor, sprecher, serie|null, band|null, dauer_min, genre, cover, audible_url, hinzugefuegt|null}`
  - **Empfehlung:** `{id, asin|null, titel, autor, sprecher|null, begruendung, tags:{genres[], stimmung[], laenge:"kurz"|"mittel"|"episch"}, aehnlich_wie|null, audible_url, regal:"wunsch-antwort"|"serien-fortsetzung"|"lieblingsautor"|"geschmacks-match", aufgenommen_am}`
  - **State:** `{version:number, favorites:string[], wishlist:string[], gehoert:string[], wishes:[{id,text,datum,status:"offen"|"beantwortet"}]}`
  - **meta.json:** `{letzter_lauf, naechster_lauf, profil_kurz}`
- localStorage-Schlüssel: `hb:pin`, `hb:state`, `hb:tombstones`, `hb:pending`.
- Tests laufen mit `node --test tests/` im Repo-Root; vor jedem Push müssen alle Tests grün sein.
- Alle Commits enden mit `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Arbeitsverzeichnis aller Kommandos: `F:\Projekte\audible-dashboard`.

---

## Phase 0 — Gerüst

### Task 1: Repo-Grundgerüst + Fixture-Daten

**Files:**
- Create: `.gitignore`, `README.md`, `data/library.json`, `data/recommendations.json`, `data/meta.json`, `tests/smoke.test.mjs`

**Interfaces:**
- Produces: Fixture-Daten gemäß Global-Schemata; alle späteren UI-Tasks entwickeln gegen diese Fixtures, bis Task 15–17 echte Daten liefern.

- [ ] **Step 1: Node-Version prüfen**

Run: `node --version`
Expected: ≥ v18. Falls nicht vorhanden: STOPP, User informieren.

- [ ] **Step 2: Dateien anlegen**

`.gitignore`:
```
node_modules/
*.tmp
.wrangler/
```

`README.md`:
```markdown
# Hörbuch-Cockpit
Persönliches Audible-Dashboard. Statische Seite (GitHub Pages) + Cloudflare-KV-Sync.
Tests: `node --test tests/` · Betrieb: siehe Obsidian-Notiz „Audible-Dashboard".
```

`data/library.json` (6 Fixture-Bücher, Schema exakt einhalten):
```json
[
  {"asin":"FIX001","titel":"Die Nebelkrone","autor":"Mara Winter","sprecher":"Luise Helm","serie":"Nebelkrone","band":1,"dauer_min":812,"genre":"Fantasy","cover":"covers/FIX001.jpg","audible_url":"https://www.audible.de/pd/FIX001","hinzugefuegt":"2025-11-02"},
  {"asin":"FIX002","titel":"Die Nebelkrone – Sturmzeit","autor":"Mara Winter","sprecher":"Luise Helm","serie":"Nebelkrone","band":2,"dauer_min":845,"genre":"Fantasy","cover":"covers/FIX002.jpg","audible_url":"https://www.audible.de/pd/FIX002","hinzugefuegt":"2026-01-15"},
  {"asin":"FIX003","titel":"Kaltes Ufer","autor":"Jonas Reht","sprecher":"Uve Teschner","serie":null,"band":null,"dauer_min":540,"genre":"Krimi","cover":"covers/FIX003.jpg","audible_url":"https://www.audible.de/pd/FIX003","hinzugefuegt":"2025-08-20"},
  {"asin":"FIX004","titel":"Sommer in Salthaven","autor":"Elin Brodersen","sprecher":"Gabrielle Pietermann","serie":null,"band":null,"dauer_min":420,"genre":"Liebesroman","cover":"covers/FIX004.jpg","audible_url":"https://www.audible.de/pd/FIX004","hinzugefuegt":"2026-03-01"},
  {"asin":"FIX005","titel":"Das Archiv der Träume","autor":"Mara Winter","sprecher":"Vera Teltz","serie":null,"band":null,"dauer_min":1290,"genre":"Fantasy","cover":"covers/FIX005.jpg","audible_url":"https://www.audible.de/pd/FIX005","hinzugefuegt":"2025-05-11"},
  {"asin":"FIX006","titel":"Mord bei Flut","autor":"Jonas Reht","sprecher":"Uve Teschner","serie":"Küstenkrimi","band":1,"dauer_min":610,"genre":"Krimi","cover":"covers/FIX006.jpg","audible_url":"https://www.audible.de/pd/FIX006","hinzugefuegt":"2026-06-28"}
]
```

`data/recommendations.json` (4 Fixture-Empfehlungen, je Regal eine):
```json
[
  {"id":"r1","asin":"FIXR01","titel":"Die Nebelkrone – Aschefall","autor":"Mara Winter","sprecher":"Luise Helm","begruendung":"Band 3 deiner Nebelkrone-Reihe – die Geschichte geht weiter.","tags":{"genres":["Fantasy"],"stimmung":["spannend","düster"],"laenge":"episch"},"aehnlich_wie":"FIX001","audible_url":"https://www.audible.de/pd/FIXR01","regal":"serien-fortsetzung","aufgenommen_am":"2026-08-05"},
  {"id":"r2","asin":"FIXR02","titel":"Winterlichter","autor":"Mara Winter","sprecher":"Vera Teltz","begruendung":"Neu von deiner Lieblingsautorin Mara Winter.","tags":{"genres":["Fantasy"],"stimmung":["herzerwärmend"],"laenge":"mittel"},"aehnlich_wie":null,"audible_url":"https://www.audible.de/pd/FIXR02","regal":"lieblingsautor","aufgenommen_am":"2026-08-05"},
  {"id":"r3","asin":"FIXR03","titel":"Nordseegrab","autor":"Katrin Fell","sprecher":"Uve Teschner","begruendung":"Weil du ♥ Kaltes Ufer liebst: gleiche raue Küste, gleicher Sprecher.","tags":{"genres":["Krimi"],"stimmung":["spannend","düster"],"laenge":"mittel"},"aehnlich_wie":"FIX003","audible_url":"https://www.audible.de/pd/FIXR03","regal":"geschmacks-match","aufgenommen_am":"2026-08-05"},
  {"id":"r4","asin":"FIXR04","titel":"Café der zweiten Chancen","autor":"Nora Lieb","sprecher":"Gabrielle Pietermann","begruendung":"Deine Antwort auf den Wunsch „etwas Herzerwärmendes für den Sommer“.","tags":{"genres":["Liebesroman"],"stimmung":["herzerwärmend","entspannend"],"laenge":"kurz"},"aehnlich_wie":null,"audible_url":"https://www.audible.de/pd/FIXR04","regal":"wunsch-antwort","aufgenommen_am":"2026-08-05"}
]
```

`data/meta.json`:
```json
{"letzter_lauf":"2026-08-05T08:00:00+02:00","naechster_lauf":"2026-08-07T07:30:00+02:00","profil_kurz":"Fantasy & Küstenkrimi, gern Serien, Lieblingssprecher Uve Teschner"}
```

`tests/smoke.test.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Fixture-Daten sind gültiges JSON mit Pflichtfeldern", () => {
  const lib = JSON.parse(readFileSync("data/library.json", "utf8"));
  assert.ok(lib.length >= 1);
  for (const b of lib) for (const f of ["asin", "titel", "autor", "genre", "dauer_min"]) assert.ok(f in b, f);
  const recs = JSON.parse(readFileSync("data/recommendations.json", "utf8"));
  for (const r of recs) for (const f of ["id", "titel", "begruendung", "tags", "regal"]) assert.ok(f in r, f);
});
```

- [ ] **Step 3: Tests laufen lassen**

Run: `node --test tests/`
Expected: 1 passed.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: Grundgerüst mit Fixture-Daten und Smoke-Test"
```

---

## Phase 1 — Logik-Kern (TDD, reine Funktionen)

### Task 2: Suche (`js/lib/suche.js`)

**Files:**
- Create: `js/lib/suche.js`, Test: `tests/suche.test.mjs`

**Interfaces:**
- Produces: `normalisiere(text:string):string` · `sucheBuecher(buecher:Buch[], anfrage:string):Buch[]` (leere Anfrage → alle; Treffer über titel/autor/sprecher/serie; case-/umlaut-unabhängig; Tippfehlertoleranz: 1 Editierschritt für Suchwörter ≥ 5 Zeichen).

- [ ] **Step 1: Failing Test schreiben**

`tests/suche.test.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { normalisiere, sucheBuecher } from "../js/lib/suche.js";

const buecher = [
  { asin: "A", titel: "Die Nebelkrone", autor: "Mara Winter", sprecher: "Luise Helm", serie: "Nebelkrone" },
  { asin: "B", titel: "Kaltes Ufer", autor: "Jonas Reht", sprecher: "Uve Teschner", serie: null },
];

test("normalisiere: Kleinbuchstaben, Umlaute, ß", () => {
  assert.equal(normalisiere("Größe MÄRCHEN"), "grosse marchen");
});
test("leere Anfrage liefert alle", () => {
  assert.equal(sucheBuecher(buecher, "  ").length, 2);
});
test("findet über Autor, case-insensitiv", () => {
  assert.deepEqual(sucheBuecher(buecher, "mara").map(b => b.asin), ["A"]);
});
test("Tippfehler mit 1 Abweichung ab 5 Zeichen", () => {
  assert.deepEqual(sucheBuecher(buecher, "nebelkrune").map(b => b.asin), ["A"]);
});
test("kurze Wörter nur exakt als Teilstring", () => {
  assert.equal(sucheBuecher(buecher, "uve").length, 1);
  assert.equal(sucheBuecher(buecher, "uvi").length, 0);
});
test("mehrere Wörter: alle müssen treffen", () => {
  assert.equal(sucheBuecher(buecher, "winter ufer").length, 0);
});
```

- [ ] **Step 2: Test rot sehen** — Run: `node --test tests/suche.test.mjs` · Expected: FAIL (Modul fehlt).

- [ ] **Step 3: Implementierung**

`js/lib/suche.js`:
```js
export function normalisiere(text) {
  return (text ?? "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function maxEinsAbstand(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}

export function sucheBuecher(buecher, anfrage) {
  const q = normalisiere(anfrage).trim();
  if (!q) return buecher;
  const tokens = q.split(/\s+/);
  return buecher.filter((b) => {
    const feld = normalisiere([b.titel, b.autor, b.sprecher, b.serie].filter(Boolean).join(" "));
    const woerter = feld.split(/\s+/);
    return tokens.every((t) =>
      feld.includes(t) || (t.length >= 5 && woerter.some((w) => maxEinsAbstand(t, w)))
    );
  });
}
```

- [ ] **Step 4: Test grün sehen** — Run: `node --test tests/suche.test.mjs` · Expected: PASS (6 Tests).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: tippfehlertolerante Bibliothekssuche"`

### Task 3: Filter + Sortierung (`js/lib/filter.js`)

**Files:**
- Create: `js/lib/filter.js`, Test: `tests/filter.test.mjs`

**Interfaces:**
- Produces: `filterBibliothek(buecher, {genre?, serie?, nurFavoriten?, favoriten?, sortierung?}):Buch[]` (Sortierungen: `"titel"|"autor"|"dauer"|"neueste"`, Default `"titel"`) · `filterEmpfehlungen(pool, {stimmung?, genre?, laenge?, aehnlichWie?, aehnlichWieGenre?}, gehoert?:string[]):Empfehlung[]`

- [ ] **Step 1: Failing Test schreiben**

`tests/filter.test.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { filterBibliothek, filterEmpfehlungen } from "../js/lib/filter.js";

const buecher = [
  { asin: "A", titel: "Zebra", autor: "B Autor", genre: "Fantasy", serie: "S1", dauer_min: 100, hinzugefuegt: "2026-01-01" },
  { asin: "B", titel: "Apfel", autor: "A Autor", genre: "Krimi", serie: null, dauer_min: 300, hinzugefuegt: "2026-05-01" },
  { asin: "C", titel: "Mitte", autor: "C Autor", genre: "Fantasy", serie: "S1", dauer_min: 200, hinzugefuegt: null },
];
const pool = [
  { id: "r1", tags: { genres: ["Fantasy"], stimmung: ["spannend"], laenge: "episch" }, aehnlich_wie: "A" },
  { id: "r2", tags: { genres: ["Krimi"], stimmung: ["düster", "spannend"], laenge: "kurz" }, aehnlich_wie: null },
];

test("Genre-Filter + Default-Sortierung nach Titel", () => {
  assert.deepEqual(filterBibliothek(buecher, { genre: "Fantasy" }).map(b => b.asin), ["C", "A"]);
});
test("nurFavoriten nutzt Favoritenliste", () => {
  assert.deepEqual(filterBibliothek(buecher, { nurFavoriten: true, favoriten: ["B"] }).map(b => b.asin), ["B"]);
});
test("Sortierung dauer = längste zuerst, neueste = jüngstes Datum zuerst", () => {
  assert.deepEqual(filterBibliothek(buecher, { sortierung: "dauer" }).map(b => b.asin), ["B", "C", "A"]);
  assert.deepEqual(filterBibliothek(buecher, { sortierung: "neueste" }).map(b => b.asin), ["B", "A", "C"]);
});
test("Empfehlungen: Stimmung UND Länge", () => {
  assert.deepEqual(filterEmpfehlungen(pool, { stimmung: "spannend", laenge: "kurz" }).map(r => r.id), ["r2"]);
});
test("Empfehlungen: gehört wird ausgeblendet", () => {
  assert.deepEqual(filterEmpfehlungen(pool, {}, ["r2"]).map(r => r.id), ["r1"]);
});
test("aehnlichWie: direkter Bezug oder Genre-Fallback", () => {
  assert.deepEqual(filterEmpfehlungen(pool, { aehnlichWie: "A" }).map(r => r.id), ["r1"]);
  assert.deepEqual(filterEmpfehlungen(pool, { aehnlichWie: "X", aehnlichWieGenre: "Krimi" }).map(r => r.id), ["r2"]);
});
```

- [ ] **Step 2: Rot** — Run: `node --test tests/filter.test.mjs` · Expected: FAIL.

- [ ] **Step 3: Implementierung**

`js/lib/filter.js`:
```js
const VERGLEICHE = {
  titel: (a, b) => a.titel.localeCompare(b.titel, "de"),
  autor: (a, b) => a.autor.localeCompare(b.autor, "de"),
  dauer: (a, b) => (b.dauer_min ?? 0) - (a.dauer_min ?? 0),
  neueste: (a, b) => (b.hinzugefuegt ?? "").localeCompare(a.hinzugefuegt ?? ""),
};

export function filterBibliothek(buecher, opt = {}) {
  let res = buecher;
  if (opt.genre) res = res.filter((b) => b.genre === opt.genre);
  if (opt.serie) res = res.filter((b) => b.serie === opt.serie);
  if (opt.nurFavoriten) res = res.filter((b) => (opt.favoriten ?? []).includes(b.asin));
  return [...res].sort(VERGLEICHE[opt.sortierung] ?? VERGLEICHE.titel);
}

export function filterEmpfehlungen(pool, opt = {}, gehoert = []) {
  return pool.filter((e) => {
    if (gehoert.includes(e.id)) return false;
    if (opt.stimmung && !e.tags.stimmung.includes(opt.stimmung)) return false;
    if (opt.genre && !e.tags.genres.includes(opt.genre)) return false;
    if (opt.laenge && e.tags.laenge !== opt.laenge) return false;
    if (opt.aehnlichWie && e.aehnlich_wie !== opt.aehnlichWie) {
      if (!(opt.aehnlichWieGenre && e.tags.genres.includes(opt.aehnlichWieGenre))) return false;
    }
    return true;
  });
}
```

- [ ] **Step 4: Grün** — Run: `node --test tests/filter.test.mjs` · Expected: PASS (6 Tests).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: Bibliotheks- und Empfehlungsfilter"`

### Task 4: Statistik (`js/lib/statistik.js`)

**Files:**
- Create: `js/lib/statistik.js`, Test: `tests/statistik.test.mjs`

**Interfaces:**
- Produces: `berechneStatistik(buecher):{anzahl, gesamt_min, genres:[{name,anzahl}], topAutoren:[{name,anzahl}], topSprecher:[{name,anzahl}], laengstes:Buch|null, kuerzestes:Buch|null}` (genres absteigend; top-Listen max. 5) · `formatiereDauer(min:number):string` („2.412 Std." bei ≥ 100 h sonst „87 Std. 30 Min.", deutsch formatiert).

- [ ] **Step 1: Failing Test schreiben**

`tests/statistik.test.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { berechneStatistik, formatiereDauer } from "../js/lib/statistik.js";

const buecher = [
  { asin: "A", autor: "X", sprecher: "S1", genre: "Fantasy", dauer_min: 600 },
  { asin: "B", autor: "X", sprecher: "S2", genre: "Fantasy", dauer_min: 300 },
  { asin: "C", autor: "Y", sprecher: "S1", genre: "Krimi", dauer_min: 900 },
];

test("Statistik: Summen, Reihenfolge, Rekorde", () => {
  const s = berechneStatistik(buecher);
  assert.equal(s.anzahl, 3);
  assert.equal(s.gesamt_min, 1800);
  assert.deepEqual(s.genres[0], { name: "Fantasy", anzahl: 2 });
  assert.deepEqual(s.topAutoren[0], { name: "X", anzahl: 2 });
  assert.equal(s.laengstes.asin, "C");
  assert.equal(s.kuerzestes.asin, "B");
});
test("Statistik: leere Bibliothek crasht nicht", () => {
  const s = berechneStatistik([]);
  assert.equal(s.anzahl, 0);
  assert.equal(s.laengstes, null);
});
test("formatiereDauer", () => {
  assert.equal(formatiereDauer(5250), "87 Std. 30 Min.");
  assert.equal(formatiereDauer(144720), "2.412 Std.");
});
```

- [ ] **Step 2: Rot** — Run: `node --test tests/statistik.test.mjs` · Expected: FAIL.

- [ ] **Step 3: Implementierung**

`js/lib/statistik.js`:
```js
function zaehle(buecher, schluessel) {
  const m = new Map();
  for (const b of buecher) {
    const wert = b[schluessel];
    if (wert) m.set(wert, (m.get(wert) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([name, anzahl]) => ({ name, anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl || a.name.localeCompare(b.name, "de"));
}

export function berechneStatistik(buecher) {
  const mitDauer = buecher.filter((b) => (b.dauer_min ?? 0) > 0);
  return {
    anzahl: buecher.length,
    gesamt_min: buecher.reduce((s, b) => s + (b.dauer_min ?? 0), 0),
    genres: zaehle(buecher, "genre"),
    topAutoren: zaehle(buecher, "autor").slice(0, 5),
    topSprecher: zaehle(buecher, "sprecher").slice(0, 5),
    laengstes: mitDauer.reduce((a, b) => (b.dauer_min > (a?.dauer_min ?? -1) ? b : a), null),
    kuerzestes: mitDauer.reduce((a, b) => (b.dauer_min < (a?.dauer_min ?? Infinity) ? b : a), null),
  };
}

export function formatiereDauer(min) {
  const std = Math.floor(min / 60);
  if (std >= 100) return `${std.toLocaleString("de-DE")} Std.`;
  return `${std} Std. ${min % 60} Min.`;
}
```

- [ ] **Step 4: Grün** — Run: `node --test tests/statistik.test.mjs` · Expected: PASS (3 Tests).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: Hörstatistik-Berechnung"`

### Task 5: „Mal wieder hören" (`js/lib/heute.js`)

**Files:**
- Create: `js/lib/heute.js`, Test: `tests/heute.test.mjs`

**Interfaces:**
- Produces: `malWiederHeute(datumIso:string, favoriten:string[]):string|null` — deterministisch pro Datum, `null` ohne Favoriten.

- [ ] **Step 1: Failing Test schreiben**

`tests/heute.test.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { malWiederHeute } from "../js/lib/heute.js";

test("deterministisch pro Datum, wechselt über Tage, null ohne Favoriten", () => {
  const favs = ["A", "B", "C"];
  const heute = malWiederHeute("2026-08-05", favs);
  assert.equal(malWiederHeute("2026-08-05", favs), heute);
  assert.ok(favs.includes(heute));
  const tage = ["2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08"];
  assert.ok(new Set(tage.map((t) => malWiederHeute(t, favs))).size > 1);
  assert.equal(malWiederHeute("2026-08-05", []), null);
});
```

- [ ] **Step 2: Rot** — Run: `node --test tests/heute.test.mjs` · Expected: FAIL.

- [ ] **Step 3: Implementierung**

`js/lib/heute.js`:
```js
export function malWiederHeute(datumIso, favoriten) {
  if (!favoriten?.length) return null;
  let h = 0;
  for (const zeichen of datumIso) h = (h * 31 + zeichen.charCodeAt(0)) >>> 0;
  return favoriten[h % favoriten.length];
}
```

- [ ] **Step 4: Grün** — Run: `node --test tests/heute.test.mjs` · Expected: PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: deterministischer Tages-Favorit"`

### Task 6: State-Merge (`js/lib/sync-merge.js`)

**Files:**
- Create: `js/lib/sync-merge.js`, Test: `tests/sync-merge.test.mjs`

**Interfaces:**
- Produces: `LEERER_STATE` (Konstante gemäß State-Schema) · `mergeState(lokal:State|null, remote:State|null, tombstones?:{wishlist:string[]}):State` — Herzen/gehört: Vereinigung; Wunschliste: Vereinigung minus Tombstones; wishes: Vereinigung per id, `beantwortet` gewinnt; version = Maximum.

- [ ] **Step 1: Failing Test schreiben**

`tests/sync-merge.test.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { mergeState, LEERER_STATE } from "../js/lib/sync-merge.js";

test("null-Seiten fallen auf die andere Seite bzw. LEERER_STATE zurück", () => {
  const s = { ...LEERER_STATE, favorites: ["A"] };
  assert.deepEqual(mergeState(null, s), s);
  assert.deepEqual(mergeState(s, null), s);
  assert.deepEqual(mergeState(null, null), LEERER_STATE);
});
test("Herzen vereinigen, Wunschlisten-Tombstones gewinnen, version = max", () => {
  const lokal = { version: 2, favorites: ["A", "B"], wishlist: ["w1", "w2"], gehoert: ["g1"], wishes: [] };
  const remote = { version: 5, favorites: ["B", "C"], wishlist: ["w2", "w3"], gehoert: [], wishes: [] };
  const m = mergeState(lokal, remote, { wishlist: ["w3"] });
  assert.deepEqual(m.favorites.sort(), ["A", "B", "C"]);
  assert.deepEqual(m.wishlist.sort(), ["w1", "w2"]);
  assert.deepEqual(m.gehoert, ["g1"]);
  assert.equal(m.version, 5);
});
test("wishes: beantwortet gewinnt über offen", () => {
  const lokal = { ...LEERER_STATE, wishes: [{ id: "x", text: "t", datum: "2026-08-01", status: "offen" }] };
  const remote = { ...LEERER_STATE, wishes: [{ id: "x", text: "t", datum: "2026-08-01", status: "beantwortet" }] };
  assert.equal(mergeState(lokal, remote).wishes[0].status, "beantwortet");
  assert.equal(mergeState(remote, lokal).wishes[0].status, "beantwortet");
});
```

- [ ] **Step 2: Rot** — Run: `node --test tests/sync-merge.test.mjs` · Expected: FAIL.

- [ ] **Step 3: Implementierung**

`js/lib/sync-merge.js`:
```js
export const LEERER_STATE = { version: 0, favorites: [], wishlist: [], gehoert: [], wishes: [] };

export function mergeState(lokal, remote, tombstones = { wishlist: [] }) {
  if (!lokal && !remote) return { ...LEERER_STATE };
  if (!remote) return { ...lokal };
  if (!lokal) return { ...remote };
  const uniq = (arr) => [...new Set(arr)];
  const wishes = new Map();
  for (const w of [...(remote.wishes ?? []), ...(lokal.wishes ?? [])]) {
    const vorhanden = wishes.get(w.id);
    wishes.set(w.id, vorhanden?.status === "beantwortet" ? vorhanden : w);
  }
  return {
    version: Math.max(lokal.version ?? 0, remote.version ?? 0),
    favorites: uniq([...(remote.favorites ?? []), ...(lokal.favorites ?? [])]),
    wishlist: uniq([...(remote.wishlist ?? []), ...(lokal.wishlist ?? [])])
      .filter((id) => !(tombstones.wishlist ?? []).includes(id)),
    gehoert: uniq([...(remote.gehoert ?? []), ...(lokal.gehoert ?? [])]),
    wishes: [...wishes.values()],
  };
}
```

- [ ] **Step 4: Grün** — Run: `node --test tests/sync-merge.test.mjs` · Expected: PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: Offline-Merge für Sync-State"`

### Task 7: Daten-Schemaprüfung (`js/lib/daten-schema.js` + CLI)

**Files:**
- Create: `js/lib/daten-schema.js`, `tools/pruefe-daten.mjs`, Test: `tests/daten-schema.test.mjs`

**Interfaces:**
- Produces: `pruefeBuch(b):string[]` und `pruefeEmpfehlung(e):string[]` (leeres Array = gültig, sonst Fehlerliste) · CLI `node tools/pruefe-daten.mjs` prüft beide JSON-Dateien, Exit-Code 1 bei Fehlern. Wird von Task 15/17/20 als Gate benutzt.

- [ ] **Step 1: Failing Test schreiben**

`tests/daten-schema.test.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { pruefeBuch, pruefeEmpfehlung } from "../js/lib/daten-schema.js";

test("gültiges Buch → keine Fehler; kaputtes Buch → benannte Fehler", () => {
  const ok = { asin: "X1", titel: "T", autor: "A", sprecher: "S", serie: null, band: null, dauer_min: 60, genre: "Krimi", cover: "covers/X1.jpg", audible_url: "https://www.audible.de/pd/X1", hinzugefuegt: null };
  assert.deepEqual(pruefeBuch(ok), []);
  const fehler = pruefeBuch({ asin: "", titel: "T", dauer_min: "60" });
  assert.ok(fehler.some((f) => f.includes("asin")));
  assert.ok(fehler.some((f) => f.includes("dauer_min")));
  assert.ok(fehler.some((f) => f.includes("audible_url")));
});
test("Empfehlung: Regal und Tags werden geprüft", () => {
  const ok = { id: "r9", asin: null, titel: "T", autor: "A", sprecher: null, begruendung: "Weil.", tags: { genres: ["Krimi"], stimmung: ["spannend"], laenge: "kurz" }, aehnlich_wie: null, audible_url: "https://www.audible.de/pd/Y", regal: "geschmacks-match", aufgenommen_am: "2026-08-05" };
  assert.deepEqual(pruefeEmpfehlung(ok), []);
  assert.ok(pruefeEmpfehlung({ ...ok, regal: "quatsch" }).some((f) => f.includes("regal")));
  assert.ok(pruefeEmpfehlung({ ...ok, tags: { genres: [], stimmung: [], laenge: "riesig" } }).some((f) => f.includes("laenge")));
});
```

- [ ] **Step 2: Rot** — Run: `node --test tests/daten-schema.test.mjs` · Expected: FAIL.

- [ ] **Step 3: Implementierung**

`js/lib/daten-schema.js`:
```js
const REGALE = ["wunsch-antwort", "serien-fortsetzung", "lieblingsautor", "geschmacks-match"];
const LAENGEN = ["kurz", "mittel", "episch"];
const istText = (w) => typeof w === "string" && w.length > 0;
const istUrl = (w) => istText(w) && w.startsWith("https://www.audible.de/");

export function pruefeBuch(b) {
  const fehler = [];
  if (!istText(b.asin)) fehler.push("asin fehlt/leer");
  if (!istText(b.titel)) fehler.push("titel fehlt/leer");
  if (!istText(b.autor)) fehler.push("autor fehlt/leer");
  if (typeof b.dauer_min !== "number" || b.dauer_min <= 0) fehler.push("dauer_min muss Zahl > 0 sein");
  if (!istText(b.genre)) fehler.push("genre fehlt/leer");
  if (!istUrl(b.audible_url)) fehler.push("audible_url muss mit https://www.audible.de/ beginnen");
  return fehler;
}

export function pruefeEmpfehlung(e) {
  const fehler = [];
  if (!istText(e.id)) fehler.push("id fehlt/leer");
  if (!istText(e.titel)) fehler.push("titel fehlt/leer");
  if (!istText(e.begruendung)) fehler.push("begruendung fehlt/leer");
  if (!istUrl(e.audible_url)) fehler.push("audible_url muss mit https://www.audible.de/ beginnen");
  if (!REGALE.includes(e.regal)) fehler.push(`regal muss eins sein von: ${REGALE.join(", ")}`);
  if (!Array.isArray(e.tags?.genres)) fehler.push("tags.genres fehlt");
  if (!Array.isArray(e.tags?.stimmung)) fehler.push("tags.stimmung fehlt");
  if (!LAENGEN.includes(e.tags?.laenge)) fehler.push(`tags.laenge muss eins sein von: ${LAENGEN.join(", ")}`);
  return fehler;
}
```

`tools/pruefe-daten.mjs`:
```js
import { readFileSync } from "node:fs";
import { pruefeBuch, pruefeEmpfehlung } from "../js/lib/daten-schema.js";

let fehlerGesamt = 0;
const melde = (datei, index, fehler) => {
  for (const f of fehler) { console.error(`${datei}[${index}]: ${f}`); fehlerGesamt++; }
};
const lib = JSON.parse(readFileSync("data/library.json", "utf8"));
lib.forEach((b, i) => melde("library", i, pruefeBuch(b)));
const doppelte = lib.map((b) => b.asin).filter((a, i, arr) => arr.indexOf(a) !== i);
if (doppelte.length) { console.error(`library: doppelte ASINs: ${doppelte.join(", ")}`); fehlerGesamt++; }
const recs = JSON.parse(readFileSync("data/recommendations.json", "utf8"));
recs.forEach((e, i) => melde("recommendations", i, pruefeEmpfehlung(e)));
console.log(fehlerGesamt === 0 ? `OK: ${lib.length} Bücher, ${recs.length} Empfehlungen` : `${fehlerGesamt} Fehler`);
process.exit(fehlerGesamt === 0 ? 0 : 1);
```

- [ ] **Step 4: Grün + CLI-Probe** — Run: `node --test tests/daten-schema.test.mjs && node tools/pruefe-daten.mjs`
Expected: Tests PASS; CLI meldet `OK: 6 Bücher, 4 Empfehlungen`, Exit 0.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: Schema-Prüfung für Datenpflege und Läufe"`

---

## Phase 2 — UI (gegen Fixture-Daten)

> UI-Tasks werden im Browser verifiziert: lokalen Server starten (`.claude/launch.json`-Eintrag
> `{"name":"hoerbuch","runtimeExecutable":"npx","runtimeArgs":["serve","-l","4173","."],"port":4173}`,
> dann preview_start "hoerbuch"). Mobil = 375 px, Desktop = 1280 px, beide Farbschemata.

### Task 8: App-Shell + Design-System (`index.html`, `app.css`, `js/app.js`)

**Files:**
- Create: `index.html`, `app.css`, `js/app.js`, `js/config.js`

**Interfaces:**
- Produces: DOM-Anker `#kopf-zahlen`, `#malwieder`, `#bibliothek`, `#entdecken`, `#wunschliste-statistik` (je `<section>`), globales `App`-Objekt aus `js/app.js`: `{ daten: {library, recommendations, meta}, zustand: State, speichern():void, istFavorit(asin):bool, toggleFavorit(asin):void }` — `speichern()` ist in Task 8 nur localStorage (`hb:state`), Task 14 erweitert um Worker-Sync. `js/config.js` exportiert `WORKER_URL` (Task 8: leerer String).
- Consumes: `LEERER_STATE` (Task 6), Fixture-Daten (Task 1), `formatiereDauer`/`berechneStatistik` (Task 4), `malWiederHeute` (Task 5).

- [ ] **Step 1: Grundgerüst schreiben**

`js/config.js`:
```js
export const WORKER_URL = ""; // Task 13 trägt die echte Worker-URL ein
```

`index.html` (vollständig):
```html
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#171310">
  <title>Hörbuch-Cockpit</title>
  <link rel="stylesheet" href="app.css">
</head>
<body>
  <header class="kopf">
    <p class="gruss">Schön, dass du da bist —<br><strong>deine Hörbuchwelt wartet.</strong></p>
    <div id="kopf-zahlen" class="kennzahlen"></div>
    <p id="stand" class="stand"></p>
    <nav class="springe">
      <a href="#bibliothek">Bibliothek</a>
      <a href="#entdecken">Entdecken</a>
      <a href="#wunschliste-statistik">Merkliste &amp; Zahlen</a>
    </nav>
  </header>
  <main>
    <section id="malwieder" aria-label="Mal wieder hören"></section>
    <section id="bibliothek" aria-label="Deine Bibliothek"></section>
    <section id="entdecken" aria-label="Neues entdecken"></section>
    <section id="wunschliste-statistik" aria-label="Merkliste und Statistik"></section>
  </main>
  <footer class="fuss"><span id="sync-status"></span></footer>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

`js/app.js`:
```js
import { LEERER_STATE } from "./lib/sync-merge.js";
import { berechneStatistik, formatiereDauer } from "./lib/statistik.js";
import { malWiederHeute } from "./lib/heute.js";

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
         <img src="${buch.cover}" alt="" loading="lazy" onerror="this.remove()">
         <div><p class="etikett">Lange nicht gehört</p>
         <h2>Zeit für „${buch.titel}“?</h2>
         <p class="gedaempft">${buch.autor} · gelesen von ${buch.sprecher}</p></div>
       </article>`
    : `<article class="malwieder-karte leer"><p class="etikett">Mal wieder hören</p>
       <p>Markiere unten deine Lieblinge mit ♥ — dann schlage ich dir hier täglich einen vor.</p></article>`;
}

async function start() {
  try { App.zustand = { ...structuredClone(LEERER_STATE), ...JSON.parse(localStorage.getItem("hb:state")) }; } catch {}
  const [library, recommendations, meta] = await Promise.all([
    ladeJson("data/library.json"), ladeJson("data/recommendations.json"), ladeJson("data/meta.json"),
  ]);
  App.daten = { library, recommendations, meta };
  zeigeKopf();
  zeigeMalWieder();
  document.addEventListener("zustand-geaendert", () => { zeigeKopf(); zeigeMalWieder(); });
  document.dispatchEvent(new CustomEvent("daten-bereit"));
}
start();
```

`app.css` — Design-Tokens + Grundlayout (vollständig übernehmen):
```css
:root {
  --bg: #171310; --flaeche: #211c17; --karte: #2a231d; --linie: #3a3128;
  --text: #f2ece4; --gedaempft: #a89a8a; --akzent: #f8991c; --akzent-kontrast: #1a1207;
  --radius: 14px; --schatten: 0 8px 28px rgb(0 0 0 / .35);
  --serif: Georgia, "Times New Roman", serif;
  --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
@media (prefers-color-scheme: light) {
  :root {
    --bg: #faf6f0; --flaeche: #f1eae0; --karte: #ffffff; --linie: #e2d8ca;
    --text: #2b2118; --gedaempft: #7d6f5f; --schatten: 0 8px 24px rgb(80 60 30 / .12);
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.55 var(--sans); }
h1, h2, h3, .gruss { font-family: var(--serif); letter-spacing: .01em; }
main, .kopf { max-width: 1080px; margin: 0 auto; padding: 0 16px; }
section { margin: 28px 0 40px; }
a { color: var(--akzent); }

.kopf { padding-top: 28px; }
.gruss { font-size: 1.5rem; margin: 0 0 18px; }
.kennzahlen { display: flex; gap: 10px; flex-wrap: wrap; }
.zahl { background: var(--flaeche); border: 1px solid var(--linie); border-radius: var(--radius);
  padding: 10px 16px; display: grid; }
.zahl strong { font-size: 1.15rem; }
.zahl span { color: var(--gedaempft); font-size: .8rem; }
.stand { color: var(--gedaempft); font-size: .8rem; }
.springe { display: flex; gap: 14px; border-bottom: 1px solid var(--linie); padding-bottom: 12px;
  position: sticky; top: 0; background: var(--bg); z-index: 5; }
.springe a { text-decoration: none; font-weight: 600; }

.malwieder-karte { display: flex; gap: 16px; align-items: center; background:
  linear-gradient(120deg, var(--karte), var(--flaeche)); border: 1px solid var(--linie);
  border-radius: var(--radius); padding: 16px; box-shadow: var(--schatten); }
.malwieder-karte img { width: 84px; border-radius: 8px; }
.etikett { color: var(--akzent); text-transform: uppercase; font-size: .72rem;
  letter-spacing: .12em; margin: 0 0 4px; font-weight: 700; }
.gedaempft { color: var(--gedaempft); }
.fuss { text-align: center; color: var(--gedaempft); font-size: .8rem; padding: 24px; }

button { font: inherit; cursor: pointer; border-radius: 999px; border: 1px solid var(--linie);
  background: var(--flaeche); color: var(--text); padding: 8px 14px; min-height: 40px; }
button.primaer { background: var(--akzent); border-color: var(--akzent); color: var(--akzent-kontrast); font-weight: 700; }
input, textarea { font: inherit; background: var(--karte); color: var(--text);
  border: 1px solid var(--linie); border-radius: 10px; padding: 10px 12px; width: 100%; }
```

- [ ] **Step 2: Browser-Verifikation** — Server starten, Seite öffnen.
Prüfen (Screenshot mobil 375 px + Desktop, hell + dunkel): Begrüßung ohne Namen, drei Kennzahlen aus Fixtures (6 Hörbücher), Stand-Zeile, „Mal wieder"-Leerzustand (noch keine Favoriten), keine Konsolen-Fehler, kein horizontales Scrollen.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: App-Shell mit Design-System und Tages-Favorit"`

### Task 9: Komponenten + Bibliothek (`js/ui/komponenten.js`, `js/ui/bibliothek.js`)

**Files:**
- Create: `js/ui/komponenten.js`, `js/ui/bibliothek.js`
- Modify: `js/app.js` (Import + Aufruf nach „daten-bereit"), `app.css` (Anhang unten)

**Interfaces:**
- Consumes: `App` (Task 8), `sucheBuecher` (Task 2), `filterBibliothek` (Task 3).
- Produces: `komponenten.js`: `buchKarte(buch, {favorit:bool}):HTMLElement` (Cover mit `onerror`-Platzhalter, Herz-Button `data-asin`), `chipLeiste(werte:string[], aktiv:string|null, beiKlick):HTMLElement`, `oeffneModal(inhalt:HTMLElement):void`, `platzhalterStil(titel):string` (deterministischer `hsl()`-Verlauf aus Titel-Hash) · `bibliothek.js`: `initBibliothek(App):void` rendert in `#bibliothek`.

- [ ] **Step 1: Implementierung**

`js/ui/komponenten.js`:
```js
export function platzhalterStil(titel) {
  let h = 0;
  for (const z of titel) h = (h * 31 + z.charCodeAt(0)) >>> 0;
  const ton = h % 360;
  return `background:linear-gradient(160deg,hsl(${ton} 42% 34%),hsl(${(ton + 40) % 360} 48% 22%))`;
}

export function buchKarte(buch, { favorit = false } = {}) {
  const el = document.createElement("article");
  el.className = "buch";
  el.innerHTML = `
    <div class="cover" style="${platzhalterStil(buch.titel)}">
      <img src="${buch.cover}" alt="" loading="lazy">
      <span class="cover-titel">${buch.titel}</span>
      <button class="herz" data-asin="${buch.asin}" aria-label="Als Liebling markieren"
        aria-pressed="${favorit}">${favorit ? "♥" : "♡"}</button>
    </div>
    <h3>${buch.titel}</h3>
    <p class="gedaempft">${buch.autor}</p>`;
  el.querySelector("img").addEventListener("error", (e) => e.target.remove());
  return el;
}

export function chipLeiste(werte, aktiv, beiKlick) {
  const leiste = document.createElement("div");
  leiste.className = "chips";
  for (const wert of werte) {
    const chip = document.createElement("button");
    chip.className = "chip" + (wert === aktiv ? " aktiv" : "");
    chip.textContent = wert;
    chip.addEventListener("click", () => beiKlick(wert === aktiv ? null : wert));
    leiste.append(chip);
  }
  return leiste;
}

export function oeffneModal(inhalt) {
  const dialog = document.createElement("dialog");
  dialog.className = "modal";
  dialog.append(inhalt);
  const schliessen = document.createElement("button");
  schliessen.textContent = "Schließen";
  schliessen.className = "modal-zu";
  schliessen.addEventListener("click", () => dialog.close());
  dialog.append(schliessen);
  dialog.addEventListener("close", () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}
```

`js/ui/bibliothek.js`:
```js
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
```

In `js/app.js` ergänzen (nach den bestehenden Imports und in `start()` nach `dispatchEvent("daten-bereit")` — Import oben, Aufruf direkt davor):
```js
import { initBibliothek } from "./ui/bibliothek.js";
// … in start(), vor dem "daten-bereit"-Event:
initBibliothek(App);
```

An `app.css` anhängen:
```css
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 16px; }
.buch { cursor: pointer; }
.buch h3 { font-size: .92rem; margin: 8px 0 0; font-family: var(--sans); }
.cover { position: relative; aspect-ratio: 1; border-radius: 10px; overflow: hidden; box-shadow: var(--schatten); }
.cover img { width: 100%; height: 100%; object-fit: cover; display: block; position: relative; z-index: 1; }
.cover-titel { position: absolute; inset: 10px; font-size: .8rem; color: #fff; font-family: var(--serif); }
.herz { position: absolute; right: 6px; bottom: 6px; z-index: 2; min-height: 34px; padding: 4px 10px;
  background: rgb(0 0 0 / .55); border: none; color: #fff; font-size: 1.05rem; }
.herz[aria-pressed="true"] { color: var(--akzent); }
.chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
.chip.aktiv { background: var(--akzent); color: var(--akzent-kontrast); border-color: var(--akzent); font-weight: 700; }
.werkzeuge { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin: 8px 0; }
.modal { border: 1px solid var(--linie); border-radius: var(--radius); background: var(--karte);
  color: var(--text); padding: 22px; max-width: min(92vw, 460px); }
.modal::backdrop { background: rgb(0 0 0 / .6); }
.modal-zu { margin-top: 14px; }
.knopf-link { display: inline-block; background: var(--akzent); color: var(--akzent-kontrast);
  border-radius: 999px; padding: 10px 16px; text-decoration: none; font-weight: 700; margin-top: 10px; }
select { font: inherit; background: var(--karte); color: var(--text); border: 1px solid var(--linie);
  border-radius: 10px; padding: 8px; }
```

- [ ] **Step 2: Browser-Verifikation** — Suche „mara" → 3 Treffer; Suche „nebelkrune" (Tippfehler) → Nebelkrone-Bände; Genre-Chip „Krimi" → 2; Serien-Chip „Nebelkrone" → 2; Herz bei zwei Büchern setzen → Kopf-Kennzahl „Lieblinge" springt auf 2, „Mal wieder"-Karte erscheint; Reload → Herzen bleiben (localStorage); Detail-Modal öffnet, Audible-Link zeigt auf Fixture-URL; Cover fehlen (Fixtures) → Platzhalter-Verläufe mit Titeltext sichtbar. Mobil + Desktop, hell + dunkel.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: Bibliothek mit Suche, Filtern, Herzen und Detailkarte"`

### Task 10: Entdecken — Regale, Finder, Wünsch dir was (`js/ui/entdecken.js`)

**Files:**
- Create: `js/ui/entdecken.js`
- Modify: `js/app.js` (Import + `initEntdecken(App)` direkt nach `initBibliothek(App)`), `app.css` (Anhang)

**Interfaces:**
- Consumes: `App`, `filterEmpfehlungen` (Task 3), `chipLeiste`, `platzhalterStil` (Task 9).
- Produces: `initEntdecken(App):void` rendert in `#entdecken`. Wunschlisten-Mutationen: `App.zustand.wishlist` push/splice + `App.speichern()`; „Kenn ich schon" → `App.zustand.gehoert` push; Wunsch-Absenden → `App.zustand.wishes.push({id: crypto.randomUUID(), text, datum: heute-ISO, status: "offen"})`.

- [ ] **Step 1: Implementierung**

`js/ui/entdecken.js`:
```js
import { filterEmpfehlungen } from "../lib/filter.js";
import { chipLeiste, platzhalterStil } from "./komponenten.js";

const REGAL_TITEL = {
  "wunsch-antwort": "Deine Wünsche — beantwortet",
  "serien-fortsetzung": "Fortsetzungen deiner Serien",
  "lieblingsautor": "Neues von deinen Autoren & Sprechern",
  "geschmacks-match": "Das trifft deinen Geschmack",
};
const STIMMUNGEN = ["spannend", "herzerwärmend", "witzig", "düster", "entspannend"];
const LAENGEN = { kurz: "Kurz (< 8 Std.)", mittel: "Mittel", episch: "Episch (> 20 Std.)" };
const filterUi = { stimmung: null, genre: null, laenge: null, aehnlichWie: null };

export function initEntdecken(App) {
  const wurzel = document.getElementById("entdecken");
  wurzel.innerHTML = `
    <h2>Neues entdecken</h2>
    <div id="regale"></div>
    <h3>Finde dein nächstes Hörbuch</h3>
    <p class="gedaempft">Wähle, wonach dir gerade ist:</p>
    <div id="finder-filter"></div>
    <div id="finder-treffer" class="empf-liste"></div>
    <div class="wunschbox">
      <h3>Wünsch dir was</h3>
      <p class="gedaempft">Sag mir, was dir fehlt — beim nächsten Lauf bekommst du passende Vorschläge.</p>
      <textarea id="wunsch-text" rows="2" placeholder="z.B. „mehr Küstenkrimis“ oder „etwas wie die Nebelkrone, aber kürzer“"></textarea>
      <button id="wunsch-senden" class="primaer">Frische Vorschläge anfordern</button>
      <ul id="wunsch-liste"></ul>
    </div>`;
  document.addEventListener("zustand-geaendert", () => zeichne(App));
  wurzel.querySelector("#wunsch-senden").addEventListener("click", () => {
    const feld = wurzel.querySelector("#wunsch-text");
    const text = feld.value.trim() || "Überrasch mich mit frischen Vorschlägen!";
    App.zustand.wishes.push({ id: crypto.randomUUID(), text, datum: new Date().toISOString().slice(0, 10), status: "offen" });
    feld.value = "";
    App.speichern();
  });
  zeichne(App);
}

function empfKarte(App, e) {
  const inWunschliste = App.zustand.wishlist.includes(e.id);
  const el = document.createElement("article");
  el.className = "empf";
  el.innerHTML = `
    <div class="empf-cover" style="${platzhalterStil(e.titel)}"><span>${e.titel}</span></div>
    <div class="empf-text">
      <h4>${e.titel}</h4>
      <p class="gedaempft">${e.autor}${e.sprecher ? ` · ${e.sprecher}` : ""}</p>
      <p class="begruendung">${e.begruendung}</p>
      <div class="empf-aktionen">
        <button class="merken" aria-pressed="${inWunschliste}">${inWunschliste ? "✓ Gemerkt" : "+ Merken"}</button>
        <button class="kenne">Kenn ich schon</button>
        <a href="${e.audible_url}" target="_blank" rel="noopener">Bei Audible ↗</a>
      </div>
    </div>`;
  el.querySelector(".merken").addEventListener("click", () => {
    const i = App.zustand.wishlist.indexOf(e.id);
    if (i >= 0) App.zustand.wishlist.splice(i, 1); else App.zustand.wishlist.push(e.id);
    App.speichern();
  });
  el.querySelector(".kenne").addEventListener("click", () => {
    if (!App.zustand.gehoert.includes(e.id)) App.zustand.gehoert.push(e.id);
    App.speichern();
  });
  return el;
}

function zeichne(App) {
  const pool = filterEmpfehlungen(App.daten.recommendations, {}, App.zustand.gehoert);
  const regale = document.getElementById("regale");
  regale.replaceChildren();
  for (const regal of Object.keys(REGAL_TITEL)) {
    const eintraege = pool.filter((e) => e.regal === regal);
    if (!eintraege.length) continue;
    const h = document.createElement("h3");
    h.textContent = REGAL_TITEL[regal];
    const liste = document.createElement("div");
    liste.className = "empf-liste";
    liste.append(...eintraege.map((e) => empfKarte(App, e)));
    regale.append(h, liste);
  }

  const filterZiel = document.getElementById("finder-filter");
  filterZiel.replaceChildren();
  filterZiel.append(chipLeiste(STIMMUNGEN, filterUi.stimmung, (w) => { filterUi.stimmung = w; zeichne(App); }));
  const genres = [...new Set(App.daten.recommendations.flatMap((e) => e.tags.genres))].sort();
  filterZiel.append(chipLeiste(genres, filterUi.genre, (w) => { filterUi.genre = w; zeichne(App); }));
  filterZiel.append(chipLeiste(Object.keys(LAENGEN), filterUi.laenge, (w) => { filterUi.laenge = w; zeichne(App); }));
  const favTitel = App.zustand.favorites
    .map((asin) => App.daten.library.find((b) => b.asin === asin)).filter(Boolean);
  if (favTitel.length) {
    const p = document.createElement("p");
    p.className = "gedaempft";
    p.textContent = "… oder ähnlich wie einer deiner Lieblinge:";
    filterZiel.append(p, chipLeiste(favTitel.map((b) => b.titel), 
      favTitel.find((b) => b.asin === filterUi.aehnlichWie)?.titel ?? null,
      (titel) => { filterUi.aehnlichWie = favTitel.find((b) => b.titel === titel)?.asin ?? null; zeichne(App); }));
  }

  const referenz = App.daten.library.find((b) => b.asin === filterUi.aehnlichWie);
  const treffer = filterEmpfehlungen(pool, { ...filterUi, aehnlichWieGenre: referenz?.genre }, []);
  const ziel = document.getElementById("finder-treffer");
  const aktiv = filterUi.stimmung || filterUi.genre || filterUi.laenge || filterUi.aehnlichWie;
  ziel.replaceChildren(...(aktiv ? treffer.map((e) => empfKarte(App, e)) : []));
  if (aktiv && !treffer.length) ziel.innerHTML = `<p class="gedaempft">Dafür habe ich gerade nichts Passendes — wünsch es dir unten, dann suche ich beim nächsten Lauf danach!</p>`;

  const wunschListe = document.getElementById("wunsch-liste");
  wunschListe.replaceChildren(...App.zustand.wishes.map((w) => {
    const li = document.createElement("li");
    li.innerHTML = `„${w.text}“ — <span class="${w.status}">${w.status === "offen" ? "wird beim nächsten Lauf beantwortet" : "beantwortet ✓"}</span>`;
    return li;
  }));
}
```

An `app.css` anhängen:
```css
.empf-liste { display: grid; gap: 14px; margin: 12px 0 22px; }
.empf { display: flex; gap: 14px; background: var(--karte); border: 1px solid var(--linie);
  border-radius: var(--radius); padding: 14px; }
.empf-cover { flex: 0 0 84px; aspect-ratio: 1; border-radius: 8px; padding: 8px;
  font-size: .72rem; color: #fff; font-family: var(--serif); overflow: hidden; }
.empf h4 { margin: 0; }
.begruendung { margin: 6px 0; font-style: italic; }
.empf-aktionen { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.merken[aria-pressed="true"] { background: var(--akzent); color: var(--akzent-kontrast); border-color: var(--akzent); }
.wunschbox { background: var(--flaeche); border: 1px solid var(--linie); border-radius: var(--radius);
  padding: 18px; margin-top: 26px; display: grid; gap: 10px; }
#wunsch-liste { margin: 0; padding-left: 18px; }
#wunsch-liste .offen { color: var(--gedaempft); }
#wunsch-liste .beantwortet { color: var(--akzent); }
@media (min-width: 760px) { .empf-liste { grid-template-columns: 1fr 1fr; } }
```

- [ ] **Step 2: Browser-Verifikation** — Alle 4 Fixture-Regale sichtbar; Stimmungs-Chip „herzerwärmend" → r2 + r4; Länge „kurz" dazu → nur r4; „Kenn ich schon" bei r3 → verschwindet überall; „+ Merken" bei r1 → Knopf wird „✓ Gemerkt"; Wunsch absenden → erscheint mit Status „wird beim nächsten Lauf beantwortet"; Reload → alles noch da. Leerer-Treffer-Hinweis erscheint bei unmöglicher Kombination.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: Entdecken mit Regalen, Finder und Wünsch-dir-was"`

### Task 11: Wunschliste + Statistik (`js/ui/wunschliste.js`)

**Files:**
- Create: `js/ui/wunschliste.js`
- Modify: `js/app.js` (Import + `initWunschliste(App)` nach `initEntdecken`), `app.css` (Anhang)

**Interfaces:**
- Consumes: `App`, `berechneStatistik`/`formatiereDauer` (Task 4), `platzhalterStil` (Task 9).
- Produces: `initWunschliste(App):void` rendert Merkliste + Statistiken in `#wunschliste-statistik`. Donut als Inline-SVG (`stroke-dasharray`-Technik), Balken als DIV-Breiten in %.

**WICHTIG bei Ausführung:** Vor dem Schreiben des Chart-Codes den `dataviz`-Skill laden und dessen Farb-/Formregeln auf Donut + Balken anwenden (Kategorienfarben aus dessen Palette, Beschriftung direkt statt Legende wo möglich).

- [ ] **Step 1: Implementierung**

`js/ui/wunschliste.js`:
```js
import { berechneStatistik, formatiereDauer } from "../lib/statistik.js";
import { platzhalterStil } from "./komponenten.js";

export function initWunschliste(App) {
  document.addEventListener("zustand-geaendert", () => zeichne(App));
  zeichne(App);
}

function zeichne(App) {
  const wurzel = document.getElementById("wunschliste-statistik");
  const gemerkt = App.zustand.wishlist
    .map((id) => App.daten.recommendations.find((e) => e.id === id)).filter(Boolean);
  const inBibliothek = new Set(App.daten.library.map((b) => b.asin));

  const s = berechneStatistik(App.daten.library);
  wurzel.innerHTML = `
    <h2>Deine Merkliste</h2>
    <div id="merkliste">${gemerkt.length ? "" : `<p class="gedaempft">Noch leer — merke dir oben Empfehlungen mit „+ Merken“.</p>`}</div>
    <h2>Deine Hörwelt in Zahlen</h2>
    <div class="statistik">
      <div class="stat-karte"><h3>Genres</h3><div id="genre-donut"></div></div>
      <div class="stat-karte"><h3>Top-Autoren</h3><div id="top-autoren"></div></div>
      <div class="stat-karte"><h3>Top-Sprecher</h3><div id="top-sprecher"></div></div>
      <div class="stat-karte"><h3>Rekorde</h3>
        <p>Längstes: <strong>${s.laengstes?.titel ?? "–"}</strong> <span class="gedaempft">(${s.laengstes ? formatiereDauer(s.laengstes.dauer_min) : ""})</span></p>
        <p>Kürzestes: <strong>${s.kuerzestes?.titel ?? "–"}</strong> <span class="gedaempft">(${s.kuerzestes ? formatiereDauer(s.kuerzestes.dauer_min) : ""})</span></p>
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
      ${gekauft ? `<p class="etikett">🎉 Ist inzwischen in deiner Bibliothek!</p>` : ""}</div>
      <div class="merk-aktionen">
        <a href="${e.audible_url}" target="_blank" rel="noopener">Audible ↗</a>
        <button class="entfernen" aria-label="Von Merkliste entfernen">✕</button>
      </div>`;
    el.querySelector(".entfernen").addEventListener("click", () => {
      App.zustand.wishlist = App.zustand.wishlist.filter((id) => id !== e.id);
      merkeTombstone(e.id);
      App.speichern();
    });
    merkZiel.append(el);
  }

  zeichneDonut(wurzel.querySelector("#genre-donut"), s.genres);
  zeichneBalken(wurzel.querySelector("#top-autoren"), s.topAutoren);
  zeichneBalken(wurzel.querySelector("#top-sprecher"), s.topSprecher);
}

function merkeTombstone(id) {
  try {
    const t = JSON.parse(localStorage.getItem("hb:tombstones") ?? '{"wishlist":[]}');
    if (!t.wishlist.includes(id)) t.wishlist.push(id);
    localStorage.setItem("hb:tombstones", JSON.stringify(t));
  } catch {}
}

const FARBEN = ["#f8991c", "#7fb069", "#5b8dbe", "#c76fa0", "#8a7f9e", "#b0876a"];

function zeichneDonut(ziel, genres) {
  const summe = genres.reduce((s, g) => s + g.anzahl, 0) || 1;
  const umfang = 2 * Math.PI * 42;
  let offset = 0;
  const ringe = genres.slice(0, 6).map((g, i) => {
    const anteil = g.anzahl / summe;
    const strich = `stroke-dasharray="${anteil * umfang} ${umfang}" stroke-dashoffset="${-offset * umfang}"`;
    offset += anteil;
    return `<circle r="42" cx="60" cy="60" fill="none" stroke="${FARBEN[i % FARBEN.length]}" stroke-width="20" ${strich} transform="rotate(-90 60 60)"/>`;
  }).join("");
  ziel.innerHTML = `<div class="donut-zeile"><svg viewBox="0 0 120 120" role="img" aria-label="Genre-Verteilung">${ringe}</svg>
    <ul class="donut-legende">${genres.slice(0, 6).map((g, i) =>
      `<li><span class="punkt" style="background:${FARBEN[i % FARBEN.length]}"></span>${g.name} <span class="gedaempft">(${g.anzahl})</span></li>`).join("")}</ul></div>`;
}

function zeichneBalken(ziel, eintraege) {
  const max = eintraege[0]?.anzahl || 1;
  ziel.innerHTML = eintraege.map((e) =>
    `<div class="balken-zeile"><span class="balken-name">${e.name}</span>
     <div class="balken"><div style="width:${(e.anzahl / max) * 100}%"></div></div>
     <span class="gedaempft">${e.anzahl}</span></div>`).join("");
}
```

An `app.css` anhängen:
```css
.statistik { display: grid; gap: 14px; }
@media (min-width: 760px) { .statistik { grid-template-columns: 1fr 1fr; } }
.stat-karte { background: var(--karte); border: 1px solid var(--linie); border-radius: var(--radius); padding: 16px; }
.stat-karte h3 { margin-top: 0; }
.donut-zeile { display: flex; gap: 16px; align-items: center; }
.donut-zeile svg { width: 120px; flex: 0 0 auto; }
.donut-legende { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; font-size: .88rem; }
.punkt { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
.balken-zeile { display: grid; grid-template-columns: minmax(90px, 40%) 1fr auto; gap: 8px; align-items: center; margin: 6px 0; font-size: .88rem; }
.balken-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.balken { background: var(--flaeche); border-radius: 999px; height: 10px; overflow: hidden; }
.balken > div { background: var(--akzent); height: 100%; border-radius: 999px; }
.merk-eintrag { display: flex; gap: 12px; align-items: center; background: var(--karte);
  border: 1px solid var(--linie); border-radius: var(--radius); padding: 12px; margin-bottom: 10px; }
.empf-cover.klein { flex: 0 0 56px; font-size: .6rem; }
.merk-aktionen { margin-left: auto; display: flex; gap: 10px; align-items: center; }
```

- [ ] **Step 2: Browser-Verifikation** — Merkliste zeigt in Task 10 gemerkte Titel, ✕ entfernt (und Reload hält es entfernt); Donut zeigt Fantasy 3 / Krimi 2 / Liebesroman 1; Balken Top-Autoren führt Mara Winter (3) und Jonas Reht (2); Rekorde: Längstes „Das Archiv der Träume". Beide Themes prüfen (Donut-Farben auf beiden lesbar).

- [ ] **Step 3: Alle Tests grün** — Run: `node --test tests/` · Expected: PASS komplett.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: Merkliste und Statistiken mit Donut und Balken"`

---

## Phase 3 — Sync (Cloudflare Worker + Client)

### Task 12: Worker-Handler (TDD) + Wrangler-Konfiguration

**Files:**
- Create: `worker/handler.js`, `worker/worker.js`, `worker/wrangler.toml`, Test: `tests/handler.test.mjs`

**Interfaces:**
- Produces: `behandle(request:Request, umgebung:{PIN:string, KV:{get,put}}):Promise<Response>` — Routen: `OPTIONS *` → 204+CORS · `GET /state` → State-JSON (Default `LEERER_STATE`) · `PUT /state` → validiert PIN (Header `X-Pin`), Größe ≤ 100 000 Zeichen, JSON mit `favorites`-Array; Antworten immer mit CORS-Headern (`Access-Control-Allow-Origin: *`, Methoden GET/PUT/OPTIONS, Header Content-Type/X-Pin).

- [ ] **Step 1: Failing Test schreiben**

`tests/handler.test.mjs`:
```js
import test from "node:test";
import assert from "node:assert/strict";
import { behandle } from "../worker/handler.js";

function umgebung() {
  const speicher = new Map();
  return { PIN: "123456", KV: { get: async (k) => speicher.get(k) ?? null, put: async (k, v) => speicher.set(k, v) } };
}
const anfrage = (methode, pin, body) =>
  new Request("https://w.example/state", { method: methode, headers: pin ? { "X-Pin": pin } : {}, body, duplex: "half" });

test("OPTIONS liefert 204 mit CORS", async () => {
  const r = await behandle(new Request("https://w.example/state", { method: "OPTIONS" }), umgebung());
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), "*");
});
test("falscher PIN → 401; unbekannter Pfad → 404", async () => {
  assert.equal((await behandle(anfrage("GET", "999999"), umgebung())).status, 401);
  const r = await behandle(new Request("https://w.example/quatsch", { method: "GET", headers: { "X-Pin": "123456" } }), umgebung());
  assert.equal(r.status, 404);
});
test("GET ohne Daten liefert leeren State", async () => {
  const r = await behandle(anfrage("GET", "123456"), umgebung());
  assert.deepEqual((await r.json()).favorites, []);
});
test("PUT speichert, GET liest zurück; kaputtes JSON → 400; zu groß → 413", async () => {
  const env = umgebung();
  const state = JSON.stringify({ version: 1, favorites: ["A"], wishlist: [], gehoert: [], wishes: [] });
  assert.equal((await behandle(anfrage("PUT", "123456", state), env)).status, 200);
  assert.deepEqual((await (await behandle(anfrage("GET", "123456"), env)).json()).favorites, ["A"]);
  assert.equal((await behandle(anfrage("PUT", "123456", "{kaputt"), env)).status, 400);
  assert.equal((await behandle(anfrage("PUT", "123456", `{"favorites":["${"x".repeat(100001)}"]}`), env)).status, 413);
});
```

- [ ] **Step 2: Rot** — Run: `node --test tests/handler.test.mjs` · Expected: FAIL.

- [ ] **Step 3: Implementierung**

`worker/handler.js`:
```js
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Pin",
};
const LEERER_STATE = { version: 0, favorites: [], wishlist: [], gehoert: [], wishes: [] };
const json = (objekt, status) =>
  new Response(JSON.stringify(objekt), { status, headers: { "Content-Type": "application/json", ...CORS } });

export async function behandle(request, umgebung) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (new URL(request.url).pathname !== "/state") return json({ fehler: "unbekannter Pfad" }, 404);
  if (request.headers.get("X-Pin") !== umgebung.PIN) return json({ fehler: "PIN falsch" }, 401);
  if (request.method === "GET") {
    const roh = await umgebung.KV.get("state");
    return json(roh ? JSON.parse(roh) : LEERER_STATE, 200);
  }
  if (request.method === "PUT") {
    const text = await request.text();
    if (text.length > 100_000) return json({ fehler: "State zu groß" }, 413);
    let daten;
    try { daten = JSON.parse(text); } catch { return json({ fehler: "kein gültiges JSON" }, 400); }
    if (!Array.isArray(daten.favorites)) return json({ fehler: "favorites fehlt" }, 422);
    await umgebung.KV.put("state", JSON.stringify(daten));
    return json({ ok: true }, 200);
  }
  return json({ fehler: "Methode nicht erlaubt" }, 405);
}
```

`worker/worker.js`:
```js
import { behandle } from "./handler.js";
export default { fetch: (request, umgebung) => behandle(request, umgebung) };
```

`worker/wrangler.toml`:
```toml
name = "hoerbuch-sync"
main = "worker.js"
compatibility_date = "2026-08-01"

[[kv_namespaces]]
binding = "KV"
id = "WIRD-IN-TASK-13-EINGETRAGEN"
```

- [ ] **Step 4: Grün** — Run: `node --test tests/handler.test.mjs` · Expected: PASS (4 Tests). (413-Test: Header-typische Request-Limits gelten in Node nicht — läuft.)

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: Cloudflare-Worker-Handler mit PIN-Schutz"`

### Task 13: Worker-Deploy + PIN (interaktiv, User evtl. nötig)

**Files:**
- Modify: `worker/wrangler.toml` (KV-id), `js/config.js` (WORKER_URL)
- Create (außerhalb Repo): `F:\Projekte\audible-dashboard-privat\pin.txt`

**Interfaces:**
- Produces: Live-Worker-URL in `js/config.js` als `WORKER_URL`; PIN-Datei für Task 20; Worker-Secret `PIN` gesetzt.

- [ ] **Step 1: Wrangler-Login prüfen** — Run: `npx wrangler@latest whoami`
Falls nicht eingeloggt: User bitten, `npx wrangler login` im Terminal auszuführen (Browser-OAuth) — STOPP bis erledigt. (Kein Cloudflare-Konto? User legt eines unter dash.cloudflare.com an — gratis.)

- [ ] **Step 2: KV-Namespace anlegen** — Run: `cd worker && npx wrangler@latest kv namespace create KV`
Die ausgegebene `id` in `wrangler.toml` eintragen.

- [ ] **Step 3: PIN erzeugen + hinterlegen**

```powershell
$pin = -join (1..6 | ForEach-Object { Get-Random -Maximum 10 })
New-Item -ItemType Directory -Force "F:\Projekte\audible-dashboard-privat" | Out-Null
Set-Content "F:\Projekte\audible-dashboard-privat\pin.txt" $pin -Encoding utf8 -NoNewline
Write-Output "PIN erzeugt (steht in der Datei)"
```
Dann: `cd worker && npx wrangler@latest secret put PIN` (PIN aus Datei einfügen; wrangler liest von stdin: `Get-Content ..\..\audible-dashboard-privat\pin.txt | npx wrangler@latest secret put PIN` vom worker-Ordner aus — Pfad prüfen).

- [ ] **Step 4: Deploy** — Run: `cd worker && npx wrangler@latest deploy`
Ausgegebene URL (`https://hoerbuch-sync.<konto>.workers.dev`) in `js/config.js` eintragen:
```js
export const WORKER_URL = "https://hoerbuch-sync.<konto>.workers.dev";
```

- [ ] **Step 5: Roundtrip-Test gegen Live-Worker**

```bash
PIN=$(cat "F:/Projekte/audible-dashboard-privat/pin.txt")
WORKER_URL="https://hoerbuch-sync.<konto>.workers.dev"   # URL aus Step 4 einsetzen
curl -s -H "X-Pin: $PIN" "$WORKER_URL/state"
curl -s -X PUT -H "X-Pin: $PIN" -d '{"version":1,"favorites":["TEST"],"wishlist":[],"gehoert":[],"wishes":[]}' "$WORKER_URL/state"
curl -s -H "X-Pin: $PIN" "$WORKER_URL/state"
curl -s -H "X-Pin: 000000" "$WORKER_URL/state" -o /dev/null -w "%{http_code}"
```
Expected: leerer State → `{"ok":true}` → State mit `TEST` → `401`. Danach TEST-State wieder leeren (PUT mit leerem State).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "chore: Worker deployed, Konfiguration verdrahtet"`

### Task 14: Sync-Client + UI-Integration (`js/sync.js`)

**Files:**
- Create: `js/sync.js`
- Modify: `js/app.js` (Sync in `start()` + `speichern()`), `app.css` (PIN-Dialog + Statuszeile)

**Interfaces:**
- Consumes: `WORKER_URL` (Task 13), `mergeState`/`LEERER_STATE` (Task 6), `App` (Task 8).
- Produces: `initSync(App):Promise<void>` — lädt Remote-State beim Start (mergt bei Pending-Flag), registriert `App.syncSpeichern(state):Promise<bool>`; `fragePinAb():Promise<string>` (Overlay, einmalig pro Gerät, `hb:pin`); Statusanzeige in `#sync-status` („✓ synchron" / „⚠ nicht synchronisiert — Änderungen bleiben auf diesem Gerät").

- [ ] **Step 1: Implementierung**

`js/sync.js`:
```js
import { WORKER_URL } from "./config.js";
import { mergeState } from "./lib/sync-merge.js";

function status(text, warnung = false) {
  const el = document.getElementById("sync-status");
  el.textContent = text;
  el.className = warnung ? "warnung" : "";
}

export function fragePinAb() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "pin-overlay";
    overlay.innerHTML = `<form class="pin-box">
      <h2>Familien-PIN</h2>
      <p class="gedaempft">Einmalig eingeben — dieses Gerät merkt ihn sich.</p>
      <input name="pin" inputmode="numeric" autocomplete="one-time-code" placeholder="6-stelliger PIN" required>
      <button class="primaer">Los geht’s</button></form>`;
    overlay.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const pin = new FormData(e.target).get("pin").trim();
      localStorage.setItem("hb:pin", pin);
      overlay.remove();
      resolve(pin);
    });
    document.body.append(overlay);
  });
}

async function anfrage(methode, pin, body) {
  const r = await fetch(`${WORKER_URL}/state`, {
    method: methode,
    headers: { "X-Pin": pin, ...(body ? { "Content-Type": "application/json" } : {}) },
    body,
  });
  if (r.status === 401) throw new Error("pin");
  if (!r.ok) throw new Error(`http ${r.status}`);
  return r.json();
}

export async function initSync(App) {
  if (!WORKER_URL) { status(""); return; }
  let pin = localStorage.getItem("hb:pin") ?? (await fragePinAb());

  App.syncSpeichern = async (state) => {
    try {
      await anfrage("PUT", pin, JSON.stringify(state));
      localStorage.removeItem("hb:pending");
      status("✓ synchron");
      return true;
    } catch {
      localStorage.setItem("hb:pending", "1");
      status("⚠ nicht synchronisiert — Änderungen bleiben vorerst auf diesem Gerät", true);
      return false;
    }
  };

  while (true) {
    try {
      const remote = await anfrage("GET", pin);
      let tombstones = { wishlist: [] };
      try { tombstones = JSON.parse(localStorage.getItem("hb:tombstones")) ?? tombstones; } catch {}
      if (localStorage.getItem("hb:pending")) {
        App.zustand = mergeState(App.zustand, remote, tombstones);
        await App.syncSpeichern(App.zustand);
        localStorage.removeItem("hb:tombstones");
      } else {
        App.zustand = mergeState(null, remote);
      }
      status("✓ synchron");
      document.dispatchEvent(new CustomEvent("zustand-geaendert"));
      return;
    } catch (fehler) {
      if (fehler.message === "pin") { localStorage.removeItem("hb:pin"); pin = await fragePinAb(); continue; }
      status("⚠ gerade offline — deine Änderungen bleiben auf diesem Gerät", true);
      return;
    }
  }
}
```

In `js/app.js`: Import `initSync` oben; in `start()` nach dem Laden der JSONs und **vor** den `init*`-Aufrufen `await initSync(App);` einfügen. In `App.speichern()` als letzte Zeile ergänzen: `this.syncSpeichern?.(this.zustand);`

An `app.css` anhängen:
```css
.pin-overlay { position: fixed; inset: 0; background: var(--bg); display: grid; place-items: center; z-index: 50; }
.pin-box { background: var(--karte); border: 1px solid var(--linie); border-radius: var(--radius);
  padding: 26px; display: grid; gap: 12px; width: min(90vw, 340px); }
#sync-status.warnung { color: #d9a13c; }
```

- [ ] **Step 2: Browser-Verifikation (Sync-Beweis)** — Frischer Browser-Kontext: PIN-Dialog erscheint, falscher PIN → Dialog kommt wieder; richtiger PIN → „✓ synchron". Herz setzen; zweiten Browser-Kontext öffnen (z.B. zweites Browser-Profil oder Inkognito), PIN eingeben → Herz ist da. Worker-URL in `js/config.js` testweise verstümmeln → Seite lädt trotzdem mit Warnhinweis, Herzen funktionieren lokal; URL wiederherstellen.

- [ ] **Step 3: Alle Tests** — Run: `node --test tests/` · Expected: PASS.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: geräteübergreifender Sync mit PIN-Dialog und Offline-Fallback"`

---

## Phase 4 — Echte Daten

### Task 15: Audible-Bibliothek auslesen (interaktiv, Claude + User-Chrome)

**Files:**
- Create: `tools/auslese-anleitung.md`, `data/covers-manifest.json`
- Modify: `data/library.json` (Fixtures ersetzen)

**Interfaces:**
- Produces: echte `library.json` (Schema wie global definiert) + `covers-manifest.json` (`{"<asin>":"<cover-url>", …}`). **User-Voraussetzung: Audible im echten Chrome eingeloggt.**

- [ ] **Step 1: Anleitung ablegen** — `tools/auslese-anleitung.md`:
```markdown
# Audible-Auslese (Prozedur für Claude)
1. Claude-in-Chrome-Tools laden; neuen Tab öffnen: https://www.audible.de/library/titles
   (nicht eingeloggt → User bitten, sich einzuloggen, warten).
2. Falls vorhanden: Seitengröße auf 50 stellen (Dropdown unten). Gesamtzahl der Titel notieren.
3. Pro Seite via get_page_text/read_page erfassen: Titel, Autor, Sprecher, Serie+Band
   („Serie: X, Titel Y"), Dauer („Spieldauer: 10 Std. 12 Min." → Minuten), Produktlink
   (ASIN = Segment nach /pd/…/), Cover-IMG-URL (auf ._SL500_ normalisieren).
4. Alle Seiten durchblättern bis Gesamtzahl erreicht. Zwischenstand je Seite in Scratchpad-JSON.
5. genre: von Claude kuratiert (Titel-/Serienkenntnis; unklare Fälle: Produktseite prüfen).
   hinzugefuegt: aus Bibliotheks-Sortierung „Zuletzt hinzugefügt" ableiten, sonst null.
6. Schreiben: data/library.json (Schema!) + data/covers-manifest.json (asin → Cover-URL).
7. Validieren: node tools/pruefe-daten.mjs && node --test tests/
8. Stichprobe: 5 zufällige Bücher gegen die Audible-Seite prüfen (Titel, Dauer, Link öffnet).
```

- [ ] **Step 2: Prozedur ausführen** (Claude, live) — genau nach Anleitung; Anzahl in `library.json` muss der von Audible angezeigten Gesamtzahl entsprechen.

- [ ] **Step 3: Validierung** — Run: `node tools/pruefe-daten.mjs` · Expected: `OK: <n> Bücher…`, Exit 0. Stichprobe aus Schritt 8 dokumentiert im Commit-Text.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "data: echte Audible-Bibliothek (<n> Titel) ausgelesen"`

### Task 16: Cover verkleinern + einchecken (`tools/cover-shrink.ps1`)

**Files:**
- Create: `tools/cover-shrink.ps1`, `covers/*.jpg`

**Interfaces:**
- Consumes: `data/covers-manifest.json` (Task 15).
- Produces: `covers/<asin>.jpg` (Breite 200 px, JPEG q80) für jede ASIN; fehlgeschlagene Downloads werden gemeldet (Platzhalter übernimmt die UI automatisch).

- [ ] **Step 1: Skript schreiben**

`tools/cover-shrink.ps1`:
```powershell
param([string]$Manifest = "data/covers-manifest.json", [string]$Ziel = "covers", [int]$Breite = 200)
Add-Type -AssemblyName System.Drawing
$eintraege = Get-Content $Manifest -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force $Ziel | Out-Null
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq "image/jpeg"
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]80)
$fehler = 0
foreach ($e in $eintraege.PSObject.Properties) {
  $ausgabe = Join-Path $Ziel "$($e.Name).jpg"
  if (Test-Path $ausgabe) { continue }
  try {
    $tmp = [System.IO.Path]::GetTempFileName()
    Invoke-WebRequest $e.Value -OutFile $tmp -UseBasicParsing
    $bild = [System.Drawing.Image]::FromFile($tmp)
    $hoehe = [int]($bild.Height * ($Breite / $bild.Width))
    $klein = New-Object System.Drawing.Bitmap $Breite, $hoehe
    $g = [System.Drawing.Graphics]::FromImage($klein)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($bild, 0, 0, $Breite, $hoehe)
    $klein.Save($ausgabe, $codec, $params)
    $g.Dispose(); $klein.Dispose(); $bild.Dispose(); Remove-Item $tmp
  } catch { Write-Warning "Cover fehlgeschlagen: $($e.Name) – $_"; $fehler++ }
}
Write-Output "Fertig. Fehlgeschlagen: $fehler"
```

- [ ] **Step 2: Ausführen** — Run: `powershell -ExecutionPolicy Bypass -File tools/cover-shrink.ps1`
Expected: `Fertig. Fehlgeschlagen: 0` (einzelne Fehlschläge okay — notieren). Prüfen: Dateizahl ≈ Bücherzahl, Einzelgröße < 30 KB (`Get-ChildItem covers | Measure-Object Length -Sum`).

- [ ] **Step 3: Browser-Verifikation** — Bibliothek zeigt jetzt echte Cover; fehlende → Platzhalter.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "data: Cover verkleinert eingecheckt"`

### Task 17: Geschmacksprofil + Erst-Kuratierung (Claude-Recherche)

**Files:**
- Modify: `data/recommendations.json` (Fixtures ersetzen), `data/meta.json`

**Interfaces:**
- Consumes: echte `library.json`, ggf. vom User genannte Start-Favoriten.
- Produces: 60–100 echte Empfehlungen (Schema + Regal-Verteilung), aktualisierte `meta.json` mit echtem `profil_kurz`.

- [ ] **Step 1: Profil destillieren** — Aus `library.json`: Top-Genres/-Autoren/-Sprecher (via `node -e` mit `berechneStatistik`), Serien mit letztem vorhandenem Band. User fragen, ob er Start-Favoriten nennen will. `profil_kurz` (1 Satz) in `meta.json`.

- [ ] **Step 2: Recherche + Kuratierung** (Claude, live, WebSearch/Browser) — Für jede Serie: nächster Band auf audible.de suchen → Regal `serien-fortsetzung`. Für Top-5-Autoren/-Sprecher: Neuerscheinungen seit letztem Kauf → `lieblingsautor`. Rest bis ≥ 60: Geschmacks-Matches über Audible-Kategorien/Bestenlisten passend zu Genres/Stimmungen → `geschmacks-match`. Jede Empfehlung: echte ASIN + `https://www.audible.de/pd/<asin>`-URL, persönliche `begruendung`, ehrliche Tags. Kein Titel, der schon in `library.json` steht (ASIN-Abgleich!).

- [ ] **Step 3: Validieren** — Run: `node tools/pruefe-daten.mjs` · Expected: OK, Exit 0. Browser: 10 zufällige Audible-Links stichprobenartig öffnen — Titel stimmt überein.

- [ ] **Step 4: Browser-Verifikation Dashboard** — Regale gefüllt, Finder liefert für jede Stimmung ≥ 1 Treffer (sonst Tags nachschärfen).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "data: Geschmacksprofil und Erst-Kuratierung (<n> Empfehlungen)"`

---

## Phase 5 — Veröffentlichung

### Task 18: PWA-Installierbarkeit (Manifest + Icons)

**Files:**
- Create: `manifest.webmanifest`, `icons/icon-192.png`, `icons/icon-512.png`, `tools/icons.ps1`
- Modify: `index.html` (head)

**Interfaces:**
- Produces: installierbare Seite („Zum Home-Bildschirm"); Icons stilisierte Kopfhörer auf warmem Dunkelgrund.

- [ ] **Step 1: Icons zeichnen** — `tools/icons.ps1`:
```powershell
Add-Type -AssemblyName System.Drawing
foreach ($groesse in 192, 512) {
  $b = New-Object System.Drawing.Bitmap $groesse, $groesse
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.SmoothingMode = "AntiAlias"
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml("#171310"))
  $orange = [System.Drawing.ColorTranslator]::FromHtml("#f8991c")
  $stift = New-Object System.Drawing.Pen $orange, ($groesse * 0.09)
  $g.DrawArc($stift, $groesse * 0.2, $groesse * 0.22, $groesse * 0.6, $groesse * 0.6, 180, 180)
  $pinsel = New-Object System.Drawing.SolidBrush $orange
  foreach ($x in ($groesse * 0.14), ($groesse * 0.66)) {
    $g.FillRectangle($pinsel, $x, $groesse * 0.5, $groesse * 0.2, $groesse * 0.3) }
  $g.Dispose()
  New-Item -ItemType Directory -Force icons | Out-Null
  $b.Save("icons/icon-$groesse.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $b.Dispose()
}
Write-Output "Icons erzeugt"
```
Run: `powershell -ExecutionPolicy Bypass -File tools/icons.ps1` — Icons ansehen (Read), müssen wie Kopfhörer wirken; sonst Werte justieren.

- [ ] **Step 2: Manifest + head**

`manifest.webmanifest`:
```json
{
  "name": "Hörbuch-Cockpit",
  "short_name": "Hörbücher",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#171310",
  "theme_color": "#171310",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
In `index.html`-head ergänzen:
```html
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="apple-touch-icon" href="icons/icon-192.png">
```

- [ ] **Step 3: Verifikation** — Browser: Manifest lädt ohne Konsolen-Fehler (Network-Tab 200).

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: installierbar als Home-Bildschirm-App"`

### Task 19: GitHub-Repo + Pages live (interaktiv, gh nötig)

**Files:**
- Modify: keine (nur Remote/Infrastruktur)

**Interfaces:**
- Produces: öffentliches Repo + Live-URL `https://<user>.github.io/audible-dashboard/` — die finale Adresse für die Frau.

- [ ] **Step 1: gh prüfen** — Run: `gh auth status`
Nicht eingeloggt → User bitten: `gh auth login` (STOPP bis erledigt). Kein gh installiert → `winget install GitHub.cli`, dann Login.

- [ ] **Step 2: Branch + Repo + Push**

```bash
git branch -M main
gh repo create audible-dashboard --public --source . --push
```

- [ ] **Step 3: Pages aktivieren**

```bash
gh api --method POST "repos/{owner}/audible-dashboard/pages" -f "source[branch]=main" -f "source[path]=/"
```
(Falls schon existiert: 409 ist okay.) 1–2 Minuten warten, dann: `gh api "repos/{owner}/audible-dashboard/pages" --jq .html_url`

- [ ] **Step 4: Live-Smoke-Test** — Browser auf die Live-URL: PIN-Dialog → eingeben → „✓ synchron"; Herz setzen; zweiter Browser-Kontext auf Live-URL → Herz sichtbar. Cover laden, Konsole sauber, mobil 375 px prüfen. **Achtung Pfad-Basis:** Alle fetch-/src-Pfade sind relativ (`data/…`, `covers/…`) — unter `/audible-dashboard/` funktionierend verifizieren.

- [ ] **Step 5: Abschließender Commit falls Fixes nötig** — `git add -A && git commit -m "fix: Pfad-/Live-Korrekturen nach Pages-Smoke-Test" && git push`

---

## Phase 6 — Automatisierung + Abschluss

### Task 20: Auffrisch-Lauf (Prompt, Skript, Zeitplan)

**Files:**
- Create: `tools/refresh-prompt.md`, `tools/refresh.cmd`

**Interfaces:**
- Consumes: PIN-Datei (Task 13), Worker-URL (`js/config.js`), Schema-Gate (Task 7).
- Produces: geplanter Lauf Di + Fr 07:30 (Task Scheduler `HoerbuchRefresh`), der Wünsche beantwortet, Pool auffrischt, pusht.

- [ ] **Step 1: Lauf-Prompt schreiben** — `tools/refresh-prompt.md`:
```markdown
# Auffrisch-Lauf Hörbuch-Cockpit (headless)
Arbeitsverzeichnis: F:\Projekte\audible-dashboard. Spec: docs/superpowers/specs/2026-08-05-audible-dashboard-design.md §5.
1. PIN lesen: F:\Projekte\audible-dashboard-privat\pin.txt; WORKER_URL aus js/config.js.
2. State holen: curl -H "X-Pin: <pin>" <WORKER_URL>/state
3. Profil schärfen: favorites/gehoert gegen data/library.json + data/recommendations.json auswerten.
4. Für jeden Wunsch mit status "offen": gezielt recherchieren (WebSearch + audible.de),
   2–4 Empfehlungen mit regal "wunsch-antwort" erzeugen (Schema!, echte ASIN, Begründung
   nimmt Bezug auf den Wunschtext). Wunsch im State auf "beantwortet" setzen (PUT, Merge beachten:
   erst frisch GETten, nur wishes-Status ändern).
5. Turnus-Auffrischung: veraltete geschmacks-match-Einträge (aufgenommen_am älter 6 Wochen und
   nicht in wishlist) entfernen; 5–10 frische kuratieren (Regeln Spec §5: nichts, was in
   library.json steht; Pool-Deckel 100).
6. meta.json: letzter_lauf = jetzt; naechster_lauf = nächster Di/Fr 07:30; profil_kurz prüfen.
7. Gate: node tools/pruefe-daten.mjs && node --test tests/ — nur bei Exit 0 weiter.
8. git add -A && git commit -m "data: Auffrisch-Lauf <datum>" && git push
9. Bei Fehlern: nichts committen, Fehlerdatei F:\Projekte\audible-dashboard-privat\letzter-fehler.txt schreiben.
```

- [ ] **Step 2: Startskript** — `tools/refresh.cmd`:
```bat
@echo off
cd /d F:\Projekte\audible-dashboard
claude -p "Lies tools/refresh-prompt.md und führe den Auffrisch-Lauf exakt danach aus." --permission-mode acceptEdits --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch" > "F:\Projekte\audible-dashboard-privat\letzter-lauf.log" 2>&1
```

- [ ] **Step 3: Probelauf von Hand** — Vorher im Live-Dashboard einen Test-Wunsch absenden („mehr Küstenkrimis"). Dann: `tools\refresh.cmd` ausführen; Log lesen. Expected: Commit mit neuen `wunsch-antwort`-Empfehlungen, Wunsch-Status im KV „beantwortet", Live-Seite zeigt nach Pages-Rebuild das Regal „Deine Wünsche — beantwortet" + Status-Haken. Schema-Gate lief (im Log sichtbar).

- [ ] **Step 4: Zeitplan registrieren**

```powershell
schtasks /Create /TN "HoerbuchRefresh" /TR "F:\Projekte\audible-dashboard\tools\refresh.cmd" /SC WEEKLY /D TUE,FRI /ST 07:30 /F
schtasks /Query /TN "HoerbuchRefresh"
```
Expected: Task angelegt, nächste Laufzeit angezeigt.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: geplanter Auffrisch-Lauf Di+Fr 07:30" && git push`

### Task 21: Obsidian-Notiz + Abnahme

**Files:**
- Create: `F:\Projekte\Second Brain\Second Brain\10 Projekte\Audible-Dashboard.md` (obsidian-markdown-Konventionen!)

**Interfaces:**
- Consumes: alles Vorherige. Produces: Betriebs-Doku + abgeschlossene Abnahme nach Spec §8.

- [ ] **Step 1: Projektnotiz schreiben** — Frontmatter `typ: projekt`, `status: aktiv`, `naechster_schritt: "Feedback der Frau einsammeln"`; Inhalt: Live-URL, Repo-URL, Worker-URL, PIN-Ablageort (`F:\Projekte\audible-dashboard-privat\pin.txt` — **nicht der PIN selbst**), Update-Kommandos („Dashboard aktualisieren" = Tasks 15–17 wiederholen), Zeitplan-Name `HoerbuchRefresh`, Log-Pfad.

- [ ] **Step 2: Abnahme nach Spec §8 komplett durchgehen** — alle 6 Punkte einzeln ausführen und Ergebnis in der Projektnotiz abhaken: ① mobil+desktop ② Sync-Beweis 2 Geräte ③ Wunsch-Roundtrip ④ 10-Links-Stichprobe ⑤ hell/dunkel + Installierbarkeit ⑥ Worker-Ausfall-Fallback (config testweise verstümmeln, prüfen, zurück).

- [ ] **Step 3: Abschluss-Commit** — `git add -A && git commit -m "docs: Abnahme dokumentiert" && git push`. User informieren: Live-URL + PIN-Übergabe an die Frau (mündlich), Kurzanleitung „Zum Home-Bildschirm hinzufügen".
