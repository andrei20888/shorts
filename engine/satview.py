"""
satview.py — procedural "clean satellite view" renderer for Time Lapse Earth.

Everything is generated from a seed: terrain, coast, shallow water, lush land,
deserts, rivers, growing cities (street grids), night lights with cyan/white
bloom, clouds with shadows, and cinematic grading.

A Scene precomputes static layers once; render(t, night, ...) returns the
world canvas for a moment in time (t in 0..1 = start year .. end year).
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

import cv2
import numpy as np

# --------------------------------------------------------------------------
# small helpers
# --------------------------------------------------------------------------

def hexc(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0


def lerp(a, b, t):
    return a + (b - a) * t


def smoothstep(e0, e1, x):
    d = e1 - e0
    if abs(d) < 1e-6:
        d = 1e-6
    t = np.clip((x - e0) / d, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def ease_in_out(t):
    return t * t * (3 - 2 * t)


def ramp(x: np.ndarray, stops: list[tuple[float, str]]) -> np.ndarray:
    """Piecewise-linear colour ramp. x in [0,1] (H,W) -> (H,W,3)."""
    xs = np.array([s[0] for s in stops], dtype=np.float32)
    cs = np.stack([hexc(s[1]) for s in stops])  # (n,3)
    out = np.zeros(x.shape + (3,), dtype=np.float32)
    for ch in range(3):
        out[..., ch] = np.interp(x, xs, cs[:, ch])
    return out


def fbm(h: int, w: int, rng: np.random.Generator, cells: float = 4.0, octaves: int = 6,
        persistence: float = 0.5, lacunarity: float = 2.0, aniso: float = 1.0) -> np.ndarray:
    """Value-noise fBm in [0,1] built from bicubically upsampled random grids.
    aniso > 1 stretches features horizontally (dunes), < 1 vertically."""
    out = np.zeros((h, w), dtype=np.float32)
    amp, total, c = 1.0, 0.0, cells
    for _ in range(octaves):
        gw = max(2, int(round(c / aniso)) + 2)
        gh = max(2, int(round(c * h / w)) + 2)
        g = rng.random((gh, gw), dtype=np.float32)
        up = cv2.resize(g, (w, h), interpolation=cv2.INTER_CUBIC)
        out += amp * up
        total += amp
        amp *= persistence
        c *= lacunarity
    out /= total
    out -= out.min()
    out /= max(out.max(), 1e-6)
    return out


def warp(img: np.ndarray, dx: np.ndarray, dy: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    return cv2.remap(img, xx + dx, yy + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def gauss(img: np.ndarray, sigma: float) -> np.ndarray:
    if sigma <= 0:
        return img
    if sigma > 12:  # fast large blur: downscale, blur, upscale
        f = sigma / 6.0
        h, w = img.shape[:2]
        small = cv2.resize(img, (max(2, int(w / f)), max(2, int(h / f))), interpolation=cv2.INTER_AREA)
        small = cv2.GaussianBlur(small, (0, 0), 6.0)
        return cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)
    return cv2.GaussianBlur(img, (0, 0), sigma)


def dist_to(mask: np.ndarray) -> np.ndarray:
    """Euclidean distance (px) from every pixel to the nearest True pixel of mask."""
    inv = (~mask).astype(np.uint8)
    return cv2.distanceTransform(inv, cv2.DIST_L2, 5).astype(np.float32)


def grid_pattern(h: int, w: int, angle_deg: float, spacing: float, line_w: float,
                 offset: float = 0.0) -> np.ndarray:
    """Soft street-grid mask (1 on streets) rotated by angle."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    a = math.radians(angle_deg)
    u = xx * math.cos(a) + yy * math.sin(a) + offset
    v = -xx * math.sin(a) + yy * math.cos(a) + offset * 0.37
    du = np.abs(((u / spacing) % 1.0) - 0.5) * spacing
    dv = np.abs(((v / spacing) % 1.0) - 0.5) * spacing
    d = np.minimum(du, dv)
    return smoothstep(line_w, line_w * 0.35, d)


# --------------------------------------------------------------------------
# palettes
# --------------------------------------------------------------------------

LUSH = [(0.00, "#0f3a22"), (0.22, "#1c5a2d"), (0.45, "#2f7a35"), (0.62, "#5f9a3c"),
        (0.78, "#8aa64a"), (0.90, "#8c7d55"), (1.00, "#d9d4c8")]
DESERT = [(0.00, "#b99a62"), (0.30, "#cbb078"), (0.55, "#d9c18a"), (0.75, "#c4a46d"),
          (0.90, "#a98a58"), (1.00, "#8d7147")]
SAVANNA = [(0.00, "#6f7a3c"), (0.30, "#8e8f47"), (0.55, "#a79d5a"), (0.75, "#8a8a4c"),
           (1.00, "#6b6a40")]
