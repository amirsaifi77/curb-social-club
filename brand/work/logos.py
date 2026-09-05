"""Curb Social Club logo builder.

Wordmarks are Instrument Serif outlines (real font, converted to paths),
edited with skia-pathops. Monograms are constructed geometry on a 64 grid.
Every SVG is written in three colour variants: ink, light, accent.
"""
import os, math
import pathops
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

FONTS = "/home/claude/cac/brand-v2/fonts"
OUT = "/home/claude/cac/brand-v2/logos"
os.makedirs(OUT, exist_ok=True)

INK = "#23272A"      # marine layer text primary (light scheme)
LIGHT = "#EDEFF0"    # marine layer text primary (dark scheme)
ACCENT = "#5E2A2E"   # oxblood
VARIANTS = {"": INK, "-light": LIGHT, "-accent": ACCENT}

# --------------------------------------------------------------------------
# font helpers
# --------------------------------------------------------------------------
class Face:
    def __init__(self, path):
        self.f = TTFont(path)
        self.gs = self.f.getGlyphSet()
        self.cmap = self.f.getBestCmap()
        self.hmtx = self.f["hmtx"]
        self.upm = self.f["head"].unitsPerEm
        self.kern = self._kern()

    def _kern(self):
        kern = {}
        if "GPOS" not in self.f:
            return kern
        gpos = self.f["GPOS"].table
        for lk in gpos.LookupList.Lookup:
            for st in lk.SubTable:
                if st.LookupType == 9:
                    st = st.ExtSubTable
                if st.LookupType != 2:
                    continue
                if st.Format == 1:
                    for i, g1 in enumerate(st.Coverage.glyphs):
                        for pvr in st.PairSet[i].PairValueRecord:
                            v = getattr(pvr.Value1, "XAdvance", 0) if pvr.Value1 else 0
                            kern.setdefault((g1, pvr.SecondGlyph), v)
                elif st.Format == 2:
                    for g1 in st.Coverage.glyphs:
                        c1 = st.ClassDef1.classDefs.get(g1, 0)
                        for g2, c2 in st.ClassDef2.classDefs.items():
                            v = st.Class1Record[c1].Class2Record[c2].Value1
                            xa = getattr(v, "XAdvance", 0) if v else 0
                            if xa:
                                kern.setdefault((g1, g2), xa)
        return kern

    def glyph(self, ch):
        g = self.cmap[ord(ch)]
        p = pathops.Path()
        self.gs[g].draw(p.getPen())
        return p, self.hmtx[g][0], g

    def text(self, s, tracking=0, kern=True, scale=1.0, x0=0.0, y0=0.0):
        """Returns (path, advance) in font units (y up), scaled."""
        out = pathops.Path()
        x = 0.0
        prev = None
        self.positions = []
        for i, ch in enumerate(s):
            p, adv, g = self.glyph(ch)
            if kern and prev is not None:
                x += self.kern.get((prev, g), 0)
            self.positions.append(x0 + x * scale)
            out.addPath(p.transform(scale, 0, 0, scale, x0 + x * scale, y0))
            x += adv + (tracking if i + 1 < len(s) else 0)
            prev = g
        out = union(out)
        return out, x * scale

# --------------------------------------------------------------------------
# geometry helpers (font units, y up unless noted)
# --------------------------------------------------------------------------
def poly(pts):
    p = pathops.Path()
    pen = p.getPen()
    pen.moveTo(pts[0])
    for pt in pts[1:]:
        pen.lineTo(pt)
    pen.closePath()
    return p

def rect(x0, y0, x1, y1):
    return poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])

def union(*paths):
    out = pathops.Path()
    pathops.union(list(paths), out.getPen())
    return out

def diff(a, b):
    out = pathops.Path()
    pathops.difference([a], [b], out.getPen())
    return out

def bounds(p):
    return p.bounds  # (xmin, ymin, xmax, ymax)

