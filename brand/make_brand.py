"""
make_brand.py — generates the Time Lapse Earth identity:

  brand/out/logo_800.png                 YouTube avatar (circle-safe)
  brand/out/logo_2048.png                master
  brand/out/logo_mark_transparent.png    mark on transparent background
  brand/out/wordmark_dark.png            horizontal lockup (mark + name)
  brand/out/banner_2560x1440.png/.jpg    YouTube channel art (text inside the 1546x423 safe area)
  brand/out/banner_preview_devices.png   how the banner crops on TV / desktop / mobile

Concept: "Orbit Mark" — a planet seen from orbit, half lush day, half night
lit by cyan megacities, with a satellite trail that reads as fast-forward.
"""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from engine.satview import CitySeed, Scene, SceneSpec, fbm, gauss, hexc, smoothstep, to_u8  # noqa: E402

OUT = Path(__file__).resolve().parent / "out"
OUT.mkdir(exist_ok=True)
FONT_DIR = "/usr/share/fonts/opentype/inter/"
F_BLACK = FONT_DIR + "InterDisplay-Black.otf"
F_XBOLD = FONT_DIR + "InterDisplay-ExtraBold.otf"
F_MED = FONT_DIR + "Inter-Medium.otf"
F_SEMI = FONT_DIR + "Inter-SemiBold.otf"
F_MONO = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Bold.ttf"

NAVY = "#071626"
CYAN = "#5eebff"


# --------------------------------------------------------------------------
# the mark
# --------------------------------------------------------------------------