RAINFOREST = [(0.00, "#0b2f1a"), (0.30, "#114223"), (0.55, "#17552b"), (0.80, "#1f6630"),
              (1.00, "#2a7438")]
SALT = [(0.00, "#9e9e93"), (0.40, "#c9c6b6"), (0.70, "#e3dfd0"), (1.00, "#f2efe6")]
STEPPE = [(0.00, "#8a8558"), (0.35, "#a29a62"), (0.65, "#b3a86c"), (1.00, "#9a9060")]

WATER_DEEP = "#061b36"
WATER_MID = "#0c4472"
WATER_SHALLOW = "#2492ad"
WATER_SHORE = "#79c9c6"

PALETTES = {"lush": LUSH, "desert": DESERT, "savanna": SAVANNA, "rainforest": RAINFOREST,
            "salt": SALT, "steppe": STEPPE}


# --------------------------------------------------------------------------
# scene description
# --------------------------------------------------------------------------

@dataclass
class CitySeed:
    x: float            # normalised 0..1
    y: float
    radius: float = 0.18  # normalised to width
    weight: float = 1.0
    start: float = 0.0    # t at which this seed starts growing
    grid_angle: float = 12.0


@dataclass
class SceneSpec:
    kind: str = "coastal"          # coastal | lake | fishbone | inland
    seed: int = 7
    palette: str = "lush"
    sea_side: str = "left"         # left | right | top | bottom | none
    sea_fraction: float = 0.42     # how much of the canvas is sea at the coast line
    coast_rough: float = 1.0
    mountains: float = 0.4         # relief amplitude
    river: Optional[list[tuple[float, float]]] = None   # control points normalised
    river_width: float = 0.012
    cities: list[CitySeed] = field(default_factory=list)
    city_max: float = 1.0          # overall extent multiplier at t=1
    density_power: float = 1.4
    coast_affinity: float = 0.6    # cities hug the shore
    cloud_cover: float = 0.14
    cloud_scale: float = 2.2
    palm: Optional[dict] = None    # {"x":..,"y":..,"dir":deg,"size":..,"t0":..,"t1":..}
    reclaim: list[dict] = field(default_factory=list)  # extra land polygons appearing over time
    lake_shrink: Optional[dict] = None  # {"t0":..,"t1":..,"amount":..}
    fishbone: Optional[dict] = None     # {"spacing":..,"t0":..,"t1":..,"angle":..}
    light_warmth: float = 0.35     # fraction of warm sodium lights vs cyan/white
    sprawl_noise: float = 0.55
    land_detail: float = 1.0
    street_spacing: Optional[float] = None   # px; default width/150
    lake_center: tuple = (0.5, 0.47)
    lake_size: float = 1.0
    sea_rise: Optional[dict] = None     # {"t0","t1","amount"} coast floods over time
    circles: Optional[dict] = None      # pivot-irrigation circles {"x","y","rx","ry","n","r","t0","t1","fade_t0","fade_t1"}


# --------------------------------------------------------------------------
# the scene
# --------------------------------------------------------------------------

