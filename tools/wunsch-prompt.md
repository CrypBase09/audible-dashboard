# Sofort-Antwort auf einen Hörbuch-Wunsch (headless)

Arbeitsverzeichnis: `F:\Projekte\audible-dashboard`. Regeln: `docs/superpowers/specs/2026-08-06-hoerbuch-cockpit-v2-design.md` §4.

Du beantwortest **einen** offenen Wunsch aus dem Sync-Speicher. Arbeite zügig — die Person wartet.

1. **PIN und Worker lesen:** PIN aus `F:\Projekte\audible-dashboard-privat\pin.txt`,
   Worker-URL aus `js/config.js`. Netzzugriffe über PowerShell (`Invoke-WebRequest`),
   nicht über curl in Bash — die Bash-Sandbox blockiert workers.dev.
2. **State holen** (`GET /state`). Suche den **ersten** Wunsch mit `status: "in_arbeit"`
   in `profile.sie.wishes` oder `profile.er.wishes`. Merke dir das Profil (`sie`/`er`)
   und die Wunsch-ID. Gibt es keinen, beende ohne Änderung.
3. **Kontext bilden:** Lies `data/library.json`. Die markierten Bücher des Profils
   (`profile.<p>.meine`) sind der Geschmack; `profile.<p>.lieblinge` wiegen doppelt.
   `profile.<p>.abgelehnt` und `.gehoert` sind Negativsignale — nichts Ähnliches vorschlagen.
4. **Recherchieren:** Suche auf audible.de nach 2–4 Titeln, die zum Wunschtext passen.
   Nutze `https://www.audible.de/search?keywords=…` per WebFetch, öffne den Produktlink und
   lies die ASIN aus der URL `/pd/<slug>/<ASIN>`. **Erfinde keine ASIN.** Nichts vorschlagen,
   dessen ASIN in `library.json` steht.
5. **Antwort schreiben:** Für jeden Treffer ein Objekt im Empfehlungs-Schema
   (`id: "r-<ASIN>"`, `regal: "wunsch-antwort"`, `aufgenommen_am` = heute) plus die Felder
   `fuer: "<profil>"` und `erzeugt_am` (ISO-Zeit).
6. **State aktualisieren:** frisch GETten, die neuen Objekte an `frisch` anhängen,
   den Wunsch auf `status: "beantwortet"` setzen, `version` auf die aktuelle Zeit in
   Millisekunden, dann PUT. **Keine anderen Felder anfassen** — die Personen bedienen
   das Dashboard parallel.
7. **Dauerhaft ablegen:** Dieselben Empfehlungen (ohne `fuer`/`erzeugt_am`) an
   `data/recommendations.json` anhängen, dann
   `node tools/pruefe-daten.mjs && node --test`. Nur bei Exit 0 ausliefern:
   ```
   powershell -ExecutionPolicy Bypass -File tools/ausliefern.ps1 -Nachricht "data: Wunsch beantwortet <datum>"
   ```
   `ausliefern.ps1` pusht **und** stößt den Workflow ausdrücklich an — ein Sicherheitsnetz für
   den Fall, dass GitHub die Push-Auslöser drosselt (kam am 06.08.2026 während einer Störung vor).
8. **Fehler:** Findest du nichts Belegbares, setze den Wunsch trotzdem auf `beantwortet`
   und hänge eine Empfehlung mit `titel: "Nichts Passendes gefunden"` NICHT an — schreibe
   stattdessen den Grund nach `F:\Projekte\audible-dashboard-privat\letzter-fehler.txt`.
   Bei Abbruch bleibt der Wunsch auf `in_arbeit`; der Wächter setzt ihn nach 30 Minuten zurück.
