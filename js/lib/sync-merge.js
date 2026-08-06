import { PROFILE, normalisiereState } from "./profil.js";

export const LEERE_TOMBSTONES = { sie: { wishlist: [] }, er: { wishlist: [] } };

const RANG = { offen: 0, in_arbeit: 1, beantwortet: 2 };

const uniq = (...listen) => [...new Set(listen.flat())];

function mergeProfil(lokal, remote, tombstones) {
  const wishes = new Map();
  for (const w of [...remote.wishes, ...lokal.wishes]) {
    const bisher = wishes.get(w.id);
    if (!bisher || (RANG[w.status] ?? 0) > (RANG[bisher.status] ?? 0)) wishes.set(w.id, w);
  }
  const geloescht = tombstones?.wishlist ?? [];
  return {
    meine: uniq(remote.meine, lokal.meine),
    lieblinge: uniq(remote.lieblinge, lokal.lieblinge),
    wishlist: uniq(remote.wishlist, lokal.wishlist).filter((id) => !geloescht.includes(id)),
    gehoert: uniq(remote.gehoert, lokal.gehoert),
    abgelehnt: uniq(remote.abgelehnt, lokal.abgelehnt),
    wishes: [...wishes.values()],
  };
}

export function mergeState(lokalRoh, remoteRoh, tombstones = LEERE_TOMBSTONES) {
  const lokal = normalisiereState(lokalRoh);
  const remote = normalisiereState(remoteRoh);
  const frisch = new Map();
  for (const f of [...remote.frisch, ...lokal.frisch]) frisch.set(f.id, f);
  const profile = {};
  for (const name of PROFILE) {
    profile[name] = mergeProfil(lokal.profile[name], remote.profile[name], tombstones?.[name]);
  }
  return { version: Math.max(lokal.version, remote.version), profile, frisch: [...frisch.values()] };
}
