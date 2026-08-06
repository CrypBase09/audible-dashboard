export function platzhalterStil(titel) {
  let h = 0;
  for (const z of titel) h = (h * 31 + z.charCodeAt(0)) >>> 0;
  const ton = h % 360;
  return `background:linear-gradient(160deg,hsl(${ton} 42% 34%),hsl(${(ton + 40) % 360} 48% 22%))`;
}

export function buchKarte(buch, { herz = false, stern = false } = {}) {
  const el = document.createElement("article");
  el.className = "buch";
  el.innerHTML = `
    <div class="cover" style="${platzhalterStil(buch.titel)}">
      <img src="${buch.cover}" alt="" loading="lazy">
      <span class="cover-titel">${buch.titel}</span>
      <div class="marken">
        <button class="marke herz" data-asin="${buch.asin}" aria-pressed="${herz}"
          aria-label="${herz ? "Aus meinen Büchern entfernen" : "Zu meinen Büchern"}">${herz ? "♥" : "♡"}</button>
        <button class="marke stern" data-asin="${buch.asin}" aria-pressed="${stern}"
          aria-label="${stern ? "Kein Liebling mehr" : "Als Liebling markieren"}">${stern ? "★" : "☆"}</button>
      </div>
    </div>
    <h3>${buch.titel}</h3>
    <p class="gedaempft">${buch.autor}</p>`;
  el.querySelector("img").addEventListener("error", (e) => e.target.remove());
  return el;
}

export function chipLeiste(werte, aktiv, beiKlick) {
  const leiste = document.createElement("div");
  leiste.className = "chips";
  for (const wert of werte) {
    const chip = document.createElement("button");
    chip.className = "chip" + (wert === aktiv ? " aktiv" : "");
    chip.textContent = wert;
    chip.addEventListener("click", () => beiKlick(wert === aktiv ? null : wert));
    leiste.append(chip);
  }
  return leiste;
}

export function oeffneModal(inhalt) {
  const dialog = document.createElement("dialog");
  dialog.className = "modal";
  dialog.append(inhalt);
  const schliessen = document.createElement("button");
  schliessen.textContent = "Schließen";
  schliessen.className = "modal-zu";
  dialog.append(schliessen);
  const weg = () => { dialog.close(); dialog.remove(); };
  schliessen.addEventListener("click", weg);
  dialog.addEventListener("cancel", weg);
  dialog.addEventListener("close", () => dialog.remove());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) weg(); });
  document.body.append(dialog);
  dialog.showModal();
}
