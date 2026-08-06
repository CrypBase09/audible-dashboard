export const PROFILE = ["sie", "er"];
export const LEERES_PROFIL = { meine: [], lieblinge: [], wishlist: [], gehoert: [], abgelehnt: [], wishes: [] };
export const LEERER_STATE = { version: 0, profile: { sie: { ...LEERES_PROFIL }, er: { ...LEERES_PROFIL } }, frisch: [] };

const liste = (wert) => (Array.isArray(wert) ? [...wert] : []);

function normalisiereProfil(roh) {
  return {
    meine: liste(roh?.meine),
    lieblinge: liste(roh?.lieblinge),
    wishlist: liste(roh?.wishlist),
    gehoert: liste(roh?.gehoert),
    abgelehnt: liste(roh?.abgelehnt),
    wishes: liste(roh?.wishes),
  };
}

// Nimmt sowohl das v2-Schema als auch einen flachen v1-State entgegen.
// v1-Markierungen landen bei „sie", weil das Dashboard vor v2 nur ihr gehörte.
export function normalisiereState(roh) {
  const state = {
    version: Number(roh?.version) || 0,
    profile: {
      sie: normalisiereProfil(roh?.profile?.sie),
      er: normalisiereProfil(roh?.profile?.er),
    },
    frisch: liste(roh?.frisch),
  };
  if (!roh?.profile && roh) {
    state.profile.sie = {
      ...state.profile.sie,
      meine: liste(roh.favorites),
      wishlist: liste(roh.wishlist),
      gehoert: liste(roh.gehoert),
      wishes: liste(roh.wishes),
    };
  }
  return state;
}

export function holeProfil(state, name) {
  return state.profile[PROFILE.includes(name) ? name : "sie"];
}

function schalte(feld, wert, an) {
  const i = feld.indexOf(wert);
  if (an && i < 0) feld.push(wert);
  if (!an && i >= 0) feld.splice(i, 1);
}

export function setzeHerz(state, profilName, asin, an) {
  const p = holeProfil(state, profilName);
  schalte(p.meine, asin, an);
  if (!an) schalte(p.lieblinge, asin, false);
}

export function setzeStern(state, profilName, asin, an) {
  const p = holeProfil(state, profilName);
  schalte(p.lieblinge, asin, an);
  if (an) schalte(p.meine, asin, true);
}

export function hatMarkierungen(state, profilName) {
  return holeProfil(state, profilName).meine.length > 0;
}
