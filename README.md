# about.pulsus.tech

The Pulsus Platform marketing site. Plain static pages — no build step, no
dependencies, no image assets beyond `favicon.svg`.

## Product facts these pages must respect

Standing constraints, recorded here so every new page inherits them rather
than rediscovering them:

- **Every application is multi-tenant.** Each interface should show its scope
  — an entity, business-unit or perspective selector — because that is what a
  multi-tenant product looks like in use. Tenants are strictly separated.
- **No institution is ever named.** The institution in the source material is
  fictional and on a public page would read as a real client. Scope selectors
  say "All entities" and similar. The footer states that the imagery is
  illustrative.
- **Base currency in illustrative data is USD.** No figure appears without a
  unit, and the currency is stated once per screen rather than repeated on
  every number.
- **A drawn screenshot must agree with itself.** Plotted series resolve to the
  figures beside them, periods match their filters, totals sum, and countdowns
  agree with the dates they count down to. A buyer for this product reads
  dashboards for a living and checks exactly these things first.

## Structure

`index.html` is the homepage and carries its own inline styles. The product
pages (`systems/*/`) and the demo page (`demo/`) share `assets/site.css`.
`favicon.svg` is the U-and-dot mark from the logo. On the homepage everything
is inline:

- **Fonts** — Sora and IBM Plex Sans, from Google Fonts.
- **The Executive Brief mock** in the hero is drawn in CSS and SVG rather than
  shipped as a screenshot. It stays sharp on every display, weighs nothing, and
  cannot go stale when the product's UI moves on.
- **The convergence diagram** ("twelve applications → one Executive Brief") is
  inline SVG. The twelve dotted paths terminate at a single point; that is the
  platform's argument in one image. The health ring's arc is a real percentage
  of the circle's circumference, not an eyeballed dash value.
- **The dashboard date** renders from the browser clock, so the weekday and the
  date can never contradict each other.

The wordmark is live text, `PULS<span class="u">U</span>S`, with the logo's
red dot drawn inside the second U by `.wm .u::after`. It is defined in both
`index.html` and `assets/site.css`; change the two together.

Brand tokens live in `:root` and are taken from the product itself — red
`#e4012b`, ink `#1c1416`, warm paper `#faf7f5` — so the site and the apps it
sells look like one company.

## Deployment

Vercel project `pulsus-about`, serving `about.pulsus.tech`. No framework, no
build command, no output directory: Vercel serves `index.html` from the root.

The project is connected to this repository, so a push to `main` deploys to
production. Nothing needs to be uploaded by hand.

## Editing

Edit `index.html` and push. Before pushing, it is worth checking that the CSS
and markup still parse — a stray invalid colour token renders as a visibly
broken element rather than failing loudly:

```sh
python3 - <<'EOF'
import re, html.parser
src = open('index.html', encoding='utf-8').read()
ids = set(re.findall(r'\bid="([^"]+)"', src))
bad = [c for c in set(re.findall(r'#[0-9a-zA-Z]+', src))
       if not re.fullmatch(r'#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})', c)
       and c[1:] not in ids]
print('bad colour tokens:', bad)
print('missing anchors:', sorted(set(re.findall(r'href="#([^"]+)"', src)) - ids))
print('css brace balance:', src.count('{') - src.count('}'))
EOF
```

All three should come back empty or zero.

## Known gaps

- The three photographic backgrounds in the original concept (city at night
  behind the hero, boardroom behind "With Pulsus", mountain skyline behind the
  close) are not present. The hero uses a CSS bokeh field in place of the
  first, and the other two are gradients. The only images are the demo
  screenshots in the hero and the app icons on the capability tiles (`img/`).
- Four of the twelve capabilities have their own page under `systems/`
  (Panorama, Connect, Cash, Talent). Tech has its own site,
  https://abouttech.pulsus.tech/ (repo HomePulsusTech); its tile links there,
  and `/systems/tech/` redirects there (`vercel.json`). The other seven tiles (Recon,
  Settlement, Risk, Quality, Ops, Communiqué, Credit Insight) send visitors to
  the demo page with "See it in a demo" until their pages exist, as does the
  "See them in a demo" link above the tiles.
- There is no About section content beyond the footer attribution.

## Demo enquiry form

The Book a demo page (`demo/`) posts to a small Vercel function, `api/enquiry.js`,
which emails the request through Resend. Set these in the Vercel project's
environment variables:

| Variable | Needed | Default |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | none; without it the form opens the visitor's email instead |
| `ENQUIRY_TO` | no | `support@pulsus.tech` |
| `ENQUIRY_FROM` | no | `Pulsus Platform <support@pulsus.tech>` |

The sending domain must be verified in Resend (pulsus.tech already is, since
the Command Center sends from it). Replies go straight to the visitor.

---

Pulsus is developed by Tumblehill Labs, the product studio of Tumblehill
Holdings LLC.
