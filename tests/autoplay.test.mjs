// Interactive sections on the product story and plans pages start playing on
// their own once scrolled into view (the pulsus-autoplay helper). Every page
// with such sections carries the same helper, the helper switches itself off
// with prefers-reduced-motion, and every section it names exists on the page.
// Run: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const STORY = ["tech", "accord", "cash", "cx", "cx/es", "panorama", "panorama/es", "quality", "recon", "risk", "talent", "talent/es"];
const PAGES = [...STORY, ...STORY.map((p) => p.replace(/^(\w+)(\/(en|es))?$/, "$1$2/plans"))];
const read = (p) => readFileSync(new URL(`sites/${p}/index.html`, ROOT), "utf8");
const helperOf = (html) => {
  const m = html.match(/<!-- pulsus-autoplay -->\n<script>\n([\s\S]*?)\n<\/script>/);
  return m && m[1];
};
const reference = helperOf(read("tech"));

test("the autoplay helper exists and honours reduced motion", () => {
  assert.ok(reference, "tech story page carries the helper");
  assert.match(reference, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(reference, /if\(!el\|\|RM\.matches\)return null;/, "nothing plays with reduced motion");
  assert.match(reference, /IntersectionObserver/);
  assert.match(reference, /isTrusted/, "only a real visitor's input hands the section over");
});

for (const p of PAGES) {
  test(`${p}: interactive sections autoplay with the shared helper`, () => {
    const html = read(p);
    const helper = helperOf(html);
    assert.ok(helper, "helper present");
    assert.equal(helper, reference, "same helper as every other page");
    const ids = [...html.matchAll(/A\(\{el:'#([\w-]+)'/g)].map((m) => m[1]);
    assert.ok(ids.length, "at least one section set up");
    for (const id of ids) assert.match(html, new RegExp(`<section[^>]*id="${id}"`), `#${id} is a section on the page`);
    const es = /<html[^>]*lang="es/.test(html);
    assert.match(helper, es ? /Reproduciendo · toque para explorar/ : /Playing · tap to explore/);
    assert.equal(html.match(/<!-- pulsus-autoplay -->/g).length, 1, "included once");
  });
}