class Scene:
    def __init__(self, spec: SceneSpec, width: int, height: int):
        self.spec = spec
        self.w, self.h = width, height
        self.rng = np.random.default_rng(spec.seed)
        self._build_static()

    # ---------------------------------------------------------------- static
    def _build_static(self):
        s, h, w, rng = self.spec, self.h, self.w, self.rng
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        nx, ny = xx / w, yy / h

        # --- elevation: fbm + domain warp + large-scale shaping ------------
        base = fbm(h, w, rng, cells=3.2, octaves=7, persistence=0.52)
        wx = (fbm(h, w, rng, cells=2.0, octaves=4) - 0.5) * w * 0.08 * s.coast_rough
        wy = (fbm(h, w, rng, cells=2.0, octaves=4) - 0.5) * h * 0.08 * s.coast_rough
        elev = warp(base, wx, wy)
        detail = fbm(h, w, rng, cells=18.0, octaves=4, persistence=0.55)
        elev = elev * 0.82 + detail * 0.18 * s.land_detail

        if s.kind == "lake":
            # basin: bowl in the middle filled with water
            cx, cy = s.lake_center
            r = np.sqrt(((nx - cx) * 1.0) ** 2 + ((ny - cy) * (h / w)) ** 2) / s.lake_size
            bowl = smoothstep(0.12, 0.62, r)
            elev = bowl * 0.78 + (elev - 0.5) * 0.30 + 0.12
        elif s.sea_side != "none":
            g = {"left": nx, "right": 1 - nx, "top": ny, "bottom": 1 - ny}[s.sea_side]
            # coastline at sea_fraction with a gentle ramp; noise gives bays and headlands
            shore = smoothstep(s.sea_fraction - 0.16, s.sea_fraction + 0.22, g)
            elev = shore * 0.62 + (elev - 0.5) * 0.46 + 0.05
        else:
            elev = elev * 0.7 + 0.25

        self.elev = elev.astype(np.float32)
        self.sea_level0 = 0.30
        self.water0 = self.elev < self.sea_level0

        # --- river carved into the land -----------------------------------
        self.river_mask = np.zeros((h, w), dtype=np.float32)
        if s.river:
            pts = self._smooth_path(s.river, rng)
            rw = max(2.0, s.river_width * w)
            m = np.zeros((h, w), dtype=np.uint8)
            cv2.polylines(m, [pts], False, 255, int(rw), lineType=cv2.LINE_AA)
            self.river_mask = cv2.GaussianBlur(m.astype(np.float32) / 255.0, (0, 0), 1.2)
            self.elev = np.minimum(self.elev, np.where(self.river_mask > 0.5, self.sea_level0 - 0.02, 1.0)).astype(np.float32)
            self.water0 = (self.elev < self.sea_level0) | (self.river_mask > 0.5)

        # --- land texture -------------------------------------------------
        moist = fbm(h, w, rng, cells=5.0, octaves=5)
        fine = fbm(h, w, rng, cells=60.0, octaves=3, persistence=0.6)
        self.fine = fine
        pal = PALETTES[s.palette]
        if s.palette == "desert":
            dunes = fbm(h, w, rng, cells=28.0, octaves=3, persistence=0.5, aniso=3.5)
            tex = np.clip(0.55 * self.elev + 0.30 * dunes + 0.15 * moist, 0, 1)
        else:
            tex = np.clip(0.45 * self.elev + 0.40 * moist + 0.15 * fine, 0, 1)
        land = ramp(tex, pal)
        # hill shade
        gx = cv2.Sobel(self.elev, cv2.CV_32F, 1, 0, ksize=3) / 8.0
        gy = cv2.Sobel(self.elev, cv2.CV_32F, 0, 1, ksize=3) / 8.0
        lx, ly = -0.6, -0.8
        shade = np.clip(1.0 + (gx * lx + gy * ly) * (260.0 * s.mountains), 0.55, 1.35)
        shade = cv2.GaussianBlur(shade, (0, 0), 1.0)
        land *= shade[..., None]
        land *= (0.94 + 0.12 * (fine - 0.5))[..., None]
        self.land_day = np.clip(land, 0, 1).astype(np.float32)

        # salt / exposed-bed colour for shrinking lakes
        self.bed_day = ramp(np.clip(0.5 * fine + 0.5 * moist, 0, 1), SALT).astype(np.float32)

        # --- water ---------------------------------------------------------
        self.wave = fbm(h, w, rng, cells=90.0, octaves=2, persistence=0.6)
        self.depth_noise = fbm(h, w, rng, cells=7.0, octaves=4)
        self.sand_day = ramp(np.clip(fine * 0.6 + 0.3, 0, 1), DESERT).astype(np.float32)
        self.pasture_day = ramp(np.clip(fine * 0.7 + 0.15, 0, 1),
                                [(0.0, "#a08a52"), (0.5, "#bba56a"), (1.0, "#cdb98a")]).astype(np.float32)
        self._water_cache = {}

        # --- urban potential -----------------------------------------------
        pot = np.zeros((h, w), dtype=np.float32)
        angle_field = np.zeros((h, w), dtype=np.float32)
        angle_w = np.zeros((h, w), dtype=np.float32)
        for c in s.cities:
            d2 = ((nx - c.x) ** 2 + ((ny - c.y) * (h / w)) ** 2) / (c.radius ** 2)
            k = c.weight * np.exp(-d2 * 1.2)
            pot = np.maximum(pot, k * (1.0 - 0.15 * c.start))
            angle_field += c.grid_angle * k
            angle_w += k
        self.city_angle = angle_field / np.maximum(angle_w, 1e-4)
        sprawl = fbm(h, w, rng, cells=9.0, octaves=5, persistence=0.55)
        pot = pot * (1.0 - s.sprawl_noise * 0.6 + s.sprawl_noise * 1.2 * sprawl)
        if s.sea_side != "none" or s.river:
            dcoast = dist_to(self.water0)
            pot *= 1.0 + s.coast_affinity * np.exp(-dcoast / (0.07 * w))
        pot *= (~self.water0).astype(np.float32)
        # dilate the "no build" zone slightly so cities never touch the water edge weirdly
        self.pot = np.clip(pot, 0, 1.6).astype(np.float32)

        # street grids: three rotated grids, selected by the dominant city angle
        self.streets = np.zeros((h, w), dtype=np.float32)
        self.avenues = np.zeros((h, w), dtype=np.float32)
        district = fbm(h, w, rng, cells=6.0, octaves=3)
        angles = [0.0, 27.0, 61.0]
        spacing = s.street_spacing or max(9.0, w / 150.0)
        for i, a in enumerate(angles):
            sel = ((district * 3).astype(int) == i).astype(np.float32)
            sel = cv2.GaussianBlur(sel, (0, 0), 2.0)
            g = grid_pattern(h, w, a + 11.0, spacing, 1.1, offset=i * 37.0)
            av = grid_pattern(h, w, a + 11.0, spacing * 5.0, 1.9, offset=i * 37.0)
            self.streets += g * sel
            self.avenues += av * sel
        self.block_var = fbm(h, w, rng, cells=w / spacing, octaves=1)
        district_tone = fbm(h, w, rng, cells=4.0, octaves=2)
        blocks = ramp(self.block_var, [(0.0, "#8a857c"), (0.5, "#a8a297"), (1.0, "#c2bbae")])
        blocks *= (0.92 + 0.16 * district_tone)[..., None]
        blocks *= np.array([1.0, 0.985, 0.95], dtype=np.float32) ** (district_tone[..., None] * 2 - 1)
        self.blocks = np.clip(blocks, 0, 1).astype(np.float32)
        self.parks = smoothstep(0.80, 0.9, fbm(h, w, rng, cells=22.0, octaves=2))

        # farmland patchwork (fields) on lush land away from mountains
        if s.palette in ("lush", "savanna", "steppe"):
            cell = rng.random((int(h / 7), int(w / 13)), dtype=np.float32)
            cells = cv2.resize(cell, (w, h), interpolation=cv2.INTER_NEAREST)
            cells = warp(cells, (fbm(h, w, rng, cells=3.0, octaves=2) - 0.5) * 14, (fbm(h, w, rng, cells=3.0, octaves=2) - 0.5) * 14)
            edges = cv2.resize(np.ones_like(cell), (w, h), interpolation=cv2.INTER_NEAREST)  # placeholder
            field_col = ramp(cells, [(0.0, "#7c8f3a"), (0.3, "#a6a84c"), (0.55, "#c2a95c"), (0.8, "#8fae4a"), (1.0, "#5e8c38")])
            farm_zone = smoothstep(0.35, 0.6, moist) * smoothstep(0.62, 0.45, self.elev) * (~self.water0).astype(np.float32)
            farm_zone *= smoothstep(0.35, 0.7, fbm(h, w, rng, cells=3.5, octaves=3))
            farm_zone = cv2.GaussianBlur(farm_zone, (0, 0), 3.0) * 0.85
            self.land_day = np.clip(self.land_day * (1 - farm_zone[..., None]) + field_col * shade[..., None] * farm_zone[..., None], 0, 1).astype(np.float32)
        self.roof_specks = (rng.random((h, w), dtype=np.float32) > 0.985).astype(np.float32)
        self.light_noise = fbm(h, w, rng, cells=40.0, octaves=3)
        self.warm_noise = fbm(h, w, rng, cells=14.0, octaves=3)
        self.flicker = rng.random((h, w), dtype=np.float32)

        # --- palm / reclamation ------------------------------------------
        self.palm_layers = self._build_palm() if s.palm else None

        # --- fishbone deforestation ----------------------------------------
        self.fish = self._build_fishbone() if s.fishbone else None

        # --- pivot irrigation circles --------------------------------------
        self.circle_list = None
        if s.circles:
            c = s.circles
            crng = np.random.default_rng(s.seed + 7)
            n = c.get("n", 70)
            lst = []
            # jittered grid: real pivots sit in rows along access roads
            cols = int(math.sqrt(n * (c["rx"] / c["ry"]) * (w / h))) + 1
            rows = int(n / cols) + 1
            cells = [(i, j) for i in range(cols) for j in range(rows)]
            crng.shuffle(cells)
            for (i, j) in cells[:n]:
                cx = (c["x"] - c["rx"] + (i + 0.5 + crng.uniform(-0.2, 0.2)) * 2 * c["rx"] / cols) * w
                cy = (c["y"] - c["ry"] + (j + 0.5 + crng.uniform(-0.2, 0.2)) * 2 * c["ry"] / rows) * h
                r = c.get("r", 0.02) * w * crng.uniform(0.8, 1.15)
                a = crng.uniform(c["t0"], c["t1"])
                d = crng.uniform(c.get("fade_t0", 2.0), c.get("fade_t1", 3.0))
                lst.append((int(cx), int(cy), int(r), a, d, crng.uniform(0.0, 1.0)))
            self.circle_list = lst
            self.crop_day = ramp(np.clip(fine * 0.8 + 0.1, 0, 1), [(0.0, "#2f7d33"), (0.5, "#4f9a3b"), (1.0, "#86b54a")]).astype(np.float32)

        # --- clouds --------------------------------------------------------
        self.cloud_big = fbm(h * 2, w, rng, cells=s.cloud_scale, octaves=6, persistence=0.55, aniso=1.7)
        self.cloud_fine = fbm(h * 2, w, rng, cells=s.cloud_scale * 7, octaves=3, persistence=0.5, aniso=2.5)

        # --- vignette ------------------------------------------------------
        r = np.sqrt(((nx - 0.5) * 2) ** 2 + ((ny - 0.5) * 2) ** 2)
        self.vignette = np.clip(1.0 - 0.28 * smoothstep(0.55, 1.45, r), 0, 1).astype(np.float32)

    def _smooth_path(self, ctrl, rng):
        pts = np.array([(x * self.w, y * self.h) for x, y in ctrl], dtype=np.float32)
        # Catmull-Rom through control points
        out = []
        p = np.vstack([pts[:1], pts, pts[-1:]])
        for i in range(1, len(p) - 2):
            for k in np.linspace(0, 1, 40, endpoint=False):
                t2, t3 = k * k, k * k * k
                a = p[i - 1] * (-0.5 * t3 + t2 - 0.5 * k) + p[i] * (1.5 * t3 - 2.5 * t2 + 1) + \
                    p[i + 1] * (-1.5 * t3 + 2 * t2 + 0.5 * k) + p[i + 2] * (0.5 * t3 - 0.5 * t2)
                out.append(a)
        out = np.array(out)
        # organic meander jitter
        n = len(out)
        jit = np.cumsum(rng.normal(0, 1, (n, 2)), axis=0)
        jit -= np.linspace(jit[0], jit[-1], n)
        out += jit * (self.w * 0.0035)
        return out.astype(np.int32)

    def _build_palm(self):
        """Palm Jumeirah-like reclamation: trunk, fronds, crescent. Returns list of
        (mask, reveal_start, reveal_end) with reveal in 0..1 of the palm window."""
        s, h, w = self.spec, self.h, self.w
        p = s.palm
        cx, cy = p["x"] * w, p["y"] * h
        size = p.get("size", 0.22) * w
        ang = math.radians(p.get("dir", -90))   # direction pointing to the sea
        dx, dy = math.cos(ang), math.sin(ang)
        px, py = -dy, dx                        # perpendicular
        layers = []

        def line_mask(pts, thickness):
            m = np.zeros((h, w), dtype=np.uint8)
            cv2.polylines(m, [np.array(pts, dtype=np.int32)], False, 255, int(max(2, thickness)), lineType=cv2.LINE_AA)
            return m.astype(np.float32) / 255.0

        trunk_len = size * 0.95
        trunk = line_mask([(cx, cy), (cx + dx * trunk_len, cy + dy * trunk_len)], size * 0.075)
        layers.append((trunk, 0.0, 0.35))
        n_fronds = p.get("fronds", 8)
        for i in range(n_fronds):
            f = (i + 1) / (n_fronds + 1)
            base = (cx + dx * trunk_len * (0.18 + 0.72 * f), cy + dy * trunk_len * (0.18 + 0.72 * f))
            spread = math.radians(62 - 30 * f)
            flen = size * (0.52 - 0.18 * f)
            for side in (-1, 1):
                ex = base[0] + (dx * math.cos(spread) + px * side * math.sin(spread)) * flen
                ey = base[1] + (dy * math.cos(spread) + py * side * math.sin(spread)) * flen
                # slight curve toward the sea
                mid = ((base[0] + ex) / 2 + dx * flen * 0.05, (base[1] + ey) / 2 + dy * flen * 0.05)
                fr = line_mask([base, mid, (ex, ey)], size * 0.03)
                layers.append((fr, 0.25 + 0.45 * f, 0.55 + 0.4 * f))
        # crescent breakwater
        crescent = np.zeros((h, w), dtype=np.uint8)
        c_center = (int(cx + dx * trunk_len * 0.62), int(cy + dy * trunk_len * 0.62))
        rad = int(size * 0.7)
        start_ang = math.degrees(ang) - 118
        cv2.ellipse(crescent, c_center, (rad, rad), 0, start_ang, start_ang + 236, 255, int(size * 0.018), lineType=cv2.LINE_AA)
        layers.append((crescent.astype(np.float32) / 255.0, 0.55, 1.0))
        return layers

    def _build_fishbone(self):
        """Roads for fishbone deforestation: a main road and perpendicular feeders."""
        s, h, w = self.spec, self.h, self.w
        f = s.fishbone
        ang = math.radians(f.get("angle", 8))
        dx, dy = math.cos(ang), math.sin(ang)
        px, py = -dy, dx
        cx, cy = f.get("x", 0.5) * w, f.get("y", 0.5) * h
        L = 1.6 * max(w, h)
        main = np.zeros((h, w), dtype=np.uint8)
        cv2.line(main, (int(cx - dx * L), int(cy - dy * L)), (int(cx + dx * L), int(cy + dy * L)), 255, 3, cv2.LINE_AA)
        spacing = f.get("spacing", 0.07) * w
        feeders = []
        n = int(L / spacing)
        rng = np.random.default_rng(s.seed + 99)
        for i in range(-n, n + 1):
            bx, by = cx + dx * i * spacing, cy + dy * i * spacing
            if not (-0.2 * w < bx < 1.2 * w and -0.2 * h < by < 1.2 * h):
                continue
            flen = f.get("feeder_len", 0.42) * w * rng.uniform(0.6, 1.0)
            m = np.zeros((h, w), dtype=np.uint8)
            for side in (-1, 1):
                ex, ey = bx + px * side * flen, by + py * side * flen
                cv2.line(m, (int(bx), int(by)), (int(ex), int(ey)), 255, 2, cv2.LINE_AA)
            order = abs(i) / max(n, 1) + rng.uniform(-0.08, 0.08)
            feeders.append((m, order, dist_to(m > 0)))
        return {"main": main, "dmain": dist_to(main > 0), "feeders": feeders, "dir": (dx, dy)}

    # ----------------------------------------------------------------- dynamic
    def water_mask(self, t: float) -> np.ndarray:
        s = self.spec
        level = self.sea_level0
        if s.kind == "lake" and s.lake_shrink:
            ls = s.lake_shrink
            k = smoothstep(ls["t0"], ls["t1"], t)
            level = self.sea_level0 - ls.get("amount", 0.22) * k
        if s.sea_rise:
            sr = s.sea_rise
            level = level + sr.get("amount", 0.06) * smoothstep(sr["t0"], sr["t1"], t)
        return (self.elev < level) | (self.river_mask > 0.5), level

    def land_mask_extra(self, t: float) -> np.ndarray:
        """Reclaimed land appearing over time (palm etc.)."""
        extra = np.zeros((self.h, self.w), dtype=np.float32)
        if self.palm_layers:
            p = self.spec.palm
            k = smoothstep(p["t0"], p["t1"], t)
            for m, a, b in self.palm_layers:
                reveal = smoothstep(a, b, k)
                extra = np.maximum(extra, m * reveal)
        return extra

    def render(self, t: float, night: float = 0.0, cloud_t: Optional[float] = None,
               city_scale: float = 1.0) -> np.ndarray:
        """Return float32 RGB (H,W,3) in 0..1 for normalised time t."""
        s, h, w = self.spec, self.h, self.w
        t = float(np.clip(t, 0, 1))
        night = float(np.clip(night, 0, 1))

        # ---------------- ground (land / exposed bed / water) --------------
        water, level = self.water_mask(t)
        extra = self.land_mask_extra(t)
        water_f = water.astype(np.float32) * (1.0 - extra)
        water_bool = water_f > 0.5

        ground = self.land_day.copy()
        if s.kind == "lake":
            # exposed lake bed between original and current level
            exposed = (self.elev < self.sea_level0 + 0.015) & ~water_bool
            ring = np.clip((self.elev - level) / max(self.sea_level0 - level + 1e-3, 1e-3), 0, 1)
            bed = self.bed_day * (0.86 + 0.14 * ring)[..., None]
            e = cv2.GaussianBlur(exposed.astype(np.float32), (0, 0), 1.0)[..., None]
            ground = ground * (1 - e) + bed * e
        if extra.any():
            ex = extra[..., None]
            ground = ground * (1 - ex) + self.sand_day * ex

        # water colour by distance to shore (cached while the shoreline is static)
        key = (round(level, 4), round(float(extra.sum()), 1))
        if key not in self._water_cache:
            d = dist_to(~water_bool)  # distance from water pixel to land
            depth = smoothstep(0.0, 0.07 * w, d) * (0.65 + 0.7 * self.depth_noise) + 0.12 * (self.depth_noise - 0.5)
            depth = np.clip(depth, 0, 1)
            wcol = ramp(depth, [(0.0, WATER_SHORE), (0.07, WATER_SHALLOW), (0.30, WATER_MID), (1.0, WATER_DEEP)])
            wcol *= (0.95 + 0.10 * (self.wave - 0.5))[..., None]
            wcol *= (0.93 + 0.14 * self.depth_noise)[..., None]
            if len(self._water_cache) > 6:
                self._water_cache.clear()
            self._water_cache[key] = wcol.astype(np.float32)
        wcol = self._water_cache[key]
        wf = cv2.GaussianBlur(water_f, (0, 0), 0.8)[..., None]
        img = ground * (1 - wf) + wcol * wf

        # ---------------- fishbone deforestation -------------------------
        cleared_total = None
        if self.fish is not None:
            f = s.fishbone
            k = smoothstep(f["t0"], f["t1"], t)
            cleared = np.zeros((h, w), dtype=np.float32)
            roads = self.fish["main"].astype(np.float32) / 255.0 * smoothstep(0.0, 0.08, k)
            dmain = self.fish["dmain"]
            cleared = np.maximum(cleared, smoothstep(0.016 * w * k, 0.0, dmain) * smoothstep(0.0, 0.1, k))
            for m, order, dm in self.fish["feeders"]:
                kk = smoothstep(order * 0.75, order * 0.75 + 0.3, k)
                if kk <= 0:
                    continue
                width = (0.004 + 0.03 * kk) * w
                strip = smoothstep(width, width * 0.35, dm) * (0.55 + 0.45 * self.fine)
                strip = np.where(dm < width, strip, 0)
                cleared = np.maximum(cleared, strip * kk)
                roads = np.maximum(roads, m.astype(np.float32) / 255.0 * kk)
            cleared = np.clip(cleared, 0, 1)
            c3 = cleared[..., None]
            img = img * (1 - c3) + self.pasture_day * c3
            rd = roads[..., None]
            img = img * (1 - rd * 0.8) + hexc("#d8c9a6") * rd * 0.8
            cleared_total = cleared
            roads_total = roads

        # ---------------- pivot irrigation circles ------------------------
        circ = None
        if self.circle_list:
            m = np.zeros((h, w), dtype=np.float32)
            for (cx_, cy_, r_, a, d, ph) in self.circle_list:
                alpha = float(smoothstep(a, a + 0.05, t) * (1 - smoothstep(d, d + 0.08, t)))
                if alpha <= 0.01:
                    continue
                cv2.circle(m, (cx_, cy_), r_, float(alpha), -1, lineType=cv2.LINE_AA)
            # pivot arm: slightly darker wedge texture via fine noise
            circ = cv2.GaussianBlur(m, (0, 0), 1.0) * (0.8 + 0.2 * self.fine)
            c3 = circ[..., None]
            img = img * (1 - c3) + self.crop_day * c3

        # ---------------- cities ------------------------------------------
        # extent grows with t: threshold falls from 1.15 (nothing) to ~0.18
        growth = ease_in_out(t)
        thr = lerp(1.05, 0.22 / max(s.city_max, 1e-3), growth) / max(city_scale, 1e-3)
        pot = self.pot
        if extra.any():
            pot = np.maximum(pot, extra * 0.9 * smoothstep(0.6, 1.0, extra))
        density = np.clip((pot - thr) / 0.55, 0, 1) ** s.density_power    # 0 suburb .. 1 core
        built = smoothstep(thr - 0.03, thr + 0.03, pot)
        # patchy sprawl edge: low-density areas are only partly built
        patch = smoothstep(0.2, 0.9, density + 0.5 * self.block_var)
        built *= patch
        built = cv2.GaussianBlur(built, (0, 0), 1.0)
        built *= (1.0 - water_f)

        if built.max() > 0.01:
            core_dark = hexc("#666460")
            dens3 = density[..., None]
            city_day = self.blocks * (1 - 0.5 * dens3) + core_dark * 0.5 * dens3
            streets = np.clip(self.streets * 0.6 + self.avenues, 0, 1)
            city_day = city_day * (1 - streets[..., None] * 0.5) + hexc("#d9d4ca") * streets[..., None] * 0.5
            city_day += self.roof_specks[..., None] * density[..., None] * 0.45
            built = built * (1 - 0.85 * self.parks * (1 - density))   # parks survive in suburbs
            b3 = built[..., None]
            img = img * (1 - b3) + city_day * b3

        # ---------------- clouds ------------------------------------------
        ct = t if cloud_t is None else cloud_t
        shift = int((ct * 0.9 + 0.05) * h)
        cb = self.cloud_big[shift:shift + h]
        cf = self.cloud_fine[shift:shift + h]
        cov = s.cloud_cover
        field_c = cb * 0.72 + cf * 0.28
        lo = 0.80 - cov * 0.9
        cloud = smoothstep(lo, lo + 0.16, field_c) * (0.55 + 0.45 * smoothstep(lo, lo + 0.3, field_c))
        cloud_soft = cv2.GaussianBlur(cloud, (0, 0), 1.2)
        haze = gauss(cloud_soft, 30.0) * 0.35
        shadow = np.roll(np.roll(cloud_soft, 14, axis=0), 18, axis=1)
        img *= (1.0 - 0.40 * shadow)[..., None]

        # ---------------- night ------------------------------------------
        if night > 0.001:
            dusk = img * lerp(1.0, 0.13, night)
            dusk = dusk * np.array([0.75, 0.95, 1.25], dtype=np.float32) ** night  # cool ambient
            dusk += np.array([0.012, 0.03, 0.06], dtype=np.float32) * night
            if built.max() > 0.01:
                on = smoothstep(0.0, 0.25, built) * (0.35 + 0.65 * density) * (0.6 + 0.4 * self.light_noise)
                lamps = (self.streets * 0.55 + self.avenues * 1.0) * on
                lamps += self.roof_specks * density * 0.8 * on
                sparkle = smoothstep(0.55, 0.95, self.light_noise) * density * 0.3 * on
                lamps = np.clip(lamps + sparkle, 0, 1.2)
                # some lights are not yet on in new districts
                lamps *= 0.7 + 0.3 * smoothstep(0.0, 1.0, (self.flicker * 0.5 + 0.5) * (0.5 + density))
                warm_mix = smoothstep(0.4, 0.75, self.warm_noise) * s.light_warmth
                cyan = hexc("#9ff6ff")
                white = hexc("#ffffff")
                warm = hexc("#ffbe6a")
                col = cyan * (1 - warm_mix)[..., None] * 0.72 + white * (1 - warm_mix)[..., None] * 0.28 + warm * warm_mix[..., None]
                light_rgb = lamps[..., None] * col
                bloom1 = gauss(light_rgb, 3.0)
                bloom2 = gauss(light_rgb, 14.0)
                bloom3 = gauss(light_rgb, 44.0)
                glow = light_rgb * 0.8 + bloom1 * 0.45 + bloom2 * 0.28 + bloom3 * 0.2
                dusk += glow * night * (1.0 - 0.6 * cloud_soft)[..., None]
            if circ is not None:
                dusk += (circ * 0.02 * night)[..., None] * hexc("#9ff6ff")
            if cleared_total is not None:
                # settlements and burning edges glow warm along the clearings
                pts = (self.flicker > 0.994).astype(np.float32) * smoothstep(0.15, 0.7, cleared_total) * 1.4
                lamp = pts + roads_total * 0.35 + smoothstep(0.3, 0.9, cleared_total) * 0.06
                glow = lamp + gauss(lamp, 3.0) * 0.8 + gauss(lamp, 14.0) * 0.6 + gauss(lamp, 40.0) * 0.4
                dusk += (glow * night)[..., None] * hexc("#ffb866")
            # filmic soft knee so the bloom never blows out to flat white
            img = np.where(dusk < 0.6, dusk, 0.6 + 0.4 * (1 - np.exp(-(dusk - 0.6) / 0.4)))

        # clouds on top (lit by sun during day, dim at night)
        cloud_col = lerp(hexc("#f7f9fb"), hexc("#26343f"), night)
        c3 = np.clip(cloud_soft * 0.85 + haze * (1 - night * 0.7), 0, 0.9)[..., None]
        img = img * (1 - c3) + cloud_col * c3

        # ---------------- grade --------------------------------------------
        img = self.grade(img, night)
        return img

    def grade(self, img: np.ndarray, night: float) -> np.ndarray:
        img = np.clip(img, 0, 1)
        # gentle S-curve + saturation
        img = img * img * (3 - 2 * img) * 0.35 + img * 0.65
        lum = img @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
        sat = 1.18 - 0.1 * night
        img = lum[..., None] + (img - lum[..., None]) * sat
        # cool shadows / clean highlights
        img += (0.5 - lum)[..., None] * np.array([-0.02, 0.0, 0.035], dtype=np.float32) * 0.6
        img *= self.vignette[..., None]
        return np.clip(img, 0, 1).astype(np.float32)


