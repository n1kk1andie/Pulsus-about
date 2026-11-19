// Pulsus Connect's story site (aboutconnect.pulsus.tech → /sites/connect/).
// Connect is sold by walkthrough, so the site has no plans page; otherwise it
// follows the product-site rules: its own assets, Try Demo, Sign in, search
// metadata, robots and sitemap, the host routing and the suite footer.
// Run: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const html = read("sites/connect/index.html");
const vercel = JSON.parse(read("vercel.json"));
const meta = (re) => html.match(re)?.[1] ?? "";

test("every local asset is in the site's own folder", () => {
  const refs = [...html.matchAll(/(?:src|href|content)="(\/[^"#?]*)"/g)].map((m) => m[1]).filter((p) => p !== "/");
  assert.ok(refs.length >= 1);
  for (const p of refs) {
    assert.ok(p.startsWith("/sites/connect/assets/"), p);
    assert.ok(existsSync(new URL(p.slice(1), ROOT)), `${p} is missing`);
  }
  assert.ok(existsSync(new URL("sites/connect/assets/og.png", ROOT)));
});

test("Try Demo registers for Connect's demo; Sign in goes to Connect", () => {
  assert.ok(html.includes('href="https://executive.pulsus.tech/demo/register?app=connect&amp;next=https%3A%2F%2Fdemo-connect.pulsus.tech%2F"'));
  assert.ok(html.includes('href="https://connect.pulsus.tech/">Sign in</a>'));
  assert.ok(html.includes("https://about.pulsus.tech/walkthrough/?app=Connect"));
});

test("leads with the unspoken need: approved, but where is it?", () => {
  assert.match(html, /<h1>Approved\.<\/h1>/);
  assert.match(html, /<p class="h1">But where<br>is it\?<\/p>/);
  for (const id of ["how", "track", "control", "start"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.doesNotMatch(html, /\$\d/, "no prices on the story page");
});

test("search title, description, Open Graph and structured data", () => {
  const title = meta(/<title>(.*?)<\/title>/), desc = meta(/<meta name="description" content="([^"]*)">/);
  assert.ok(title.startsWith("Pulsus Connect · ") && /software/i.test(title) && title.length <= 68, title);
  assert.ok(desc.length >= 130 && desc.length <= 170, `description is ${desc.length}`);
  assert.equal(meta(/<meta property="og:title" content="([^"]*)">/), title);
  assert.equal(meta(/<meta property="og:description" content="([^"]*)">/), desc);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(ld["@type"], "SoftwareApplication");
  assert.equal(ld.url, "https://aboutconnect.pulsus.tech/");
});

test("the host serves the story, robots and sitemap; old links forward", () => {
  const has = (src, dest) => vercel.rewrites.some((r) => r.source === src && r.destination === dest && r.has?.[0]?.value === "aboutconnect.pulsus.tech");
  assert.ok(has("/", "/sites/connect/index.html"));
  assert.ok(has("/robots.txt", "/seo/aboutconnect/robots.txt"));
  assert.ok(has("/sitemap.xml", "/seo/aboutconnect/sitemap.xml"));
  assert.ok(read("seo/aboutconnect/robots.txt").includes("Sitemap: https://aboutconnect.pulsus.tech/sitemap.xml"));
  assert.ok(read("seo/aboutconnect/sitemap.xml").includes("<loc>https://aboutconnect.pulsus.tech/</loc>"));
  assert.ok(read("middleware.js").includes('aboutconnect: "connect"'));
  for (const src of ["/systems/connect", "/systems/connect/"]) assert.equal(vercel.redirects.find((r) => r.source === src)?.destination, "https://aboutconnect.pulsus.tech/");
});

test("the suite footer links to Connect everywhere", () => {
  assert.ok(html.includes('<a href="/" aria-current="page" style="color:#fff">Pulsus Connect</a>'));
  assert.ok(html.includes("Pulsus Connect · Part of the Pulsus Intelligence Suite"));
  assert.ok(read("sites/quality/index.html").includes('<a href="https://aboutconnect.pulsus.tech/">Pulsus Connect</a>'));
});
