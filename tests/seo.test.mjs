// Search: titles and descriptions buyers search for, structured data (JSON-LD),
// robots.txt and sitemap.xml per host, and the cross-links between the sites.
// Run: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const vercel = JSON.parse(read("vercel.json"));
const APPS = ["quality", "cash", "panorama", "risk", "accord", "cx", "talent", "recon", "tech", "communique", "connect"];
const NAMES = { quality: "Quality", cash: "Cash", panorama: "Panorama", risk: "Risk", accord: "Accord", cx: "CX", talent: "Talent", recon: "Recon", tech: "Tech", communique: "Communiqué", connect: "Connect" };
// [site folder, language, path on its host]
const PAGES = APPS.flatMap((a) => [[a, "en", ""]])
  .concat([["cx/es", "es", "es/"], ["panorama/es", "es", "es/"], ["talent/es", "es", "es/"]]);

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
      const creator = { "@type": "Person", "@id": "https://about.pulsus.tech/#creator", name: "Nicola Anderson", jobTitle: "Founder", sameAs: ["https://www.linkedin.com/in/nicolaanderson/"] };
      // creator and owner live in the metadata only: search engines read them, visitors never see them
      assert.deepEqual(app_.publisher, { "@type": "Organization", name: "Tumblehill Labs", founder: creator, parentOrganization: { "@type": "Organization", name: "Tumblehill Holdings LLC", founder: creator } });
      assert.deepEqual(app_.creator, creator);
      assert.equal(app_.copyrightHolder.name, "Tumblehill Holdings LLC");
      assert.ok(html.includes('<meta name="author" content="Nicola Anderson">'));
      assert.equal(html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<meta[^>]*>/g, "").includes("Nicola Anderson"), false, "not shown on the page");
      assert.ok(!/aggregateRating|"review/i.test(JSON.stringify(all)), "no ratings or reviews");
      if (!plans) {
        // Visible prices stay on the plans page; the home page carries the same
        // offer in its metadata only, so search engines and AI assistants find it.
        const plansHtml = read(`sites/${dir}/plans/index.html`);
        const plansApp = nodes(plansHtml).find((n) => n["@type"] === "SoftwareApplication");
        assert.deepEqual(app_.offers, plansApp.offers, "same offer as the plans page");
        const visible = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<meta[^>]*>/g, "");
        assert.ok(!/\$\s?\d[^<]{0,40}\b(a|per) (month|employee|user)/i.test(visible), "no price shown on the home page");
        return;
      }
      const o = app_.offers;
      assert.equal(o.priceCurrency, "USD");
      assert.equal(o.priceSpecification["@type"], "UnitPriceSpecification");
      assert.equal(o.priceSpecification.price, o.price);
      const shown = Number(o.price).toLocaleString(lang === "es" ? "de-DE" : "en-US");
      assert.ok(html.includes(`$${shown}`), `price $${shown} is on the page`);
      assert.equal(o.url, `${host}${sub}plans/`);
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

