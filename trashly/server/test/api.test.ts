import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/http/server.ts";
import { ScheduleService } from "../src/services/schedule-service.ts";
import { FileStore } from "../src/store/file-store.ts";
import { createProviders } from "../src/providers/index.ts";
import { mockHttp } from "./helpers.ts";

async function withServer(fn: (base: string) => Promise<void>) {
  const { http } = mockHttp(() => ({ status: 503, body: "" }));   // wszystkie źródła „leżą”
  const store = new FileStore(null);
  const svc = new ScheduleService(createProviders({ http, store }), store);
  const srv = createServer(createApp(svc));
  await new Promise<void>(r => srv.listen(0, r));
  try { await fn(`http://127.0.0.1:${(srv.address() as AddressInfo).port}`); }
  finally { srv.close(); }
}
const post = (base: string, path: string, body: unknown) =>
  fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("API: lista miast z możliwościami integracji", () => withServer(async (b) => {
  const r = await (await fetch(`${b}/api/cities`)).json();
  assert.deepEqual(r.cities.map((c: { id: string }) => c.id).sort(), ["jastrzebie", "poznan", "rybnik", "warszawa", "zory"]);
  assert.equal(r.cities.find((c: { id: string }) => c.id === "rybnik").capabilities.schedule, "NOT_INTEGRATED");
}));

test("API: walidacja wejścia", () => withServer(async (b) => {
  assert.equal((await post(b, "/api/resolve", { city: "krakow", street: "Rynek", number: "1" })).status, 422);
  assert.equal((await post(b, "/api/resolve", { city: "zory", street: "", number: "1" })).status, 400);
  assert.equal((await post(b, "/api/resolve", { city: "zory", street: "Rynek", number: "1; drop" })).status, 400);
  assert.equal((await post(b, "/api/resolve", { city: "zory", street: "<script>", number: "1" })).status, 400);
  assert.equal((await fetch(`${b}/api/nope`)).status, 404);
}));

test("API: awaria źródeł nie wywraca serwera – czytelny błąd po polsku", () => withServer(async (b) => {
  const r = await post(b, "/api/resolve", { city: "warszawa", street: "Krucza", number: "3" });
  assert.equal(r.status, 502);
  const j = await r.json();
  assert.match(j.error, /źródł/i);
  assert.equal((await fetch(`${b}/api/health`)).status, 200);
}));

test("API: przewodnik działa niezależnie od harmonogramów", () => withServer(async (b) => {
  const r = await (await fetch(`${b}/api/guide?q=karton%20mleko`)).json();
  assert.equal(r.items[0].category, "plastik");
  const s = await (await fetch(`${b}/api/guide?q=sloik`)).json();
  assert.equal(s.items[0].category, "szklo");
}));

test("API: serwuje frontend, ale nie pliki spoza katalogu", () => withServer(async (b) => {
  assert.equal((await fetch(`${b}/`)).status, 200);
  assert.equal((await fetch(`${b}/assets/logo-mark.png`)).status, 200);
  assert.equal((await fetch(`${b}/server/src/http/server.ts`)).status, 404);
  assert.equal((await fetch(`${b}/assets/../server/data/guide.json`)).status, 404);
}));
