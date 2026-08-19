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

test("renders the first step of the Keepstorm start flow", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Keepstorm<\/title>/i);
  assert.match(html, /KEEPSTORM/);
  assert.match(html, /Alpha 0\.6\.6/);
  assert.match(html, /keepstorm-banner-v1\.png/);
  assert.doesNotMatch(html, /Your buildings spawn units on their own/);
  assert.match(html, /Start a game/);
  assert.match(html, /Play against the AI/);
  assert.match(html, /Online with 2 players/);
  assert.match(html, /Online with 2 teams of 2/);
  assert.doesNotMatch(html, /<button(?=[^>]*data-mode="1v1")(?=[^>]*disabled="")[^>]*>/);
  assert.doesNotMatch(html, /<button(?=[^>]*data-mode="2v2")(?=[^>]*disabled="")[^>]*>/);
  assert.doesNotMatch(html, /Testing soon/);
  assert.match(html, /Join a game/);
  assert.match(html, /Enter a code from a friend/);
  assert.doesNotMatch(html, /<button(?=[^>]*data-mode="join")(?=[^>]*disabled="")[^>]*>/);
  assert.match(html, /How to play/);
  assert.match(html, /<meta property="og:image" content="https:\/\/keepstorm\.com\/og\.png"\/>/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/keepstorm\.com\/og\.png"\/>/);
  assert.match(html, /<meta(?=[^>]*name="viewport")(?=[^>]*content="[^"]*width=device-width[^"]*")[^>]*>/);
  assert.match(html, /<meta(?=[^>]*name="viewport")(?=[^>]*content="[^"]*initial-scale=1[^"]*")[^>]*>/);
  assert.match(html, /<meta name="theme-color" content="#0d120e"\/>/);
  assert.doesNotMatch(html, /maximum-scale=1|user-scalable=no/);
  assert.doesNotMatch(html, /localhost(?::\d+)?\/og\.png/);
  assert.match(html, /keepstorm-crest-v1\.png/);
  assert.match(html, /favicon\.ico/);
  assert.match(html, /apple-touch-icon\.png/);
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest"\/>/);
  assert.match(html, /<meta name="apple-mobile-web-app-capable" content="yes"\/>/);
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="Keepstorm"\/>/);
  assert.match(html, /<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"\/>/);
  assert.doesNotMatch(html, /Daybreak Company|Briarcrown Covenant|Stormglass Collegium/);
  assert.doesNotMatch(html, /Build the answer|Time the march|TEAM ALPHA|DOCTRINE|ARSENAL|AUTHORITATIVE ROOM/);
  assert.doesNotMatch(html, /Heartkeep|Stormbreak/);
  assert.doesNotMatch(html, /Your site is taking shape|SkeletonPreview|react-loading-skeleton/);
});
