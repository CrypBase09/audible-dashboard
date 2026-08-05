import { WORKER_URL } from "./config.js";
import { mergeState } from "./lib/sync-merge.js";

function status(text, warnung = false) {
  const el = document.getElementById("sync-status");
  el.textContent = text;
  el.className = warnung ? "warnung" : "";
}

export function fragePinAb() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "pin-overlay";
    overlay.innerHTML = `<form class="pin-box">
      <h2>Familien-PIN</h2>
      <p class="gedaempft">Einmalig eingeben — dieses Gerät merkt ihn sich.</p>
      <input name="pin" inputmode="numeric" autocomplete="one-time-code" placeholder="6-stelliger PIN" required>
      <button class="primaer">Los geht’s</button></form>`;
    overlay.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const pin = new FormData(e.target).get("pin").trim();
      localStorage.setItem("hb:pin", pin);
      overlay.remove();
      resolve(pin);
    });
    document.body.append(overlay);
    overlay.querySelector("input").focus();
  });
}

async function anfrage(methode, pin, body) {
  const r = await fetch(`${WORKER_URL}/state`, {
    method: methode,
    headers: { "X-Pin": pin, ...(body ? { "Content-Type": "application/json" } : {}) },
    body,
  });
  if (r.status === 401) throw new Error("pin");
  if (!r.ok) throw new Error(`http ${r.status}`);
  return r.json();
}

export async function initSync(App) {
  if (!WORKER_URL) { status(""); return; }
  let pin = localStorage.getItem("hb:pin") ?? (await fragePinAb());

  App.syncSpeichern = async (state) => {
    try {
      await anfrage("PUT", pin, JSON.stringify(state));
      localStorage.removeItem("hb:pending");
      status("✓ synchron");
      return true;
    } catch {
      localStorage.setItem("hb:pending", "1");
      status("⚠ nicht synchronisiert — Änderungen bleiben vorerst auf diesem Gerät", true);
      return false;
    }
  };

  while (true) {
    try {
      const remote = await anfrage("GET", pin);
      let tombstones = { wishlist: [] };
      try { tombstones = JSON.parse(localStorage.getItem("hb:tombstones")) ?? tombstones; } catch {}
      if (localStorage.getItem("hb:pending")) {
        App.zustand = mergeState(App.zustand, remote, tombstones);
        await App.syncSpeichern(App.zustand);
        localStorage.removeItem("hb:tombstones");
      } else {
        App.zustand = mergeState(null, remote);
      }
      status("✓ synchron");
      document.dispatchEvent(new CustomEvent("zustand-geaendert"));
      return;
    } catch (fehler) {
      if (fehler.message === "pin") { localStorage.removeItem("hb:pin"); pin = await fragePinAb(); continue; }
      status("⚠ gerade offline — deine Änderungen bleiben auf diesem Gerät", true);
      return;
    }
  }
}