def svg_d(path, flip=True, tx=0, ty=0, scale=1.0):
    """Path (y up) -> SVG d string (y down) with translate/scale applied."""
    p = path.transform(scale, 0, 0, -scale if flip else scale, tx, ty)
    pen = SVGPathPen(None, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    p.draw(pen)
    return pen.getCommands()

def write_svg(name, path_yup, pad=0.08, height=None, extra=None, title=None, w=None, h=None, bbox=None):
    """Write three colour variants of one mark. bbox forces the viewBox (in y-up units)."""
    if bbox is None:
        x0, y0, x1, y1 = bounds(path_yup)
    else:
        x0, y0, x1, y1 = bbox
    bw, bh = x1 - x0, y1 - y0
    px, py = bw * pad, bh * pad
    vx, vy, vw, vh = x0 - px, -(y1 + py), bw + 2 * px, bh + 2 * py
    d = svg_d(path_yup)
    for suffix, color in VARIANTS.items():
        body = f'<path fill="{color}" fill-rule="nonzero" d="{d}"/>'
        if extra:
            body += extra(color)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vx:.1f} {vy:.1f} {vw:.1f} {vh:.1f}" '
               f'width="{vw:.0f}" height="{vh:.0f}" role="img" aria-label="{title or name}">\n'
               f'<title>{title or name}</title>\n{body}\n</svg>\n')
        with open(os.path.join(OUT, f"{name}{suffix}.svg"), "w") as fh:
            fh.write(svg)
    return (vx, vy, vw, vh)

# --------------------------------------------------------------------------
# wordmarks
# --------------------------------------------------------------------------
serif = Face(f"{FONTS}/InstrumentSerif-Regular.ttf")
serif_i = Face(f"{FONTS}/InstrumentSerif-Italic.ttf")
geist_m = Face(f"{FONTS}/Geist-Medium.ttf")
geist_r = Face(f"{FONTS}/Geist-Regular.ttf")

def curb_plain(face=serif, tracking=0):
    return face.text("curb", tracking=tracking)

def chamfer_b(path, cut=36, bx=None):
    """Replace the flag serif at the top of the b ascender with a 45 degree chamfer.
    Stem of b in Instrument Serif: left edge x=62, right edge x=130, top y=740 (glyph units).
    bx is the x offset of the b inside the word (defaults to the last laid-out glyph)."""
    if bx is None:
        bx = serif.positions[-1]
    xl, xr, top = 62 + bx, 130 + bx, 740
    # remove the flag serif (everything left of the stem above y=600)
    path = diff(path, rect(xl - 120, 600, xl, 820))
    # chamfer: region on the upper-left side of the line (xl, top-cut) -> (xl+cut, top)
    p1, p2 = (xl - 0.5, top - cut), (xl + cut, top + 0.5)
    path = diff(path, poly([p1, p2, (p2[0] - 400, p2[1] + 400), (p1[0] - 400, p1[1] + 400)]))
    # square the top-right corner so the flat top reads as a clean plane
    path = union(path, rect(xl + cut, 716, xr, top))
    return path

marks = {}

# 01 chamfer: the b's ascender top is a curb edge
p, adv = curb_plain()
p = chamfer_b(p, cut=36)
marks["wordmark-01-chamfer"] = (p, "curb wordmark, chamfered b")
write_svg("wordmark-01-chamfer", p, title="curb")

# 02 horizon: plain word on a hairline horizon rule
p, adv = curb_plain()
x0, y0, x1, y1 = bounds(p)
rule = rect(x0, -118, x1, -104)   # 14 units thick, ~1px at 120px wide
p2 = union(p, rule)
marks["wordmark-02-horizon"] = (p2, "curb wordmark with horizon rule")
write_svg("wordmark-02-horizon", p2, title="curb")

# 03 italic: Instrument Serif Italic, unaltered, tight
p, adv = curb_plain(face=serif_i, tracking=-6)
marks["wordmark-03-italic"] = (p, "curb wordmark, italic")
write_svg("wordmark-03-italic", p, title="curb")

# 04 tight: roman letters set tight so the word reads as one block
p, adv = curb_plain(tracking=-34)
marks["wordmark-04-tight"] = (p, "curb wordmark, tight")
write_svg("wordmark-04-tight", p, title="curb")

