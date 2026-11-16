// Search: titles and descriptions buyers search for, structured data (JSON-LD),
// robots.txt and sitemap.xml per host, and the cross-links between the sites.
// Run: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const vercel = JSON.parse(read("vercel.json"));
const APPS = ["quality", "cash", "panorama", "risk", "accord", "cx", "talent", "recon", "tech", "communique"];
const NAMES = { quality: "Quality", cash: "Cash", panorama: "Panorama", risk: "Risk", accord: "Accord", cx: "CX", talent: "Talent", recon: "Recon", tech: "Tech", communique: "Communiqué" };
// [site folder, language, path on its host]
const PAGES = APPS.flatMap((a) => [[a, a === "cx" ? "es" : "en", ""]])
  .concat([["cx/en", "en", "en/"], ["panorama/es", "es", "es/"], ["talent/es", "es", "es/"]]);

const ENT = { amp: "&", quot: '"', lt: "<", gt: ">", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", mdash: "—", ndash: "–", hellip: "…", rarr: "→", larr: "←", times: "×", middot: "·" };
const unescape = (s) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m));
const text = (s) => unescape(s.replace(/<\/(li|p|ol|ul)>/g, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const meta = (html, re) => unescape(html.match(re)?.[1] ?? "");
const jsonld = (html) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
const nodes = (html) => jsonld(html).flatMap((d) => d["@graph"] ?? [d]);

for (const [dir, lang, sub] of PAGES) {
  const app = dir.split("/")[0];
  const brand = `Pulsus ${NAMES[app]}`;
  const host = `https://about${app}.pulsus.tech/`;
  const story = read(`sites/${dir}/index.html`);
  const storyTitle = meta(story, /<title>(.*?)<\/title>/);
  const descriptor = storyTitle.slice(brand.length + 3);

  for (const plans of [false, true]) {
    const html = plans ? read(`sites/${dir}/plans/index.html`) : story;
    const page = `${dir}${plans ? "/plans" : ""}`;

    test(`${page}: search title, description and Open Graph match`, () => {
      const title = meta(html, /<title>(.*?)<\/title>/);
      const desc = meta(html, /<meta name="description" content="([^"]*)">/);
      assert.ok(title.startsWith(`${brand} · `), title);
      if (plans) assert.equal(title, `${brand} · ${lang === "es" ? "Precios, planes y funciones" : "Pricing, plans & features"}`);
      else assert.ok(/software/i.test(title), "names what it is: software");
      assert.ok(title.length <= 68, `title is ${title.length} characters`);
      assert.ok(desc.length >= 130 && desc.length <= 170, `description is ${desc.length} characters`);
      assert.equal(meta(html, /<meta property="og:title" content="([^"]*)">/), title);
      assert.equal(meta(html, /<meta property="og:description" content="([^"]*)">/), desc);
      assert.ok(!/plain (english|language)|noindex/i.test(html));
    });

    test(`${page}: no keyword line in the footer; plans FAQ says what it is`, () => {
      assert.ok(!html.includes('class="kw"'), "footer stays as designed");
      if (!plans) return;
      const q = lang === "es" ? `¿Qué es ${brand}?` : `What is ${brand}?`;
      const first = text(html.match(/<details[^>]*>\s*<summary[^>]*>(.*?)<\/summary>(.*?)<\/details>/s)?.[0] ?? "");
      assert.ok(first.startsWith(q), "first FAQ asks what it is");
      const d = descriptor.replace(/ & /g, lang === "es" ? " y " : " and ").split(/[ ,]/)[0];
      assert.ok(first.toLowerCase().includes(d.toLowerCase()), `answer names it: ${d}`);
    });

    test(`${page}: structured data`, () => {
      const all = nodes(html);
      const app_ = all.find((n) => n["@type"] === "SoftwareApplication");
      assert.ok(app_);
      assert.equal(app_.name, brand);
      assert.equal(app_.applicationCategory, "BusinessApplication");
      assert.equal(app_.operatingSystem, "Web");
      assert.equal(app_.url, host + sub);
      assert.equal(app_.image, meta(html, /<meta property="og:image" content="([^"]+)"/));
      assert.ok(app_.description.length > 50);
      assert.deepEqual(app_.publisher, { "@type": "Organization", name: "Tumblehill Labs", parentOrganization: { "@type": "Organization", name: "Tumblehill Holdings LLC" } });
      assert.ok(!/aggregateRating|"review/i.test(JSON.stringify(all)), "no ratings or reviews");
      if (!plans) {
        assert.equal(app_.offers, undefined, "prices only on the plans page");
        assert.ok(!/\$\d|price/i.test(JSON.stringify(all)));
        return;
      }
      const o = app_.offers;
      assert.equal(o.priceCurrency, "USD");
      assert.equal(o.priceSpecification["@type"], "UnitPriceSpecification");
      assert.equal(o.priceSpecification.price, o.price);
      const shown = Number(o.price).toLocaleString(lang === "es" ? "de-DE" : "en-US");
      assert.ok(html.includes(`$${shown}`), `price $${shown} is on the page`);
      assert.equal(o.url, app === "accord" ? "https://aboutpanorama.pulsus.tech/plans/" : `${host}${sub}plans/`);
      const faq = all.find((n) => n["@type"] === "FAQPage");
      const onPage = [...html.matchAll(/<details[^>]*>\s*<summary[^>]*>(.*?)<\/summary>(.*?)<\/details>/gs)].map((m) => [text(m[1]), text(m[2])]);
      assert.ok(onPage.length >= 5);
      assert.deepEqual(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), onPage, "FAQ text exactly as shown");
    });
  }
}

test("about.pulsus.tech home: Organization and WebSite", () => {
  const all = nodes(read("index.html"));
  const org = all.find((n) => n["@type"] === "Organization");
  assert.equal(org.name, "Tumblehill Labs");
  assert.equal(org.parentOrganization.name, "Tumblehill Holdings LLC");
  assert.equal(all.find((n) => n["@type"] === "WebSite")?.url, "https://about.pulsus.tech/");
});

const SITEMAPS = [["about", "about.pulsus.tech"], ...APPS.map((a) => [`about${a}`, `about${a}.pulsus.tech`])];
test("no robots.txt or sitemap.xml at the root, where it would answer for every host", () => {
  assert.ok(!existsSync(new URL("robots.txt", ROOT)) && !existsSync(new URL("sitemap.xml", ROOT)));
});

for (const [key, host] of SITEMAPS) {
  test(`${host}: robots.txt and sitemap.xml are routed and list real pages`, () => {
    for (const f of ["robots.txt", "sitemap.xml"]) {
      const r = vercel.rewrites.find((x) => x.source === `/${f}` && x.has?.[0]?.type === "host" && x.has[0].value === host);
      assert.equal(r?.destination, `/seo/${key}/${f}`);
    }
    const robots = read(`seo/${key}/robots.txt`);
    assert.match(robots, /User-agent: \*\nAllow: \//);
    assert.ok(!/Disallow: \//.test(robots));
    assert.ok(robots.includes(`Sitemap: https://${host}/sitemap.xml`));
    const xml = read(`seo/${key}/sitemap.xml`);
    const urls = [...xml.matchAll(/<url>(.*?)<\/url>/gs)].map((m) => m[1]);
    assert.ok(urls.length >= 2);
    for (const u of urls) {
      const loc = u.match(/<loc>(.*?)<\/loc>/)[1];
      assert.ok(loc.startsWith(`https://${host}/`), loc);
      assert.ok(u.includes("<lastmod>2026-11-16</lastmod>"));
      const path = new URL(loc).pathname;
      const file = key === "about" ? `${path.slice(1)}index.html` : `sites/${key.slice(5)}/${path.slice(1)}index.html`;
      const html = read(file);
      assert.ok(html.includes(`<link rel="canonical" href="${loc}">`), `${file} canonical is ${loc}`);
      for (const [, lang, href] of u.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g))
        assert.ok(html.includes(`hreflang="${lang}" href="${href}"`), `${file} hreflang ${lang}`);
    }
  });
}

test("every product page is in its sitemap", () => {
  for (const [dir, , sub] of PAGES) {
    const app = dir.split("/")[0];
    const xml = read(`seo/about${app}/sitemap.xml`);
    for (const p of ["", "plans/"]) assert.ok(xml.includes(`<loc>https://about${app}.pulsus.tech/${sub}${p}</loc>`), `${dir} ${p}`);
  }
});

test("nothing blocks indexing except the Webby links", () => {
  for (const h of vercel.headers ?? []) {
    if (h.headers.some((x) => /x-robots-tag/i.test(x.key))) assert.equal(h.source, "/webby/:path*");
  }
});

test("each product site links to every other in its footer; the suite home links to all of them", () => {
  for (const [dir] of PAGES) for (const p of ["", "plans/"]) {
    const html = read(`sites/${dir}/${p}index.html`);
    const foot = html.match(/<footer class="suitefoot".*?<\/footer>/s)[0];
    for (const a of APPS) if (a !== dir.split("/")[0]) assert.ok(foot.includes(`href="https://about${a}.pulsus.tech/"`), `${dir}/${p} → ${a}`);
    assert.ok(/<span class="np">Pulsus Connect<\/span>/.test(foot) && /<span class="np">Pulsus Credit Insight<\/span>/.test(foot));
  }
  for (const f of ["index.html", "products/index.html"]) for (const a of APPS) assert.ok(read(f).includes(`href="https://about${a}.pulsus.tech/"`), `${f} → ${a}`);
});
