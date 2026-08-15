import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

register(new URL("./cloudflare-workers-loader.mjs", import.meta.url), import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the Keepstorm alpha title experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Keepstorm — Build the answer\. Time the march\.<\/title>/i);
  assert.match(html, /KEEPSTORM/);
  assert.match(html, /Build the answer\./);
  assert.match(html, /Daybreak Company/);
  assert.match(html, /MULTIPLAYER ALPHA/);
  assert.match(html, /Three asymmetric factions/);
  assert.match(html, /Twenty-four structures/);
  assert.match(html, /Fifteen ability-driven cohorts/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /Heartkeep|Stormbreak/);
  assert.doesNotMatch(html, /Your site is taking shape|SkeletonPreview|react-loading-skeleton/);
});
