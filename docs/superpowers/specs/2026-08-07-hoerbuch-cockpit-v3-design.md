# Design v3: Entdecken zuerst — Suche als Herzstück, Bibliothek als Geschmacksquelle

**Datum:** 2026-08-07 · **Status:** Freigegeben · Baut auf v2 auf
(`2026-08-06-hoerbuch-cockpit-v2-design.md`).

## Leitgedanke

Das Dashboard ist ein **Entdeckungswerkzeug**, keine Bibliotheksverwaltung. Die eigene
Bibliothek dient dazu, den Geschmack zu erfassen — sie ist Mittel, nicht Zweck. Die
Reihenfolge der Seite bildet das ab.

## 1. Neue Seitenreihenfolge

| # | Bereich | Inhalt |
|---|---|---|
| 1 | Kopf | Begrüßung, Profilumschalter, Zeile „N Vorschläge · zuletzt aufgefrischt …" |
| 2 | **Für dich gefunden** | Die kuratierten Regale — Hauptbereich |
| 3 | **Finde etwas Neues** | Die erweiterte Suche (siehe §2) |
| 4 | Deine Merkliste | Gemerkte Vorschläge |
| 5 | Mal wieder hören | Tagesvorschlag aus den Sternen |
| 6 | Deine Bibliothek | Eingeklappt; enthält Suche, Filter, Grid **und die Statistiken** |

Die Bibliothek wird ein natives Aufklapp-Element (`<details>`), Zusammenfassungszeile:
„Deine Bibliothek · N Bücher · zum Markieren aufklappen". **Offen**, solange das Profil keine
Markierung hat (Markieren ist dann der erste Schritt), sonst **geschlossen**. Der Zustand wird
nicht gespeichert — er ergibt sich jedes Mal neu aus dem Markierungsstand.

Die Kopf-Kennzahlen verlieren ihre Prominenz: statt drei Kacheln nur noch eine ruhige Zeile.
Die Zahlen zur Bibliothek (Anzahl, Hörzeit, Lieblinge) stehen künftig **in** der Bibliothek.

## 2. Die Suche — ein Bereich statt zwei

„Wünsch dir was" entfällt als eigener Kasten und geht in der Suche auf: Beides war eine Art,
etwas zu verlangen; zwei Wege dafür sind einer zu viel.

**Sieben Auswahlgruppen**, alle als Chips, alle mehrfach wählbar außer Länge und Ähnlich-wie:

| Gruppe | Feld | Werte |
|---|---|---|
| Stimmung | `stimmung` | spannend, herzerwärmend, witzig, düster, entspannend |
| Anlass | `anlass` | zum Einschlafen, fürs Auto, beim Bügeln, mit den Kindern, lange Reise |
| Thema | `themen` | Familie, Ruhrpott, Beziehung, Alltag, Reisen, Tiere, Politik, Wissenschaft, Geschichte, Krimi-Fälle |
| Erzählform | `form` | Lesung, Hörspiel, Bühnenprogramm, Podcast |
| Sprecher | `sprecher` | die häufigsten Sprecher der markierten Bücher als Chips + Freitextfeld |
| Länge | `laenge` | kurz, mittel, episch (einfach) |
| Ähnlich wie | `aehnlich_wie` | Auswahl aus den markierten Büchern (einfach) |

Dazu ein Freitextfeld „sonst noch etwas?".

**Verhalten:**

1. Jede Änderung filtert **sofort** den vorhandenen Vorrat; die Trefferzahl steht über der Liste.
2. Darunter steht **immer** der Knopf „Danach richtig suchen" — auch bei Treffern, denn der
   Vorrat ist klein und Audible groß. Bei null Treffern wird er hervorgehoben und der Text
   erklärt das: „Im Vorrat ist nichts dabei — soll ich richtig danach suchen?"
3. Der Knopf erzeugt aus der Auswahl **einen lesbaren Auftragssatz** und legt ihn als Wunsch
   (`status: "offen"`) im Profil ab. Der bestehende Wunsch-Wächter übernimmt ihn wie bisher.
   Beispiel: „Hörspiel zum Einschlafen, Thema Ruhrpott, gesprochen von Uve Teschner, kurz,
   ähnlich wie Die Känguru-Chroniken."
4. Offene Aufträge erscheinen unter der Suche mit Status, wie bisher; der Knopf zeigt dann
   „Suche läuft …" und die Seite pollt alle 30 Sekunden.

**Filter-Semantik:** Innerhalb einer Gruppe ODER (mehrere Themen = eines genügt), zwischen
Gruppen UND. Ein leeres Suchformular zeigt keine Trefferliste — dann sind die Regale oben dran.

## 3. Erweiterte Schlagworte

Das Empfehlungs-Schema bekommt drei Felder in `tags`:

```
tags: { genres[], stimmung[], laenge, themen[], anlass[], form }
```

