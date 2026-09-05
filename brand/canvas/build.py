#!/usr/bin/env python3
"""Generates the Curb Social Club design canvas artboards (.dc.html) and canvas.json.

Everything is flat: solid fills, 1px hairlines, no gradients, no shadows heavier
than a hairline. Liquid Glass (translucent, blurred) is used only on the nav layer:
the tab bar pill, the toolbar buttons, the bottom search on Map.

Run:  python3 build.py
"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
BRAND = os.path.dirname(HERE)          # brand-v2/
LOGOS = os.path.join(BRAND, 'logos')
TOKENS = json.load(open(os.path.join(BRAND, 'tokens.json')))

# ---------------------------------------------------------------- tokens
def theme(name, scheme):
    t = TOKENS['themes'][name][scheme]
    v = {k: t[k]['$value'] for k in t}
    def rgba(hex8):
        h = hex8.lstrip('#')
        r, g, b, a = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16) / 255
        return f'rgba({r},{g},{b},{a:.2f})'
    def rgba_of(hex6, a):
        h = hex6.lstrip('#')
        return f'rgba({int(h[0:2],16)},{int(h[2:4],16)},{int(h[4:6],16)},{a})'
    T = dict(
        name=TOKENS['themes'][name]['name'], key=name, scheme=scheme, dark=(scheme == 'dark'),
        bg=v['bg'], surface=v['surface'], raised=v['surfaceRaised'], border=v['border'],
        ink=v['textPrimary'], ink2=v['textSecondary'], accent=v['accent'], accentInk=v['accentInk'],
        link=v['link'], success=v['success'], warning=v['warning'], error=v['error'],
        pinNow=v['pinNow'], pinToday=v['pinToday'], pinUpcoming=v['pinUpcoming'],
        pinRecurring=v['pinRecurring'], pinPast=v['pinPast'], pinCluster=v['pinCluster'], pinLabel=v['pinLabel'],
        glass=rgba(v['glassTint']), scrim=rgba(v['scrim']),
        glassHair=rgba_of(v['border'], 0.35),
    )
    # Flat placeholder photos: three bands (overcast sky, the lot, wet asphalt).
    PHOTO = {
        ('marine-layer', 'light'): [('#CFD4D6', '#A9B1B5', '#717A7E'), ('#C6CCCF', '#9EA7AB', '#5F6A6F'), ('#D3D7D9', '#B0B7BA', '#7B8488')],
        ('marine-layer', 'dark'):  [('#3C4348', '#2F3539', '#22272A'), ('#434A4F', '#333A3E', '#25292C'), ('#373E43', '#2C3236', '#1F2326')],
        ('harbor', 'light'):       [('#D5D3CC', '#ADB0B1', '#606B79'), ('#CFCEC8', '#A5A9AB', '#55617A'), ('#DAD8D1', '#B4B7B7', '#6B7583')],
        ('olive-ivory', 'light'):  [('#D4D5CC', '#AAAFA4', '#6D7568'), ('#CDCFC5', '#A1A79C', '#616A5D'), ('#D9DAD1', '#B2B6AB', '#767E72')],
        ('harbor', 'dark'):        [('#33405A', '#26324A', '#1B2537'), ('#3A4762', '#2B3850', '#1F2A3D'), ('#2F3B54', '#232F45', '#182233')],
        ('olive-ivory', 'dark'):   [('#3E4437', '#30352A', '#23271F'), ('#454B3E', '#353A2F', '#262A21'), ('#393F33', '#2C3127', '#20241C')],
    }
    T['photos'] = PHOTO[(name, scheme)]
    return T

ML = theme('marine-layer', 'light')

# ---------------------------------------------------------------- fonts and base css
FONT_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&amp;family=Instrument+Serif:ital@0;1&amp;display=swap">'
SERIF = "'Instrument Serif', Georgia, 'Times New Roman', serif"
SANS = "Geist, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
SYS = "-apple-system, 'SF Pro Text', Geist, Inter, sans-serif"   # iOS chrome stand-in

def vars_of(T):
    """Theme tokens as CSS custom properties, so one stylesheet serves every phone on a comparison artboard."""
    return (f"--bg:{T['bg']};--surface:{T['surface']};--raised:{T['raised']};--border:{T['border']};--ink:{T['ink']};--ink2:{T['ink2']};"
            f"--accent:{T['accent']};--accentInk:{T['accentInk']};--link:{T['link']};--glass:{T['glass']};--glassHair:{T['glassHair']};")

def css(T):
    return f"""
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; {vars_of(T)} background: var(--bg); color: var(--ink); font-family: {SANS}; -webkit-font-smoothing: antialiased; font-feature-settings: 'tnum'; }}
    a {{ color: var(--link); text-decoration: none; }} a:hover {{ color: var(--ink); }}
    .serif {{ font-family: {SERIF}; font-weight: 400; }}
    .plate {{ font-family: {SANS}; font-weight: 500; font-size: 13px; line-height: 16px; letter-spacing: 0.6px; text-transform: uppercase; font-feature-settings: 'tnum', 'case'; color: var(--ink2); }}
    .label {{ font-family: {SANS}; font-weight: 500; font-size: 11px; line-height: 14px; letter-spacing: 0.8px; text-transform: uppercase; color: var(--ink2); }}
    .caption {{ font-family: {SANS}; font-weight: 500; font-size: 12px; line-height: 16px; letter-spacing: 0.2px; color: var(--ink2); }}
    .glass {{ background: var(--glass); -webkit-backdrop-filter: blur(20px) saturate(1.1); backdrop-filter: blur(20px) saturate(1.1); box-shadow: 0 0 0 1px var(--glassHair); }}
    .ico {{ width: 24px; height: 24px; stroke: currentColor; fill: none; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; flex: none; }}
    .ico-sm {{ width: 18px; height: 18px; }}
    .ico-xs {{ width: 14px; height: 14px; stroke-width: 1.75; }}
    .ico-fill {{ fill: currentColor; stroke: none; }}
    .chip {{ display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 9px; border-radius: 999px; font-size: 12px; font-weight: 500; letter-spacing: 0.2px; white-space: nowrap; box-shadow: 0 0 0 1px var(--border); }}
    .rule {{ height: 1px; background: var(--border); flex: none; }}
