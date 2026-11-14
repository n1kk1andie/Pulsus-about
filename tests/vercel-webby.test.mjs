// The Webby judges' readable address: https://pulsus.tech/webby/<code> (and
// about.pulsus.tech/webby/<code>, the same project) sends the judge to the live
// platform, which resolves the code — or a link's original id — sets demo
// access and opens the showcase. Temporary (307) and never cached.
// Run: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cfg = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const DEST = "https://executive.pulsus.tech/demo/webby/:code";

// Vercel's path patterns, for the two shapes used here.
function match(source, path) {
  const m = /^\/webby\/:code\((.+)\)(\/?)$/.exec(source);
  if (!m) return null;
  const r = new RegExp(`^/webby/(${m[1]})${m[2] ? "/" : ""}$`).exec(path);
  return r ? r[1] : null;
}
const redirectFor = (path) => {
  for (const r of cfg.redirects) {
    if (!r.source.startsWith("/webby/")) continue;
    const code = match(r.source, path);
    if (code) return { ...r, to: r.destination.replace(":code", code) };
  }
  return null;
};

test("/webby/<code> redirects to the live platform's Webby link, temporarily", () => {
  for (const [path, code] of [["/webby/judges-7q4m", "judges-7q4m"], ["/webby/judges-7q4m/", "judges-7q4m"], ["/webby/Judges-7Q4M", "Judges-7Q4M"], ["/webby/ExDUNcyqvSwKIQlkUIFOFA", "ExDUNcyqvSwKIQlkUIFOFA"]]) {
    const r = redirectFor(path);
    assert.ok(r, path);
    assert.equal(r.to, `https://executive.pulsus.tech/demo/webby/${code}`, path);
    assert.equal(r.permanent, false, "307, never a permanent (cached) redirect");
    assert.equal(r.statusCode, undefined);
    assert.equal(r.has, undefined, "every host of the project: pulsus.tech and about.pulsus.tech");
  }
  for (const path of ["/webby/", "/webby/abc", "/webby/a/b", "/webby/../x", "/webby/" + "x".repeat(41), "/webby/judges%207q4m"]) assert.equal(redirectFor(path), null, path);
  const all = cfg.redirects.filter((r) => r.source.startsWith("/webby/"));
  assert.equal(all.length, 2);
  for (const r of all) assert.equal(r.destination, DEST);
  assert.ok(cfg.redirects.indexOf(all[0]) === 0, "first, ahead of every other rule");
});

test("/webby answers are never cached or indexed", () => {
  const h = (cfg.headers || []).find((x) => x.source === "/webby/:path*");
  assert.ok(h);
  const get = (k) => h.headers.find((x) => x.key.toLowerCase() === k)?.value;
  assert.equal(get("cache-control"), "no-store");
  assert.match(get("x-robots-tag"), /noindex/);
});
