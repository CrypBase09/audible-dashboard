# Auffrisch-Lauf Hörbuch-Cockpit (headless)

Arbeitsverzeichnis: `F:\Projekte\audible-dashboard`. Regeln: Spec `docs/superpowers/specs/2026-08-05-audible-dashboard-design.md` §5.

**Ab v2 gibt es zwei Profile (`sie`, `er`) — jeder Schritt gilt für beide getrennt.**
Netzzugriffe über PowerShell (`Invoke-WebRequest`), nicht über curl in Bash: die
Bash-Sandbox blockiert workers.dev.

1. PIN lesen: `F:\Projekte\audible-dashboard-privat\pin.txt`; Worker-URL aus `js/config.js`.
2. State holen: `GET <WORKER_URL>/state` (v2-Schema mit `profile.sie` / `profile.er`).
3. Profil schärfen: je Person `meine` (Herz) und `lieblinge` (Stern, doppelt gewichtet) gegen
   `data/library.json` auswerten; `abgelehnt` und `gehoert` sind Negativsignale — nichts
   Ähnliches mehr vorschlagen.
4. Für jeden Wunsch mit Status `offen`: gezielt recherchieren (WebSearch + audible.de),
   2–4 Empfehlungen mit Regal `wunsch-antwort` erzeugen — Schema aus der Spec einhalten,
   echte ASIN aus der Produktseiten-URL, Begründung nimmt Bezug auf den Wunschtext.
   Danach im State den Wunsch auf `beantwortet` setzen: erst frisch GETten, NUR den
   wishes-Status ändern, dann PUT (Merge-Disziplin — keine anderen Felder anfassen).
5. Turnus-Auffrischung: `geschmacks-match`-Einträge mit `aufgenommen_am` älter als 6 Wochen
   entfernen, sofern in keiner der beiden Wunschlisten; 5–10 frische kuratieren — je nach
   Geschmack beider Profile, damit niemand leer ausgeht. Nichts aufnehmen, was schon in
   `library.json` steht (ASIN-Abgleich). Pool-Deckel 100.
5b. `frisch`-Einträge im State, die inzwischen in `data/recommendations.json` stehen,
   aus dem State entfernen — sie werden sonst doppelt vorgehalten.
6. Cover für neue Empfehlungen: URLs in `data/covers-manifest.json` ergänzen und
   `powershell -ExecutionPolicy Bypass -File tools/cover-shrink.ps1` laufen lassen (best effort).
7. `data/meta.json` stempeln: `letzter_lauf` = jetzt (ISO), `naechster_lauf` = nächster
   Di/Fr 07:30 (Europe/Zurich), `profil_kurz` bei Bedarf aktualisieren.
8. Gate: `node tools/pruefe-daten.mjs && node --test` — nur bei Exit 0 weiter.
9. Ausliefern über das Skript (pusht und stößt die Auslieferung ausdrücklich an):
   ```
   powershell -ExecutionPolicy Bypass -File tools/ausliefern.ps1 -Nachricht "data: Auffrisch-Lauf <datum>"
   ```
   Das Skript pusht, stößt den Workflow an und meldet das Ergebnis der Auslieferung.
10. Bei Fehlern: nichts committen; Fehlertext nach
    `F:\Projekte\audible-dashboard-privat\letzter-fehler.txt` schreiben.
