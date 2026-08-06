# Design v2: Hörbuch-Cockpit — Profile, Sofort-Vorschläge, zwei Design-Welten

**Datum:** 2026-08-06 · **Status:** Freigegeben · Baut auf `2026-08-05-audible-dashboard-design.md` auf.

## Was sich ändert

Das Dashboard bedient ab v2 **zwei Personen** mit getrennten Buchauswahlen, getrennten
Empfehlungen und je eigener Design-Welt. Der Wunsch-Knopf löst die Recherche **sofort** aus
statt auf den Turnus-Lauf zu warten. Empfehlungen bekommen eine dritte Aktion („Lehne ich ab").

## 1. Profile

Zwei feste Profile: `sie` und `er`. Beim ersten Öffnen erscheint ein Auswahlschirm
(„Für sie" / „Für ihn"); die Wahl liegt in `hb:profil` im Gerätespeicher. Ein Umschalter
im Kopfbereich wechselt jederzeit. Der Familien-PIN bleibt für beide derselbe —
die Profile trennen Inhalte, nicht Zugang.

**State-Schema (Cloud, ersetzt das flache v1-Schema):**

```json
{
  "version": 1770000000000,
  "profile": {
    "sie": { "meine": ["ASIN"], "lieblinge": ["ASIN"], "wishlist": ["r-id"],
             "gehoert": ["r-id"], "abgelehnt": ["r-id"],
             "wishes": [{"id","text","datum","status":"offen|in_arbeit|beantwortet"}] },
    "er":  { "…gleiche Felder…" }
  },
  "frisch": [ { "…Empfehlungs-Objekt…", "fuer": "sie|er", "erzeugt_am": "ISO" } ]
}
```

- `meine` = Herz („gehört zu mir"), `lieblinge` = Stern („höre ich immer wieder").
  Ein Stern setzt implizit auch das Herz; ein entferntes Herz entfernt auch den Stern.
- `frisch` nimmt Sofort-Antworten des Wächters auf, bevor sie dauerhaft in
  `data/recommendations.json` landen. Einträge älter als 24 Stunden räumt der Wächter weg.
- **Migration:** Ein v1-State (flaches `favorites`) wird beim Laden erkannt und in
  `profile.sie.meine` überführt, damit nichts verloren geht. Reine Lesefunktion, kein Skript.

## 2. Markierung und Bibliotheks-Ansicht

Jede Buchkarte hat zwei Knöpfe: **Herz** und **Stern**. Die Bibliothek kennt zwei Modi:

| Modus | Zeigt | Wann aktiv |
|---|---|---|
| Meine | nur Titel mit Herz des aktiven Profils | sobald das Profil ≥ 1 Herz hat (Default) |
| Alle | alle 67 Titel | Schalter „Alle 67 anzeigen"; automatisch, solange 0 Herzen |

Die Kopf-Kennzahlen (Anzahl, Hörzeit) und die Statistiken beziehen sich immer auf die
**eigene Auswahl**, nicht auf die Gesamtbibliothek. „Mal wieder hören" zieht aus den
Sternen des Profils, ersatzweise aus den Herzen.

## 3. Entdecken

Sichtbarkeitsregeln, alle zur Laufzeit ausgewertet (nicht nur beim Bauen der Daten):

1. **Nie Besitz:** Eine Empfehlung, deren ASIN in `library.json` steht, wird ausgeblendet.
2. **Nie Abgelehntes/Gehörtes:** IDs in `abgelehnt` oder `gehoert` des Profils verschwinden.
3. **Fortsetzungen** (`regal: serien-fortsetzung`) erscheinen nur, wenn der Anker
   (`aehnlich_wie`) im `meine` des Profils steht.
4. **Lieblingsautoren** (`regal: lieblingsautor`) erscheinen nur, wenn Autor **oder** Sprecher
   der Empfehlung bei mindestens einem `meine`-Buch des Profils vorkommt.
5. **Geschmacks-Matches** erscheinen nur, wenn eines ihrer Genres in den Genres der
   `meine`-Bücher vorkommt.
6. **Anlaufschutz:** Hat das Profil noch keine Herzen, gelten die Regeln 3–5 nicht — dann
   wird der ganze Pool gezeigt, damit die Seite nicht leer wirkt.

**Drei Aktionen je Karte:** „Merken" (Wunschliste), „Kenn ich schon" (`gehoert`),
**„Lehne ich ab"** (`abgelehnt`). Ablehnen blendet dauerhaft aus und geht als
Negativsignal in den Auftrag der nächsten Kuratierung ein.

## 4. Sofort-Vorschläge

**Ablauf:**

1. Nutzerin tippt Wunsch → Eintrag mit `status: "offen"` im eigenen Profil, sofortiger PUT.
2. Knopf zeigt „Suche läuft…"; die Seite pollt den State alle 30 Sekunden, solange ein
   Wunsch `offen` oder `in_arbeit` ist. Ohne offenen Wunsch wird nicht gepollt.
3. Der Wächter (`tools/wunsch-waechter.cmd`, Windows-Aufgabe `HoerbuchWunschWaechter`,
   alle 3 Minuten) liest den State. Findet er `offen`, setzt er ihn auf `in_arbeit`
   (Doppelstart-Schutz) und startet `claude -p` mit `tools/wunsch-prompt.md`.
4. Claude recherchiert 2–4 Titel, schreibt sie in `state.frisch` (mit `fuer: <profil>`),
   setzt den Wunsch auf `beantwortet`, ergänzt `data/recommendations.json` und pusht.
5. Das Dashboard mischt `recommendations.json` + `state.frisch` (Dedup über `id`) und zeigt
   die Antworten im Regal **„Deine Wünsche — beantwortet"**.

**Fehlerfälle:** Bricht der Lauf ab, bleibt der Wunsch auf `in_arbeit`; der Wächter setzt
Einträge, die älter als 30 Minuten `in_arbeit` sind, auf `offen` zurück und versucht es erneut
(maximal zweimal, danach `beantwortet` mit Hinweistext). Läuft der PC nicht, bleibt der Wunsch
`offen` und wird beim nächsten Start oder beim Di/Fr-Lauf abgearbeitet — das Dashboard sagt
das ehrlich an: „Wird bearbeitet, sobald der Rechner wieder läuft."

Der bestehende Turnus-Lauf (Di + Fr 07:30) bleibt für die allgemeine Auffrischung bestehen
und räumt zusätzlich `frisch`-Einträge auf, die in `recommendations.json` angekommen sind.

## 5. Design-Welten

Beide Welten teilen Struktur, Komponenten und Funktionen. Unterschiedlich sind Farbe,
Typografie, Kantenradius und Bewegungsdetails. Umschaltung über `data-welt="sie|er"`
am Wurzelelement; jede Welt definiert ihre Tokens vollständig, hell wie dunkel.

**Sie — Samt und Rosé**
Grund tiefes Aubergine (#2A1220), Flächen #3A1A2C, Akzent Roségold (#E8B4C8) mit
tieferem Kontrastton (#7D3C55) für Text-auf-Akzent. Überschriften in Serif, weit gesperrt.
Cover mit weichem Schatten und leichtem Aufskalieren beim Antippen; das Herz füllt sich
mit kurzer Puls-Animation. Großzügiger Weißraum, runde Ecken (16 px).

**Er — Nachtblau und Cyan**
Grund #0A1826, Flächen #12283D, Akzent Cyan (#4FD1C5) auf dunklem Kontrastton (#04302C).
Überschriften serifenlos, Zahlen in Monospace. Kantigere Ecken (6 px), präzises Raster,
dünne Trennlinien statt Schatten. Bewegung sparsam: nur Farbwechsel, kein Skalieren.

**Verbindlich für beide:** Textkontrast ≥ 7:1, Chart-Palette bleibt die validierte
farbenblind-taugliche Reihe, `prefers-reduced-motion` schaltet alle Animationen ab.

## 6. Betroffene Dateien

- `js/lib/profil.js` (neu) — Profil-State lesen/schreiben, Migration, Herz/Stern-Logik
- `js/lib/empfehlungs-filter.js` (neu) — die sechs Sichtbarkeitsregeln
- `js/lib/sync-merge.js` — Merge auf Profil-Struktur umstellen
- `worker/handler.js` — Validierung auf neues Schema
- `js/ui/*` — Profilwahl, Umschalter, Stern, Ablehnen, Markier-Modus, Wunsch-Polling
- `app.css` → aufgeteilt in `css/basis.css`, `css/welt-sie.css`, `css/welt-er.css`
- `tools/wunsch-waechter.cmd` + `tools/wunsch-prompt.md` (neu)

## 7. Abnahme v2

1. Profilwahl erscheint beim ersten Öffnen; Wechsel funktioniert und ändert Farbwelt sofort.
2. Herz und Stern auf Profil A gesetzt → auf Profil B unsichtbar, auf zweitem Gerät in A sichtbar.
3. Bibliothek zeigt in „Meine" nur markierte Titel; „Alle anzeigen" zeigt wieder 67.
4. Fortsetzung erscheint erst, nachdem der zugehörige Band ein Herz bekommen hat.
5. „Lehne ich ab" blendet dauerhaft aus, auch nach Neuladen und auf dem zweiten Gerät.
6. Echter Wunsch-Durchstich: abgesendet → Wächter startet → Antwort im Dashboard, ohne Zutun.
7. Beide Welten hell und dunkel geprüft, Kontrast ≥ 7:1, keine horizontale Scrollleiste bei 375 px.
8. Alle Tests grün, `node tools/pruefe-daten.mjs` sauber.

## 8. Bewusst nicht enthalten

Mehr als zwei Profile, Passwortschutz je Profil, Empfehlungen ohne PC (dafür wäre ein
API-Schlüssel nötig — bewusst abgewählt), automatische Zuordnung vorhandener Bücher zu
Personen, Bewertungssterne für gehörte Bücher.
