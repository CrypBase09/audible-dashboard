# Audible-Auslese (Prozedur für Claude)

**Gelernte Realität (06.08.2026):** DOM-Zugriff (get_page_text/read_page/javascript) auf
audible.de scheitert an Endlos-Nachladern (document_idle wird nie erreicht). Funktionierender Weg:

## Schritt 1 — Bibliothek ablesen (Chrome + Desktop-Screenshots)
1. Claude-in-Chrome: Tab auf `https://www.audible.de/library/titles?pageSize=50`
   (nicht eingeloggt → User bitten). Chrome-Fenster muss sichtbar im Vordergrund sein.
2. computer-use (read-Tier): Screenshot/zoom der Buchzeilen; pro Buch ablesen:
   Titel, Autor, Sprecher, Serie + Band, Spieldauer. Blättern über die Extension
   (URL `...&page=N`), NICHT über Klicks im DOM.
3. Gesamtzahl der Titel notieren (steht oben auf der Seite) — Vollständigkeits-Soll.

## Schritt 2 — Anreicherung ohne Login (WebFetch, SSR-Seiten)
1. Pro Titel: `https://www.audible.de/search?keywords=<titel>+<autor>` per WebFetch —
   Produktlink `/pd/<slug>/<ASIN>` des passenden Treffers extrahieren (Titel+Autor abgleichen!).
2. Produktseite fetchen → verifizieren: Sprecher, exakte Spieldauer, Serie/Band, Genre
   (Kategorie-Brotkrumen), Cover-URL (`m.media-amazon.com/images/...`, auf `_SL500_` normieren).
3. `data/library.json` (Schema!) + `data/covers-manifest.json` (`asin → cover-url`) schreiben.
   `hinzugefuegt`: unbekannt → null (Library zeigt es nicht zuverlässig).

## Schritt 3 — Validierung
1. `node tools/pruefe-daten.mjs && node --test` — muss grün sein.
2. Anzahl == Audible-Gesamtzahl; 5 Titel stichprobenartig gegen die Produktseite prüfen.
3. `powershell -ExecutionPolicy Bypass -File tools/cover-shrink.ps1` → Cover einchecken.