// Public marketing pages are open to search engines and AI assistants, so they can
// read and describe the products correctly. Only bulk scrapers are refused, and the
// API, the demo proxy and the Webby links stay out of every crawler's reach.
const WELCOME = ["Googlebot", "Bingbot", "Google-Extended", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai", "PerplexityBot", "Perplexity-User", "Applebot", "Applebot-Extended", "DuckAssistBot", "meta-externalagent"];
const PRIVATE = ["/api/", "/demo", "/webby/", "/_next/", "/config.js"];
function groups(robots) {
  const out = [];
  let cur = null;
  for (const line of robots.split("\n").map((l) => l.replace(/#.*/, "").trim()).filter(Boolean)) {
    const [k, ...v] = line.split(":");
    const key = k.trim().toLowerCase(), val = v.join(":").trim();
    if (key === "user-agent") {
      if (!cur || cur.rules.length) out.push((cur = { agents: [], rules: [] }));
      cur.agents.push(val.toLowerCase());
    } else if (key === "allow" || key === "disallow") cur.rules.push([key, val]);
  }
  return out;
}
function checkRobots(robots, host) {
  const g = groups(robots);
  const named = (ua) => g.find((x) => x.agents.includes(ua.toLowerCase()));
  for (const ua of ["CCBot", "Bytespider"]) assert.deepEqual(named(ua)?.rules, [["disallow", "/"]], `${host} refuses ${ua}`);
  for (const ua of [...WELCOME, "*"]) {
    const rules = named(ua)?.rules;
    assert.ok(rules, `${host} names ${ua}`);
    assert.deepEqual(rules[0], ["allow", "/"], `${host} welcomes ${ua}`);
    assert.ok(!rules.some(([k, v]) => k === "disallow" && v === "/"), `${host} does not block ${ua}`);
    for (const p of PRIVATE) assert.ok(rules.some(([k, v]) => k === "disallow" && v === p), `${host} keeps ${ua} off ${p}`);
  }
}

// Connect's pages were published after the 2026-11-16 refresh of the others.
const LASTMOD = { aboutconnect: "2026-11-19" };
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
    checkRobots(robots, host);
    assert.ok(robots.includes(`Sitemap: https://${host}/sitemap.xml`));
    const xml = read(`seo/${key}/sitemap.xml`);
    const urls = [...xml.matchAll(/<url>(.*?)<\/url>/gs)].map((m) => m[1]);
    assert.ok(urls.length >= 2);
    for (const u of urls) {
      const loc = u.match(/<loc>(.*?)<\/loc>/)[1];
      assert.ok(loc.startsWith(`https://${host}/`), loc);
      assert.ok(u.includes(`<lastmod>${LASTMOD[key] ?? "2026-11-16"}</lastmod>`));
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
    // Connect's own footer marks itself as the current site instead of linking out to itself
    const toConnect = dir === "connect" ? 'href="/" aria-current="page" style="color:#fff">Pulsus Connect<' : 'href="https://aboutconnect.pulsus.tech/"';
    assert.ok(foot.includes(toConnect) && /<span class="np">Pulsus Credit Insight<\/span>/.test(foot));
  }
  for (const f of ["index.html", "products/index.html"]) for (const a of APPS) assert.ok(read(f).includes(`href="https://about${a}.pulsus.tech/"`), `${f} → ${a}`);
});

test("pulsus.tech serves its own robots.txt (same policy) and the suite's llms.txt", () => {
  const r = vercel.rewrites.find((x) => x.source === "/robots.txt" && x.has?.[0]?.value === "pulsus.tech");
  assert.equal(r?.destination, "/seo/pulsus/robots.txt");
  const robots = read("seo/pulsus/robots.txt");
  checkRobots(robots, "pulsus.tech");
  assert.ok(robots.includes("Sitemap: https://about.pulsus.tech/sitemap.xml"));
  assert.equal(vercel.rewrites.find((x) => x.source === "/llms.txt" && x.has?.[0]?.value === "pulsus.tech")?.destination, "/seo/about/llms.txt");
});

for (const [key, host] of SITEMAPS) {
  test(`${host}: llms.txt is routed and describes the product from its own pages`, () => {
    const r = vercel.rewrites.find((x) => x.source === "/llms.txt" && x.has?.[0]?.type === "host" && x.has[0].value === host);
    assert.equal(r?.destination, `/seo/${key}/llms.txt`);
    const llms = read(`seo/${key}/llms.txt`);
    const app = key.slice(5);
    const name = key === "about" ? "Pulsus Platform" : `Pulsus ${NAMES[app]}`;
    assert.ok(llms.startsWith(`# ${name}\n\n> `), "title, then a one-line summary");
    assert.ok(llms.includes(`official website of ${key === "about" ? "the Pulsus Intelligence Suite" : name}`));
    assert.ok(llms.includes(`https://${host}/`));
    assert.ok(!/\b(\d+|eleven|twelve|thirteen) (applications|apps)\b/i.test(llms), "no app count");
    assert.ok(!/Meridian/.test(llms), "no client names");
    assert.ok(llms.includes("Developed by Tumblehill Labs, the applied intelligence research and engineering division of Tumblehill Holdings, founded by Nicola Anderson (publishing as Nicola Onju Isak), researcher, former PwC Director, former financial services Chief Operating Officer and institutional transformation executive.\n\nLinkedIn: https://linkedin.com/in/nicolaanderson\n"), "names its creator");
    assert.equal((llms.match(/Nicola/g) || []).length, 2, "creator named only in the Creator section (name and publishing name)");
    if (key === "about") {
      assert.ok(/no public price/i.test(llms));
      for (const a of APPS) assert.ok(llms.includes(`](https://about${a}.pulsus.tech/)`), `links to ${a}`);
      return;
    }
    assert.ok(llms.includes(`https://${host}/plans/`));
    const plans = read(`sites/${app}/plans/index.html`);
    const offer = nodes(plans).find((n) => n["@type"] === "SoftwareApplication").offers;
    if (app === "connect") {
      assert.ok(llms.includes("> Enterprise payment orchestration\n"));
      assert.ok(/no free trial/i.test(llms) && !/14-day/.test(llms));
      assert.ok(llms.includes("US$15,000 a year") && plans.includes("US$15,000 a year"));
      return;
    }
    const shown = Number(offer.price).toLocaleString("en-US");
    assert.ok(llms.includes(`$${shown}`), `price $${shown} as on the plans page`);
    assert.ok(llms.includes("14-day free trial"));
  });
}

test("product sites say which site is the official one for each product", () => {
  for (const [dir] of PAGES) {
    const app = dir.split("/")[0];
    const site = nodes(read(`sites/${dir}/index.html`)).find((n) => n["@type"] === "WebSite");
    assert.equal(site?.url, `https://about${app}.pulsus.tech/`);
    assert.equal(site.about.url, `https://about${app}.pulsus.tech/`);
    assert.equal(site.isPartOf.url, "https://about.pulsus.tech/");
  }
  const list = nodes(read("index.html")).find((n) => n["@type"] === "ItemList");
  assert.deepEqual(new Set(list.itemListElement.map((i) => i.url)), new Set(APPS.map((a) => `https://about${a}.pulsus.tech/`)));
});
