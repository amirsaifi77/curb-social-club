"""Brand sheet, palette cards and social card. HTML -> PNG via Playwright (Chromium in /opt/pw-browsers)."""
import os, re
import palette as P

W = "/home/claude/cac/brand-v2/work"
LOGOS = "/home/claude/cac/brand-v2/logos"
OUT = "/home/claude/cac/brand-v2"
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/opt/pw-browsers"

def svg(name, color=None, h=None, w=None, cls=""):
    s = open(f"{LOGOS}/{name}.svg").read()
    s = re.sub(r"<title>.*?</title>\n?", "", s)
    if color:
        s = re.sub(r'fill="#[0-9A-Fa-f]{6}"', f'fill="{color}"', s)
    s = re.sub(r' width="[\d.]+" height="[\d.]+"', "", s, count=1)
    style = []
    if h: style.append(f"height:{h}px")
    if w: style.append(f"width:{w}px")
    s = s.replace("<svg ", f'<svg class="{cls}" style="{";".join(style)}" ', 1)
    return s

FONT_CSS = """
@font-face { font-family: 'Instrument Serif'; src: local('Instrument Serif'); }
@font-face { font-family: 'Geist'; src: local('Geist'); }
"""

BASE_CSS = FONT_CSS + """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Geist, Inter, sans-serif; -webkit-font-smoothing: antialiased; }
.serif { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; }
.plate { font-family: Geist, sans-serif; font-feature-settings: 'tnum' 1, 'case' 1; text-transform: uppercase; letter-spacing: 0.08em; }
.label { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
.rule { height: 1px; }
"""

ML = P.THEMES["marine-layer"]["light"]
INK, FOG, BORDER, SEC, ACC = ML["textPrimary"], ML["bg"], ML["border"], ML["textSecondary"], ML["accent"]

# --------------------------------------------------------------------------
# brand sheet 2400 x 1600
# --------------------------------------------------------------------------
def swatch_row(theme, scheme, size=44):
    t = P.THEMES[theme][scheme]
    roles = ["bg", "surface", "surfaceRaised", "border", "textPrimary", "textSecondary", "accent", "accentInk", "link", "success", "warning", "error"]
    cells = ""
    for r in roles:
        cells += (f'<div class="sw"><div class="chip" style="background:{t[r]};width:{size}px;height:{size}px;border:1px solid {BORDER}"></div>'
                  f'<div class="swl">{r}</div><div class="swh">{t[r]}</div></div>')
    pins = ""
    for r in ["pinNow", "pinToday", "pinUpcoming", "pinRecurring", "pinPast", "pinCluster"]:
        pins += (f'<div class="pin" style="background:{t[r]};"><div style="width:8px;height:8px;border-radius:50%;background:{t["pinLabel"]}"></div></div>')
    return f'<div class="swrow">{cells}</div><div class="pins">{pins}</div>'