"""

# ---------------------------------------------------------------- icons (24 grid, thin stroke, SF-symbol stand-ins)
I = {
 'newspaper': '<rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M8 9h4v4H8zM14 9h3M14 12h3M8 16h9"/>',
 'newspaper_f': '<path class="ico-fill" d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM8 9v4h4V9zm6 0v1.2h3V9zm0 2.8V13h3v-1.2zM8 15v1.2h9V15z"/>',
 'map': '<path d="M9 5 4 7v12l5-2 6 2 5-2V5l-5 2z"/><path d="M9 5v12M15 7v12"/>',
 'map_f': '<path class="ico-fill" d="M9 5 4 7v12l5-2zM10 5v12l5 2V7zM16 7v12l4-2V5z"/>',
 'bell': '<path d="M7 15.5V11a5 5 0 0 1 10 0v4.5l1.5 1.5H5.5z"/><path d="M10.5 19.5a1.5 1.5 0 0 0 3 0"/>',
 'person': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="10" r="2.8"/><path d="M6.8 18a5.5 5.5 0 0 1 10.4 0"/>',
 'plus': '<path d="M12 5.5v13M5.5 12h13"/>',
 'search': '<circle cx="11" cy="11" r="6"/><path d="m15.5 15.5 4 4"/>',
 'filter': '<path d="M4 7h16M7 12h10M10 17h4"/>',
 'locate': '<path d="M19 5 5 11l6.5 1.5L13 19z"/>',
 'calendar': '<rect x="4" y="5.5" width="16" height="14" rx="1.5"/><path d="M4 10h16M8 3.5v4M16 3.5v4"/>',
 'clock': '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
 'pin': '<path d="M12 18s-5-4.3-5-8.5a5 5 0 0 1 10 0C17 13.7 12 18 12 18z"/><circle cx="12" cy="9.5" r="1.8"/><path d="M6.5 19.5c1.2.7 3.2 1 5.5 1s4.3-.3 5.5-1"/>',
 'directions': '<path d="M12 3 3 12l9 9 9-9z"/><path d="M9.5 13v-1.5h5l-1.5-1.5M14.5 11.5 13 13"/>',
 'share': '<path d="M12 3.5v11M8.5 7 12 3.5 15.5 7"/><path d="M5.5 11.5v7a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-7"/>',
 'back': '<path d="m14.5 5-7 7 7 7"/>',
 'chev': '<path d="m9.5 5 7 7-7 7"/>',
 'chevdown': '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
 'link': '<path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.2 1.2"/><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.2-1.2"/>',
 'seal': '<path d="m12 3 1.9 1.4 2.3-.3.9 2.2 2.1.9-.3 2.3L20.3 12l-1.4 1.9.3 2.3-2.1.9-.9 2.2-2.3-.3L12 20.3l-1.9-1.4-2.3.3-.9-2.2-2.1-.9.3-2.3L3.7 12l1.4-1.9-.3-2.3 2.1-.9.9-2.2 2.3.3z"/><path d="m8.8 12.2 2.2 2.2 4.2-4.6"/>',
 'question': '<circle cx="12" cy="12" r="8"/><path d="M9.8 9.6a2.3 2.3 0 1 1 3.3 2.1c-.7.4-1.1.9-1.1 1.6M12 16.5h.01"/>',
 'warn': '<path d="M12 4.5 3.5 19h17z"/><path d="M12 10v4M12 16.5h.01"/>',
 'repeat': '<path d="m16.5 3.5 3 3-3 3"/><path d="M4.5 11V9.5a3 3 0 0 1 3-3h12"/><path d="m7.5 20.5-3-3 3-3"/><path d="M19.5 13v1.5a3 3 0 0 1-3 3h-12"/>',
 'photo': '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><circle cx="8.5" cy="10" r="1.4"/><path d="m20.5 15-4.5-4.5-7 7"/>',
 'x': '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
 'list': '<path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11"/><circle cx="4.75" cy="6.5" r=".9" class="ico-fill"/><circle cx="4.75" cy="12" r=".9" class="ico-fill"/><circle cx="4.75" cy="17.5" r=".9" class="ico-fill"/>',
 'check_c': '<circle cx="12" cy="12" r="8"/><path d="m8.5 12.3 2.5 2.5 4.6-5"/>',
 'check_cf': '<path class="ico-fill" d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zm4.1 5.3-4.9 5.3-2.3-2.3-1.1 1.1 3.4 3.4 6-6.4z"/>',
 'apple': '<path class="ico-fill" d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.7zM14.1 5.8c.6-.8 1.1-1.8 1-2.8-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.7-1 2.8 1 0 2.1-.6 2.7-1.4z"/>',
 'car': '<path class="ico-fill" d="M6.2 9.5 7.4 6.6A1.5 1.5 0 0 1 8.8 5.7h6.4a1.5 1.5 0 0 1 1.4.9l1.2 2.9H19a1.5 1.5 0 0 1 1.5 1.5v4.5a1 1 0 0 1-1 1h-.5v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-1h-.5a1 1 0 0 1-1-1V11a1.5 1.5 0 0 1 1.5-1.5zm2-.3h7.6l-.9-2.2H9.1zM7 13.7a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4zm10 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z"/>',
 'camera': '<path d="M4.5 8h2.8l1.7-2.5h6L16.7 8h2.8v10.5h-15z"/><circle cx="12" cy="13" r="3"/>',
 'bubble': '<path d="M4.5 6.5A1.5 1.5 0 0 1 6 5h12a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 18 16H9.5l-5 3.5z"/>',
}
def ico(name, cls='ico', style=''):
    return f'<svg class="{cls}" viewBox="0 0 24 24" style="{style}">{I[name]}</svg>'

# ---------------------------------------------------------------- logos (inline SVG, currentColor)
def logo_svg(file, height, extra_style=''):
    s = open(os.path.join(LOGOS, file)).read()
    vb = re.search(r'viewBox="([^"]+)"', s).group(1)
    d = re.search(r' d="([^"]+)"', s).group(1)
    x, y, w, h = [float(n) for n in vb.split()]
    width = height * w / h
    return (f'<svg viewBox="{vb}" style="height:{height}px;width:{width:.1f}px;display:block;flex:none;{extra_style}" role="img" aria-label="curb">'
            f'<path fill="currentColor" fill-rule="nonzero" d="{d}"/></svg>')

# ---------------------------------------------------------------- flat pieces
def photo(T, i=0, style='', extra='', horizon=0.56):
    sky, mid, ground = T['photos'][i % 3]
    return (f'<div style="position:relative;overflow:hidden;background:{sky};{style}">'
            f'<div style="position:absolute;left:0;right:0;top:{horizon*100:.0f}%;bottom:0;background:{mid}"></div>'
            f'<div style="position:absolute;left:0;right:0;top:{(horizon+0.26)*100:.0f}%;bottom:0;background:{ground}"></div>'
            f'{extra}</div>')

def chip(T, text, icon=None, color=None):
    color = color or T['ink2']
    ic = ico(icon, 'ico ico-xs') if icon else ''
    return f'<div class="chip" style="color:{color};background:{T["surface"]}">{ic}<span>{text}</span></div>'

def plate(T, text, color=None, style=''):
    c = f'color:{color};' if color else ''
    return f'<span class="plate" style="{c}{style}">{text}</span>'

def glass_circle(T, icon, size=44, style=''):
    return f'<div class="glass" style="width:{size}px;height:{size}px;border-radius:{size//2}px;display:flex;align-items:center;justify-content:center;color:{T["ink"]};{style}">{ico(icon)}</div>'

def tabbar(T, active='feed'):
    tabs = [('feed', 'newspaper', 'newspaper_f', 'Feed'), ('map', 'map', 'map_f', 'Map'), ('activity', 'bell', 'bell', 'Activity'), ('profile', 'person', 'person', 'Profile')]
    items = ''
    for key, off, on, label in tabs:
        is_on = key == active
        color = T['ink'] if is_on else T['ink2']
        items += (f'<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:66px;height:56px;color:{color}">'
                  f'{ico(on if is_on else off, "ico", "stroke-width:1.75")}<span style="font-family:{SYS};font-size:10px;line-height:12px;font-weight:{600 if is_on else 500}">{label}</span></div>')
    return (f'<div style="position:absolute;left:20px;right:20px;bottom:22px;display:flex;align-items:center;gap:10px;z-index:30">'
            f'<div class="glass" style="flex:1;height:60px;border-radius:30px;display:flex;align-items:center;justify-content:space-around;padding:0 6px">{items}</div>'
            f'<div class="glass" style="width:60px;height:60px;border-radius:30px;display:flex;align-items:center;justify-content:center;color:{T["ink"]}">{ico("plus", "ico", "stroke-width:1.75")}</div>'
            f'</div>')

def phone_open(T, bg=None):
    return f'<div style="{vars_of(T)}width:402px;height:874px;position:relative;overflow:hidden;background:{bg or T["bg"]};font-family:{SANS};color:{T["ink"]}">'

def wrap(body, T):
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  {FONT_LINK}
  <style>{css(T)}</style>
</helmet>
{body}
</x-dc>
</body>
</html>
"""

