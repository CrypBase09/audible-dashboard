export function malWiederHeute(datumIso, favoriten) {
  if (!favoriten?.length) return null;
  let h = 0;
  for (const zeichen of datumIso) h = (h * 31 + zeichen.charCodeAt(0)) >>> 0;
  return favoriten[h % favoriten.length];
}