def brand_sheet():
    css = BASE_CSS + f"""
    body {{ width:2400px; height:1600px; background:{FOG}; color:{INK}; overflow:hidden; }}
    .page {{ padding: 48px 72px 40px; height:1600px; display:grid; grid-template-columns: 0.95fr 1.05fr 1fr; grid-template-rows: auto 1fr auto; gap: 0 56px; }}
    .head {{ grid-column: 1 / -1; display:flex; justify-content:space-between; align-items:flex-end; padding-bottom:16px; border-bottom:1px solid {INK}; }}
    .head .meta {{ font-size:14px; color:{SEC}; letter-spacing:0.06em; text-transform:uppercase; text-align:right; line-height:1.6; }}
    h2 {{ font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:{SEC}; font-weight:500; margin: 22px 0 10px; padding-bottom: 8px; border-bottom:1px solid {BORDER}; }}
    .opt {{ display:flex; align-items:center; gap:22px; padding:8px 0; border-bottom:1px solid {BORDER}; }}
    .opt .n {{ width:34px; font-size:12px; color:{SEC}; letter-spacing:0.08em; }}
    .opt .t {{ margin-left:auto; text-align:right; font-size:12px; color:{SEC}; letter-spacing:0.04em; width:150px; }}
    .monos {{ display:grid; grid-template-columns: repeat(4, 1fr); gap:20px; }}
    .mono {{ padding:12px 0; }}
    .mono .big {{ background:#fff; border:1px solid {BORDER}; padding:10px; display:flex; justify-content:center; }}
    .mono .small {{ display:flex; gap:10px; align-items:flex-end; margin-top:10px; }}
    .mono .small div {{ display:flex; gap:6px; align-items:flex-end; }}
    .mono .cap {{ font-size:11px; color:{SEC}; margin-top:8px; letter-spacing:0.04em; }}
    .dark {{ background:{INK}; }}
    .swrow {{ display:grid; grid-template-columns:repeat(6, 1fr); gap:6px 8px; margin-bottom:6px; }}
    .sw {{ width:100%; }} .sw .chip {{ width:100% !important; height:34px !important; }}
    .swl {{ font-size:9px; color:{SEC}; margin-top:4px; letter-spacing:0.02em; white-space:nowrap; overflow:hidden; }}
    .swh {{ font-size:10px; color:{INK}; font-feature-settings:'tnum' 1; }}
    .pins {{ display:flex; gap:6px; margin:2px 0 6px; }}
    .pin {{ width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; }}
    .theme {{ padding: 6px 0 2px; }}
    .theme .tn {{ font-family:'Instrument Serif', serif; font-size:24px; margin-bottom:0; }}
    .theme .ts {{ font-size:11px; color:{SEC}; margin-bottom:6px; }}
    .theme .sch {{ font-size:10px; color:{SEC}; letter-spacing:0.1em; text-transform:uppercase; margin:4px 0 3px; }}
    .type {{ display:block; }} .type .specs {{ display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:22px; padding-top:16px; border-top:1px solid {BORDER}; }}
    .type .disp {{ font-family:'Instrument Serif', serif; font-size:52px; line-height:1.05; letter-spacing:-0.01em; }}
    .type .body {{ font-size:15px; line-height:1.5; max-width:520px; margin-top:12px; color:{INK}; }}
    .type .spec {{ font-size:12px; color:{SEC}; line-height:1.8; }}
    .type .spec b {{ color:{INK}; font-weight:500; }}
    .icons {{ display:flex; gap:18px; align-items:center; }}
    """
    wm_opts = [("01", "wordmark-01-chamfer", "chamfered b, curb edge"), ("02", "wordmark-02-horizon", "horizon rule"),
               ("03", "wordmark-03-italic", "italic"), ("04", "wordmark-04-tight", "tight")]
    wm_html = "".join(f'<div class="opt"><div class="n">{n}</div>{svg(f, h=92)}<div class="t">{t}</div></div>' for n, f, t in wm_opts)
    lock_html = (f'<div class="opt"><div class="n">L1</div>{svg("lockup-horizontal-01", h=36)}<div class="t">small caps, formal</div></div>'
                 f'<div class="opt"><div class="n">L2</div>{svg("lockup-horizontal-02", h=56)}<div class="t">wordmark + Geist caps</div></div>'
                 f'<div class="opt"><div class="n">L3</div>{svg("lockup-horizontal-03", h=64)}<div class="t">monogram + wordmark</div></div>'
                 f'<div class="opt" style="border-bottom:0"><div class="n">S1</div>{svg("lockup-stacked-01", h=120)}<div class="t">stacked</div></div>')
    mono_opts = [("01", "monogram-01-stroke", "stroke, chamfer (primary)"), ("02", "monogram-02-block", "block, step"),
                 ("03", "monogram-03-horizon", "stroke on horizon"), ("04", "monogram-04-rolled", "rolled edge")]
    mono_html = ""
    for n, f, t in mono_opts:
        smalls = "".join(f'<div style="background:#fff;border:1px solid {BORDER};padding:4px">{svg(f, h=s, w=s)}</div>' for s in (16, 24, 32, 48))
        darks = "".join(f'<div class="dark" style="padding:4px">{svg(f, color=ML["surfaceRaised"], h=s, w=s)}</div>' for s in (16, 32))
        mono_html += (f'<div class="mono"><div class="big">{svg(f, h=120, w=120)}</div>'
                      f'<div class="small">{smalls}{darks}</div><div class="cap">{n} {t}</div></div>')
    pal_html = ""
    for tk, t in P.THEMES.items():
        pal_html += (f'<div class="theme"><div class="tn">{t["name"]}</div><div class="ts">{t["story"]}</div>'
                     f'<div class="sch">Light</div>{swatch_row(tk, "light")}<div class="sch">Dark</div>{swatch_row(tk, "dark")}</div>')
    icons_html = "".join(f'<img src="file://{OUT}/icons/{t}/preview-360.png" style="width:96px;height:96px">' for t in P.THEMES)
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body><div class="page">
    <div class="head">
      <div style="display:flex;align-items:flex-end;gap:36px">{svg("wordmark-01-chamfer", h=120)}
        <div style="font-size:14px;color:{SEC};line-height:1.6;padding-bottom:6px">Curb Social Club<br>Brand sheet, v2.0</div></div>
      <div class="meta">2026-09-05<br>Instrument Serif + Geist<br>Three themes, light and dark<br>Flat: no gradients, no shadows</div>
    </div>
    <div>
      <h2>Wordmark options</h2>{wm_html}
      <h2>Lockups</h2>{lock_html}
    </div>
    <div>
      <h2>Monogram options, curb profile C</h2>
      <div class="monos">{mono_html}</div>
      <h2>App icons, iOS 26 layered, flat</h2>
      <div class="icons">{icons_html}<div style="font-size:12px;color:{SEC};line-height:1.7;margin-left:10px">Marine Layer: fog on wet asphalt<br>Harbor: brass on navy<br>Olive and Ivory: ivory on sage</div></div>
      <h2>Accent variants</h2>
      <div style="display:flex;gap:16px;align-items:center">
        <div style="background:#fff;border:1px solid {BORDER};padding:12px 20px">{svg("wordmark-01-chamfer", h=64)}</div>
        <div class="dark" style="padding:12px 20px">{svg("wordmark-01-chamfer-light", h=64)}</div>
        <div style="background:{FOG};border:1px solid {BORDER};padding:12px 20px">{svg("wordmark-01-chamfer-accent", h=64)}</div>
        <div style="background:{ACC};padding:12px 20px">{svg("monogram-01-stroke", color=ML["accentInk"], h=64, w=64)}</div>
      </div>
      <h2>Type pairing</h2>
    <div class="type">
      <div>
        <div class="disp">Saturday, 7:30 am.<br>Marine layer until ten.</div>
        <div class="body">Forty cars in the lot behind the bakery by eight. Air-cooled and water-cooled, a Volvo wagon, two Miatas. Bring whatever you drive. Coffee is inside, parking is wherever there is room.</div>
        <div class="plate" style="margin-top:14px;font-size:13px;color:{SEC}">Sat 7:30 am &nbsp;&middot;&nbsp; 4.2 mi &nbsp;&middot;&nbsp; Every Saturday</div>
      </div>
      <div class="specs"><div class="spec"><b>Display, Instrument Serif</b><br>Display 40/44, tracking -0.4<br>Title 28/32, tracking -0.2<br>Headline 22/26<br><br><b>Where the serif appears</b><br>Wordmark, feed masthead, event titles, host names, onboarding. Never in buttons, chrome, or metadata.</div>
      <div class="spec"><b>UI and body, Geist</b><br>Subhead 15/20 medium<br>Body 16/24 regular<br>Caption 12/16 medium, +0.2<br>Plate 13/16 medium, +0.6, uppercase, tabular<br><br><b>iOS chrome</b><br>SF Pro through system text styles under Liquid Glass. Not overridden.</div></div>
    </div>
    </div>
    <div>
      <h2>Palettes</h2>{pal_html}
    </div>
    </div></body></html>"""
    open(f"{W}/brand-sheet.html", "w").write(html)
    return html

# --------------------------------------------------------------------------
# palette cards 1600 x 1000, one per theme
# --------------------------------------------------------------------------
def palette_card(tk):
    t = P.THEMES[tk]
    def side(scheme):
        c = t[scheme]
        roles = [r for r in P.ROLE_DESC if not r.startswith("pin") and r not in ("glassTint", "scrim")]
        chips = "".join(f'<div class="chip"><div class="c" style="background:{c[r]};border:1px solid {c["border"]}"></div>'
                        f'<div class="r" style="color:{c["textPrimary"]}">{r}</div><div class="h" style="color:{c["textSecondary"]}">{c[r]}</div></div>' for r in roles)
        pins = "".join(f'<div class="pinw"><div class="pin" style="background:{c[r]};border:2px solid {c["surfaceRaised"]}"><div style="width:8px;height:8px;border-radius:50%;background:{c["pinLabel"]}"></div></div>'
                       f'<div class="h" style="color:{c["textSecondary"]}">{r[3:].lower()}<br>{c[r]}</div></div>'
                       for r in ["pinNow", "pinToday", "pinUpcoming", "pinRecurring", "pinPast", "pinCluster"])
        card = f"""
        <div class="ui" style="background:{c['surface']};border:1px solid {c['border']}">
          <div class="plate" style="color:{c['textSecondary']};font-size:11px">Sat 7:30 am &middot; 4.2 mi</div>
          <div class="serif" style="font-size:26px;color:{c['textPrimary']};margin:4px 0 2px">Back Bay Coffee, Saturday</div>
          <div style="font-size:13px;color:{c['textSecondary']}">Hosted by Back Bay Air-Cooled &middot; 42 going</div>
          <div style="display:flex;gap:8px;margin-top:14px">
            <div style="background:{c['accent']};color:{c['accentInk']};font-size:13px;font-weight:500;padding:8px 14px;border-radius:8px">I'm going</div>
            <div style="border:1px solid {c['border']};color:{c['textPrimary']};font-size:13px;font-weight:500;padding:8px 14px;border-radius:8px">Share</div>
            <div style="color:{c['link']};font-size:13px;padding:8px 4px">Directions</div>
          </div>
        </div>"""
        return f"""<div class="side" style="background:{c['bg']}">
          <div class="sch" style="color:{c['textSecondary']}">{scheme}</div>
          <div class="chips">{chips}</div>
          <div class="sch" style="color:{c['textSecondary']};margin-top:18px">Map pins</div>
          <div class="pins">{pins}</div>
          {card}
        </div>"""
    css = BASE_CSS + f"""
    body {{ width:1600px; height:1000px; overflow:hidden; background:{FOG}; }}
    .wrap {{ height:1000px; display:grid; grid-template-rows: auto 1fr; }}
    .head {{ padding: 40px 56px 22px; display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid {INK}; color:{INK}; }}
    .head .tn {{ font-size:44px; }}
    .head .ts {{ font-size:14px; color:{SEC}; margin-top:6px; }}
    .sides {{ display:grid; grid-template-columns:1fr 1fr; }}
    .side {{ padding: 30px 56px; }}
    .sch {{ font-size:11px; letter-spacing:0.12em; text-transform:uppercase; margin-bottom:12px; }}
    .chips {{ display:grid; grid-template-columns: repeat(6, 1fr); gap: 14px 10px; }}
    .chip .c {{ height:54px; width:100%; }}
    .chip .r {{ font-size:11px; margin-top:6px; }}
    .chip .h {{ font-size:11px; font-feature-settings:'tnum' 1; }}
    .pins {{ display:flex; gap:22px; }}
    .pinw {{ text-align:left; }}
    .pin {{ width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:6px; }}
    .h {{ font-size:11px; line-height:1.4; }}
    .ui {{ margin-top:22px; padding:18px 20px; border-radius:14px; max-width:520px; }}
    """
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body><div class="wrap">
    <div class="head"><div><div class="serif tn">{t['name']}</div><div class="ts">{t['story']}</div></div>
    <div style="display:flex;align-items:center;gap:20px">{svg('lockup-horizontal-02', h=40)}<div style="font-size:12px;color:{SEC};text-align:right;line-height:1.6">Theme <b style="font-weight:500;color:{INK}">{tk}</b><br>tokens.json v2.0, 2026-09-05</div></div></div>
    <div class="sides">{side('light')}{side('dark')}</div></div></body></html>"""
    open(f"{W}/palette-{tk}.html", "w").write(html)

