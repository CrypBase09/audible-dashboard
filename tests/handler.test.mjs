import test from "node:test";
import assert from "node:assert/strict";
import { behandle } from "../worker/handler.js";

function umgebung() {
  const speicher = new Map();
  return { PIN: "123456", KV: { get: async (k) => speicher.get(k) ?? null, put: async (k, v) => speicher.set(k, v) } };
}
const anfrage = (methode, pin, body) =>
  new Request("https://w.example/state", { method: methode, headers: pin ? { "X-Pin": pin } : {}, body, duplex: "half" });

test("OPTIONS liefert 204 mit CORS", async () => {
  const r = await behandle(new Request("https://w.example/state", { method: "OPTIONS" }), umgebung());
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), "*");
});
test("falscher PIN → 401; unbekannter Pfad → 404", async () => {
  assert.equal((await behandle(anfrage("GET", "999999"), umgebung())).status, 401);
  const r = await behandle(new Request("https://w.example/quatsch", { method: "GET", headers: { "X-Pin": "123456" } }), umgebung());
  assert.equal(r.status, 404);
});
test("GET ohne Daten liefert leeren State", async () => {
  const r = await behandle(anfrage("GET", "123456"), umgebung());
  assert.deepEqual((await r.json()).favorites, []);
});
test("PUT speichert, GET liest zurück; kaputtes JSON → 400; zu groß → 413", async () => {
  const env = umgebung();
  const state = JSON.stringify({ version: 1, favorites: ["A"], wishlist: [], gehoert: [], wishes: [] });
  assert.equal((await behandle(anfrage("PUT", "123456", state), env)).status, 200);
  assert.deepEqual((await (await behandle(anfrage("GET", "123456"), env)).json()).favorites, ["A"]);
  assert.equal((await behandle(anfrage("PUT", "123456", "{kaputt"), env)).status, 400);
  assert.equal((await behandle(anfrage("PUT", "123456", `{"favorites":["${"x".repeat(100001)}"]}`), env)).status, 413);
});
