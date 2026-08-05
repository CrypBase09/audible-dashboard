const VERGLEICHE = {
  titel: (a, b) => a.titel.localeCompare(b.titel, "de"),
  autor: (a, b) => a.autor.localeCompare(b.autor, "de"),
  dauer: (a, b) => (b.dauer_min ?? 0) - (a.dauer_min ?? 0),
  neueste: (a, b) => (b.hinzugefuegt ?? "").localeCompare(a.hinzugefuegt ?? ""),
};

export function filterBibliothek(buecher, opt = {}) {
  let res = buecher;
  if (opt.genre) res = res.filter((b) => b.genre === opt.genre);
  if (opt.serie) res = res.filter((b) => b.serie === opt.serie);
  if (opt.nurFavoriten) res = res.filter((b) => (opt.favoriten ?? []).includes(b.asin));
  return [...res].sort(VERGLEICHE[opt.sortierung] ?? VERGLEICHE.titel);
}

export function filterEmpfehlungen(pool, opt = {}, gehoert = []) {
  return pool.filter((e) => {
    if (gehoert.includes(e.id)) return false;
    if (opt.stimmung && !e.tags.stimmung.includes(opt.stimmung)) return false;
    if (opt.genre && !e.tags.genres.includes(opt.genre)) return false;
    if (opt.laenge && e.tags.laenge !== opt.laenge) return false;
    if (opt.aehnlichWie && e.aehnlich_wie !== opt.aehnlichWie) {
      if (!(opt.aehnlichWieGenre && e.tags.genres.includes(opt.aehnlichWieGenre))) return false;
    }
    return true;
  });
}
