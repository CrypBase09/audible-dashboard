# Auffrisch-Lauf Hörbuch-Cockpit (headless)

Arbeitsverzeichnis: `F:\Projekte\audible-dashboard`. Regeln: Spec `docs/superpowers/specs/2026-08-05-audible-dashboard-design.md` §5.

1. PIN lesen: `F:\Projekte\audible-dashboard-privat\pin.txt`; Worker-URL aus `js/config.js`.
2. State holen: `curl -s -H "X-Pin: <pin>" <WORKER_URL>/state`
3. Profil schärfen: `favorites`/`gehoert` gegen `data/library.json` + `data/recommendations.json`
   auswerten (Herzen stark gewichten, „gehört" als schwaches Negativsignal).
4. Für jeden Wunsch mit Status `offen`: gezielt recherchieren (WebSearch + audible.de),
   2–4 Empfehlungen mit Regal `wunsch-antwort` erzeugen — Schema aus der Spec einhalten,
   echte ASIN aus der Produktseiten-URL, Begründung nimmt Bezug auf den Wunschtext.
   Danach im State den Wunsch auf `beantwortet` setzen: erst frisch GETten, NUR den
   wishes-Status ändern, dann PUT (Merge-Disziplin — keine anderen Felder anfassen).
5. Turnus-Auffrischung: `geschmacks-match`-Einträge mit `aufgenommen_am` älter als 6 Wochen
   entfernen, sofern nicht in der Wunschliste des States; 5–10 frische kuratieren.
   Nichts aufnehmen, was schon in `library.json` steht (ASIN-Abgleich). Pool-Deckel 100.
6. Cover für neue Empfehlungen: URLs in `data/covers-manifest.json` ergänzen und
   `powershell -ExecutionPolicy Bypass -File tools/cover-shrink.ps1` laufen lassen (best effort).
7. `data/meta.json` stempeln: `letzter_lauf` = jetzt (ISO), `naechster_lauf` = nächster
   Di/Fr 07:30 (Europe/Zurich), `profil_kurz` bei Bedarf aktualisieren.
8. Gate: `node tools/pruefe-daten.mjs && node --test` — nur bei Exit 0 weiter.
9. `git add -A && git commit -m "data: Auffrisch-Lauf <datum>" && git push`
10. Bei Fehlern: nichts committen; Fehlertext nach
    `F:\Projekte\audible-dashboard-privat\letzter-fehler.txt` schreiben.
