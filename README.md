# Hörbuch-Cockpit

Persönliches Audible-Dashboard für zwei Personen. Statische Seite (GitHub Pages)
+ Cloudflare-KV-Sync. Zwei Profile mit eigener Buchauswahl und eigener Design-Welt.

- **Tests:** `node --test` (nicht `node --test tests/` — schlägt unter Windows fehl)
- **Daten-Gate:** `node tools/pruefe-daten.mjs`
- **Auslieferung:** GitHub Actions (`.github/workflows/pages.yml`), nicht Jekyll
- **Betrieb:** siehe Obsidian-Notiz „Audible-Dashboard"