def render_mark(S: int = 2400, transparent: bool = False, seed: int = 4) -> Image.Image:
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    cx = cy = S / 2
    R = S * 0.33
    X = (xx - cx) / R
    Y = (yy - cy) / R
    r2 = X * X + Y * Y
    inside = r2 < 1.0
    Z = np.sqrt(np.clip(1 - r2, 0, 1))

    # ---- background ---------------------------------------------------
    if transparent:
        bg = np.zeros((S, S, 4), dtype=np.float32)
    else:
        rr = np.sqrt(((xx - cx) / S) ** 2 + ((yy - cy) / S) ** 2)
        base = hexc("#0c2440")[None, None] * (1 - smoothstep(0.0, 0.75, rr))[..., None] + hexc("#040a14")[None, None] * smoothstep(0.0, 0.75, rr)[..., None]
        bg = np.concatenate([base, np.ones((S, S, 1), np.float32)], axis=2)

    # ---- surface (lon/lat sampled noise for natural foreshortening) ------
    lon = np.arctan2(X, Z)          # -pi/2 .. pi/2 visible
    lat = np.arcsin(np.clip(Y, -1, 1))
    tex_w, tex_h = 2048, 1024
    land_tex = fbm(tex_h, tex_w, rng, cells=3.0, octaves=7, persistence=0.55)
    city_tex = fbm(tex_h, tex_w, rng, cells=24.0, octaves=5, persistence=0.62)
    detail_tex = fbm(tex_h, tex_w, rng, cells=40.0, octaves=3, persistence=0.6)
    u = ((lon + 0.6) / (2 * np.pi) % 1.0) * (tex_w - 1)
    v = ((lat + np.pi / 2) / np.pi) * (tex_h - 1)
    land = cv2.remap(land_tex, u.astype(np.float32), v.astype(np.float32), cv2.INTER_LINEAR)
    city = cv2.remap(city_tex, u.astype(np.float32), v.astype(np.float32), cv2.INTER_LINEAR)
    detail = cv2.remap(detail_tex, u.astype(np.float32), v.astype(np.float32), cv2.INTER_LINEAR)
    land_mask = smoothstep(0.50, 0.56, land)                 # ~45 % land
    coast = smoothstep(0.42, 0.50, land)                     # shallow shelf

    # day colours
    green = hexc("#1d6b35") * (1 - detail)[..., None] + hexc("#79b24a") * detail[..., None]
    green = green * (0.85 + 0.3 * smoothstep(0.5, 0.8, land))[..., None]
    ocean = hexc("#0a3a66") * (1 - coast)[..., None] + hexc("#1f8fa8") * coast[..., None]
    day = ocean * (1 - land_mask)[..., None] + green * land_mask[..., None]

    # night colours + city lights
    night_ground = hexc("#06121c") * (1 - land_mask)[..., None] + hexc("#0d1f1c") * land_mask[..., None]
    lights = smoothstep(0.56, 0.80, city) * land_mask * (0.5 + 0.5 * detail)
    lights += smoothstep(0.93, 0.97, detail) * land_mask * smoothstep(0.45, 0.6, city) * 1.2
    lights_rgb = lights[..., None] * (hexc("#5eebff") * 0.75 + hexc("#ffffff") * 0.25)
    glow = lights_rgb * 1.6 + gauss(lights_rgb, S * 0.0025) * 1.0 + gauss(lights_rgb, S * 0.011) * 0.9
    night = night_ground + glow

    # terminator: tilted, soft
    ang = np.deg2rad(-22)
    axis = X * np.cos(ang) + Y * np.sin(ang)
    k = smoothstep(-0.30, 0.30, axis)      # 0 = day (left), 1 = night (right)
    surf = day * (1 - k)[..., None] + night * k[..., None]

    # lighting: lambert from upper-left + limb darkening + cyan rim on the night side
    L = np.array([-0.55, -0.45, 0.70], np.float32)
    L /= np.linalg.norm(L)
    ndl = np.clip(X * L[0] + Y * L[1] + Z * L[2], 0, 1)
    shade = 0.35 + 0.75 * ndl
    shade = shade * (1 - k) + (0.55 + 0.45 * ndl) * k * 0.9
    surf = surf * shade[..., None]
    fres = (1 - Z) ** 3
    surf += hexc("#5eebff")[None, None] * (fres * (0.35 + 0.45 * k))[..., None]
    surf += hexc("#8fd3ff")[None, None] * (fres * 0.25 * (1 - k))[..., None]

    # clouds on the day side
    cloud_tex = fbm(tex_h, tex_w, rng, cells=6.0, octaves=5, persistence=0.55, aniso=2.2)
    clouds = cv2.remap(cloud_tex, u.astype(np.float32), v.astype(np.float32), cv2.INTER_LINEAR)
    clouds = smoothstep(0.62, 0.80, clouds) * (1 - k) * 0.85 * shade
    surf = surf * (1 - clouds)[..., None] + hexc("#f4f8fb")[None, None] * clouds[..., None]

    sphere_alpha = smoothstep(1.0, 0.985, r2).astype(np.float32)
    sphere = np.concatenate([np.clip(surf, 0, 1.4), sphere_alpha[..., None]], axis=2)

    # atmosphere glow (outside the sphere)
    rad = np.sqrt(r2)
    atmo = np.exp(-np.clip(rad - 1.0, 0, 10) * 9.0) * (rad >= 1.0)
    atmo_col = hexc("#3fb6ff") * (1 - k)[..., None] + hexc("#5eebff") * k[..., None]
    atmo_rgba = np.concatenate([atmo_col, (atmo * 0.85)[..., None]], axis=2)

    def over(dst, src):
        a = src[..., 3:4]
        dst[..., :3] = src[..., :3] * a + dst[..., :3] * (1 - a)
        dst[..., 3:4] = a + dst[..., 3:4] * (1 - a)
        return dst

    img = bg.copy()
    img = over(img, atmo_rgba)

    # orbit ring: back half first
    ring = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rx, ry = R * 1.42, R * 0.40
    tilt = -24
    ring_layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(ring_layer).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=(255, 255, 255, 150), width=int(S * 0.0075))
    ring_layer = ring_layer.rotate(tilt, resample=Image.BICUBIC, center=(cx, cy))
    ring_np = np.asarray(ring_layer).astype(np.float32) / 255.0
    # the upper half (in rotated frame) is behind the globe
    rel = (yy - cy) * np.cos(np.deg2rad(tilt)) - (xx - cx) * np.sin(np.deg2rad(tilt))
    back = (rel < 0).astype(np.float32)
    ring_back = ring_np.copy()
    ring_back[..., 3] *= back * 0.55
    ring_front = ring_np.copy()
    ring_front[..., 3] *= (1 - back)
    img = over(img, ring_back)
    img = over(img, sphere)
    img = over(img, ring_front)

    # satellite + fast-forward trail on the front arc
    sat = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sat)
    th = np.deg2rad(38)
    px, py = cx + rx * np.cos(th), cy + ry * np.sin(th)
    # trail: three fading dashes along the ellipse behind the satellite
    for i in range(1, 4):
        a0 = th + i * 0.10
        a1 = th + i * 0.10 + 0.07
        pts = [(cx + rx * np.cos(a), cy + ry * np.sin(a)) for a in np.linspace(a0, a1, 6)]
        sd.line(pts, fill=(94, 235, 255, int(230 / (i * 1.25))), width=int(S * 0.011), joint="curve")
    sd.ellipse([px - S * 0.014, py - S * 0.014, px + S * 0.014, py + S * 0.014], fill=(255, 255, 255, 255))
    sat = sat.rotate(tilt, resample=Image.BICUBIC, center=(cx, cy))
    sat_glow = sat.filter(ImageFilter.GaussianBlur(S * 0.012))
    img = over(img, np.asarray(sat_glow).astype(np.float32) / 255.0 * np.array([1, 1, 1, 0.9], np.float32))
    img = over(img, np.asarray(sat).astype(np.float32) / 255.0)

    out = np.clip(img, 0, 1)
    out[..., :3] = np.where(out[..., 3:4] > 0, out[..., :3], 0)
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA")


