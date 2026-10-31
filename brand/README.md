# Cosmic Scale — brand assets

Everything here is generated from HTML/Canvas (no external images, no network), so the
assets can be re-rendered pixel-identically at any time. Palette and type rules live in
[`BRAND.md`](BRAND.md).

| File | What it is |
|---|---|
| `logo.html` → `logo_1024.png` | Profile picture, 1024×1024. Ringed cosmic-blue sphere with a growing dot chain (the "scale" trail). Everything important sits inside the circular crop YouTube applies. |
| `logo_preview.png` | QA sheet: the mark circle-cropped at 1024 / 176 / 98 / 48 px, on dark and light backgrounds (the sizes YouTube actually displays). |
| `banner.html` → `banner_2560x1440.png` | Channel banner, 2560×1440. Title, tagline and the scale ladder (quark → atom → Earth → Jupiter → Saturn → Sun → TON 618 over a log-scale axis) all sit inside the 1546×423 safe area; stars, nebula, galaxy and grid floor fill the rest for desktop/TV. |
| `banner_safe_preview.png` | Same banner with the YouTube crop zones outlined: safe area (1546×423, red), tablet (1855×423, amber), desktop minimum (2560×423, cyan), TV (full). |
| `render_brand.cjs` | Renderer (Playwright + headless Chromium + ImageMagick for the preview sheet). |

## Re-render

```bash
node brand/render_brand.cjs          # logo + banner + previews
node brand/render_brand.cjs logo     # only the profile picture
node brand/render_brand.cjs banner   # only the banner
```

Requires the pre-installed Playwright/Chromium, ImageMagick (`convert`) and the Inter,
Inter Display and JetBrains Mono system fonts. Edit the `.html` files to change the design;
the seeded random generators keep stars and dither identical between renders.

## Upload to YouTube

**Profile picture** — YouTube Studio → Customization → Branding → *Picture* → Change →
upload `logo_1024.png`. YouTube accepts 98×98 minimum, 4 MB max; this file is 1024×1024,
~1.2 MB. Keep the crop centred (the default); check it against `logo_preview.png`.

**Banner** — same page → *Banner image* → Change → upload `banner_2560x1440.png`
(exact recommended size, ~3.8 MB, under the 6 MB limit). In the preview dialog YouTube
shows the TV / desktop / mobile crops; the title, tagline and ladder stay visible in all
three because they are inside the 1546×423 safe area (verify with `banner_safe_preview.png`).

**Watermark (optional)** — Branding → *Video watermark*: a 150×150 version of the mark
can be made with `convert brand/logo_1024.png -resize 150x150 watermark_150.png`.

## Design notes

- The ringed blue planet in the banner is the same object as the logo mark, so the two
  assets read as one system.
- Colours use only the `BRAND.md` tokens; the Sun and Jupiter use the `--solar` family
  because that is what those objects look like, and the Earth uses natural ocean/land
  tones on top of the cosmic blue.
- Labels on the axis are approximate real diameters (quark upper bound, hydrogen atom,
  Earth, Jupiter, Saturn with rings, Sun, TON 618 event horizon).