- `themen`: 1–3 Werte aus der Themenliste (§2), frei erweiterbar durch spätere Läufe.
- `anlass`: 0–3 Werte; leer ist erlaubt, wenn nichts eindeutig passt.
- `form`: genau ein Wert aus Lesung / Hörspiel / Bühnenprogramm / Podcast.

Alle 76 vorhandenen Vorschläge werden einmalig nachgepflegt. `tools/pruefe-daten.mjs`
prüft die neuen Felder mit; `form` und `themen` sind Pflicht, `anlass` optional.

**Rückwärtskompatibilität:** Fehlen die Felder (alter Eintrag aus dem Sofort-Speicher), wird
der Eintrag weiter angezeigt, fällt aber aus Filtern für die fehlenden Gruppen heraus — er
verschwindet nicht.

## 4. Besitz-Erkennung härten

Heute blendet die Laufzeitregel Vorschläge aus, deren ASIN in `library.json` steht — das gilt
bereits für **alle** Bibliothekstitel, markiert oder nicht (an den echten Daten geprüft:
null Überschneidung bei 76 Vorschlägen gegen 67 Bücher).

**Lücke:** Führt Audible dasselbe Buch als neue Ausgabe unter anderer ASIN (andere Sprecher,
Neuauflage), greift der ASIN-Abgleich nicht. Deshalb kommt ein **normalisierter Titelabgleich**
dazu: Titel kleingeschrieben, Untertitel nach dem ersten Doppelpunkt abgeschnitten, Umlaute
und Satzzeichen vereinheitlicht. Stimmt der so normalisierte Titel **und** mindestens ein
Autorenname überein, gilt das Buch als besessen. Der Autorenvergleich verhindert Fehlalarme
bei Allerweltstiteln.

## 5. Täglicher Lauf

`HoerbuchRefresh` läuft künftig **täglich 07:30** statt dienstags und freitags.

Anpassungen im Auftrag (`tools/refresh-prompt.md`):
- Pool-Deckel steigt von 100 auf **150**.
- Rotation: `geschmacks-match` älter als **vier Wochen** (statt sechs) fliegt raus, sofern auf
  keiner Merkliste und nicht abgelehnt.
- **Wechselnder Blickwinkel je Wochentag**, damit nicht täglich dieselbe Ecke abgegrast wird:
  Mo Neuerscheinungen · Di ein Thema, das im Vorrat unterrepräsentiert ist · Mi ein Sprecher
  aus den markierten Büchern · Do Hörspiele und Bühnenprogramme · Fr Serien und Fortsetzungen ·
  Sa etwas für die Kinder oder gemeinsam · So etwas Ruhiges zum Einschlafen.
- Neue Einträge bekommen `themen`, `anlass` und `form` gleich mit.

Der Wunsch-Wächter (alle 3 Minuten) bleibt unverändert.

## 6. Betroffene Dateien

- `js/lib/empfehlungs-filter.js` — Titelabgleich, erweiterte Filtergruppen
- `js/lib/suchauftrag.js` (neu) — erzeugt den Auftragssatz aus der Auswahl
- `js/lib/daten-schema.js` + `tools/pruefe-daten.mjs` — neue Pflichtfelder
- `js/ui/entdecken.js` — Regale und Suche getrennt, sieben Gruppen, Nachsuch-Knopf
- `js/ui/bibliothek.js` — Aufklapp-Element, Statistiken hinein
- `js/ui/wunschliste.js` — Statistiken wandern zur Bibliothek
- `js/app.js` + `index.html` — neue Reihenfolge, schlanker Kopf
- `css/basis.css` — Aufklapp-Element, Suchbereich
- `data/recommendations.json` — Schlagworte nachgepflegt
- `tools/refresh-prompt.md` — täglicher Takt, Blickwinkel, Deckel

## 7. Abnahme v3

1. Reihenfolge stimmt; Bibliothek startet bei markiertem Profil geschlossen, bei leerem offen.
2. Statistiken erscheinen in der Bibliothek, nicht mehr als eigener Bereich.
3. Alle sieben Suchgruppen filtern; Kombination aus zwei Gruppen greift als UND.
4. „Danach richtig suchen" erzeugt einen lesbaren Auftrag, der Wächter beantwortet ihn.
5. Ein Bibliothekstitel unter anderer ASIN wird über den Titelabgleich ausgeblendet (Test).
6. Täglicher Lauf registriert, Probelauf erfolgreich, Blickwinkel im Auftrag hinterlegt.
7. Alle Tests grün, `pruefe-daten.mjs` sauber, beide Welten auf 375 px ohne Querlauf.

## 8. Bewusst nicht enthalten

Volltextsuche über Audible aus dem Browser (geht nicht ohne Server), gespeicherte Suchen,
Benachrichtigung bei neuen Treffern, Sortierung der Vorschläge nach Bewertung.