AVATARS = ['#7E8588', '#48677D', '#5E5B7A', '#5C6469']
def going_row(T, n, text, size=22):
    out = '<div style="display:flex;align-items:center">'
    for i in range(n):
        m = '' if i == 0 else 'margin-left:-6px;'
        out += f'<div style="width:{size}px;height:{size}px;border-radius:999px;background:{AVATARS[i % 4]};box-shadow:0 0 0 2px {T["surface"]};{m}flex:none"></div>'
    out += f'<span class="caption" style="margin-left:10px">{text}</span></div>'
    return out

# ---------------------------------------------------------------- data
MEETS = [
  dict(title='Back Bay Coffee', when='Sat 7:30 am', plate='SAT 7:30 AM', dist='4.2 mi', where='Lot behind the bakery on Bayside', host='Back Bay Air-Cooled', going='42 going', status='confirmed', photo=0),
  dict(title='Balboa Island Sunday', when='Sun 8 am', plate='SUN 8:00 AM', dist='6.1 mi', where='Marine Ave, by the ferry', host='Balboa Coffee Cars', going='27 going', status='instagram', photo=1),
  dict(title='Mariners Mile early lot', when='Sat 8 am', plate='SAT 8:00 AM', dist='2.8 mi', where='Mariners Mile, west end', host='Mariners Mile Garage', going='18 going', status='unconfirmed', photo=2),
  dict(title='Laguna Canyon wagons', when='Sun 9 am', plate='SUN 9:00 AM', dist='11 mi', where='Canyon Rd turnout', host='Canyon Wagon Society', going='14 going', status='series', photo=1),
  dict(title='Huntington Harbour Sunday', when='Sun 8 am', plate='SUN 8:00 AM', dist='9.4 mi', where='Harbour lot, east side', host='Harbour Coffee Club', going='33 going', status='confirmed', photo=2),
]
def status_chip(T, status):
    if status == 'confirmed':  return chip(T, 'Confirmed by host', 'seal', T['success'])
    if status == 'instagram':  return chip(T, 'Listed from Instagram', 'link')
    if status == 'series':     return chip(T, 'Every Sunday', 'repeat')
    return chip(T, 'Not yet confirmed', 'question')

# ---------------------------------------------------------------- Feed
def card(T, m):
    return f'''<div style="display:flex;flex-direction:column;background:{T['surface']};border-radius:14px;overflow:hidden;box-shadow:0 0 0 1px {T['border']}">
      {photo(T, m['photo'], 'height:271px', '', 0.54 + 0.04 * m['photo'])}
      <div style="display:flex;flex-direction:column;gap:6px;padding:14px 16px 16px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">{plate(T, f"{m['plate']} &middot; {m['dist'].upper()}")}{status_chip(T, m['status'])}</div>
        <div class="serif" style="font-size:22px;line-height:26px;color:{T['ink']}">{m['title']}</div>
        <div class="caption" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{m['host']} &middot; {m['where']} &middot; {m['going']}</div>
      </div>
    </div>'''

def feed(T):
    def fchip(text, on=False):
        if on:
            return f'<div class="chip" style="background:{T["ink"]};color:{T["bg"]};box-shadow:none;height:30px;padding:0 12px;font-size:13px">{text}</div>'
        return f'<div class="chip" style="background:{T["surface"]};color:{T["ink"]};height:30px;padding:0 12px;font-size:13px">{text}</div>'
    return phone_open(T) + f'''
  <div style="position:absolute;top:58px;left:20px;right:20px;display:flex;align-items:flex-end;justify-content:space-between;z-index:5">
    <div style="display:flex;flex-direction:column;gap:2px">
      <span class="serif" style="font-size:44px;line-height:44px;letter-spacing:-0.4px;color:{T['ink']}">curb</span>
    </div>
    {glass_circle(T, 'filter')}
  </div>
  <div style="position:absolute;top:114px;left:20px;right:20px;display:flex;flex-direction:column;gap:12px;z-index:5">
    <div style="display:flex;align-items:center;justify-content:space-between">{plate(T, 'This weekend &middot; Newport Beach &middot; 25 mi')}<span class="caption" style="color:{T['link']}">Change</span></div>
    <div class="rule"></div>
    <div style="display:flex;gap:8px">{fchip('Near me', True)}{fchip('Following')}{fchip('Series')}{fchip('Past')}</div>
  </div>
  <div style="position:absolute;top:196px;left:20px;right:20px;bottom:0;display:flex;flex-direction:column;gap:16px;overflow:hidden">
    {card(T, MEETS[0])}
    {card(T, MEETS[1])}
  </div>
  {tabbar(T, 'feed')}
</div>'''

# ---------------------------------------------------------------- Map
def map_base(T):
    water = '#C3CDD3' if not T['dark'] else '#243038'
    land = T['bg']
    block = T['surface'] if not T['dark'] else T['surface']
    park = '#DCE1DA' if not T['dark'] else '#262E28'
    road = T['raised']
    lbl = T['ink2']
    return f'''<svg viewBox="0 0 402 874" style="position:absolute;inset:0;width:100%;height:100%" preserveAspectRatio="none">
  <rect width="402" height="874" fill="{land}"/>
  <path d="M-10 640 C 70 600, 150 660, 220 590 S 320 430, 420 400 L 420 874 L -10 874 Z" fill="{water}"/>
  <g fill="{park}"><rect x="40" y="150" width="110" height="80"/><rect x="250" y="120" width="90" height="70"/><rect x="60" y="330" width="70" height="60"/></g>
  <g fill="{block}"><rect x="170" y="60" width="60" height="60"/><rect x="180" y="250" width="70" height="60"/><rect x="290" y="230" width="80" height="50"/><rect x="60" y="250" width="80" height="50"/></g>
  <g stroke="{road}" stroke-width="6" fill="none"><path d="M-10 230 H 420"/><path d="M-10 420 C 80 400, 160 420, 240 380 S 340 300, 420 290"/><path d="M160 0 V 560"/><path d="M340 0 V 380"/></g>
  <g stroke="{road}" stroke-width="3" fill="none"><path d="M-10 120 H 420"/><path d="M-10 320 H 240"/><path d="M60 0 V 500"/><path d="M250 0 V 300"/><path d="M-10 540 C 60 500, 120 560, 200 520"/></g>
  <g font-family="Geist, Inter, sans-serif" font-size="11" fill="{lbl}" letter-spacing="0.4">
    <text x="24" y="222">Pacific Coast Hwy</text>
    <text x="262" y="512" transform="rotate(-22 262 512)">Upper Newport Bay</text>
    <text x="168" y="100" transform="rotate(90 168 100)">Jamboree Rd</text>
    <text x="300" y="352" transform="rotate(-16 300 352)">Bayside Dr</text>
  </g>
</svg>'''

