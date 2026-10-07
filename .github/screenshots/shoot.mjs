// Signs in to the demo Command Center and captures desktop and phone views.
// Credentials come from the environment (repository secrets) and are never logged.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const out = process.argv[2] || "out";
const base = (process.env.BASE_URL || "https://demo-executive.pulsus.tech").replace(/\/+$/, "");
const email = process.env.DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;
if (!email || !password) throw new Error("DEMO_EMAIL and DEMO_PASSWORD secrets are required");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const log = [];

async function signIn(ctx) {
  // The same flow the login form uses: fetch the signed "a + b" challenge, answer it.
  const ch = await (await ctx.request.get(`${base}/api/login`)).json();
  const res = await ctx.request.post(`${base}/api/login`, {
    data: { email, password, answer: ch.a + ch.b, exp: ch.exp, sig: ch.sig },
    headers: { Origin: base },
  });
  if (!res.ok()) throw new Error(`Sign-in failed with status ${res.status()}`);
}

async function settle(page) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(12000); // the brief and Signals fill in after load
}

async function shootTabs(page, prefix) {
  for (const tab of ["Details", "History", "Insights", "Reports"]) {
    const btn = page.getByRole("button", { name: tab, exact: true }).or(page.getByRole("link", { name: tab, exact: true })).first();
    if (!(await btn.count())) { log.push(`${prefix}: no ${tab} tab`); continue; }
    await btn.click();
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `${out}/${prefix}-${tab.toLowerCase()}.png` });
    log.push(`${prefix}: ${tab}`);
  }
}

// Desktop, retina-sharp.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await signIn(ctx);
  const page = await ctx.newPage();
  await page.goto(`${base}/`);
  await settle(page);
  await page.screenshot({ path: `${out}/desktop-pulse.png` });
  await page.screenshot({ path: `${out}/desktop-pulse-full.png`, fullPage: true });
  log.push("desktop: pulse");
  await shootTabs(page, "desktop");
  await ctx.close();
}

// Phone (iPhone-sized).
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await signIn(ctx);
  const page = await ctx.newPage();
  await page.goto(`${base}/`);
  await settle(page);
  await page.screenshot({ path: `${out}/phone-pulse.png` });
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/phone-pulse-2.png` });
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/phone-pulse-3.png` });
  log.push("phone: pulse x3");
  await ctx.close();
}

writeFileSync(`${out}/log.txt`, log.join("\n") + "\n");
console.log(log.join("\n"));
await browser.close();
