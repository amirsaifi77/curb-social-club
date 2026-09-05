"""App icons per theme: Icon Composer layers (background.svg, foreground.svg) + flattened 1024 PNG. Flat, no gloss."""
import os, io, re
import cairosvg
from PIL import Image
import palette as P

LOGOS = "/home/claude/cac/brand-v2/logos"
ICONS = "/home/claude/cac/brand-v2/icons"
MONO = "monogram-01-stroke"

ICON_COLORS = {
  # theme: (background, foreground) all flat
  "marine-layer": (P.THEMES["marine-layer"]["light"]["textPrimary"], P.THEMES["marine-layer"]["dark"]["textPrimary"]),   # wet asphalt, fog
  "harbor":       (P.THEMES["harbor"]["light"]["textPrimary"],       P.THEMES["harbor"]["dark"]["accent"]),             # navy, brass
  "olive-ivory":  (P.THEMES["olive-ivory"]["light"]["link"],         P.THEMES["olive-ivory"]["dark"]["textPrimary"]),   # sage olive, ivory
}

src = open(f"{LOGOS}/{MONO}.svg").read()
d = re.search(r'd="([^"]+)"', src).group(1)

S = 1024
# the C occupies 8..52 x 8..56 on the 64 grid; make it 58% of the canvas tall, centred
grid = 64
c_h = 48
scale = (S * 0.58) / c_h
box = grid * scale
tx = (S - box) / 2 - (8 * scale) + ((box - 44 * scale) / 2 - 8 * scale) * 0  # centre the 64 box, then nudge so the C itself is centred
# centre on the C's own bounds (8..52, 8..56)
cx = (8 + 52) / 2 * scale
cy = (8 + 56) / 2 * scale
tx = S / 2 - cx
ty = S / 2 - cy

for theme, (bg, fg) in ICON_COLORS.items():
    outdir = os.path.join(ICONS, theme)
    os.makedirs(outdir, exist_ok=True)
    background = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">\n'
                  f'<title>curb app icon background, {theme}</title>\n<rect width="{S}" height="{S}" fill="{bg}"/>\n</svg>\n')
    foreground = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">\n'
                  f'<title>curb app icon foreground, {theme}</title>\n'
                  f'<path fill="{fg}" transform="translate({tx:.2f} {ty:.2f}) scale({scale:.4f})" d="{d}"/>\n</svg>\n')
    flat = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">\n'
            f'<rect width="{S}" height="{S}" fill="{bg}"/>\n'
            f'<path fill="{fg}" transform="translate({tx:.2f} {ty:.2f}) scale({scale:.4f})" d="{d}"/>\n</svg>\n')
    open(f"{outdir}/background.svg", "w").write(background)
    open(f"{outdir}/foreground.svg", "w").write(foreground)
    cairosvg.svg2png(bytestring=flat.encode(), write_to=f"{outdir}/icon-1024.png", output_width=S, output_height=S)
    # preview with the iOS squircle-ish mask at 180 for docs (not for submission)
    im = Image.open(f"{outdir}/icon-1024.png").convert("RGBA").resize((360, 360), Image.LANCZOS)
    mask = Image.new("L", (360, 360), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 359, 359), radius=80, fill=255)
    im.putalpha(mask)
    im.save(f"{outdir}/preview-360.png")
    print(theme, bg, fg, "->", outdir)
