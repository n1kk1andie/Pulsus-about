# about.pulsus.tech

The Pulsus Platform marketing site. One self-contained static page — no build
step, no dependencies, no image assets.

## Structure

`index.html` is the whole site. Everything is inline:

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

Brand tokens live in `:root` and are taken from the product itself — red
`#e4012b`, ink `#1c1416`, warm paper `#faf7f5` — so the site and the apps it
sells look like one company.

## Deployment

Vercel project `pulsus-about`, serving `about.pulsus.tech`. No framework, no
build command, no output directory: Vercel serves `index.html` from the root.

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
  close) are not present. There are no image assets in this repo; the hero uses
  a CSS bokeh field in place of the first, and the other two are gradients.
- Capability tiles and the "Explore all capabilities" link all point at
  `#contact`. There are no per-capability pages yet.
- There is no About section content beyond the footer attribution.

---

Pulsus is developed by Tumblehill Labs, the product studio of Tumblehill
Holdings LLC.