# --------------------------------------------------------------------------
# social card 1200 x 630 (Marine Layer)
# --------------------------------------------------------------------------
def social_card():
    c = ML
    H = 176   # wordmark height; baseline sits at 92% of the svg box (see write_svg padding)
    top = 250 - int(H * 0.92)
    css = BASE_CSS + f"""
    body {{ width:1200px; height:630px; overflow:hidden; background:{c['bg']}; color:{c['textPrimary']}; position:relative; }}
    .band {{ position:absolute; left:0; top:0; width:1200px; height:250px; background:{c['border']}; }}
    .horizon {{ position:absolute; left:0; top:250px; width:1200px; height:1px; background:{c['textPrimary']}; opacity:0.5; }}
    .wm {{ position:absolute; left:84px; top:{top}px; }}
    .sub {{ position:absolute; left:88px; top:274px; font-size:13px; letter-spacing:0.14em; text-transform:uppercase; color:{c['textSecondary']}; }}
    .plate {{ position:absolute; right:88px; top:274px; font-size:13px; color:{c['textSecondary']}; }}
    .tag {{ position:absolute; left:86px; top:338px; font-family:'Instrument Serif', serif; font-size:60px; line-height:1.05; letter-spacing:-0.01em; max-width:820px; }}
    .body {{ position:absolute; left:88px; top:500px; font-size:18px; color:{c['textSecondary']}; max-width:680px; line-height:1.45; }}
    .mono {{ position:absolute; right:88px; bottom:60px; }}
    """
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>{css}</style></head><body>
    <div class="band"></div><div class="horizon"></div>
    <div class="wm">{svg('wordmark-01-chamfer', h=H)}</div>
    <div class="sub">Curb Social Club</div>
    <div class="plate">Newport Beach &middot; Sat 7:30 am</div>
    <div class="tag">Find cars and coffee meets near you.</div>
    <div class="body">Small weekend meets, listed by the people who host them. Every car welcome. Browsing is free, no account needed.</div>
    <div class="mono">{svg('monogram-01-stroke', h=64, w=64)}</div>
    </body></html>"""
    open(f"{W}/social-card.html", "w").write(html)

def render_all():
    from playwright.sync_api import sync_playwright
    jobs = [("brand-sheet.html", f"{OUT}/brand-sheet.png", 2400, 1600),
            ("social-card.html", f"{OUT}/social-card-1200x630.png", 1200, 630)]
    for tk in P.THEMES:
        jobs.append((f"palette-{tk}.html", f"{OUT}/palette-{tk}.png", 1600, 1000))
    with sync_playwright() as p:
        b = p.chromium.launch()
        for src, dst, w, h in jobs:
            pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            pg.goto(f"file://{W}/{src}")
            pg.wait_for_timeout(300)
            pg.screenshot(path=dst, clip={"x": 0, "y": 0, "width": w, "height": h})
            print("rendered", dst)
            pg.close()
        b.close()

if __name__ == "__main__":
    brand_sheet()
    for tk in P.THEMES:
        palette_card(tk)
    social_card()
    render_all()
