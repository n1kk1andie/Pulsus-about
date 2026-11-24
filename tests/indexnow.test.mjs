// IndexNow: the key file must answer at the root of every host this project
// serves, untouched by host rewrites, redirects or the middleware.
// Run: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import middleware, { config } from "../middleware.js";
import { KEY, HOSTS, APPS, parseSitemap, onHost, urlsFor } from "../scripts/indexnow.mjs";

const ROOT = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const vercel = JSON.parse(read("vercel.json"));
const PATH = `/${KEY}.txt`;
const OUR_HOSTS = HOSTS.filter((h) => h !== "explore.pulsus.tech");

test("key is 32 hex characters and the root file holds exactly the key", () => {
  assert.match(KEY, /^[0-9a-f]{32}$/);
  assert.equal(read(`${KEY}.txt`), KEY);
});

test("every Pulsus marketing host is covered", () => {
  assert.equal(APPS.length, 11);
  for (const h of ["about.pulsus.tech", "pulsus.tech", "aboutcx.pulsus.tech", "abouttech.pulsus.tech", "aboutconnect.pulsus.tech"]) assert.ok(HOSTS.includes(h), h);
});

test("no rewrite or redirect in vercel.json catches the key file on any host", () => {
  // Only a root-level wildcard ("/:x", "/(...)") or the exact path could catch it.
  const png = /^pulsus-[a-z-]+\.png$/; // the one root-level pattern in use
  for (const rule of [...vercel.rewrites, ...vercel.redirects]) {
    const s = rule.source;
    assert.notEqual(s, PATH);
    if (s === "/:file(pulsus-[a-z-]+\\.png)") assert.ok(!png.test(PATH.slice(1)));
    else assert.ok(!/^\/[:(]/.test(s), `${s} is a root wildcard; check it against ${PATH}`);
  }
});

test("middleware leaves the key file alone on every host", () => {
  assert.equal(config.matcher, "/");
  for (const h of OUR_HOSTS) assert.equal(middleware(new Request(`https://${h}${PATH}`)), undefined, h);
});

test("the key file is deployed (not in .vercelignore)", () => {
  const ignored = read(".vercelignore").split("\n").map((l) => l.trim()).filter(Boolean);
  assert.ok(!ignored.some((p) => PATH.slice(1).startsWith(p.replace(/^\//, "")) || p === "*.txt"));
  assert.ok(ignored.includes("scripts/"), "the submit script stays out of the deployment");
});

test("sitemap parsing keeps page URLs on the host and follows sitemap indexes", async () => {
  const files = {
    "https://about.pulsus.tech/sitemap.xml": `<sitemapindex><sitemap><loc>https://about.pulsus.tech/pages.xml</loc></sitemap><sitemap><loc>https://aboutcx.pulsus.tech/sitemap.xml</loc></sitemap></sitemapindex>`,
    "https://about.pulsus.tech/pages.xml": `<urlset><url><loc> https://about.pulsus.tech/ </loc></url><url><loc>https://about.pulsus.tech/a?x=1&amp;y=2</loc></url></urlset>`,
    "https://aboutcx.pulsus.tech/sitemap.xml": `<urlset><url><loc>https://aboutcx.pulsus.tech/</loc></url></urlset>`,
  };
  const fake = async (u) => (files[u] ? { status: 200, body: files[u] } : { status: 404, body: "" });
  assert.deepEqual(await urlsFor("about.pulsus.tech", fake), ["https://about.pulsus.tech/", "https://about.pulsus.tech/a?x=1&y=2"]);
  assert.deepEqual(parseSitemap(read("seo/about/sitemap-index.xml")).urls, []);
  assert.equal(parseSitemap(read("seo/about/sitemap-index.xml")).sitemaps.length, 12);
  assert.equal(onHost("https://about.pulsus.tech/x", "pulsus.tech"), false);
});
