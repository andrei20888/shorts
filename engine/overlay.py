"""
overlay.py — HUD, year counter, karaoke captions and CTA cards drawn with PIL.

All text lives inside the YouTube Shorts safe zone:
  top ~230 px (channel / search icons), bottom ~430 px (title, music),
  right ~170 px (like / comment / share column).
"""
from __future__ import annotations

import math
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT_DIR = "/usr/share/fonts/opentype/inter/"
FONTS = {
    "display": FONT_DIR + "InterDisplay-ExtraBold.otf",
    "black": FONT_DIR + "InterDisplay-Black.otf",
    "bold": FONT_DIR + "Inter-Bold.otf",
    "semibold": FONT_DIR + "Inter-SemiBold.otf",
    "medium": FONT_DIR + "Inter-Medium.otf",
    "mono": "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Bold.ttf",
}

W, H = 1080, 1920
SAFE_TOP, SAFE_BOTTOM, SAFE_RIGHT = 230, 1490, 900   # y-limits / x-limit of usable area

CYAN = (94, 235, 255)
CYAN_DIM = (94, 235, 255, 150)
WHITE = (255, 255, 255)
YELLOW = (255, 214, 72)
RED = (255, 76, 76)


@lru_cache(maxsize=256)
def font(kind: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONTS[kind], size)


def ease_out(t: float) -> float:
    t = min(max(t, 0.0), 1.0)
    return 1 - (1 - t) ** 3


def ease_in_out(t: float) -> float:
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def text_size(fnt, s):
    l, t, r, b = fnt.getbbox(s)
    return r - l, b - t


def wrap(text: str, fnt, max_w: int) -> list[str]:
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if text_size(fnt, test)[0] <= max_w or not cur:
            cur = test
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def glow_text(layer: Image.Image, xy, s, fnt, fill, glow=(94, 235, 255), radius=18, strength=0.9, anchor="la"):
    """Draw text with a coloured glow underneath (on an RGBA layer)."""
    g = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    gd.text(xy, s, font=fnt, fill=glow + (int(255 * strength),), anchor=anchor)
    g = g.filter(ImageFilter.GaussianBlur(radius))
    layer.alpha_composite(g)
    ImageDraw.Draw(layer).text(xy, s, font=fnt, fill=fill, anchor=anchor)


def shadow_text(layer: Image.Image, xy, s, fnt, fill, stroke=6, anchor="la", shadow=10):
    d = ImageDraw.Draw(layer)
    if shadow:
        sh = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).text((xy[0] + 3, xy[1] + 8), s, font=fnt, fill=(0, 0, 0, 180), anchor=anchor,
                                stroke_width=stroke, stroke_fill=(0, 0, 0, 180))
        sh = sh.filter(ImageFilter.GaussianBlur(shadow))
        layer.alpha_composite(sh)
    d.text(xy, s, font=fnt, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=(8, 10, 14, 255))


# --------------------------------------------------------------------------
# HUD
# --------------------------------------------------------------------------

