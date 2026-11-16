// The product story pages at the root of each about<app>.pulsus.tech address.
// Run: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import middleware, { siteFor, config } from "../middleware.js";

test("product hosts map to their site; every other host passes through", () => {
  assert.equal(siteFor("aboutquality.pulsus.tech"), "quality");
  assert.equal(siteFor("aboutrecon.pulsus.tech"), "recon");
  assert.equal(siteFor("about.pulsus.tech"), undefined);
  assert.equal(siteFor("pulsus.tech"), undefined);
  assert.equal(siteFor("abouttech.pulsus.tech"), undefined);
  assert.equal(siteFor("aboutquality.evil.example"), undefined);
  assert.equal(config.matcher, "/");
});

test("root of a product host is rewritten to its story page", () => {
  const r = middleware(new Request("https://aboutcash.pulsus.tech/"));
  assert.equal(r.headers.get("x-middleware-rewrite"), "https://aboutcash.pulsus.tech/sites/cash/index.html");
});

test("about.pulsus.tech and other paths are left alone", () => {
  assert.equal(middleware(new Request("https://about.pulsus.tech/")), undefined);
  assert.equal(middleware(new Request("https://aboutcash.pulsus.tech/plans/")), undefined);
});