def pin(T, x, y, color, icon='car', size=32, selected=False):
    ring = T['ink'] if selected else T['raised']
    sz = int(size * 1.2) if selected else size
    return (f'<div style="position:absolute;left:{x}px;top:{y}px;width:{sz}px;height:{sz}px;border-radius:999px;background:{color};color:{T["pinLabel"]};'
            f'display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px {ring};transform:translate(-50%,-50%)">{ico(icon, "ico ico-sm", "stroke-width:1.75")}</div>')

def cluster(T, x, y, n):
    return (f'<div style="position:absolute;left:{x}px;top:{y}px;width:34px;height:34px;border-radius:999px;background:{T["pinCluster"]};color:{T["pinLabel"]};'
            f'display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px {T["raised"]};transform:translate(-50%,-50%)"><span class="plate" style="color:{T["pinLabel"]};letter-spacing:0">{n}</span></div>')

def map_screen(T):
    m = MEETS[0]
    return phone_open(T) + f'''
  {map_base(T)}
  <div style="position:absolute;left:236px;top:404px;width:14px;height:14px;border-radius:999px;background:{T['link']};box-shadow:0 0 0 3px {T['raised']};transform:translate(-50%,-50%)"></div>
  {pin(T, 296, 318, T['pinToday'], 'car', 32, True)}
  {pin(T, 104, 190, T['pinNow'])}
  {pin(T, 350, 150, T['pinUpcoming'])}
  {pin(T, 84, 388, T['pinRecurring'], 'repeat')}
  {pin(T, 210, 262, T['pinUpcoming'])}
  {pin(T, 236, 468, T['pinPast'], 'photo')}
  {cluster(T, 60, 300, 3)}
  {cluster(T, 372, 240, 5)}
  <div style="position:absolute;top:60px;left:20px;right:20px;display:flex;align-items:center;justify-content:space-between;z-index:12">
    <div class="glass" style="height:44px;padding:0 14px 0 16px;border-radius:22px;display:flex;align-items:center;gap:8px;color:{T['ink']}"><span style="font-family:{SYS};font-size:15px;font-weight:600">Newport Beach</span>{ico('chevdown', 'ico ico-sm', f'color:{T["ink2"]}')}</div>
    <div style="display:flex;gap:10px">{glass_circle(T, 'list')}{glass_circle(T, 'locate')}</div>
  </div>
  <div style="position:absolute;left:0;right:0;top:528px;bottom:0;background:{T['raised']};border-radius:20px 20px 0 0;box-shadow:0 0 0 1px {T['border']};z-index:15;overflow:hidden">
    <div style="width:36px;height:5px;border-radius:3px;background:{T['border']};margin:8px auto 0"></div>
    <div style="display:flex;gap:14px;padding:14px 20px 0">
      {photo(T, 0, 'width:104px;height:78px;border-radius:10px;flex:none', '', 0.56)}
      <div style="display:flex;flex-direction:column;gap:4px;min-width:0;flex:1">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">{plate(T, 'Today 7:30 am &middot; 4.2 mi')}</div>
        <div class="serif" style="font-size:22px;line-height:26px;color:{T['ink']}">{m['title']}</div>
        <div class="caption" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{m['host']} &middot; {m['going']}</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;padding:12px 20px 0">{status_chip(T, 'confirmed')}{chip(T, 'Every Saturday', 'repeat')}</div>
    <div class="rule" style="margin:14px 20px 0"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px 0">
      <span style="font-size:15px;font-weight:500;color:{T['ink']}">Directions</span>{ico('directions', 'ico ico-sm', f'color:{T["ink2"]}')}
    </div>
  </div>
  <div class="glass" style="position:absolute;left:20px;right:20px;bottom:94px;height:52px;border-radius:26px;display:flex;align-items:center;gap:10px;padding:0 10px 0 16px;color:{T['ink']};z-index:20">
    {ico('search', 'ico', f'color:{T["ink2"]}')}
    <span style="flex:1;font-family:{SYS};font-size:16px;color:{T['ink2']}">Search meets, hosts, places</span>
    {ico('filter', 'ico ico-sm', f'color:{T["ink2"]}')}
  </div>
  {tabbar(T, 'map')}
</div>'''

# ---------------------------------------------------------------- List
def row(T, m):
    trailing = ico('seal', 'ico ico-sm', f'color:{T["success"]}') if m['status'] == 'confirmed' else (ico('repeat', 'ico ico-sm', f'color:{T["ink2"]}') if m['status'] == 'series' else '')
    return f'''<div style="display:flex;gap:14px;align-items:center;padding:14px 0">
      {photo(T, m['photo'], 'width:96px;height:72px;border-radius:10px;flex:none', '', 0.55)}
      <div style="flex:1;display:flex;flex-direction:column;gap:4px;min-width:0">
        <span style="font-size:16px;line-height:20px;font-weight:500;color:{T['ink']};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{m['title']}</span>
        {plate(T, f"{m['plate'].split(' ',1)[1]} &middot; {m['dist']}")}
        <span class="caption" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{m['host']} &middot; {m['going']}</span>
      </div>
      {trailing}
    </div>'''

def section(T, title, sub):
    return f'''<div style="display:flex;align-items:baseline;justify-content:space-between;padding:22px 0 8px;border-bottom:1px solid {T['border']}">
      <span class="serif" style="font-size:22px;line-height:26px;color:{T['ink']}">{title}</span>{plate(T, sub)}</div>'''

def list_screen(T):
    return phone_open(T) + f'''
  <div style="position:absolute;top:58px;left:20px;right:20px;display:flex;align-items:flex-end;justify-content:space-between;z-index:5">
    <div style="display:flex;flex-direction:column;gap:6px">
      {plate(T, 'This weekend &middot; within 25 mi')}
      <span class="serif" style="font-size:40px;line-height:44px;letter-spacing:-0.4px;color:{T['ink']}">14 meets</span>
    </div>
    <div class="glass" style="height:40px;padding:0 4px;border-radius:20px;display:flex;align-items:center;gap:2px">
      <div style="height:32px;padding:0 12px;border-radius:16px;background:{T['ink']};color:{T['bg']};display:flex;align-items:center;font-family:{SYS};font-size:13px;font-weight:600">Date</div>
      <div style="height:32px;padding:0 12px;border-radius:16px;display:flex;align-items:center;font-family:{SYS};font-size:13px;font-weight:500;color:{T['ink2']}">Distance</div>
    </div>
  </div>
  <div style="position:absolute;top:130px;left:20px;right:20px;bottom:0;display:flex;flex-direction:column;overflow:hidden">
    {section(T, 'Saturday', 'Sep 5')}
    <div style="border-bottom:1px solid {T['border']}">{row(T, MEETS[0])}</div>
    <div style="border-bottom:1px solid {T['border']}">{row(T, MEETS[2])}</div>
    {section(T, 'Sunday', 'Sep 6')}
    <div style="border-bottom:1px solid {T['border']}">{row(T, MEETS[1])}</div>
    <div style="border-bottom:1px solid {T['border']}">{row(T, MEETS[3])}</div>
    <div style="border-bottom:1px solid {T['border']}">{row(T, MEETS[4])}</div>
  </div>
  <div class="glass" style="position:absolute;left:50%;bottom:98px;transform:translateX(-50%);height:40px;padding:0 16px 0 14px;border-radius:20px;display:flex;align-items:center;gap:6px;color:{T['ink']};font-family:{SYS};font-size:14px;font-weight:600;z-index:21">{ico('map', 'ico ico-sm')}Map</div>
  {tabbar(T, 'map')}
</div>'''

