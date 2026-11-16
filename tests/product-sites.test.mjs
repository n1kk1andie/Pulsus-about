// The product sites served at about<app>.pulsus.tech (vercel.json rewrites the
// host to /sites/<app>/). Each page is one static file: every local asset it
// names exists under its own folder, "Try Demo" opens that app's demo
// registration, "Sign in" goes to the app, and the suite footer is present.
// Run: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const SITES = [
  { key: "quality", page: "quality", name: "Quality", signin: "https://quality.pulsus.tech/login", demo: "demo-quality.pulsus.tech" },
  { key: "cash", page: "cash", name: "Cash", signin: "https://cash.pulsus.tech/login", demo: "demo-cash.pulsus.tech" },
  { key: "panorama", page: "panorama", name: "Panorama", signin: "https://panorama.pulsus.tech/login", demo: "demo-panorama.pulsus.tech" },
  { key: "risk", page: "risk", name: "Risk", signin: "https://risk.pulsus.tech/login", demo: "demo-risk.pulsus.tech" },
  { key: "accord", page: "accord", name: "Accord", signin: "https://stats.pulsus.tech/login", demo: "demo-stats.pulsus.tech" },
  { key: "talent", page: "talent", name: "Talent", signin: "https://talent.pulsus.tech/login", demo: "demo-talent.pulsus.tech" },
  { key: "recon", page: "recon", name: "Recon", signin: "https://recon.pulsus.tech/login", demo: "demo-recon.pulsus.tech" },
  { key: "cx", page: "cx", name: "CX", signin: "https://cx.pulsus.tech/login", demo: "demo-cx.pulsus.tech", es: true },
  { key: "cx", page: "cx/en", name: "CX", signin: "https://cx.pulsus.tech/login", demo: "demo-cx.pulsus.tech" },
];
const vercel = JSON.parse(readFileSync(new URL("vercel.json", ROOT), "utf8"));

for (const s of SITES) {
  const html = readFileSync(new URL(`sites/${s.page}/index.html`, ROOT), "utf8");
  const site = `https://about${s.key}.pulsus.tech/`;

  test(`${s.page}: every local asset exists in the site's own folder`, () => {
    const refs = [...html.matchAll(/(?:src|href|content)="(\/[^"#?]*)"/g)].map((m) => m[1]).filter((p) => p !== "/" && p !== "/en/");
    assert.ok(refs.length >= 3);
    for (const p of refs) {
      assert.ok(p.startsWith(`/sites/${s.key}/assets/`), `${p} is outside /sites/${s.key}/assets/`);
      assert.ok(existsSync(new URL(p.slice(1), ROOT)), `${p} is missing`);
    }
  });

  test(`${s.page}: Try Demo registers for the demo; Sign in goes to the app`, () => {
    const demo = `https://executive.pulsus.tech/demo/register?app=${s.key}&amp;next=${encodeURIComponent(`https://${s.demo}/`)}`;
    assert.ok(html.includes(`href="${demo}"`), "Try Demo link");
    assert.ok(html.includes(`href="${s.signin}"`), "Sign in link");
  });

  test(`${s.page}: one h1, canonical, Open Graph image, footer, zoom allowed`, () => {
    assert.equal(html.match(/<h1\b/g).length, 1);
    assert.ok(html.includes(`<link rel="canonical" href="${s.page.endsWith("/en") ? site + "en/" : site}">`), "canonical");
    const og = html.match(/<meta property="og:image" content="([^"]+)"/)[1];
    assert.ok(og.startsWith(`${site}sites/${s.key}/assets/`));
    assert.ok(existsSync(new URL(og.slice(site.length), ROOT)), "og image exists");
    const footer = s.es
      ? ["Pulsus CX · Parte de Pulsus Intelligence Suite", "Un producto de Tumblehill Labs, estudio de productos de Tumblehill Holdings LLC."]
      : [`Pulsus ${s.name} · Part of the Pulsus Intelligence Suite`, "A product of Tumblehill Labs, a product studio of Tumblehill Holdings LLC."];
    for (const line of footer) assert.ok(html.includes(line), line);
    assert.ok(!/user-scalable\s*=\s*no|maximum-scale/i.test(html), "pinch-zoom stays allowed");
    assert.ok(!/Tumblehill Holdings LLC Product|plain (english|language)/i.test(html));
  });

  test(`${s.page}: the about${s.key} host is routed to the page`, () => {
    const r = vercel.rewrites.find((x) => x.source === (s.page.endsWith("/en") ? "/en/" : "/") && x.has?.[0]?.value === `about${s.key}.pulsus.tech`);
    assert.ok(r, "host rewrite");
    assert.equal(r.destination, `/sites/${s.page}/index.html`);
  });
}