# --------------------------------------------------------------------------
# camera: crop/zoom the world into an output frame
# --------------------------------------------------------------------------

def camera(world: np.ndarray, out_w: int, out_h: int, cx: float = 0.5, cy: float = 0.5,
           scale: float = 1.0, rot_deg: float = 0.0) -> np.ndarray:
    """cx,cy normalised centre; scale 1 = the world's full height fits the frame."""
    H, W = world.shape[:2]
    # visible region in world pixels
    vis_h = H / scale
    vis_w = vis_h * out_w / out_h
    if vis_w > W:
        vis_w = W
        vis_h = vis_w * out_h / out_w
    px, py = cx * W, cy * H
    s = out_h / vis_h
    M = cv2.getRotationMatrix2D((px, py), rot_deg, s)
    M[0, 2] += out_w / 2 - px
    M[1, 2] += out_h / 2 - py
    flags = cv2.INTER_AREA if s < 1 else cv2.INTER_LINEAR
    return cv2.warpAffine(world, M, (out_w, out_h), flags=flags, borderMode=cv2.BORDER_REFLECT)


def to_u8(img: np.ndarray) -> np.ndarray:
    return np.clip(img * 255.0 + 0.5, 0, 255).astype(np.uint8)


def add_grain(img_u8: np.ndarray, rng: np.random.Generator, amount: float = 3.0) -> np.ndarray:
    n = rng.normal(0, amount, img_u8.shape[:2]).astype(np.float32)
    out = img_u8.astype(np.float32) + n[..., None]
    return np.clip(out, 0, 255).astype(np.uint8)