# ---------------------------------------------------------------- Event detail
def meta_row(T, icon, main, sub=None, trailing=None, main_color=None):
    sub_html = f'<span class="caption">{sub}</span>' if sub else ''
    tr = f'<div style="margin-left:auto;flex:none">{trailing}</div>' if trailing else ''
    icon_color = main_color or T['ink2']
    text_color = main_color or T['ink']
    return (f'<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid {T["border"]}">'
            f'{ico(icon, "ico", "color:" + icon_color)}'
            f'<div style="display:flex;flex-direction:column;gap:2px;min-width:0"><span style="font-size:15px;line-height:20px;font-weight:500;color:{text_color}">{main}</span>{sub_html}</div>{tr}</div>')

def detail(T):
    m = MEETS[0]
    return phone_open(T) + f'''
  {photo(T, 0, 'position:absolute;top:0;left:0;right:0;height:226px', '', 0.58)}
  <div style="position:absolute;top:60px;left:20px;right:20px;display:flex;justify-content:space-between;z-index:12">{glass_circle(T, 'back')}{glass_circle(T, 'share')}</div>
  <div style="position:absolute;top:226px;left:0;right:0;bottom:0;background:{T['bg']};overflow:hidden">
    <div style="display:flex;flex-direction:column;padding:18px 20px 0">
      <div style="display:flex;flex-direction:column;gap:6px;padding-bottom:14px;border-bottom:1px solid {T['border']}">
        {plate(T, 'Sat, Sep 5 &middot; 7:30 to 10 am', T['ink'])}
        <span class="serif" style="font-size:28px;line-height:32px;letter-spacing:-0.2px;color:{T['ink']}">{m['title']}</span>
        <span class="caption" style="font-weight:400;font-size:13px;line-height:18px;letter-spacing:0">{m['where']}, Newport Beach &middot; {m['dist']}</span>
      </div>
      {meta_row(T, 'seal', 'Confirmed by host', 'Last confirmed Thu, Sep 3 by Back Bay Air-Cooled', None, T['success'])}
      {meta_row(T, 'person', 'Back Bay Air-Cooled', 'Host &middot; 14 meets &middot; every Saturday', f'<span style="font-size:15px;font-weight:500;color:{T["link"]}">Follow</span>')}
      {meta_row(T, 'repeat', 'Every Saturday, 7:30 to 10 am', 'Next: Sep 12, Sep 19', None)}
      <div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid {T['border']}">{ico('check_c', 'ico', f'color:{T["ink2"]}')}{going_row(T, 3, '42 going &middot; 3 people you follow')}</div>
      <p style="margin:14px 0 0;font-size:16px;line-height:24px;color:{T['ink']};text-wrap:pretty">Lot behind the bakery on Bayside, 7:30 to 10. Coffee is inside, parking is wherever there is room. Air-cooled and water-cooled both fine. Wagons welcome. If the marine layer holds, bring a jacket. It usually holds.</p>
      <div style="display:flex;align-items:center;gap:8px;margin-top:12px">{ico('link', 'ico ico-sm', f'color:{T["ink2"]}')}<span class="caption" style="font-weight:400;font-size:13px;letter-spacing:0">Listed from the host&#39;s Evite. <a href="#" style="font-weight:500">Open original</a></span></div>
    </div>
  </div>
  <div style="position:absolute;left:20px;right:20px;bottom:22px;display:flex;gap:10px;z-index:20">
    {glass_circle(T, 'directions', 56)}
    {glass_circle(T, 'share', 56)}
    <div style="flex:1;height:56px;border-radius:28px;background:{T['accent']};color:{T['accentInk']};display:flex;align-items:center;justify-content:center;gap:8px;font-family:{SYS};font-size:16px;font-weight:600">{ico('check_c', 'ico', 'stroke-width:1.75')}I&#39;m going</div>
  </div>
</div>'''

# ---------------------------------------------------------------- Create from link
def conf_chip(T, level):
    color, icon, text = {'sure': (T['success'], 'seal', 'Sure'), 'check': (T['warning'], 'question', 'Check'), 'guess': (T['error'], 'warn', 'Guess')}[level]
    return chip(T, text, icon, color)

def field(T, label, value, level, hint=None):
    border = T['border'] if level == 'sure' else {'check': T['warning'], 'guess': T['error']}[level]
    hint_html = f'<span class="caption" style="font-weight:400;letter-spacing:0;line-height:16px;color:{T["ink2"]}">{hint}</span>' if hint else ''
    return f'''<div style="display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;align-items:center;justify-content:space-between"><span class="label">{label}</span>{conf_chip(T, level)}</div>
      <div style="height:46px;padding:0 14px;display:flex;align-items:center;background:{T['surface']};box-shadow:0 0 0 1px {border};border-radius:10px;font-size:16px;color:{T['ink']}">{value}</div>
      {hint_html}
    </div>'''

def create(T):
    return phone_open(T, T['scrim']) + f'''
  <div style="position:absolute;inset:0;background:{T['ink']}"></div>
  <div style="position:absolute;left:0;right:0;top:54px;bottom:0;background:{T['raised']};border-radius:20px 20px 0 0;overflow:hidden">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:56px;border-bottom:1px solid {T['border']}">
      <span style="font-family:{SYS};font-size:16px;font-weight:500;color:{T['ink']};width:64px">Cancel</span>
      <span style="font-family:{SYS};font-size:16px;font-weight:600;color:{T['ink']}">Add a meet</span>
      <span style="width:64px"></span>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px;padding:18px 20px 0">
      <div style="display:flex;flex-direction:column;gap:6px">
        <span class="label">Link</span>
        <div style="display:flex;align-items:center;gap:10px;height:46px;padding:0 12px 0 14px;background:{T['surface']};box-shadow:0 0 0 1px {T['border']};border-radius:10px">{ico('link', 'ico ico-sm', f'color:{T["ink2"]}')}<span style="flex:1;font-size:15px;color:{T['ink']};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">evite.com/event/back-bay-coffee-0912</span>{ico('x', 'ico ico-xs', f'color:{T["ink2"]}')}</div>
        <div style="display:flex;align-items:center;gap:6px;color:{T['success']}">{ico('seal', 'ico ico-xs')}<span class="caption" style="color:{T['success']}">Evite link read. 6 of 7 fields found.</span></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding-top:6px;border-top:1px solid {T['border']};margin-top:2px">
        <span class="label" style="padding-top:8px">Draft</span><span class="caption" style="padding-top:8px;font-weight:400;letter-spacing:0">Tap a field to change it</span>
      </div>
      {field(T, 'Title', 'Back Bay Coffee', 'sure')}
      {field(T, 'When', 'Sat, Sep 12 &middot; 7:30 to 10 am', 'sure')}
      {field(T, 'Where', 'Lot behind the bakery on Bayside', 'check', 'Evite said &quot;behind the bakery&quot;. We matched the Bayside lot. Tap to move the pin.')}
      {field(T, 'Host', 'Back Bay Air-Cooled', 'sure')}
      {field(T, 'Repeats', 'Every Saturday', 'guess', 'Guessed from &quot;see you every week&quot; in the description.')}
    </div>
    <div style="position:absolute;left:20px;right:20px;bottom:30px;display:flex;flex-direction:column;gap:8px;align-items:center;background:{T['raised']};padding-top:12px">
      <div style="width:100%;height:52px;border-radius:8px;background:{T['accent']};color:{T['accentInk']};display:flex;align-items:center;justify-content:center;font-family:{SYS};font-size:16px;font-weight:600">Post</div>
      <span class="caption" style="font-weight:400;letter-spacing:0">Looks right? Fix anything we got wrong, then post.</span>
    </div>
  </div>
</div>'''

