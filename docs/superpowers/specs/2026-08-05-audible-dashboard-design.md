# Design: Audible-Dashboard „Hörbuch-Cockpit"

**Datum:** 2026-08-05 · **Status:** Freigegeben (v2, mündlich) — schriftliches Review ausstehend

## 1. Ziel & Nutzerin

Ein persönliches Hörbuch-Dashboard für die Frau des Auftraggebers. Sie hört viel und wiederholt
auf Audible (audible.de angenommen; beim Auslesen verifizieren). Das Dashboard bietet:

1. Übersicht der eigenen Audible-Bibliothek mit Suche, Filtern und Favoriten-Herzen
2. Eine „clevere Suche" für neue Hörbücher: kuratierte Geschmacks-Empfehlungen **plus**
   interaktive Entdeckung (Stimmung/Genre/Länge/„ähnlich wie …")
3. Wunschliste, Hör-Statistiken, „Mal wieder hören"-Ecke
4. Selbststeuerung durch die Nutzerin: Herzen/Wunschliste geräteübergreifend synchron,
   neue Empfehlungen per „Wünsch dir was" anstoßbar — ohne Umweg über den Auftraggeber

Sprache durchgehend Deutsch. Mobile-first (Hauptgerät: ihr Handy), am Desktop ebenso sauber.

## 2. Getroffene Entscheidungen

| Thema | Entscheidung |
|---|---|
| Bibliotheks-Datenquelle | Browser-Auslese der Audible-Bibliothek über das echte Chrome des Auftraggebers (eingeloggte Session) |
| Hosting | Öffentliches GitHub-Repo + GitHub Pages (Datenschutz-Hinweis erteilt und akzeptiert) |
| Sync | Cloudflare Worker + KV (Gratis-Konto), Familien-PIN, Last-write-wins |
| Empfehlungs-Frische | Geplanter Claude-Lauf auf dem Dauerbetriebs-PC, 2×/Woche (Di + Fr früh), plus Lauf auf Zuruf |
| „Anstoßen"-Semantik | Bestell-Prinzip: Wünsche landen im Sync-Speicher, Lieferung beim nächsten Lauf; keine Echtzeit-Generierung |
| Favoriten-Erfassung | Nutzerin setzt Herzen selbst im Dashboard; initial kann der Auftraggeber Lieblinge nennen (werden als Startbestand eingebettet) |
| Cover | Verkleinerte Kopien (~200 px Breite, JPEG/WebP) im Repo, kein Hotlinking |
| Technik Dashboard | Statisches Vanilla HTML/CSS/JS ohne Build-Prozess; Daten als JSON per fetch |
| Installierbarkeit | Web-App-Manifest + Icons („Zum Home-Bildschirm"); bewusst **kein** Service Worker |

## 3. Architektur

```
Audible (Bibliothek) ──Browser-Auslese──▶ library.json + covers/ ─┐
Web-Recherche (Kuratierung)  ──────────▶ recommendations.json  ───┤
                                                                  ▼
                                              GitHub-Repo ──▶ GitHub Pages (Dashboard)
                                                                  ▲            │
Geplanter Claude-Lauf (PC, Di+Fr) ── liest Wünsche, kuratiert, pusht            │ fetch/save
                                          ▲                                     ▼
                                          └────────── Cloudflare Worker + KV (Sync-State)
```

### 3.1 GitHub-Repo (`audible-dashboard`)

```
index.html          – App-Shell (eine Seite, fünf Bereiche)
app.css / app.js    – Design + Logik, Vanilla, kein Framework, kein Build
data/library.json   – Bibliothek (Quelle der Wahrheit)
data/recommendations.json – kuratierter Empfehlungspool (~60–100 Titel)
data/meta.json      – Zeitstempel letzter Lauf, nächster geplanter Lauf, Profil-Kurzfassung
covers/<asin>.jpg   – verkleinerte Cover
manifest.webmanifest + icons/ – Installierbarkeit
docs/superpowers/…  – Spec + Plan
tools/              – Auslese-/Update-Helfer (Node-Skripte), laufen nur lokal
```

**Datensatz Bibliothek** (pro Buch): `asin`, `titel`, `autor`, `sprecher`, `serie`, `band`,
`dauer_min`, `genre` (kuratiert), `cover` (Pfad), `audible_url`, `hinzugefuegt` (falls auslesbar).

**Datensatz Empfehlung**: `id`, `asin` (aus der Audible-URL; Basis für den Abgleich
„inzwischen gekauft → aus Wunschliste raus"), `titel`, `autor`, `sprecher`, `begruendung` (persönlicher Satz),
`tags` = {`genres[]`, `stimmung[]`, `laenge`: kurz|mittel|episch}, `aehnlich_wie` (ASIN-Bezug),
`audible_url`, `regal` (serien-fortsetzung | lieblingsautor | geschmacks-match | wunsch-antwort),
`aufgenommen_am`.

### 3.2 Cloudflare Worker + KV (Sync)

- Endpunkte: `GET /state`, `PUT /state` — ein JSON-Objekt, Limit 100 KB.
- Auth: Familien-PIN im Header; Worker vergleicht mit Secret. **PIN steht nirgends im Repo.**
  Jedes Gerät fragt ihn einmalig ab und merkt ihn im localStorage.
- State: `{ version, favorites: [asin], wishlist: [empfehlungs-id], gehoert: [empfehlungs-id],
  wishes: [{text, datum, status: offen|beantwortet}] }`.
- Konflikte: im Normalbetrieb Last-write-wins — jede Änderung schreibt sofort den ganzen State
  (eine Hauptnutzerin, Risiko akzeptiert). Nur nach einer Offline-Phase gilt die Merge-Regel
  aus Abschnitt 7.
- Offline/Fehler: localStorage als Cache; UI zeigt dezent „nicht synchronisiert".

### 3.3 Geplanter Auffrisch-Lauf (lokal auf dem Dauerbetriebs-PC)

- Windows Task Scheduler startet Di + Fr um 07:30 einen headless Claude-Lauf (`claude -p` mit
  festem Auftrag-Prompt; Details im Implementierungsplan).
- Ablauf: KV-State lesen → offene Wünsche + Herzen auswerten → Geschmacksprofil
  aktualisieren → gezielt recherchieren → `recommendations.json` auffrischen (Wunsch-Antworten
  in eigenes Regal, Wünsche im KV auf „beantwortet" setzen) → `meta.json` stempeln →
  committen + pushen.
- Bibliotheks-Refresh (neue Käufe) läuft halbautomatisch auf Zuruf des Auftraggebers,
  da die Audible-Session im echten Chrome liegt; wenn der geplante Lauf Chrome-Zugriff hat,
  darf er es zusätzlich versuchen, sonst überspringt er still.

## 4. Dashboard: Aufbau & Verhalten

Eine Seite, fünf Bereiche (mobile: untereinander mit Sprungnavigation; Desktop: großzügiges Grid):

1. **Kopf:** Begrüßung, Kernzahlen (Anzahl Bücher, Gesamthörzeit), Stand „Zuletzt aufgefrischt /
   nächster Lauf" aus `meta.json`.
2. **Mal wieder hören:** täglich wechselnder Favorit (deterministisch aus Datum + Favoritenliste,
   kein Zufalls-Flackern), mit „Lange nicht gehört: Zeit für …?".
3. **Bibliothek:** Cover-Grid, Sofort-Suche (Titel/Autor/Sprecher, tippfehlertolerant),
   Filter-Chips (Genre, Serie, nur ♥), Sortierung (Titel, Autor, Dauer, Neueste). Herz-Toggle am
   Cover. Tipp aufs Cover → Detailkarte (großes Cover, Serie/Band, Sprecher, Dauer, Audible-Link).
   Lazy Loading der Bilder.
4. **Entdecken:** Kuratierte Regale in fester Reihenfolge: „Deine Wünsche" (falls beantwortet),
   „Fortsetzungen deiner Serien", „Neues von deinen Autoren/Sprechern", „Weil du ♥ … liebst",
   „Frisch entdeckt". Darunter der **Finder**: Chips für Stimmung, Genre, Länge + „Ähnlich wie …"
   (Auswahl aus Favoriten); filtert den Pool live. Jede Karte: Cover-Platzhalter oder Cover,
   Begründungs-Satz, Merken-Button (→ Wunschliste), „Kenn ich schon"-Button (blendet aus),
   Audible-Link (neuer Tab).
5. **Wunschliste + Statistiken:** Merkliste mit Abhaken („gekauft" → Glückwunsch-Hinweis,
   verschwindet beim nächsten Bibliotheks-Refresh automatisch, da dann in der Bibliothek);
   Statistiken: Gesamthörzeit, Genre-Verteilung (Donut), Top-5-Autoren, Top-5-Sprecher,
   Rekorde (längstes/kürzestes Buch). Charts nach dataviz-Richtlinien.

**Wünsch dir was:** eigener Block in „Entdecken": Freitextfeld + „Frische Vorschläge anfordern".
Zeigt offene Wünsche mit Status. Erwartungstext: „Wird beim nächsten Lauf (Datum) beantwortet."

## 5. Empfehlungslogik (Kuratierung durch Claude)

Geschmacksprofil aus: Genres/Autoren/Sprecher-Häufigkeit der Bibliothek, Herzen (stark gewichtet),
Serien mit offenen Fortsetzungen, beantwortete/abgelehnte Vorschläge („Kenn ich schon" zählt
als schwaches Negativ-Signal). Recherche über Audible-Katalogseiten und Web. Jede Empfehlung
muss auf audible.de existieren (Link geprüft), erhält genau ein Regal und eine persönliche
Begründung. Keine Preisangaben (veralten). Pool gedeckelt auf ~100; Älteres rotiert raus,
Wunschlisten-Einträge bleiben immer erhalten.

## 6. Design-Sprache

Warmes, cover-zentriertes Dunkel-Design, Audible-Orange (#f8991c-Nähe) als Akzent, edle
Typografie, sanfte Übergänge, große Touch-Ziele. Automatische Hell/Dunkel-Anpassung
(prefers-color-scheme), beides gepflegt. Look „persönliche Bibliothek", nicht „Verkaufsseite".
Namentliche Begrüßung der Nutzerin (Name wird vor dem Bau erfragt).

## 7. Grenzen, Fehlerfälle, Risiken

- **Audible-Login abgelaufen:** Auslese meldet sich, Auftraggeber loggt kurz ein, weiter.
- **Audible-Markup ändert sich:** Auslese-Helfer ist bewusst simpel gehalten und wird bei Bruch
  angepasst; Dashboard funktioniert davon unabhängig weiter.
- **Fehlende Cover:** Platzhalter-Karte mit Farbverlauf (Hash aus Titel) + Titeltext.
- **Worker nicht erreichbar:** localStorage-Fallback, dezenter Hinweis, kein Datenverlust
  (Merge bei Wiederverbindung: Vereinigungsmenge der Herzen; Wunschlisten-Löschungen gewinnen).
- **PIN öffentlich?** Nein — PIN nur im Worker-Secret + Geräte-localStorage, nie im Repo.
- **Öffentliches Repo:** Bibliotheksliste einsehbar; akzeptiert. Keine echten Namen im Repo
  über den Vornamen der Begrüßung hinaus, keine Konto-/Maildaten.
- **16-MB-/Größen-Fragen:** entfallen (kein Artifact); Repo-Budget: 300 Cover ≈ 6 MB, unkritisch.

## 8. Abnahme-Tests

1. Mobil (375 px) + Desktop: alle fünf Bereiche bedienbar, keine horizontale Scrollleiste.
2. Herz setzen auf Gerät A → erscheint nach Reload auf Gerät B (Sync-Beweis).
3. Wunsch absenden → steht im KV; simulierter Lauf beantwortet ihn → Regal „Deine Wünsche" gefüllt.
4. Stichprobe 10 Audible-Links (Bibliothek + Empfehlungen) öffnen korrekt.
5. Hell/Dunkel beide sauber; Installierbarkeit auf Android/iOS geprüft.
6. Worker abgeklemmt → Seite bleibt voll nutzbar (lokaler Modus, Hinweis sichtbar).

## 9. Bewusst NICHT enthalten (YAGNI)

Echtzeit-Empfehlungen auf Knopfdruck, Preise/Angebote, Hörstatistik-Import aus Audible
(Hördauer je Buch ist nicht zuverlässig auslesbar), Mehrbenutzer-Profile, Service Worker /
Offline-Cache, Bewertungssterne, Login außer PIN.

## 10. Offene Punkte für den Implementierungsplan

- Vorname der Nutzerin für die Begrüßung (vor Bau erfragen)
- GitHub-Konto/`gh`-CLI-Verfügbarkeit auf diesem PC prüfen; Repo-Name final
- Cloudflare-Konto: existiert eines? Wrangler-Login einmalig nötig
- Bibliotheksgröße (zeigt sich bei der Auslese; Design skaliert bis ~1000 Titel)
- Genau ein Obsidian-Anker: Projektnotiz `10 Projekte/Audible-Dashboard.md` (typ/status/
  naechster_schritt) mit URL, PIN-Ablageort-Hinweis (nicht der PIN selbst), Betriebs-Doku
