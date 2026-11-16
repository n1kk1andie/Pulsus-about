// Routing Middleware: serves each product's story page at the root of its own
// address (aboutquality.pulsus.tech/ → /sites/quality/). A host rewrite in
// vercel.json can't do this for "/", because the suite's own index.html wins
// there. Every other host and path (about.pulsus.tech included) passes through.
// Same as rewrite() from @vercel/functions, without adding a dependency.
export const config = { matcher: "/" };

const SITES = {
  aboutquality: "quality",
  aboutcash: "cash",
  aboutpanorama: "panorama",
  aboutrisk: "risk",
  aboutaccord: "accord",
  aboutcx: "cx",
  abouttalent: "talent",
  aboutrecon: "recon",
};

export function siteFor(hostname) {
  const [sub, ...rest] = String(hostname || "").toLowerCase().split(".");
  return rest.join(".") === "pulsus.tech" ? SITES[sub] : undefined;
}

export default function middleware(request) {
  const url = new URL(request.url);
  const app = url.pathname === "/" ? siteFor(url.hostname) : undefined;
  if (!app) return;
  return new Response(null, {
    headers: { "x-middleware-rewrite": new URL(`/sites/${app}/index.html`, request.url).toString() },
  });
}
