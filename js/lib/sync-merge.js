export const LEERER_STATE = { version: 0, favorites: [], wishlist: [], gehoert: [], wishes: [] };

export function mergeState(lokal, remote, tombstones = { wishlist: [] }) {
  if (!lokal && !remote) return { ...LEERER_STATE };
  if (!remote) return { ...lokal };
  if (!lokal) return { ...remote };
  const uniq = (arr) => [...new Set(arr)];
  const wishes = new Map();
  for (const w of [...(remote.wishes ?? []), ...(lokal.wishes ?? [])]) {
    const vorhanden = wishes.get(w.id);
    wishes.set(w.id, vorhanden?.status === "beantwortet" ? vorhanden : w);
  }
  return {
    version: Math.max(lokal.version ?? 0, remote.version ?? 0),
    favorites: uniq([...(remote.favorites ?? []), ...(lokal.favorites ?? [])]),
    wishlist: uniq([...(remote.wishlist ?? []), ...(lokal.wishlist ?? [])])
      .filter((id) => !(tombstones.wishlist ?? []).includes(id)),
    gehoert: uniq([...(remote.gehoert ?? []), ...(lokal.gehoert ?? [])]),
    wishes: [...wishes.values()],
  };
}