# --------------------------------------------------------------------------
# text helpers
# --------------------------------------------------------------------------

def tracked_width(fnt, text, tracking):
    return sum(fnt.getlength(ch) for ch in text) + tracking * (len(text) - 1)


def draw_tracked(d: ImageDraw.ImageDraw, xy, text, fnt, fill, tracking, anchor_center=True, glow_layer=None):
    x, y = xy
    w = tracked_width(fnt, text, tracking)
    if anchor_center:
        x -= w / 2
    for ch in text:
        d.text((x, y), ch, font=fnt, fill=fill, anchor="ls")
        x += fnt.getlength(ch) + tracking


def wordmark(height: int = 400, dark_bg: bool = True) -> Image.Image:
    mark = render_mark(2400, transparent=True).resize((height, height), Image.LANCZOS)
    fnt = ImageFont.truetype(F_BLACK, int(height * 0.46))
    tracking = height * 0.03
    text = "TIME LAPSE EARTH"
    tw = int(tracked_width(fnt, text, tracking))
    W = height + int(height * 0.12) + tw + int(height * 0.1)
    img = Image.new("RGBA", (W, height), (7, 22, 38, 255) if dark_bg else (0, 0, 0, 0))
    img.alpha_composite(mark, (0, 0))
    d = ImageDraw.Draw(img)
    draw_tracked(d, (height + height * 0.12, height * 0.64), text, fnt, (255, 255, 255, 255), tracking, anchor_center=False)
    return img


# --------------------------------------------------------------------------
# banner
# --------------------------------------------------------------------------

