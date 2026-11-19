// Pulsus Connect's story site (aboutconnect.pulsus.tech → /sites/connect/).
// It follows the product-site rules (its own assets, Try Demo, Sign in, search
// metadata, robots and sitemap, the host routing and the suite footer), and its
// prices live only on /plans/ (sites/connect/plans/), checked below and in
// product-sites.test.mjs and seo.test.mjs.
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
  const refs = [...html.matchAll(/(?:src|href|content)="(\/[^"#?]*)"/g)].map((m) => m[1]).filter((p) => p !== "/" && p !== "/plans/");
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
  assert.match(html, /<h1 id="hero-h">The payment was approved\. <span>So where is it\?<\/span><\/h1>/);
  // the pain first: one payment's week, scroll by scroll; the product arrives only as the answer
  const caps = [...html.matchAll(/<div class="cap" data-ch="(\d)"><p class="day">([^<]*)<\/p><h2>([\s\S]*?)<\/h2>/g)].map((m) => [m[2], m[3].replace(/<[^>]+>/g, "")]);
  assert.deepEqual(caps.map((c) => c[0]), ["Monday · 10:40", "Tuesday · 09:12", "Wednesday · 14:05", "Thursday · 16:30", "What actually happened", "With Pulsus Connect"]);
  assert.equal(caps[4][1], "It arrived on Tuesday. Nobody could see it.");
  assert.ok(!/Pulsus Connect/.test(caps.slice(0, 5).map((c) => c[1]).join(" ")), "the product is not named before the answer");
  // the story plays by itself in the opening screen, beside the headline; the page scrolls normally
  assert.doesNotMatch(html, /height:\d{3}vh|position:sticky;top:var/, "no scroll-jacked story");
  assert.ok(html.indexOf('id="caps"') < html.indexOf('id="map"') && html.indexOf('id="map"') < html.indexOf('id="member"'));
  assert.match(html, /<button class="pp" id="pp" type="button" aria-label="Pause">/);
  assert.equal((html.match(/class="pdot"/g) || []).length, 6);
  assert.match(html, /header\{position:sticky;top:0/, "the Pulsus header stays on screen");
  for (const id of ["story", "member", "views", "keys", "route", "start"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.doesNotMatch(html, /class="stage"|id="grip"/, "its own design, not another product site's");
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

test("plans page: three editions in Connect's look, US dollars, the agreed figures", () => {
  const plans = read("sites/connect/plans/index.html");
  assert.ok(html.includes('<a href="/plans/">Plans &amp; features</a></nav>'), "Pricing in the story's nav");
  assert.match(plans, /:root\{--paper:#f5f6f8;--ink:#0b1f4d;--night:#071538/, "Connect's own colours");
  assert.match(plans, /<span class="prod"><span>CONNECT<\/span><\/span>/);
  assert.match(plans, /header\{position:sticky;top:0/);
  assert.doesNotMatch(plans, /member/i, "customers, never members");
  assert.doesNotMatch(plans, /fiserv|signature \(cif/i, "no vendor or bank system named on a public page");
  assert.doesNotMatch(plans, /€|£|EUR|GBP|JMD|TTD|J\$/, "USD only");
  for (const p of ["US$15,000", "US$1,250 a month", "US$25,000", "US$2,083.33 a month", "US$12,000", "US$1</p>", "500 payments a month included", "1,000 payments a month included", "US$0.90", "From US$21,000 a year", "From US$37,000 a year", "unused payments expire"]) assert.ok(plans.includes(p), p);
  assert.ok(plans.includes('href="https://executive.pulsus.tech/signup?product=connect"'));
  assert.ok(plans.includes('href="https://executive.pulsus.tech/signup?product=connectpro"'));
  assert.ok(plans.includes('href="mailto:support@pulsus.tech?subject=Pulsus%20Connect%20Enterprise">Contact sales'));
  assert.match(plans, /<article class="ed hi"[^>]*>\s*<p class="badge">Recommended<\/p>\s*<p class="ename" id="ed-pro">Professional/, "Professional highlighted");
  // worked example: Essential, 8 users, 3 connections (the starter pack), 1,500 payments a month
  const lic = 1250 * 12, extra = (8 - 5) * 50 * 12, minimum = 500 * 12, over = (1500 - 500) * 1 * 12, pay = minimum + over, setup = 12000;
  for (const p of ["US$5,000 each for the 4th to 6th", "US$4,500 each from the 7th", "first 3"]) assert.ok(plans.includes(p), p);
  const usd = (n) => `US$${n.toLocaleString("en-US")}`;
  for (const n of [lic, extra, minimum, over, setup, lic + extra + pay + setup, lic + extra + pay]) assert.ok(plans.includes(`<dd>${usd(n)}</dd>`), usd(n));
});
