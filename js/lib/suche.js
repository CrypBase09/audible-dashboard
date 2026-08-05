export function normalisiere(text) {
  return (text ?? "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function maxEinsAbstand(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return diff + (a.length - i) + (b.length - j) <= 1;
}

export function sucheBuecher(buecher, anfrage) {
  const q = normalisiere(anfrage).trim();
  if (!q) return buecher;
  const tokens = q.split(/\s+/);
  return buecher.filter((b) => {
    const feld = normalisiere([b.titel, b.autor, b.sprecher, b.serie].filter(Boolean).join(" "));
    const woerter = feld.split(/\s+/);
    return tokens.every((t) =>
      feld.includes(t) || (t.length >= 5 && woerter.some((w) => maxEinsAbstand(t, w)))
    );
  });
}