# ---------------------------------------------------------------- Theme comparison
def comparison():
    variants = [(theme('marine-layer', 'light'), 'Marine Layer', 'Default. Fog white, wet asphalt, oxblood.'),
                (theme('harbor', 'light'), 'Harbor', 'Bone white, deep navy, old brass.'),
                (theme('olive-ivory', 'light'), 'Olive and Ivory', 'Ivory, sage olive, burnt sienna.'),
                (theme('marine-layer', 'dark'), 'Marine Layer Dark', 'Same roles, lifted accent, dark ink on accent.')]
    cols = ''
    for T, name, note in variants:
        cols += f'''<div style="display:flex;flex-direction:column;gap:16px;width:402px;flex:none">
      <div style="display:flex;flex-direction:column;gap:4px;padding-bottom:12px;border-bottom:1px solid {ML['border']}">
        <span class="serif" style="font-size:28px;line-height:32px;color:{ML['ink']}">{name}</span>
        <span class="caption" style="font-weight:400;font-size:13px;letter-spacing:0;color:{ML['ink2']}">{note} &middot; {T['key']}, {T['scheme']}</span>
      </div>
      <div style="width:402px;height:874px;border-radius:40px;overflow:hidden;box-shadow:0 0 0 1px {ML['border']};position:relative">{feed(T)}</div>
    </div>'''
    return f'''<div style="width:1848px;height:1080px;background:{ML['bg']};padding:48px;display:flex;gap:48px;align-items:flex-start;font-family:{SANS}">{cols}</div>'''

# ---------------------------------------------------------------- Landing (web, 1440)
def landing():
    T = ML
    def nav(t): return f'<span style="font-size:15px;font-weight:500;color:{T["ink"]}">{t}</span>'
    def teaser(m, place, i):
        return f'''<div style="display:flex;flex-direction:column;gap:10px">
          {photo(T, i, 'height:255px;border-radius:12px', '', 0.55 + 0.03 * i)}
          {plate(T, f"{place}, {m['when']}")}
          <span class="serif" style="font-size:26px;line-height:30px;color:{T['ink']}">{m['title']}</span>
          <span style="font-size:14px;line-height:20px;color:{T['ink2']}">{m['where']}. Hosted by {m['host']}. {m['going']}.</span>
        </div>'''
    def step(n, title, body):
        return f'''<div style="display:flex;flex-direction:column;gap:12px;padding-top:20px;border-top:1px solid {T['border']}">
          {plate(T, n)}
          <span class="serif" style="font-size:24px;line-height:28px;color:{T['ink']}">{title}</span>
          <span style="font-size:15px;line-height:22px;color:{T['ink2']};text-wrap:pretty">{body}</span>
        </div>'''
    phone = feed(T)
    return f'''<div style="width:1440px;height:2260px;background:{T['bg']};position:relative;overflow:hidden;font-family:{SANS};color:{T['ink']}">
  <div class="glass" style="position:absolute;top:0;left:0;right:0;height:72px;z-index:10;box-shadow:0 1px 0 {T['border']}">
    <div style="width:1120px;height:72px;margin:0 auto;display:flex;align-items:center;justify-content:space-between">
      <div style="color:{T['ink']}">{logo_svg('lockup-horizontal-02.svg', 36)}</div>
      <div style="display:flex;align-items:center;gap:32px">{nav('Find a meet')}{nav('Hosts')}{nav('About')}</div>
      <div style="height:40px;padding:0 16px;border-radius:8px;background:{T['accent']};color:{T['accentInk']};display:flex;align-items:center;gap:8px;font-size:15px;font-weight:500">{ico('apple', 'ico ico-sm')}Get the app</div>
    </div>
  </div>
  <div style="position:absolute;top:150px;left:160px;width:1120px;display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:80px;align-items:center">
    <div style="display:flex;flex-direction:column;gap:28px">
      {plate(T, 'Newport Beach &middot; this Saturday &middot; 7:30 am')}
      <h1 class="serif" style="margin:0;font-size:72px;line-height:74px;letter-spacing:-0.8px;color:{T['ink']};text-wrap:balance">Find cars and coffee meets near you.</h1>
      <p style="margin:0;font-size:19px;line-height:29px;color:{T['ink2']};max-width:500px;text-wrap:pretty">Saturday morning lots from Newport Beach to Long Beach, listed by the people who host them. The time, the lot, the distance, who is going. Browse without an account.</p>
      <div style="display:flex;align-items:center;gap:20px">
        <div style="height:52px;padding:0 22px;border-radius:8px;background:{T['accent']};color:{T['accentInk']};display:flex;align-items:center;gap:10px;font-size:16px;font-weight:500;white-space:nowrap">{ico('apple')}Get the app</div>
        <a href="#" style="font-size:16px;font-weight:500;display:flex;align-items:center;gap:4px;white-space:nowrap">Browse this weekend{ico('chev', 'ico ico-sm')}</a>
      </div>
      {plate(T, 'Free &middot; iOS and web &middot; every meet, every car')}
    </div>
    <div style="display:flex;align-items:center;justify-content:center;height:880px">
      <div style="width:426px;height:898px;border-radius:52px;background:{T['ink']};padding:12px;flex:none">
        <div style="width:402px;height:874px;border-radius:40px;overflow:hidden;position:relative;background:{T['bg']}">{phone}</div>
      </div>
    </div>
  </div>
  <div style="position:absolute;top:1090px;left:160px;width:1120px;display:flex;flex-direction:column;gap:28px">
    <div style="display:flex;align-items:baseline;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid {T['border']}">
      <span class="serif" style="font-size:34px;line-height:38px;color:{T['ink']}">This weekend</span>{plate(T, 'Sat, Sep 5 and Sun, Sep 6 &middot; within 25 mi of Newport Beach')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:32px">
      {teaser(MEETS[0], 'Newport Beach', 0)}
      {teaser(MEETS[1], 'Balboa Island', 1)}
      {teaser(MEETS[3], 'Laguna Beach', 2)}
    </div>
  </div>
  <div style="position:absolute;top:1560px;left:0;right:0;height:300px;background:{T['ink']};color:{T['bg']}">
    <div style="width:1120px;margin:0 auto;height:300px;display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:80px;align-items:center">
      <span class="serif" style="font-size:56px;line-height:60px;letter-spacing:-0.4px;color:{T['bg']}">Every meet, every car.</span>
      <div style="display:flex;flex-direction:column;gap:14px;font-size:17px;line-height:26px;color:{T['border']};text-wrap:pretty">
        <span>The lot behind a bakery with six cars is listed next to the one with four hundred. Daily drivers park beside the air-cooled stuff and nobody minds.</span>
        <span>If someone hosts it, it is here, with their name on it and a link back to where they posted it. Bring whatever you drive.</span>
      </div>
    </div>
  </div>
  <div style="position:absolute;top:1940px;left:160px;width:1120px;display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:32px">
    {step('01 &middot; for hosts', 'Already posted it? Paste the link.', 'Evite, Eventbrite, Meetup, or a public Instagram post. We read the link and draft the listing.')}
    {step('02', 'Check the draft.', 'Time, lot, host, and repeat come in with a confidence tag on each. Fix what we got wrong, then post.')}
    {step('03', 'It is listed, with your name on it.', 'People nearby see it on the map and in the feed. Confirm it each week and it says so.')}
  </div>
  <div style="position:absolute;top:2180px;left:160px;width:1120px;display:flex;align-items:center;justify-content:space-between;padding-top:20px;border-top:1px solid {T['border']}">
    <div style="color:{T['ink']}">{logo_svg('lockup-horizontal-01.svg', 14)}</div>
    <div style="display:flex;gap:24px;font-size:13px;color:{T['ink2']}"><span>Newport Beach, California</span><span>Add a meet</span><span>Hosts</span><span>Privacy</span><span>Contact</span></div>
  </div>
</div>'''

