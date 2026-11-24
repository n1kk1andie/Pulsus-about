#!/usr/bin/env node
// Tells Bing, Yandex and the other IndexNow search engines about every public
// page on the Pulsus marketing sites, read from each host's live sitemap.
// No dependencies; needs Node 18+.
//
//   node scripts/indexnow.mjs                 # all Pulsus hosts
//   node scripts/indexnow.mjs explore.pulsus.tech --dry-run
//
// Each host serves the key at https://<host>/<KEY>.txt (the file at the root
// of this repo covers every host this project serves; pulsus-explore has its
// own copy in public/). Only URLs on the host that answer 200 are submitted.
// Behind a proxy, run with NODE_USE_ENV_PROXY=1 (Node 22.21+/24).

export const KEY = "6589a70edefc060c8df79e5dc92e2882";
export const APPS = ["accord", "cash", "communique", "connect", "cx", "panorama", "quality", "recon", "risk", "talent", "tech"];
export const HOSTS = ["about.pulsus.tech", "pulsus.tech", ...APPS.map((a) => `about${a}.pulsus.tech`), "explore.pulsus.tech"];
const ENDPOINT = "https://api.indexnow.org/indexnow";

const unxml = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

// Splits a sitemap into page URLs and child sitemaps (for a sitemap index).
export function parseSitemap(xml) {
  const locs = (tag) => [...xml.matchAll(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<loc>\\s*([^<]+?)\\s*</loc>`, "g"))].map((m) => unxml(m[1]));
  return { urls: locs("url"), sitemaps: locs("sitemap") };
}

export const onHost = (url, host) => {
  try { return new URL(url).hostname === host; } catch { return false; }
};

async function get(url) {
  const r = await fetch(url, { redirect: "follow", headers: { "user-agent": "pulsus-indexnow/1.0" } });
  return { status: r.status, finalUrl: r.url, body: r.ok ? await r.text() : "" };
}

// Every page URL on `host`, from /sitemap.xml and any sitemap indexes it points to.
export async function urlsFor(host, fetchText = get) {
  const seen = new Set();
  const found = new Set();
  const queue = [`https://${host}/sitemap.xml`];
  while (queue.length && seen.size < 50) {
    const sm = queue.shift();
    if (seen.has(sm)) continue;
    seen.add(sm);
    const { status, body } = await fetchText(sm);
    if (status !== 200) continue;
    const { urls, sitemaps } = parseSitemap(body);
    urls.filter((u) => onHost(u, host)).forEach((u) => found.add(u));
    queue.push(...sitemaps);
  }
  return [...found];
}

export async function submit(host, { dryRun = false, log = console.log } = {}) {
  const keyUrl = `https://${host}/${KEY}.txt`;
  const key = await get(keyUrl);
  if (key.status !== 200 || key.body.trim() !== KEY) {
    log(`${host}: key file not live (${key.status}); skipped`);
    return { host, status: "no key" };
  }
  const candidates = await urlsFor(host);
  const live = [];
  for (const u of candidates) {
    const r = await fetch(u, { redirect: "manual" }).catch(() => ({ status: 0 }));
    if (r.status === 200) live.push(u);
    else log(`${host}: dropped ${u} (${r.status})`);
  }
  if (!live.length) {
    log(`${host}: no sitemap URLs; nothing submitted`);
    return { host, submitted: 0, status: "none" };
  }
  if (dryRun) {
    log(`${host}: would submit ${live.length}`);
    return { host, submitted: live.length, status: "dry run" };
  }
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key: KEY, keyLocation: keyUrl, urlList: live }),
  });
  const text = await r.text();
  log(`${host}: submitted ${live.length} → HTTP ${r.status}${text ? ` ${text.slice(0, 200)}` : ""}`);
  return { host, submitted: live.length, status: r.status };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const hosts = args.filter((a) => !a.startsWith("--"));
  const results = [];
  for (const h of hosts.length ? hosts : HOSTS) results.push(await submit(h, { dryRun }));
  console.table(results);
  if (results.some((r) => typeof r.status === "number" && r.status >= 300)) process.exitCode = 1;
}