# --------------------------------------------------------------------------
# lockups
# --------------------------------------------------------------------------
# small caps CURB SOCIAL CLUB: Instrument Serif capitals at 76% with wide tracking
SC = 0.76
def small_caps(face, s, scale=SC, tracking=90, x0=0):
    return face.text(s, tracking=tracking, scale=scale, x0=x0)

p, adv = small_caps(serif, "CURB SOCIAL CLUB")
marks["lockup-horizontal-01"] = (p, "CURB SOCIAL CLUB small caps")
write_svg("lockup-horizontal-01", p, title="Curb Social Club")

# horizontal 02: curb wordmark (chamfer) + hairline + SOCIAL CLUB in Geist caps
wm, _ = curb_plain(); wm = chamfer_b(wm)
wx0, wy0, wx1, wy1 = bounds(wm)
gap = 120
rule_x = wx1 + gap
vrule = rect(rule_x, -10, rule_x + 12, 516)
gs_scale = 0.30   # Geist cap height 710 -> 213 units
sub, sub_adv = geist_m.text("SOCIAL CLUB", tracking=140, scale=gs_scale, x0=rule_x + 12 + gap)
# centre the caps on the serif x-height band (0..510)
cap_h = 710 * gs_scale
sub = sub.transform(1, 0, 0, 1, 0, (510 - cap_h) / 2)
p = union(wm, vrule, sub)
marks["lockup-horizontal-02"] = (p, "curb | SOCIAL CLUB")
write_svg("lockup-horizontal-02", p, title="Curb Social Club")

# stacked: curb wordmark over a horizon rule over SOCIAL CLUB justified to the same width
wm, _ = curb_plain(); wm = chamfer_b(wm)
wx0, wy0, wx1, wy1 = bounds(wm)
W = wx1 - wx0
gs_scale = 0.2
# measure natural width, then track to justify
tmp, nat = geist_m.text("SOCIAL CLUB", tracking=0, scale=gs_scale)
tb = bounds(tmp)
nat_w = tb[2] - tb[0]
n_gaps = len("SOCIAL CLUB") - 1
track = (W - nat_w) / n_gaps / gs_scale
sub, _ = geist_m.text("SOCIAL CLUB", tracking=track, scale=gs_scale)
sb = bounds(sub)
sub = sub.transform(1, 0, 0, 1, wx0 - sb[0], -(130 + 710 * gs_scale) - 100)
rule = rect(wx0, -118, wx1, -104)
p = union(wm, rule, sub)
marks["lockup-stacked-01"] = (p, "curb stacked over SOCIAL CLUB")
write_svg("lockup-stacked-01", p, title="Curb Social Club")

# --------------------------------------------------------------------------
# monograms (single contours drawn y-down on a 64 grid, flipped to y-up for the writer)
# --------------------------------------------------------------------------
K = 0.5523  # cubic arc constant

def contour(pts):
    """pts: list of ('L', (x,y)) or ('C', (c1, c2, p)). y-down. Returns a path."""
    p = pathops.Path(); pen = p.getPen()
    first = pts[0][1]
    pen.moveTo(first)
    for kind, v in pts[1:]:
        if kind == "L":
            pen.lineTo(v)
        else:
            pen.curveTo(*v)
    pen.closePath()
    return p

def ydown(p):
    return p.transform(1, 0, 0, -1, 0, 0)

def mono_stroke(s=12, k=12, box=(8, 8, 52, 56), top_end=None, bottom_end=None):
    """Uniform-stroke C. Outer top-left corner chamfered by k (the curb edge),
    inner corner chamfered by the parallel offset so the stroke stays uniform.
    Bottom-left corner square (face meets gutter)."""
    x0, y0, x1, y1 = box
    xa = top_end if top_end is not None else x1
    xh = bottom_end if bottom_end is not None else x1
    ki = k + s * math.sqrt(2) - 2 * s
    ki = max(ki, 0)
    pts = [("L", (x0 + k, y0)), ("L", (xa, y0)), ("L", (xa, y0 + s))]
    if ki > 0:
        pts += [("L", (x0 + s + ki, y0 + s)), ("L", (x0 + s, y0 + s + ki))]
    else:
        pts += [("L", (x0 + s, y0 + s))]
    pts += [("L", (x0 + s, y1 - s)), ("L", (xh, y1 - s)), ("L", (xh, y1)), ("L", (x0, y1)), ("L", (x0, y0 + k))]
    return contour(pts)