# ---------------------------------------------------------------- Brand board (2400)
def brand_board():
    T = ML
    def head(t):
        return f'<div style="display:flex;flex-direction:column;gap:8px;padding-bottom:8px;border-bottom:1px solid {T["border"]}"><span class="label">{t}</span></div>'
    def opt(num, svg, note, h=56):
        return f'''<div style="display:flex;align-items:center;gap:24px;padding:16px 0;border-bottom:1px solid {T['border']}">
          <span class="caption" style="width:24px">{num}</span><div style="color:{T['ink']};flex:1">{svg}</div><span class="caption" style="font-weight:400;letter-spacing:0;font-size:12px;text-align:right">{note}</span></div>'''
    def mono_card(file, note):
        ladder = ''.join(f'<div style="width:{s}px;height:{s}px;color:{T["ink"]}">{logo_svg(file, s)}</div>' for s in (16, 24, 32, 48))
        ladder += f'<div style="width:24px;height:24px;background:{T["ink"]};color:{T["bg"]};padding:4px;border-radius:4px">{logo_svg(file, 16)}</div>'
        return f'''<div style="display:flex;flex-direction:column;gap:12px">
          <div style="height:120px;background:{T['raised']};box-shadow:0 0 0 1px {T['border']};display:flex;align-items:center;justify-content:center;color:{T['ink']}">{logo_svg(file, 72)}</div>
          <div style="display:flex;align-items:flex-end;gap:10px;height:48px">{ladder}</div>
          <span class="caption" style="font-weight:400;letter-spacing:0">{note}</span>
        </div>'''
    def app_icon(bg, fg):
        return f'<div style="width:72px;height:72px;border-radius:18px;background:{bg};color:{fg};display:flex;align-items:center;justify-content:center;flex:none">{logo_svg("monogram-01-stroke.svg", 42)}</div>'
    def swatch(role, hexv, ink):
        return (f'<div style="display:flex;flex-direction:column;gap:4px;flex:1;min-width:0"><div style="height:32px;background:{hexv};box-shadow:0 0 0 1px {T["border"]}"></div>'
                f'<span style="font-size:9.5px;line-height:12px;color:{ink};white-space:nowrap;letter-spacing:-0.1px">{role}</span><span style="font-size:9.5px;line-height:12px;color:{T["ink2"]};font-feature-settings:\'tnum\'">{hexv}</span></div>')
    def palette(key):
        th = TOKENS['themes'][key]
        out = f'<div style="display:flex;flex-direction:column;gap:4px"><span class="serif" style="font-size:24px;line-height:28px;color:{T["ink"]}">{th["name"]}</span><span class="caption" style="font-weight:400;letter-spacing:0">{th["story"]}</span></div>'
        for scheme in ('light', 'dark'):
            v = {k: th[scheme][k]['$value'] for k in th[scheme]}
            row1 = ''.join(swatch(r, v[r], T['ink']) for r in ('bg', 'surface', 'surfaceRaised', 'border', 'textPrimary', 'textSecondary'))
            row2 = ''.join(swatch(r, v[r], T['ink']) for r in ('accent', 'accentInk', 'link', 'success', 'warning', 'error'))
            pins = ''.join(f'<div style="width:18px;height:18px;border-radius:999px;background:{v[p]};box-shadow:0 0 0 2px {v["surfaceRaised"]}" title="{p}"></div>' for p in ('pinNow', 'pinToday', 'pinUpcoming', 'pinRecurring', 'pinPast', 'pinCluster'))
            out += f'''<div style="display:flex;flex-direction:column;gap:8px"><span class="label">{scheme}</span>
              <div style="display:flex;gap:6px">{row1}</div><div style="display:flex;gap:6px">{row2}</div>
              <div style="display:flex;gap:10px;align-items:center;padding:2px 0 0 2px">{pins}<span class="caption" style="margin-left:6px;font-weight:400;letter-spacing:0">pins: now, today, upcoming, recurring, past, cluster</span></div></div>'''
        return f'<div style="display:flex;flex-direction:column;gap:18px;padding-bottom:24px;border-bottom:1px solid {T["border"]}">{out}</div>'
    return f'''<div style="width:2400px;height:1760px;background:{T['bg']};position:relative;overflow:hidden;font-family:{SANS};color:{T['ink']};padding:56px 72px">
  <div style="display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:28px;border-bottom:1px solid {T['border']}">
    <div style="display:flex;align-items:flex-end;gap:40px">
      <div style="color:{T['ink']}">{logo_svg('wordmark-01-chamfer.svg', 112)}</div>
      <div style="display:flex;flex-direction:column;gap:4px;padding-bottom:10px"><span style="font-size:14px;color:{T['ink']}">Curb Social Club</span><span style="font-size:14px;color:{T['ink2']}">Brand board, v2.0</span></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;padding-bottom:6px">
      {plate(T, '2026-09-05')}{plate(T, 'Instrument Serif + Geist')}{plate(T, 'Three themes, light and dark')}{plate(T, 'Flat: no gradients, no shadows')}
    </div>
  </div>
  <div style="display:grid;grid-template-columns:560px 1100px 484px;gap:56px;padding-top:40px">
    <div style="display:flex;flex-direction:column;gap:40px">
      <div style="display:flex;flex-direction:column">
        {head('Wordmark options')}
        {opt('01', logo_svg('wordmark-01-chamfer.svg', 76), 'chamfered b, curb edge. Primary.')}
        {opt('02', logo_svg('wordmark-02-horizon.svg', 84), 'horizon rule')}
        {opt('03', logo_svg('wordmark-03-italic.svg', 76), 'italic, print only')}
        {opt('04', logo_svg('wordmark-04-tight.svg', 76), 'tight, under 72px')}
      </div>
      <div style="display:flex;flex-direction:column">
        {head('Lockups')}
        {opt('L1', logo_svg('lockup-horizontal-01.svg', 30), 'small caps, formal')}
        {opt('L2', logo_svg('lockup-horizontal-02.svg', 48), 'wordmark + Geist caps')}
        {opt('L3', logo_svg('lockup-horizontal-03.svg', 56), 'monogram + wordmark')}
        {opt('S1', logo_svg('lockup-stacked-01.svg', 110), 'stacked')}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:36px">
      <div style="display:flex;flex-direction:column;gap:20px">
        {head('Monogram options, curb profile C')}
        <div style="display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:24px">
          {mono_card('monogram-01-stroke.svg', '01 stroke, chamfer. Primary: app icon, favicon, avatar.')}
          {mono_card('monogram-02-block.svg', '02 block, step. Embroidery, stamps, photo overlays.')}
          {mono_card('monogram-03-horizon.svg', '03 stroke on horizon. Splash, social card.')}
          {mono_card('monogram-04-rolled.svg', '04 rolled edge. Alternate beside rounded chrome.')}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:56px">
        <div style="display:flex;flex-direction:column;gap:16px">
          {head('App icons, iOS 26 layered, flat')}
          <div style="display:flex;align-items:center;gap:16px">{app_icon('#23272A', '#EDEFF0')}{app_icon('#16223A', '#CBA55B')}{app_icon('#4B5E3E', '#EFECE1')}
            <div style="display:flex;flex-direction:column;gap:4px;margin-left:8px;font-size:13px;line-height:18px;color:{T['ink2']}"><span>Marine Layer: fog on wet asphalt</span><span>Harbor: brass on navy</span><span>Olive and Ivory: ivory on sage</span></div></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          {head('Color variants')}
          <div style="display:flex;gap:12px">
            <div style="flex:1;height:72px;background:{T['raised']};box-shadow:0 0 0 1px {T['border']};display:flex;align-items:center;justify-content:center;color:{T['ink']}">{logo_svg('wordmark-01-chamfer.svg', 40)}</div>
            <div style="flex:1;height:72px;background:{T['ink']};display:flex;align-items:center;justify-content:center;color:#EDEFF0">{logo_svg('wordmark-01-chamfer.svg', 40)}</div>
            <div style="flex:1;height:72px;background:{T['bg']};box-shadow:0 0 0 1px {T['border']};display:flex;align-items:center;justify-content:center;color:{T['accent']}">{logo_svg('wordmark-01-chamfer.svg', 40)}</div>
            <div style="width:72px;height:72px;background:{T['accent']};display:flex;align-items:center;justify-content:center;color:{T['accentInk']}">{logo_svg('monogram-01-stroke.svg', 36)}</div>
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:20px">
        {head('Type pairing')}
        <div style="display:flex;flex-direction:column;gap:14px;max-width:760px">
          <span class="serif" style="font-size:56px;line-height:60px;letter-spacing:-0.4px;color:{T['ink']}">Saturday, 7:30 am.<br>Marine layer until ten.</span>
          <span style="font-size:16px;line-height:24px;color:{T['ink']};text-wrap:pretty">Forty cars in the lot behind the bakery by eight. Air-cooled and water-cooled, a Volvo wagon, two Miatas. Bring whatever you drive. Coffee is inside, parking is wherever there is room.</span>
          {plate(T, 'Sat 7:30 am &nbsp;&middot;&nbsp; 4.2 mi &nbsp;&middot;&nbsp; every Saturday')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:56px;padding-top:16px;border-top:1px solid {T['border']}">
          <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;line-height:19px;color:{T['ink2']}">
            <span style="color:{T['ink']};font-weight:500">Display, Instrument Serif</span>
            <span>Display 40/44, tracking -0.4 &middot; Title 28/32, -0.2 &middot; Headline 22/26</span>
            <span style="color:{T['ink']};font-weight:500;margin-top:10px">Where the serif appears</span>
            <span>Wordmark, feed masthead, section headers, event titles, host names, onboarding. Never in buttons, chrome, or metadata.</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;line-height:19px;color:{T['ink2']}">
            <span style="color:{T['ink']};font-weight:500">UI and body, Geist</span>
            <span>Subhead 15/20 medium &middot; Body 16/24 &middot; Caption 12/16 medium, +0.2 &middot; Plate 13/16 medium, +0.6, uppercase, tabular</span>
            <span style="color:{T['ink']};font-weight:500;margin-top:10px">iOS chrome</span>
            <span>SF Pro through system text styles under Liquid Glass. Tab bar, toolbars, alerts, sheets: never overridden.</span>
          </div>
        </div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:24px">
      {head('Palettes')}
      {palette('marine-layer')}
      {palette('harbor')}
      {palette('olive-ivory')}
    </div>
  </div>
</div>'''

