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
  { key: "cx", page: "cx", name: "CX", signin: "https://cx.pulsus.tech/login", demo: "demo-cx.pulsus.tech" },
  { key: "cx", page: "cx/es", name: "CX", signin: "https://cx.pulsus.tech/login", demo: "demo-cx.pulsus.tech", es: true },
  { key: "panorama", page: "panorama/es", name: "Panorama", signin: "https://panorama.pulsus.tech/login", demo: "demo-panorama.pulsus.tech", es: true },
  { key: "talent", page: "talent/es", name: "Talent", signin: "https://talent.pulsus.tech/login", demo: "demo-talent.pulsus.tech", es: true },
];
const vercel = JSON.parse(readFileSync(new URL("vercel.json", ROOT), "utf8"));

for (const s of SITES) {
  const html = readFileSync(new URL(`sites/${s.page}/index.html`, ROOT), "utf8");
  const site = `https://about${s.key}.pulsus.tech/`;

  test(`${s.page}: every local asset exists in the site's own folder`, () => {
    const refs = [...html.matchAll(/(?:src|href|content)="(\/[^"#?]*)"/g)].map((m) => m[1]).filter((p) => !["/", "/en/", "/es/", "/plans/", "/en/plans/", "/es/plans/"].includes(p));
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
    const sub = s.page.includes("/") ? s.page.split("/")[1] + "/" : "";
    assert.ok(html.includes(`<link rel="canonical" href="${site}${sub}">`), "canonical");
    const og = html.match(/<meta property="og:image" content="([^"]+)"/)[1];
    assert.ok(og.startsWith(`${site}sites/${s.key}/assets/`));
    assert.ok(existsSync(new URL(og.slice(site.length), ROOT)), "og image exists");
    const footer = s.es
      ? [`Pulsus ${s.name} · Parte de Pulsus Intelligence Suite`, "Un producto de Tumblehill Labs, estudio de productos de Tumblehill Holdings LLC."]
      : [`Pulsus ${s.name} · Part of the Pulsus Intelligence Suite`, "A product of Tumblehill Labs, a product studio of Tumblehill Holdings LLC."];
    for (const line of footer) assert.ok(html.includes(line), line);
    assert.ok(!/user-scalable\s*=\s*no|maximum-scale/i.test(html), "pinch-zoom stays allowed");
    assert.ok(!/Tumblehill Holdings LLC Product|plain (english|language)/i.test(html));
  });

  test(`${s.page}: the about${s.key} host is routed to the page`, () => {
    const r = vercel.rewrites.find((x) => x.source === (s.page.includes("/") ? `/${s.page.split("/")[1]}/` : "/") && x.has?.[0]?.value === `about${s.key}.pulsus.tech`);
    assert.ok(r, "host rewrite");
    assert.equal(r.destination, `/sites/${s.page}/index.html`);
  });
}

// Plans & features: the second page of a product site (Quality first).
const PLANS = [
  { key: "quality", dir: "quality", price: ["$500 a month", "$50 each", "Assurance", "$1,000 a month"], gone: ["$250", "$30 each"] },
  { key: "cash", dir: "cash", price: ["$407", "$29", "$59"] },
  { key: "panorama", dir: "panorama", price: ["$750 a month", "No charge per person for up to 50 people", "Pulsus Panorama + Accord", "Pulsus Panorama and Pulsus Accord together for $1,000 a month."], gone: ["$500", "Accord included", "covers both"] },
  { key: "risk", dir: "risk", price: ["$750 a month", "$75 each", "Assurance", "$1,000 a month"], gone: ["$350", "$40 each", "$500"] },
  { key: "accord", dir: "accord", price: ["$500 a month", "$50 each", "Pulsus Panorama + Accord", "Pulsus Panorama and Pulsus Accord together for $1,000 a month."], gone: ["included with Pulsus Panorama", "comes with", "for both products together"] },
  { key: "talent", dir: "talent", price: ["$11"] },
  { key: "recon", dir: "recon", price: ["$500", "$400", "$300", "$3,800"] },
  { key: "cx", dir: "cx", price: [] },
  { key: "cx", dir: "cx/es", price: [] },
  { key: "panorama", dir: "panorama/es", price: ["US$750 al mes", "Sin cargo por persona hasta 50 personas", "Pulsus Panorama + Accord", "Pulsus Panorama y Pulsus Accord juntos por US$1.000 al mes."], gone: ["US$500", "Accord incluido", "cubren ambos"] },
  { key: "talent", dir: "talent/es", price: ["US$11"] },
  { key: "tech", dir: "tech", price: ["$750", "$75", "base:750", "extra:75", "$1,275"], gone: ["$500", "$50 each", "base:500"] },
  { key: "communique", dir: "communique", price: ["$500 a month", "+$50 a month", "$20 a block", "$15 each"], gone: ["$200", "users are $20"] },
  { key: "connect", dir: "connect", price: ["US$15,000", "US$1,250 a month", "US$50 per extra user", "US$25,000", "US$2,083.33 a month", "US$40 per extra user", "US$12,000", "US$1", "Contact sales", "signup?product=connect\"", "signup?product=connectpro\"", "US$34,800", "US$34,800"] },
];
for (const { key, dir, price, gone = [] } of PLANS) {
  const html = readFileSync(new URL(`sites/${dir}/plans/index.html`, ROOT), "utf8");
  const story = readFileSync(new URL(`sites/${dir}/index.html`, ROOT), "utf8");
  const en = dir.includes("/") ? dir.split("/")[1] + "/" : "";
  test(`${dir}/plans: assets, one h1, canonical, prices, links both ways, routed`, () => {
    for (const m of html.matchAll(/(?:src|href)="(\/sites\/[^"#?]*)"/g)) assert.ok(existsSync(new URL(m[1].slice(1), ROOT)), `${m[1]} is missing`);
    assert.equal(html.match(/<h1\b/g).length, 1);
    assert.ok(html.includes(`<link rel="canonical" href="https://about${key}.pulsus.tech/${en}plans/">`));
    for (const p of price) assert.ok(html.includes(p), `price ${p}`);
    for (const p of gone) assert.ok(!html.includes(p) && !story.includes(p), `old price ${p} still shown`);
    const band = story.match(/<section class="pband".*?<\/section>/s)?.[0] ?? "";
    assert.ok(band && !/\$\d/.test(band), "prices belong on the plans page only, not the story page's band");
    assert.ok(/href="\/((en|es)\/)?"/.test(html) && story.includes(`href="/${en}plans/"`), "story <-> plans links");
    for (const src of [`/${en}plans`, `/${en}plans/`]) {
      const r = vercel.rewrites.find((x) => x.source === src && x.has?.[0]?.value === `about${key}.pulsus.tech`);
      assert.equal(r?.destination, `/sites/${dir}/plans/index.html`);
    }
  });
}