def banner():
    BW, BH = 2560, 1440
    spec = SceneSpec(kind="coastal", seed=41, palette="lush", sea_side="bottom", sea_fraction=0.30, coast_rough=0.9,
                     mountains=0.22, river=[(0.05, 0.1), (0.3, 0.35), (0.55, 0.45), (0.8, 0.75), (0.95, 0.95)], river_width=0.012,
                     cities=[CitySeed(0.74, 0.46, 0.26, 1.0, 0.0, 14), CitySeed(0.9, 0.3, 0.16, 0.8, 0.0, 40)],
                     coast_affinity=0.9, cloud_cover=0.05, light_warmth=0.3, city_max=0.85, street_spacing=11.0)
    sc = Scene(spec, BW, BH)
    day = sc.render(1.0, 0.0)
    night = sc.render(1.0, 1.0)
    xs = np.linspace(0, 1, BW, dtype=np.float32)[None, :, None]
    k = smoothstep(0.30, 0.70, xs)
    img = day * (1 - k) + night * k
    # legibility band + soft vignette
    yy, xx = np.mgrid[0:BH, 0:BW].astype(np.float32)
    band = np.exp(-((yy - 715) / 300.0) ** 2) * np.exp(-((xx - 1280) / 900.0) ** 2)
    img *= (1 - 0.62 * band)[..., None]
    img *= (1 - 0.25 * smoothstep(0.55, 1.1, np.sqrt(((xx - 1280) / 1280) ** 2 + ((yy - 720) / 720) ** 2)))[..., None]
    pil = Image.fromarray(to_u8(np.clip(img, 0, 1)), "RGB").convert("RGBA")

    layer = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # safe area: 1546 x 423 centred -> x 507..2053, y 508..931
    sx0, sy0, sx1, sy1 = 507, 508, 2053, 931
    mark_h = 270
    mark = render_mark(2400, transparent=True).resize((mark_h, mark_h), Image.LANCZOS)
    title = "TIME LAPSE EARTH"
    tracking = 5
    size = 132
    while True:
        fnt = ImageFont.truetype(F_BLACK, size)
        tw = tracked_width(fnt, title, tracking)
        total_w = mark_h + 40 + tw
        if total_w <= (sx1 - sx0) - 90 or size < 60:
            break
        size -= 2
    x0 = (BW - total_w) / 2
    layer.alpha_composite(mark, (int(x0), int(sy0 + 6)))
    # glow behind the title
    g = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
    draw_tracked(ImageDraw.Draw(g), (x0 + mark_h + 40, sy0 + 140), title, fnt, (94, 235, 255, 120), tracking, anchor_center=False)
    g = g.filter(ImageFilter.GaussianBlur(26))
    layer.alpha_composite(g)
    draw_tracked(d, (x0 + mark_h + 40, sy0 + 140), title, fnt, (255, 255, 255, 255), tracking, anchor_center=False)
    f_tag = ImageFont.truetype(F_MED, 44)
    d.text((x0 + mark_h + 44, sy0 + 198), "Witness our planet change in seconds.", font=f_tag, fill=(226, 236, 244, 255), anchor="lm")
    # pills
    f_pill = ImageFont.truetype(F_SEMI, 28)
    px = x0 + mark_h + 44
    py = sy0 + 272
    for text, accent in [("NEW SHORTS DAILY", (255, 76, 76)), ("@TimeLapseEarth", (94, 235, 255)), ("CITIES · CLIMATE · HISTORY", (255, 214, 72))]:
        if px + f_pill.getlength(text) + 72 > sx1 - 30:
            break
        w = f_pill.getlength(text) + 72
        d.rounded_rectangle([px, py - 26, px + w, py + 26], radius=26, fill=(6, 14, 24, 170), outline=(255, 255, 255, 70), width=2)
        d.ellipse([px + 24, py - 7, px + 38, py + 7], fill=accent + (255,))
        d.text((px + 52, py), text, font=f_pill, fill=(255, 255, 255, 235), anchor="lm")
        px += w + 18
    # HUD details outside the safe area (visible on desktop / TV)
    f_mono = ImageFont.truetype(F_MONO, 30)
    for (x, y, sx, sy) in [(80, 80, 1, 1), (BW - 80, 80, -1, 1), (80, BH - 80, 1, -1), (BW - 80, BH - 80, -1, -1)]:
        d.line([(x, y), (x + sx * 120, y)], fill=(255, 255, 255, 110), width=4)
        d.line([(x, y), (x, y + sy * 120)], fill=(255, 255, 255, 110), width=4)
    d.text((130, 110), "SAT-VIEW  ·  ORBIT 408 KM", font=f_mono, fill=(255, 255, 255, 150), anchor="lm")
    d.text((BW - 130, 110), "LIVE  ●  1984 → 2024", font=f_mono, fill=(255, 255, 255, 150), anchor="rm")
    d.text((130, BH - 110), "ACCELERATED GEOGRAPHY  ·  URBAN GROWTH  ·  CLIMATE", font=f_mono, fill=(255, 255, 255, 130), anchor="lm")
    d.text((BW - 130, BH - 110), "youtube.com/@TimeLapseEarth", font=f_mono, fill=(255, 255, 255, 130), anchor="rm")

    pil.alpha_composite(layer)
    rgb = pil.convert("RGB")
    rgb.save(OUT / "banner_2560x1440.png", optimize=True)
    rgb.save(OUT / "banner_2560x1440.jpg", quality=93, subsampling=0)

    # device previews
    mobile = rgb.crop((507, 508, 2053, 931))
    desktop = rgb.crop((0, 508, 2560, 931))
    tv = rgb
    prev = Image.new("RGB", (2560, 1440 + 423 + 423 + 160), (20, 20, 24))
    pd = ImageDraw.Draw(prev)
    f_l = ImageFont.truetype(F_SEMI, 34)
    pd.text((20, 14), "TV (2560×1440, full image)", font=f_l, fill=(220, 220, 220))
    prev.paste(tv.resize((2560, 1440)), (0, 54))
    pd.text((20, 1440 + 54 + 14), "Desktop (2560×423 strip)", font=f_l, fill=(220, 220, 220))
    prev.paste(desktop, (0, 1440 + 108))
    pd.text((20, 1440 + 108 + 423 + 14), "Mobile / safe area (1546×423) — everything important lives here", font=f_l, fill=(220, 220, 220))
    prev.paste(mobile, ((2560 - 1546) // 2, 1440 + 108 + 423 + 54))
    prev.save(OUT / "banner_preview_devices.png", optimize=True)


def logos():
    big = render_mark(2400)
    big.resize((2048, 2048), Image.LANCZOS).convert("RGB").save(OUT / "logo_2048.png", optimize=True)
    big.resize((800, 800), Image.LANCZOS).convert("RGB").save(OUT / "logo_800.png", optimize=True)
    tr = render_mark(2400, transparent=True)
    tr.resize((1024, 1024), Image.LANCZOS).save(OUT / "logo_mark_transparent.png", optimize=True)
    wordmark(400).save(OUT / "wordmark_dark.png", optimize=True)
    # circle-crop preview as YouTube shows it
    av = big.resize((800, 800), Image.LANCZOS).convert("RGBA")
    m = Image.new("L", (800, 800), 0)
    ImageDraw.Draw(m).ellipse([0, 0, 799, 799], fill=255)
    prev = Image.new("RGBA", (800, 800), (255, 255, 255, 255))
    prev.paste(av, (0, 0), m)
    prev.convert("RGB").save(OUT / "logo_circle_preview.png", optimize=True)


if __name__ == "__main__":
    logos()
    print("logos done")
    banner()
    print("banner done")
