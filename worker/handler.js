const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Pin",
};
const LEERER_STATE = { version: 0, favorites: [], wishlist: [], gehoert: [], wishes: [] };
const json = (objekt, status) =>
  new Response(JSON.stringify(objekt), { status, headers: { "Content-Type": "application/json", ...CORS } });

export async function behandle(request, umgebung) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (new URL(request.url).pathname !== "/state") return json({ fehler: "unbekannter Pfad" }, 404);
  if (request.headers.get("X-Pin") !== umgebung.PIN) return json({ fehler: "PIN falsch" }, 401);
  if (request.method === "GET") {
    const roh = await umgebung.KV.get("state");
    return json(roh ? JSON.parse(roh) : LEERER_STATE, 200);
  }
  if (request.method === "PUT") {
    const text = await request.text();
    if (text.length > 100_000) return json({ fehler: "State zu groß" }, 413);
    let daten;
    try { daten = JSON.parse(text); } catch { return json({ fehler: "kein gültiges JSON" }, 400); }
    if (!Array.isArray(daten.favorites)) return json({ fehler: "favorites fehlt" }, 422);
    await umgebung.KV.put("state", JSON.stringify(daten));
    return json({ ok: true }, 200);
  }
  return json({ fehler: "Methode nicht erlaubt" }, 405);
}
