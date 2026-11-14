// The product sites served at about<app>.pulsus.tech (the host is rewritten to
// /sites/<app>/). Each page is static: every asset it names exists under its own
// folder, "Try Demo" opens the demo registration for that app, "Sign in" goes to
// the app's own sign-in page, and the footer carries the suite's two lines.
// Run: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const SITES = {
  cash: { name: "Cash", host: "cash.pulsus.tech", demo: "demo-cash.pulsus.tech" },
  panorama: { name: "Panorama", host: "panorama.pulsus.tech", demo: "demo-panorama.pulsus.tech" },
  talent: { name: "Talent", host: "talent.pulsus.tech", demo: "demo-talent.pulsus.tech" },
};

for (const [key, s] of Object.entries(SITES)) {
  const html = readFileSync(new URL(`sites/${key}/index.html`, ROOT), "utf8");

  test(`${key}: every local asset the page names exists in its own folder`, () => {
    const refs = [...html.matchAll(/(?:src|href)="(\/[^"#?]*)"/g)].map((m) => m[1]).filter((p) => p !== "/");
    assert.ok(refs.length > 10);
    for (const p of refs) {
      assert.ok(p.startsWith(`/sites/${key}/assets/`), `${p} is outside /sites/${key}/assets/`);
      assert.ok(existsSync(new URL(p.slice(1), ROOT)), `${p} is missing`);
    }
  });

  test(`${key}: Try Demo registers for the ${key} demo; Sign in goes to the app`, () => {
    const demo = `https://executive.pulsus.tech/demo/register?app=${key}&amp;next=${encodeURIComponent(`https://${s.demo}/`)}`;
    assert.ok(html.includes(`href="${demo}">Try Demo`), "Try Demo link");
    assert.ok(html.includes(`href="https://${s.host}/login">Sign in`), "Sign in link");
  });

  test(`${key}: one h1, canonical, Open Graph image and the suite footer`, () => {
    assert.equal(html.match(/<h1\b/g).length, 1);
    assert.ok(html.includes(`<link rel="canonical" href="https://about${key}.pulsus.tech/">`));
    assert.ok(html.includes(`<meta property="og:image" content="https://about.pulsus.tech/sites/${key}/assets/og.jpg">`));
    assert.ok(html.includes(`Pulsus ${s.name} &middot; Part of the Pulsus Intelligence Suite<br>A product of Tumblehill Labs, a product studio of Tumblehill Holdings LLC.`));
    assert.ok(!/user-scalable\s*=\s*no|maximum-scale/i.test(html), "pinch-zoom stays allowed");
  });
}