# ---------------------------------------------------------------- write
files = {
  'Main.dc.html': wrap(feed(ML), ML),
  'Map.dc.html': wrap(map_screen(ML), ML),
  'List.dc.html': wrap(list_screen(ML), ML),
  'EventDetail.dc.html': wrap(detail(ML), ML),
  'CreateFromLink.dc.html': wrap(create(ML), ML),
  'ThemeComparison.dc.html': wrap(comparison(), ML),
  'Landing.dc.html': wrap(landing(), ML),
  'BrandBoard.dc.html': wrap(brand_board(), ML),
}
for name, src in files.items():
    with open(os.path.join(HERE, name), 'w') as f: f.write(src)

canvas = {
  "artboards": [
    {"file": "Main.dc.html", "title": "Feed", "x": 0, "y": 0, "w": 402, "h": 874},
    {"file": "Map.dc.html", "title": "Map", "x": 500, "y": 0, "w": 402, "h": 874},
    {"file": "List.dc.html", "title": "List", "x": 1000, "y": 0, "w": 402, "h": 874},
    {"file": "EventDetail.dc.html", "title": "Event detail", "x": 1500, "y": 0, "w": 402, "h": 874},
    {"file": "CreateFromLink.dc.html", "title": "Create from link", "x": 2000, "y": 0, "w": 402, "h": 874},
    {"file": "ThemeComparison.dc.html", "title": "Theme comparison", "x": 0, "y": 1040, "w": 1848, "h": 1080},
    {"file": "Landing.dc.html", "title": "Web landing", "x": 0, "y": 2280, "w": 1440, "h": 2260},
    {"file": "BrandBoard.dc.html", "title": "Brand board", "x": 0, "y": 4700, "w": 2400, "h": 1760},
  ],
  "annotations": [
    {"id": "brand-note", "x": 0, "y": -360, "w": 460, "text": "curb, iOS 26 Liquid Glass, Marine Layer (light).\nGlass is the nav layer only: tab bar pill, toolbar buttons, bottom search. Content is flat: surface on bg, 1px hairlines, no shadows, no gradients.\nInstrument Serif for the masthead, section headers and event titles. Geist for everything else (it also stands in for SF Pro in the tab bar). Plate style (uppercase, tracked, tabular) for times and distances.\nNo status bar drawn; the real one renders on top."},
    {"id": "accent-note", "x": 1500, "y": -240, "w": 400, "text": "One accent per screen: oxblood goes on I'm going (detail), Post (create), and the today pin (map). Selected tab is ink, not accent, so the accent stays reserved for the action."},
    {"id": "themes-note", "x": 1900, "y": 1040, "w": 380, "text": "Same Feed, four token sets. Every role name is shared, so a component is written once and themed by tokens. Placeholder photos are flat three-band blocks (sky, lot, asphalt), desaturated and cool."},
  ],
  "launch": {"view": "canvas"}
}
with open(os.path.join(HERE, 'canvas.json'), 'w') as f: json.dump(canvas, f, indent=2)
print('wrote', list(files) + ['canvas.json'])
