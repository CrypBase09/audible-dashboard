export function setzeWelt(profil) {
  document.documentElement.dataset.welt = profil;
  const farbe = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", farbe);
}

export function frageProfilAb({ erzwingen = false, aktuell = null }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "profil-wahl";
    overlay.innerHTML = `<div class="profil-wahl-inner">
      <h1>Wer hört heute?</h1>
      <p>Jede Auswahl hat eigene Bücher, eigene Vorschläge und ihr eigenes Aussehen.</p>
      <div class="profil-karten">
        <button class="profil-karte" data-profil="sie"><strong>Für sie</strong><span>Samt und Rosé</span></button>
        <button class="profil-karte" data-profil="er"><strong>Für ihn</strong><span>Nachtblau und Cyan</span></button>
      </div>
    </div>`;
    // Vorschau: Antippen zeigt die Farbwelt sofort, bevor entschieden wird.
    for (const knopf of overlay.querySelectorAll(".profil-karte")) {
      knopf.addEventListener("pointerenter", () => setzeWelt(knopf.dataset.profil));
      knopf.addEventListener("click", () => {
        const gewaehlt = knopf.dataset.profil;
        setzeWelt(gewaehlt);
        overlay.remove();
        resolve(gewaehlt);
      });
    }
    if (erzwingen && aktuell) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) { setzeWelt(aktuell); overlay.remove(); resolve(aktuell); }
      });
    }
    document.body.append(overlay);
  });
}