def draw_hud(layer: Image.Image, year: float, y0: int, y1: int, label: str, coords: str, t_sec: float,
             alpha: float = 1.0, counter_y: int = 395, show_counter: bool = True):
    d = ImageDraw.Draw(layer)
    a = int(255 * alpha)

    # corner brackets (viewfinder)
    m, L, lw = 44, 70, 3
    col = (255, 255, 255, int(120 * alpha))
    for (x, y, sx, sy) in [(m, SAFE_TOP + 10, 1, 1), (W - m, SAFE_TOP + 10, -1, 1), (m, SAFE_BOTTOM + 60, 1, -1), (W - m, SAFE_BOTTOM + 60, -1, -1)]:
        d.line([(x, y), (x + sx * L, y)], fill=col, width=lw)
        d.line([(x, y), (x, y + sy * L)], fill=col, width=lw)

    # top labels
    f_small = font("semibold", 26)
    blink = 1.0 if (t_sec % 1.2) < 0.75 else 0.35
    d.ellipse([m + 14, SAFE_TOP + 44, m + 30, SAFE_TOP + 60], fill=(255, 76, 76, int(255 * alpha * blink)))
    d.text((m + 44, SAFE_TOP + 52), label, font=f_small, fill=(255, 255, 255, int(230 * alpha)), anchor="lm")
    d.text((W - m - 14, SAFE_TOP + 52), coords, font=font("mono", 24), fill=(255, 255, 255, int(190 * alpha)), anchor="rm")

    if not show_counter:
        return

    # year counter
    yr = int(round(year))
    f_year = font("display", 176)
    txt = f"{yr}"
    glow_text(layer, (W // 2, counter_y), txt, f_year, (255, 255, 255, a), glow=CYAN, radius=22, strength=0.55 * alpha, anchor="mm")
    # progress bar
    bw, bh = 560, 6
    bx, by = (W - bw) // 2, counter_y + 118
    frac = 0.0 if y1 == y0 else min(max((year - y0) / (y1 - y0), 0), 1)
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=3, fill=(255, 255, 255, int(60 * alpha)))
    if frac > 0:
        d.rounded_rectangle([bx, by, bx + int(bw * frac), by + bh], radius=3, fill=CYAN + (a,))
        d.ellipse([bx + int(bw * frac) - 8, by - 5, bx + int(bw * frac) + 8, by + bh + 5], fill=(255, 255, 255, a))
    f_lab = font("mono", 24)
    d.text((bx, by + 22), str(y0), font=f_lab, fill=(255, 255, 255, int(170 * alpha)), anchor="lt")
    d.text((bx + bw, by + 22), str(y1), font=f_lab, fill=(255, 255, 255, int(170 * alpha)), anchor="rt")


# --------------------------------------------------------------------------
# captions
# --------------------------------------------------------------------------

STYLE = {
    # size, kind, max width, baseline y, uppercase, highlight colour
    "hook": dict(size=92, kind="black", max_w=900, y=720, upper=True, hl=CYAN),
    "beat": dict(size=74, kind="display", max_w=880, y=1180, upper=True, hl=CYAN),
    "stat": dict(size=96, kind="black", max_w=900, y=800, upper=True, hl=YELLOW),
    "quiet": dict(size=60, kind="semibold", max_w=860, y=1180, upper=False, hl=CYAN),
    "cta": dict(size=78, kind="black", max_w=880, y=1050, upper=True, hl=YELLOW),
    "interact": dict(size=58, kind="display", max_w=820, y=1330, upper=False, hl=YELLOW),
}


def caption_groups(text: str, max_words: int = 3) -> list[list[str]]:
    words = text.split()
    groups, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= max_words or w.endswith((".", ",", "!", "?", ":")):
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return groups


def draw_caption(layer: Image.Image, text: str, style: str, progress: float, age: float, remaining: float,
                 group_mode: bool = True):
    """progress: 0..1 through the spoken line; age: seconds since the line started;
    remaining: seconds until it ends."""
    st = STYLE[style]
    words = text.split()
    if not words:
        return
    if st["upper"]:
        words = [w.upper() for w in words]
    n = len(words)
    # word timing by character weight
    weights = np.array([len(w) + 2 for w in words], dtype=float)
    cum = np.cumsum(weights) / weights.sum()
    cur_idx = int(np.searchsorted(cum, min(progress, 0.999), side="right"))
    cur_idx = min(cur_idx, n - 1)

    if group_mode and style in ("beat", "quiet"):
        groups = caption_groups(" ".join(words), 3 if style == "beat" else 4)
        # find the group containing cur_idx
        gi, start = 0, 0
        for i, g in enumerate(groups):
            if start + len(g) > cur_idx:
                gi = i
                break
            start += len(g)
        shown = groups[gi]
        shown_start = start
        # pop-in of each group
        first_word_t = 0.0 if shown_start == 0 else cum[shown_start - 1]
    else:
        shown = words
        shown_start = 0
        first_word_t = 0.0

    # appear animation
    pop = ease_out(age / 0.14) if age < 0.14 else 1.0
    fade_out = 1.0 if remaining > 0.12 else max(remaining / 0.12, 0)
    alpha = pop * fade_out
    scale = 0.86 + 0.14 * pop
    size = int(st["size"] * scale)
    fnt = font(st["kind"], size)
    lines = wrap(" ".join(shown), fnt, st["max_w"])
    line_h = int(size * 1.18)
    total_h = line_h * len(lines)
    y = st["y"] - total_h // 2

    # background pill for interact / cta styles
    if style in ("interact",):
        pw = max(text_size(fnt, l)[0] for l in lines) + 80
        ph = total_h + 44
        px, py = (W - pw) // 2, y - 22
        box = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        ImageDraw.Draw(box).rounded_rectangle([px, py, px + pw, py + ph], radius=28,
                                              fill=(8, 14, 22, int(170 * alpha)), outline=YELLOW + (int(220 * alpha),), width=3)
        layer.alpha_composite(box)

    idx = shown_start
    for line in lines:
        lw = text_size(fnt, line)[0]
        x = (W - lw) // 2
        for w in line.split():
            ww = text_size(fnt, w + " ")[0]
            is_cur = idx == cur_idx
            colour = st["hl"] if is_cur else WHITE
            if style in ("hook", "stat", "cta"):
                # the whole line is shown; already-spoken words are white, current is highlighted, future dim
                if idx > cur_idx:
                    colour = (255, 255, 255)
                    a_word = int(255 * alpha * 0.55)
                else:
                    a_word = int(255 * alpha)
            else:
                a_word = int(255 * alpha)
            shadow_text(layer, (x, y), w, fnt, colour + (a_word,), stroke=max(4, size // 14), shadow=8 if idx == shown_start else 0)
            x += ww
            idx += 1
        y += line_h


# --------------------------------------------------------------------------
# effects
# --------------------------------------------------------------------------

def draw_scanline(layer: Image.Image, t: float, alpha: float = 1.0):
    """A cyan horizontal sweep from top to bottom, t in 0..1."""
    y = int(SAFE_TOP + (SAFE_BOTTOM + 60 - SAFE_TOP) * t)
    g = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    d.rectangle([0, y - 2, W, y + 2], fill=CYAN + (int(230 * alpha),))
    d.rectangle([0, y - 40, W, y], fill=CYAN + (int(50 * alpha),))
    g = g.filter(ImageFilter.GaussianBlur(3))
    layer.alpha_composite(g)


def draw_outro(layer: Image.Image, age: float, handle: str = "@TimeLapseEarth"):
    """Follow prompt: small, in the safe zone, animated in."""
    a = ease_out(age / 0.3)
    f = font("display", 44)
    f2 = font("semibold", 30)
    y = 1400
    glow_text(layer, (W // 2, y), handle, f, (255, 255, 255, int(255 * a)), glow=CYAN, radius=16, strength=0.5 * a, anchor="mm")
    ImageDraw.Draw(layer).text((W // 2, y + 46), "FOLLOW  ·  WATCH EARTH CHANGE", font=f2, fill=(255, 255, 255, int(190 * a)), anchor="mm")


def composite(frame_rgb: np.ndarray, layer: Image.Image) -> np.ndarray:
    base = Image.fromarray(frame_rgb, "RGB").convert("RGBA")
    base.alpha_composite(layer)
    return np.asarray(base.convert("RGB"))
