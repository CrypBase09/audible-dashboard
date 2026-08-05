function zaehle(buecher, schluessel) {
  const m = new Map();
  for (const b of buecher) {
    const wert = b[schluessel];
    if (wert) m.set(wert, (m.get(wert) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([name, anzahl]) => ({ name, anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl || a.name.localeCompare(b.name, "de"));
}

export function berechneStatistik(buecher) {
  const mitDauer = buecher.filter((b) => (b.dauer_min ?? 0) > 0);
  return {
    anzahl: buecher.length,
    gesamt_min: buecher.reduce((s, b) => s + (b.dauer_min ?? 0), 0),
    genres: zaehle(buecher, "genre"),
    topAutoren: zaehle(buecher, "autor").slice(0, 5),
    topSprecher: zaehle(buecher, "sprecher").slice(0, 5),
    laengstes: mitDauer.reduce((a, b) => (b.dauer_min > (a?.dauer_min ?? -1) ? b : a), null),
    kuerzestes: mitDauer.reduce((a, b) => (b.dauer_min < (a?.dauer_min ?? Infinity) ? b : a), null),
  };
}

export function formatiereDauer(min) {
  const std = Math.floor(min / 60);
  if (std >= 100) return `${std.toLocaleString("de-DE")} Std.`;
  return `${std} Std. ${min % 60} Min.`;
}
