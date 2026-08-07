export const SCHRITT = 5;

// Zeigt eine Liste stückweise: erst SCHRITT Einträge, dann auf Knopfdruck jeweils SCHRITT weitere
// — und wieder zurück. Die Zählerstände liegen beim Aufrufer, damit ein Neuzeichnen (etwa nach
// dem Merken eines Titels) die aufgeklappte Liste nicht wieder zusammenfallen lässt.
export function listeMitMehr({ eintraege, gezeigt, karte, beiMehr, klasse = "empf-liste" }) {
  const huelle = document.createDocumentFragment();
  const liste = document.createElement("div");
  liste.className = klasse;
  const sichtbar = eintraege.slice(0, gezeigt);
  liste.append(...sichtbar.map(karte));
  huelle.append(liste);

  const rest = eintraege.length - sichtbar.length;
  const aufgeklappt = gezeigt > SCHRITT && eintraege.length > SCHRITT;
  if (rest <= 0 && !aufgeklappt) return huelle;

  const zeile = document.createElement("div");
  zeile.className = "mehr-zeile";

  if (rest > 0) {
    const mehr = document.createElement("button");
    mehr.className = "mehr-knopf";
    mehr.innerHTML = `${Math.min(SCHRITT, rest)} weitere zeigen <span class="gedaempft">· noch ${rest}</span>`;
    mehr.addEventListener("click", () => beiMehr(gezeigt + SCHRITT));
    zeile.append(mehr);
  }

  if (aufgeklappt) {
    const weniger = document.createElement("button");
    weniger.className = "mehr-knopf weniger";
    weniger.textContent = "wieder einklappen";
    weniger.addEventListener("click", (e) => {
      // Die Überschrift dieses Regals wieder in den Blick holen — sonst steht man nach dem
      // Einklappen im Nichts. Gemerkt wird die Position, nicht das Element: das Neuzeichnen
      // ersetzt den ganzen Bereich, und oberhalb des Regals ändert sich nichts.
      const anker = ueberschriftUeber(e.target.closest(".mehr-zeile"));
      const y = anker ? anker.getBoundingClientRect().top + window.scrollY - 72 : null;
      beiMehr(SCHRITT);
      if (y !== null) window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    });
    zeile.append(weniger);
  }

  huelle.append(zeile);
  return huelle;
}

// Die nächste Überschrift oberhalb der Knopfzeile: bei den Regalen die h3 des Regals,
// bei der Trefferliste der Suche ersatzweise die h2 des Bereichs.
function ueberschriftUeber(zeile) {
  let el = zeile?.previousElementSibling;
  while (el) {
    if (/^H[2-4]$/.test(el.tagName)) return el;
    el = el.previousElementSibling;
  }
  return zeile?.closest("section")?.querySelector("h2") ?? null;
}