def mono_block(box=(8, 8, 56, 56), k=18, lip=10, face=16, slab=12, step=8):
    """Solid C. Thin sidewalk lip on top, thick curb face, heavy gutter slab below.
    The lip stops short of the slab: the step."""
    x0, y0, x1, y1 = box
    pts = [("L", (x0 + k, y0)), ("L", (x1 - step, y0)), ("L", (x1 - step, y0 + lip)),
           ("L", (x0 + face, y0 + lip)), ("L", (x0 + face, y1 - slab)), ("L", (x1, y1 - slab)),
           ("L", (x1, y1)), ("L", (x0, y1)), ("L", (x0, y0 + k))]
    return contour(pts)

def mono_rolled(s=12, R=20, box=(8, 8, 52, 56)):
    """Uniform-stroke C with a rolled (radiused) top-left edge and a square foot."""
    x0, y0, x1, y1 = box
    Ri = R - s
    cx, cy = x0 + R, y0 + R            # outer arc centre
    ix, iy = x0 + s + Ri, y0 + s + Ri  # inner arc centre
    pts = [("L", (cx, y0)), ("L", (x1, y0)), ("L", (x1, y0 + s)), ("L", (ix, y0 + s))]
    # inner arc from (ix, iy-Ri) to (ix-Ri, iy), counter-clockwise in y-down
    pts += [("C", ((ix - K * Ri, iy - Ri), (ix - Ri, iy - K * Ri), (ix - Ri, iy)))]
    pts += [("L", (x0 + s, y1 - s)), ("L", (x1, y1 - s)), ("L", (x1, y1)), ("L", (x0, y1)), ("L", (x0, cy))]
    # outer arc from (x0, cy) to (cx, y0)
    pts += [("C", ((x0, cy - K * R), (cx - K * R, y0), (cx, y0)))]
    return contour(pts)

monos = {
    "monogram-01-stroke": mono_stroke(s=12, k=12, box=(8, 8, 52, 56)),
    "monogram-02-block": mono_block(),
    "monogram-03-horizon": mono_stroke(s=12, k=12, box=(6, 8, 46, 56), top_end=46, bottom_end=62),
    "monogram-04-rolled": mono_rolled(s=12, R=20, box=(8, 8, 52, 56)),
}

for name, m in monos.items():
    marks[name] = (ydown(m), name)
    write_svg(name, ydown(m), pad=0, bbox=(0, -64, 64, 0), title="curb monogram")

# lockup-horizontal-03: monogram + curb wordmark
mono = ydown(monos["monogram-01-stroke"])           # y-up, 64 box: y in [-64, 0]? no: ydown gives y in [-64,0]; shift so 0..64
mb = bounds(mono)
mono = mono.transform(1, 0, 0, 1, 0, -mb[1])         # y now 0..64
scale = 560 / 64                                      # a touch over x-height, sits on the baseline
mono = mono.transform(scale, 0, 0, scale, 0, 0)
mb = bounds(mono)
wm, _ = curb_plain(); wm = chamfer_b(wm)
wb = bounds(wm)
wm = wm.transform(1, 0, 0, 1, mb[2] + 130 - wb[0], 0)
p = union(mono, wm)
marks["lockup-horizontal-03"] = (p, "monogram + curb")
write_svg("lockup-horizontal-03", p, title="curb")

print("wrote", len(os.listdir(OUT)), "files")
for n, (p, desc) in marks.items():
    b = bounds(p)
    print(f"{n:24s} {desc:40s} bounds {tuple(round(v) for v in b)}")
