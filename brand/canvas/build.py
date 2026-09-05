#!/usr/bin/env python3
"""Generates the Cars and Coffee design canvas artboards (.dc.html) from shared pieces."""
import json, os
OUT = os.path.dirname(os.path.abspath(__file__))

# ---------- shared style ----------
CSS = """
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { margin: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif; color: #1F1712; -webkit-font-smoothing: antialiased; font-feature-settings: 'cv11', 'ss01', 'tnum'; }
    a { color: #2C6BA3; text-decoration: none; } a:hover { color: #1F4F7A; }
    * { box-sizing: border-box; }
    .glass { background: rgba(255,255,255,0.58); -webkit-backdrop-filter: blur(24px) saturate(160%); backdrop-filter: blur(24px) saturate(160%); border: 1px solid rgba(255,255,255,0.7); box-shadow: 0 8px 32px rgba(42,26,16,0.16), inset 0 1px 0 rgba(255,255,255,0.8); }
    .glass-dark { background: rgba(30,25,23,0.42); -webkit-backdrop-filter: blur(24px) saturate(140%); backdrop-filter: blur(24px) saturate(140%); border: 1px solid rgba(255,255,255,0.18); box-shadow: 0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.22); color: #F5EFE8; }
    .glass-amber { background: rgba(232,135,30,0.82); -webkit-backdrop-filter: blur(20px) saturate(160%); backdrop-filter: blur(20px) saturate(160%); border: 1px solid rgba(255,255,255,0.55); box-shadow: 0 8px 28px rgba(168,89,10,0.35), inset 0 1px 0 rgba(255,255,255,0.6); color: #2A1A10; }
    .ico { width: 24px; height: 24px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
    .ico-sm { width: 18px; height: 18px; }
    .ico-fill { fill: currentColor; stroke: none; }
    .photo { position: relative; overflow: hidden; background: linear-gradient(180deg, #F5B865 0%, #E8A052 38%, #8A7E74 62%, #4A403B 100%); }
    .photo::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 22% 12%, rgba(255,243,223,0.9) 0%, rgba(255,243,223,0) 45%); }
    .photo.v2 { background: linear-gradient(180deg, #BFDDF5 0%, #F5D9A6 40%, #8A7E74 62%, #3A312C 100%); }
    .photo.v3 { background: linear-gradient(180deg, #F0A040 0%, #C26A25 40%, #5A3A22 65%, #2A1A10 100%); }
    .photo.v4 { background: linear-gradient(180deg, #E6F2FB 0%, #FAD9A6 45%, #B3A79D 62%, #4A403B 100%); }
    .photo .car { position: absolute; left: 50%; bottom: 10%; width: 58%; transform: translateX(-50%); fill: #1F1712; opacity: 0.78; }
    .scrim { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, rgba(20,17,16,0) 0%, rgba(20,17,16,0.72) 100%); }
    .chip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 500; white-space: nowrap; }
    .stack > * { flex: none; }
    .avatar { width: 28px; height: 28px; border-radius: 999px; border: 2px solid #FFFFFF; flex: none; }
"""

# ---------- icons (stroke, 24 grid) ----------
I = {
 'house': '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
 'house_f': '<path class="ico-fill" d="M3 11.5 12 4l9 7.5v8.5a1 1 0 0 1-1 1h-5v-6h-4v6H4a1 1 0 0 1-1-1z"/>',
 'map': '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
 'map_f': '<path class="ico-fill" d="M9 4 3 6v14l6-2V4zM15 6l-6-2v14l6 2zM15 6l6-2v14l-6 2z"/>',
 'bell': '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
 'person': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18.5a6 6 0 0 1 11 0"/>',
 'plus': '<path d="M12 5v14M5 12h14"/>',
 'search': '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 'sliders': '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
 'locate': '<path d="M20 4 4 11l8 1 1 8z"/>',
 'calendar': '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
 'clock': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 'pin': '<path d="M12 21s-6-5.2-6-10.5a6 6 0 0 1 12 0C18 15.8 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>',
 'share': '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>',
 'back': '<path d="m14 5-7 7 7 7"/>',
 'link': '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"/>',
 'check': '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 'check_c': '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
 'repeat': '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',
 'car': '<path d="M5 15l1.5-5a2 2 0 0 1 2-1.5h7a2 2 0 0 1 2 1.5L19 15"/><rect x="3" y="14" width="18" height="5" rx="1.5"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/>',
 'camera': '<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>',
 'bubble': '<path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4z"/>',
 'chev': '<path d="m9 5 7 7-7 7"/>',
 'warn': '<path d="M12 4 3 20h18z"/><path d="M12 10v4M12 17h.01"/>',
 'question': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"/>',
 'seal': '<path d="m12 3 2.2 1.6 2.7-.3 1 2.5 2.5 1-.3 2.7L21.7 12l-1.6 2.2.3 2.7-2.5 1-1 2.5-2.7-.3L12 21l-2.2-1.6-2.7.3-1-2.5-2.5-1 .3-2.7L2.3 12l1.6-2.2-.3-2.7 2.5-1 1-2.5 2.7.3z"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
 'directions': '<path d="M11 3 3 11l8 8 8-8z"/><path d="M9 12h5l-1.5-1.5M14 12l-1.5 1.5"/>',
 'list': '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
 'apple': '<path class="ico-fill" d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.7zM14.1 5.8c.6-.8 1.1-1.8 1-2.8-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.7-1 2.8 1 0 2.1-.6 2.7-1.4z"/>',
 'x': '<path d="M6 6l12 12M18 6 6 18"/>',
 'clipboard': '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/><path d="M9 12h6M9 16h4"/>',
 'sparkle': '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 8.5l2-2"/>',
 'photo': '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 15-5-5-8 8"/>',
 'chevdown': '<path d="m6 9 6 6 6-6"/>',
}
def ico(name, cls='ico', style=''):
    return f'<svg class="{cls}" viewBox="0 0 24 24" style="{style}">{I[name]}</svg>'

CAR = '<svg class="car" viewBox="0 0 200 70"><path d="M8 52c0-6 4-10 10-11l22-3 22-18c3-3 7-4 11-4h44c5 0 9 2 12 5l18 17 32 6c6 1 11 6 11 12v6c0 3-2 5-5 5H13c-3 0-5-2-5-5z"/><circle cx="52" cy="58" r="11" fill="#FBF7F1"/><circle cx="52" cy="58" r="5"/><circle cx="150" cy="58" r="11" fill="#FBF7F1"/><circle cx="150" cy="58" r="5"/><path d="M66 36l16-14h30l4 14z" fill="#FBF7F1" opacity="0.55"/><path d="M120 22h22l14 14h-34z" fill="#FBF7F1" opacity="0.55"/></svg>'
def photo(variant='', style='', extra=''):
    return f'<div class="photo {variant}" style="{style}">{CAR}{extra}</div>'

MARK = '<svg viewBox="0 0 64 64" style="{style}"><g fill="none" stroke="{c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 20c-3-3 3-6 0-10"/><path d="M32 20c-3-3 3-6 0-10"/><path d="M42 30h3a5 5 0 0 1 0 10h-3"/></g><path fill="{c}" d="M12 26h30v14a3 3 0 0 1-3 3H19a7 7 0 0 1-7-7z"/><circle cx="21" cy="49" r="5.5" fill="{c}"/><circle cx="21" cy="49" r="2" fill="{bg}"/><circle cx="36" cy="49" r="5.5" fill="{c}"/><circle cx="36" cy="49" r="2" fill="{bg}"/></svg>'
def mark(size=32, c='#2A1A10', bg='#FBF7F1'):
    return MARK.format(style=f'width:{size}px;height:{size}px;flex:none', c=c, bg=bg)

AV = ['#E8871E', '#4A8FCB', '#7C5CC4', '#1E7A4A', '#B3A79D', '#C1272D']
def avatars(n=4, size=28, extra=None):
    out = f'<div style="display:flex;align-items:center">'
    for i in range(n):
        m = '' if i == 0 else 'margin-left:-8px;'
        out += f'<div class="avatar" style="width:{size}px;height:{size}px;background:{AV[i%len(AV)]};{m}"></div>'
    if extra:
        out += f'<span style="margin-left:8px;font-size:13px;color:#6B5F57;font-weight:500">{extra}</span>'
    return out + '</div>'

def tabbar(active='feed', dark=False):
    g = 'glass-dark' if dark else 'glass'
    ink = '#F5EFE8' if dark else '#1F1712'
    muted = 'rgba(245,239,232,0.7)' if dark else '#6B5F57'
    tabs = [('feed','house','house_f','Feed'),('map','map','map_f','Map'),('activity','bell','bell','Activity'),('profile','person','person','Profile')]
    items = ''
    for key, off, on, label in tabs:
        is_on = key == active
        color = '#A8590A' if (is_on and not dark) else ('#F5B865' if is_on else muted)
        icon = ico(on if is_on else off)
        items += f'<div style="display:flex;flex-direction:column;align-items:center;gap:2px;width:64px;height:52px;justify-content:center;color:{color}">{icon}<span style="font-size:11px;font-weight:{600 if is_on else 500}">{label}</span></div>'
    return (f'<div style="position:absolute;left:16px;right:16px;bottom:18px;display:flex;align-items:center;gap:10px;z-index:20">'
            f'<div class="{g}" style="flex:1;height:64px;border-radius:32px;display:flex;align-items:center;justify-content:space-around;padding:0 6px;color:{ink}">{items}</div>'
            f'<div class="glass-amber" style="width:64px;height:64px;border-radius:32px;display:flex;align-items:center;justify-content:center">{ico("plus", "ico", "stroke-width:2.2")}</div>'
            f'</div>')

def phone_open(bg='#FBF7F1'):
    return f'<div style="width:390px;height:844px;position:relative;overflow:hidden;background:{bg};border-radius:0">'

def wrap(body, bg='#FBF7F1'):
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>{CSS}
    body {{ background: {bg}; }}
  </style>
</helmet>
{body}
</x-dc>
</body>
</html>
"""

def card(title, when, where, dist, going, variant='', tag=None, tagcolor='#1E7A4A', tagtext='#fff'):
    tag_html = f'<div class="chip" style="position:absolute;top:12px;left:12px;background:{tagcolor};color:{tagtext};height:26px">{tag}</div>' if tag else ''
    return f'''<div style="border-radius:20px;overflow:hidden;background:#FFFFFF;box-shadow:0 2px 12px rgba(42,26,16,0.08)">
      {photo(variant, 'height:200px', f'<div class="scrim" style="height:110px"></div>{tag_html}<div style="position:absolute;left:16px;right:16px;bottom:14px;color:#FFFFFF;font-size:20px;font-weight:700;letter-spacing:-0.2px;line-height:25px">{title}</div>')}
      <div style="padding:12px 16px 14px;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;align-items:center;gap:6px;font-size:15px;color:#1F1712;font-weight:500">{ico("clock","ico ico-sm","color:#8A7E74")}<span>{when}</span></div>
        <div style="display:flex;align-items:center;gap:6px;font-size:15px;color:#6B5F57;white-space:nowrap"><svg class="ico ico-sm" viewBox="0 0 24 24" style="color:#8A7E74">{I['pin']}</svg><span style="overflow:hidden;text-overflow:ellipsis">{where}</span><span style="color:#B3A79D">·</span><span>{dist}</span></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px">{avatars(3, 26, going)}<div style="display:flex;align-items:center;gap:4px;font-size:13px;color:#A8590A;font-weight:600">I'm going{ico("chev","ico ico-sm")}</div></div>
      </div>
    </div>'''

# ---------- Feed (Main) ----------
feed = phone_open() + f'''
  <div style="position:absolute;top:0;left:0;right:0;height:110px;z-index:10;background:linear-gradient(180deg,#FBF7F1 60%,rgba(251,247,241,0) 100%)"></div>
  <div style="position:absolute;top:60px;left:16px;right:16px;z-index:11;display:flex;align-items:flex-end;justify-content:space-between">
    <div style="display:flex;flex-direction:column;gap:2px">
      <span style="font-size:13px;font-weight:500;color:#8A7E74">Saturday, Sep 6 · North Fontana</span>
      <span style="font-size:34px;font-weight:700;letter-spacing:-0.6px;line-height:41px;color:#1F1712">This weekend</span>
    </div>
    <div class="glass" style="width:44px;height:44px;border-radius:22px;display:flex;align-items:center;justify-content:center;color:#1F1712">{ico("sliders")}</div>
  </div>
  <div class="stack" style="position:absolute;top:128px;left:0;right:0;bottom:0;overflow:hidden;padding:0 16px;display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;gap:8px;overflow:hidden">
      <div class="chip" style="background:#2A1A10;color:#FFFFFF">Near me</div>
      <div class="chip" style="background:#FFFFFF;color:#1F1712;border:1px solid #E7DED4">Following</div>
      <div class="chip" style="background:#FFFFFF;color:#1F1712;border:1px solid #E7DED4">Photos</div>
      <div class="chip" style="background:#FFFFFF;color:#1F1712;border:1px solid #E7DED4">{ico("repeat","ico ico-sm")}Recurring</div>
    </div>
    {card("Sunrise Coffee &amp; Cars", "Sat 7:00 to 10:00am", "Victoria Gardens, Rancho Cucamonga", "4.2 mi", "42 going", "", "Today", "#E8871E", "#2A1A10")}
    {card("Inland Empire Euro Meet", "Sun 8:00am", "Ontario Mills west lot", "6.8 mi", "118 going", "v2", "Recurring", "#7C5CC4")}
    {card("Riverside Sunday Roll-In", "Sun 8:30am", "Canyon Crest Towne Centre", "18 mi", "31 going", "v3")}
  </div>
  {tabbar('feed')}
</div>'''

# ---------- Map ----------
ROADS = '''<svg viewBox="0 0 390 844" style="position:absolute;inset:0;width:100%;height:100%" preserveAspectRatio="none">
  <rect width="390" height="844" fill="#EFE9E0"/>
  <g fill="#E3EEDD"><rect x="30" y="120" width="120" height="90" rx="12"/><rect x="250" y="520" width="110" height="80" rx="12"/><rect x="60" y="600" width="90" height="70" rx="12"/></g>
  <g fill="#E6DCD0"><rect x="180" y="150" width="90" height="60" rx="4"/><rect x="200" y="380" width="70" height="50" rx="4"/><rect x="40" y="380" width="110" height="60" rx="4"/></g>
  <g stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round"><path d="M0 260h390M0 470h390M0 700h390M90 0v844M290 0v844M190 0v844"/></g>
  <g stroke="#FFFFFF" stroke-width="3" fill="none"><path d="M0 340h390M0 600h390M140 0v844M340 0v844M40 0v844"/></g>
  <g stroke="#F5D9A6" stroke-width="10" fill="none" stroke-linecap="round"><path d="M-10 90c120 40 180 120 240 260s80 260 170 380"/></g>
  <g stroke="#E8871E" stroke-width="3" fill="none" stroke-dasharray="10 8" opacity="0.5"><path d="M-10 90c120 40 180 120 240 260s80 260 170 380"/></g>
</svg>'''
def pin(x, y, color, icon='car', label='#FFFFFF', size=34, selected=False):
    ring = 'box-shadow:0 0 0 3px #FFFFFF,0 4px 12px rgba(42,26,16,0.35);' if selected else 'box-shadow:0 0 0 2px #FFFFFF,0 3px 8px rgba(42,26,16,0.28);'
    return f'<div style="position:absolute;left:{x}px;top:{y}px;width:{size}px;height:{size}px;border-radius:999px;background:{color};color:{label};display:flex;align-items:center;justify-content:center;{ring}transform:translate(-50%,-50%)">{ico(icon,"ico ico-sm","stroke-width:2.2")}</div>'
def cluster(x, y, n):
    return f'<div style="position:absolute;left:{x}px;top:{y}px;width:40px;height:40px;border-radius:999px;background:#2A1A10;color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;box-shadow:0 0 0 2px #FFFFFF,0 3px 8px rgba(42,26,16,0.28);transform:translate(-50%,-50%)">{n}</div>'

mapb = phone_open('#EFE9E0') + f'''
  {ROADS}
  <div style="position:absolute;left:150px;top:300px;width:180px;height:180px;border-radius:999px;background:rgba(232,135,30,0.10);border:1.5px solid rgba(232,135,30,0.45);transform:translate(-50%,-50%)"></div>
  <div style="position:absolute;left:150px;top:300px;width:18px;height:18px;border-radius:999px;background:#2C6BA3;border:3px solid #FFFFFF;box-shadow:0 0 0 6px rgba(44,107,163,0.2);transform:translate(-50%,-50%)"></div>
  {pin(212, 246, '#E8871E', 'car', '#2A1A10', 38, True)}
  {pin(96, 372, '#1E7A4A')}
  {pin(336, 128, '#4A8FCB')}
  {pin(250, 420, '#7C5CC4', 'repeat')}
  {pin(120, 560, '#4A8FCB')}
  {pin(330, 640, '#7C5CC4', 'repeat')}
  {cluster(60, 220, 3)}
  {cluster(320, 470, 5)}
  <div class="glass" style="position:absolute;left:212px;top:166px;transform:translateX(-50%);padding:8px 12px;border-radius:14px;display:flex;flex-direction:column;gap:1px;white-space:nowrap">
    <span style="font-size:13px;font-weight:600;color:#1F1712">Sunrise Coffee &amp; Cars</span>
    <span style="font-size:12px;color:#6B5F57">Today 7:00am · 4.2 mi · 42 going</span>
  </div>
  <div style="position:absolute;top:60px;right:16px;display:flex;flex-direction:column;gap:10px;z-index:12">
    <div class="glass" style="width:44px;height:44px;border-radius:22px;display:flex;align-items:center;justify-content:center;color:#1F1712">{ico("locate")}</div>
    <div class="glass" style="width:44px;height:44px;border-radius:22px;display:flex;align-items:center;justify-content:center;color:#1F1712">{ico("list")}</div>
  </div>
  <div style="position:absolute;top:60px;left:16px;z-index:12">
    <div class="glass" style="height:44px;padding:0 14px 0 12px;border-radius:22px;display:flex;align-items:center;gap:8px;color:#1F1712">{mark(24)}<span style="font-size:15px;font-weight:600">Inland Empire</span>{ico("chevdown","ico ico-sm","color:#8A7E74")}</div>
  </div>
  <div style="position:absolute;left:16px;right:16px;bottom:96px;z-index:20;display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;gap:8px">
      <div class="glass chip" style="height:32px;color:#1F1712">{ico("calendar","ico ico-sm")}This weekend</div>
      <div class="glass chip" style="height:32px;color:#1F1712">{ico("locate","ico ico-sm")}25 mi</div>
      <div class="glass chip" style="height:32px;color:#1F1712">{ico("car","ico ico-sm")}All cars</div>
    </div>
    <div class="glass" style="height:52px;border-radius:26px;display:flex;align-items:center;gap:10px;padding:0 10px 0 16px;color:#1F1712">
      {ico("search","ico","color:#6B5F57")}
      <span style="flex:1;font-size:17px;color:#6B5F57">Search meets, hosts, places</span>
      <div style="width:36px;height:36px;border-radius:18px;background:rgba(255,255,255,0.7);display:flex;align-items:center;justify-content:center;color:#1F1712">{ico("sliders","ico ico-sm")}</div>
    </div>
  </div>
  {tabbar('map')}
</div>'''

# ---------- List ----------
def row(title, when, where, dist, going, variant='', tag=None, tagcolor='#1E7A4A', tagtext='#fff'):
    tag_html = f'<div class="chip" style="background:{tagcolor};color:{tagtext};height:22px;padding:0 8px;font-size:11px">{tag}</div>' if tag else ''
    return f'''<div style="display:flex;gap:12px;padding:12px;background:#FFFFFF;border-radius:20px;box-shadow:0 2px 12px rgba(42,26,16,0.08)">
      {photo(variant, 'width:96px;height:96px;border-radius:14px;flex:none')}
      <div style="flex:1;display:flex;flex-direction:column;gap:4px;min-width:0">
        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:17px;font-weight:600;letter-spacing:-0.1px;line-height:22px">{title}</span>{tag_html}</div>
        <span style="font-size:14px;color:#1F1712;font-weight:500">{when}</span>
        <span style="font-size:14px;color:#6B5F57;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{where} · {dist}</span>
        <div style="margin-top:2px">{avatars(3, 22, going)}</div>
      </div>
    </div>'''

listb = phone_open() + f'''
  <div style="position:absolute;top:0;left:0;right:0;height:130px;z-index:10;background:linear-gradient(180deg,#FBF7F1 70%,rgba(251,247,241,0) 100%)"></div>
  <div style="position:absolute;top:60px;left:16px;right:16px;z-index:11;display:flex;align-items:center;justify-content:space-between">
    <div style="display:flex;flex-direction:column;gap:2px">
      <span style="font-size:13px;font-weight:500;color:#8A7E74">Within 25 mi · this weekend</span>
      <span style="font-size:28px;font-weight:700;letter-spacing:-0.4px;line-height:34px">14 meets</span>
    </div>
    <div class="glass" style="height:44px;padding:0 6px;border-radius:22px;display:flex;align-items:center;color:#1F1712">
      <div style="height:34px;padding:0 12px;border-radius:17px;background:#2A1A10;color:#FFFFFF;display:flex;align-items:center;font-size:13px;font-weight:600">Date</div>
      <div style="height:34px;padding:0 12px;border-radius:17px;display:flex;align-items:center;font-size:13px;font-weight:500;color:#6B5F57">Distance</div>
    </div>
  </div>
  <div class="stack" style="position:absolute;top:142px;left:0;right:0;bottom:0;overflow:hidden;padding:0 16px;display:flex;flex-direction:column;gap:10px">
    <span style="font-size:13px;font-weight:600;color:#8A7E74;text-transform:uppercase;letter-spacing:0.4px;padding:0 4px">Saturday</span>
    {row("Sunrise Coffee &amp; Cars", "7:00 to 10:00am", "Victoria Gardens", "4.2 mi", "42 going", "", "Today", "#E8871E", "#2A1A10")}
    {row("Fontana Foothill Meet", "8:00am", "Sierra Ave &amp; Foothill", "2.1 mi", "19 going", "v4")}
    <span style="font-size:13px;font-weight:600;color:#8A7E74;text-transform:uppercase;letter-spacing:0.4px;padding:8px 4px 0">Sunday</span>
    {row("Inland Empire Euro Meet", "8:00am", "Ontario Mills west lot", "6.8 mi", "118 going", "v2", "Weekly", "#7C5CC4")}
    {row("Riverside Sunday Roll-In", "8:30am", "Canyon Crest Towne Centre", "18 mi", "31 going", "v3")}
    {row("Chino Hills Cars &amp; Cortados", "9:00am", "The Shoppes at Chino Hills", "14 mi", "56 going", "v4")}
  </div>
  <div class="glass" style="position:absolute;left:50%;bottom:98px;transform:translateX(-50%);height:40px;padding:0 16px;border-radius:20px;display:flex;align-items:center;gap:6px;color:#1F1712;font-size:14px;font-weight:600;z-index:21">{ico("map","ico ico-sm")}Map</div>
  {tabbar('feed')}
</div>'''

# ---------- Event detail ----------
def meta(icon, main, sub=None, trailing=None):
    sub_html = f'<span style="font-size:13px;color:#6B5F57;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:270px">{sub}</span>' if sub else ''
    tr = f'<div style="margin-left:auto;color:#8A7E74">{ico(trailing,"ico ico-sm")}</div>' if trailing else ''
    return f'<div style="display:flex;align-items:center;gap:12px;padding:9px 16px"><div style="width:36px;height:36px;border-radius:12px;background:#F5EFE8;display:flex;align-items:center;justify-content:center;color:#A8590A">{ico(icon,"ico ico-sm")}</div><div style="display:flex;flex-direction:column;gap:1px"><span style="font-size:16px;font-weight:500">{main}</span>{sub_html}</div>{tr}</div>'

detail = phone_open() + f'''
  {photo('', 'position:absolute;top:0;left:0;right:0;height:320px', '<div class="scrim" style="height:200px"></div>')}
  <div style="position:absolute;top:56px;left:16px;right:16px;display:flex;justify-content:space-between;z-index:12">
    <div class="glass" style="width:44px;height:44px;border-radius:22px;display:flex;align-items:center;justify-content:center;color:#1F1712">{ico("back")}</div>
    <div class="glass" style="width:44px;height:44px;border-radius:22px;display:flex;align-items:center;justify-content:center;color:#1F1712">{ico("share")}</div>
  </div>
  <div style="position:absolute;top:222px;left:16px;right:16px;z-index:11;display:flex;flex-direction:column;gap:8px;color:#FFFFFF">
    <div style="display:flex;gap:8px"><div class="chip" style="background:#E8871E;color:#2A1A10;height:26px">Today</div><div class="chip glass-dark" style="height:26px;border-radius:999px">{ico("repeat","ico ico-sm")}Every Saturday</div></div>
    <span style="font-size:28px;font-weight:700;letter-spacing:-0.4px;line-height:34px">Sunrise Coffee &amp; Cars</span>
  </div>
  <div style="position:absolute;top:320px;left:0;right:0;bottom:0;background:#FBF7F1;overflow:hidden">
    <div style="display:flex;flex-direction:column;gap:0;padding:4px 0 0">
      {meta("clock","Saturday, Sep 6 · 7:00 to 10:00am","Starts in 14 hours","calendar")}
      {meta("pin","Victoria Gardens, north lot","12505 N Mainstreet, Rancho Cucamonga · 4.2 mi","directions")}
      {meta("person","Hosted by IE Sunrise Meets","2,140 followers · 3 meets a month","chev")}
    </div>
    <div style="margin:6px 16px 0;padding:14px 16px;background:#FFFFFF;border-radius:20px;box-shadow:0 2px 12px rgba(42,26,16,0.08);display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:17px;font-weight:600">Who's going</span><span style="font-size:14px;color:#A8590A;font-weight:600">See all</span></div>
      {avatars(6, 32, "42 going · 3 people you follow")}
    </div>
    <div style="margin:12px 16px 0;display:flex;flex-direction:column;gap:8px">
      <span style="font-size:16px;line-height:22px;color:#1F1712">Bring whatever you drive. Coffee from the Starbucks on Mainstreet, overflow parking by the theater. Please no burnouts leaving the lot.</span>
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#6B5F57">{ico("link","ico ico-sm")}<span>Imported from Evite · </span><a href="#">Open original</a></div>
    </div>
    <div style="margin:14px 0 0 16px;display:flex;gap:8px;overflow:hidden">
      {photo('v3','width:110px;height:110px;border-radius:14px;flex:none')}{photo('v2','width:110px;height:110px;border-radius:14px;flex:none')}{photo('v4','width:110px;height:110px;border-radius:14px;flex:none')}{photo('','width:110px;height:110px;border-radius:14px;flex:none')}
    </div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:150px;background:linear-gradient(180deg,rgba(251,247,241,0) 0%,#FBF7F1 60%);z-index:19"></div>
  <div style="position:absolute;left:16px;right:16px;bottom:18px;display:flex;gap:10px;z-index:20">
    <div class="glass" style="width:64px;height:64px;border-radius:32px;display:flex;align-items:center;justify-content:center;color:#1F1712">{ico("camera")}</div>
    <div class="glass" style="width:64px;height:64px;border-radius:32px;display:flex;align-items:center;justify-content:center;color:#1F1712">{ico("bubble")}</div>
    <div class="glass-amber" style="flex:1;height:64px;border-radius:32px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:700">{ico("check_c","ico","stroke-width:2.2")}I'm going</div>
  </div>
</div>'''

# ---------- Create from link (two states in one artboard) ----------
def field(label, value, conf, hint=None, multiline=False):
    styles = {'high': ('#E3F5EA', '#1E7A4A', 'seal', 'Sure'), 'mid': ('#FFF4D6', '#8A5A00', 'question', 'Check'), 'low': ('#FDE7E8', '#C1272D', 'warn', 'Guess')}
    bg, fg, icon, text = styles[conf]
    border = '#E7DED4' if conf == 'high' else fg
    hint_html = f'<span style="font-size:12px;color:{fg}">{hint}</span>' if hint else ''
    return f'''<div style="display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:13px;font-weight:600;color:#6B5F57">{label}</span><div class="chip" style="background:{bg};color:{fg};height:24px;padding:0 8px">{ico(icon,"ico ico-sm","width:14px;height:14px")}{text}</div></div>
      <div style="padding:{'12px 14px' if multiline else '0 14px'};min-height:{'auto' if multiline else '48px'};display:flex;align-items:center;background:#FFFFFF;border:1.5px solid {border};border-radius:14px;font-size:16px;line-height:22px;color:#1F1712">{value}</div>
      {hint_html}
    </div>'''

def sheet_header(title, step):
    return f'''<div style="display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:56px">
      <span style="font-size:15px;font-weight:500;color:#A8590A">Cancel</span>
      <div style="display:flex;flex-direction:column;align-items:center"><span style="font-size:17px;font-weight:600">{title}</span><span style="font-size:12px;color:#8A7E74">{step}</span></div>
      <span style="font-size:15px;font-weight:500;color:#B3A79D;width:46px;text-align:right"></span>
    </div>'''

create_step1 = phone_open('#2A2320') + f'''
  <div style="position:absolute;inset:0;opacity:0.35">{photo('v3','position:absolute;inset:0')}</div>
  <div style="position:absolute;left:0;right:0;top:64px;bottom:0;background:#FBF7F1;border-radius:32px 32px 0 0;box-shadow:0 -8px 32px rgba(0,0,0,0.3);overflow:hidden">
    <div style="width:36px;height:5px;border-radius:3px;background:#D8CFC4;margin:8px auto 0"></div>
    {sheet_header("New meet", "Step 1 of 2")}
    <div class="stack" style="padding:8px 16px 0;display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;flex-direction:column;gap:4px"><span style="font-size:22px;font-weight:700;letter-spacing:-0.2px">Paste a link</span><span style="font-size:15px;color:#6B5F57;line-height:20px">Already posted it somewhere? We'll pull in the details so you don't type them twice.</span></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;align-items:center;gap:10px;height:52px;padding:0 14px;background:#FFFFFF;border:1.5px solid #E8871E;border-radius:16px;box-shadow:0 0 0 4px rgba(232,135,30,0.15)">{ico("link","ico ico-sm","color:#A8590A")}<span style="flex:1;font-size:15px;color:#1F1712;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">https://www.evite.com/event/0179ZSUNRISE7AM</span><div style="width:28px;height:28px;border-radius:14px;background:#F5EFE8;display:flex;align-items:center;justify-content:center;color:#6B5F57">{ico("x","ico ico-sm","width:14px;height:14px")}</div></div>
        <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:#1E7A4A;font-weight:500">{ico("check_c","ico ico-sm","width:16px;height:16px")}Evite link recognized</div>
      </div>
      <div style="height:56px;border-radius:28px;background:#E8871E;color:#2A1A10;display:flex;align-items:center;justify-content:center;gap:8px;font-size:17px;font-weight:700">{ico("sparkle","ico","stroke-width:2")}Import details</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
        <span style="font-size:13px;font-weight:600;color:#8A7E74;text-transform:uppercase;letter-spacing:0.4px">Works with</span>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <div class="chip" style="background:#FFFFFF;border:1px solid #E7DED4;color:#1F1712">Evite</div>
          <div class="chip" style="background:#FFFFFF;border:1px solid #E7DED4;color:#1F1712">Eventbrite</div>
          <div class="chip" style="background:#FFFFFF;border:1px solid #E7DED4;color:#1F1712">Meetup</div>
          <div class="chip" style="background:#FFFFFF;border:1px solid #E7DED4;color:#1F1712">Facebook Events</div>
          <div class="chip" style="background:#FFFFFF;border:1px solid #E7DED4;color:#1F1712">Instagram post</div>
          <div class="chip" style="background:#FFFFFF;border:1px solid #E7DED4;color:#1F1712">Partiful</div>
          <div class="chip" style="background:#FFFFFF;border:1px solid #E7DED4;color:#1F1712">{ico("camera","ico ico-sm","width:14px;height:14px")}Flyer photo</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:4px"><div style="flex:1;height:1px;background:#E7DED4"></div><span style="font-size:13px;color:#8A7E74">or</span><div style="flex:1;height:1px;background:#E7DED4"></div></div>
      <div style="height:52px;border-radius:26px;border:1.5px solid #E7DED4;background:#FFFFFF;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:#1F1712">Fill it in by hand</div>
    </div>
  </div>
</div>'''

create_step2 = phone_open('#2A2320') + f'''
  <div style="position:absolute;inset:0;opacity:0.35">{photo('v3','position:absolute;inset:0')}</div>
  <div style="position:absolute;left:0;right:0;top:64px;bottom:0;background:#FBF7F1;border-radius:32px 32px 0 0;box-shadow:0 -8px 32px rgba(0,0,0,0.3);overflow:hidden">
    <div style="width:36px;height:5px;border-radius:3px;background:#D8CFC4;margin:8px auto 0"></div>
    {sheet_header("Review draft", "Step 2 of 2")}
    <div class="stack" style="padding:4px 16px 0;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#FFFFFF;border-radius:14px;border:1px solid #E7DED4">{ico("link","ico ico-sm","color:#A8590A")}<div style="display:flex;flex-direction:column;flex:1;min-width:0"><span style="font-size:13px;font-weight:600">Imported from Evite</span><span style="font-size:12px;color:#8A7E74;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">evite.com/event/0179ZSUNRISE7AM · 6 of 7 fields found</span></div></div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:13px;font-weight:600;color:#6B5F57">Cover photo</span><div class="chip" style="background:#E3F5EA;color:#1E7A4A;height:24px;padding:0 8px">{ico("seal","ico ico-sm","width:14px;height:14px")}Sure</div></div>
        {photo('', 'height:96px;border-radius:14px', '<div class="glass" style="position:absolute;right:10px;bottom:10px;height:30px;padding:0 10px;border-radius:15px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#1F1712"><svg class="ico ico-sm" viewBox="0 0 24 24" style="width:14px;height:14px">' + I['photo'] + '</svg>Change</div>')}
      </div>
      {field("Title", "Sunrise Coffee &amp; Cars", "high")}
      {field("Date and time", "Sat, Sep 6 · 7:00 to 10:00am", "high")}
      {field("Location", "Victoria Gardens, Rancho Cucamonga", "mid", "Evite said &quot;VG north lot by Starbucks&quot;. We matched a place; tap to adjust the pin.")}
      {field("Host", "IE Sunrise Meets", "high")}
      {field("Repeats", "Every Saturday", "low", "Guessed from &quot;see you every week!&quot; in the description.")}
    </div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(180deg,rgba(251,247,241,0) 0%,#FBF7F1 55%)"></div>
    <div style="position:absolute;left:16px;right:16px;bottom:18px;display:flex;flex-direction:column;gap:8px;align-items:center">
      <div style="width:100%;height:56px;border-radius:28px;background:#E8871E;color:#2A1A10;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700">Post meet</div>
      <span style="font-size:12px;color:#8A7E74">Looks right? Fix anything we got wrong, then post.</span>
    </div>
  </div>
</div>'''

create = f'''<div style="display:flex;gap:60px;padding:0;background:#FBF7F1;width:840px;height:844px;position:relative">
  <div style="position:relative;width:390px;height:844px;overflow:hidden">{create_step1}</div>
  <div style="position:relative;width:390px;height:844px;overflow:hidden">{create_step2}</div>
  <div style="position:absolute;left:390px;top:400px;width:60px;display:flex;align-items:center;justify-content:center;color:#B3A79D">{ico("chev","ico","width:28px;height:28px")}</div>
</div>'''

# ---------- Landing (desktop web) ----------
def nav_link(t): return f'<span style="font-size:15px;font-weight:500;color:#1F1712">{t}</span>'
def step(n, title, body, icon):
    return f'''<div style="display:flex;flex-direction:column;gap:14px;padding:28px;background:#FFFFFF;border-radius:24px;box-shadow:0 2px 12px rgba(42,26,16,0.06)">
      <div style="width:48px;height:48px;border-radius:16px;background:#FDF0DC;color:#A8590A;display:flex;align-items:center;justify-content:center">{ico(icon)}</div>
      <span style="font-size:13px;font-weight:600;color:#8A7E74;letter-spacing:0.4px;text-transform:uppercase">Step {n}</span>
      <span style="font-size:22px;font-weight:700;letter-spacing:-0.3px;line-height:28px">{title}</span>
      <span style="font-size:16px;line-height:24px;color:#6B5F57;text-wrap:pretty">{body}</span>
    </div>'''

landing = f'''<div style="width:1440px;min-height:1900px;background:#FBF7F1;position:relative;overflow:hidden">
  <div style="position:absolute;top:-220px;right:-160px;width:760px;height:760px;border-radius:999px;background:radial-gradient(circle, rgba(245,184,101,0.55) 0%, rgba(245,184,101,0) 65%)"></div>
  <div style="position:absolute;top:24px;left:50%;transform:translateX(-50%);width:1120px;z-index:10">
    <div class="glass" style="height:64px;border-radius:32px;display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 20px">
      <div style="display:flex;align-items:center;gap:10px">{mark(32)}<span style="font-size:18px;font-weight:700;letter-spacing:-0.3px">Cars <span style="color:#E8871E">&amp;</span> Coffee</span></div>
      <div style="display:flex;align-items:center;gap:32px">{nav_link("Find a meet")}{nav_link("Hosts")}{nav_link("Add your meet")}</div>
      <div style="height:44px;padding:0 18px;border-radius:22px;background:#2A1A10;color:#FFFFFF;display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600">{ico("apple","ico ico-sm")}Get the app</div>
    </div>
  </div>
  <div style="position:absolute;top:150px;left:50%;transform:translateX(-50%);width:1120px;display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:64px;align-items:center">
    <div style="display:flex;flex-direction:column;gap:28px;padding-top:40px">
      <div class="chip" style="align-self:flex-start;background:#FDF0DC;color:#A8590A;height:32px;padding:0 14px;font-size:13px">{ico("pin","ico ico-sm")}Inland Empire · OC · LA</div>
      <h1 style="margin:0;font-size:64px;font-weight:700;letter-spacing:-2px;line-height:68px;color:#1F1712;text-wrap:balance">Find your Saturday morning.</h1>
      <p style="margin:0;font-size:20px;line-height:30px;color:#6B5F57;max-width:520px;text-wrap:pretty">Every local car meet, on one map. Coffee meetups from Fontana to Irvine, from Miatas to McLarens. Browse without an account.</p>
      <div style="display:flex;align-items:center;gap:14px">
        <div style="height:56px;padding:0 22px;border-radius:28px;background:#2A1A10;color:#FFFFFF;display:flex;align-items:center;gap:10px;font-size:17px;font-weight:600;white-space:nowrap">{ico("apple")}Download on the App Store</div>
        <a href="#" style="font-size:17px;font-weight:600;color:#A8590A;display:flex;align-items:center;gap:4px;white-space:nowrap">Browse meets on the web{ico("chev","ico ico-sm")}</a>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:8px">{avatars(5, 32)}<span style="font-size:15px;color:#6B5F57">[GOING COUNT] people going this weekend</span></div>
    </div>
    <div style="position:relative;height:720px;display:flex;align-items:center;justify-content:center">
      <div style="width:360px;height:700px;border-radius:52px;background:#1E1917;padding:12px;box-shadow:0 30px 80px rgba(42,26,16,0.35)">
        <div style="width:100%;height:100%;border-radius:42px;overflow:hidden;position:relative;background:#EFE9E0">
          <div style="position:absolute;inset:0;transform:scale(0.865);transform-origin:top left;width:390px;height:784px">{mapb.replace('height:844px','height:784px',1)}</div>
        </div>
      </div>
    </div>
  </div>
  <div style="position:absolute;top:960px;left:50%;transform:translateX(-50%);width:1120px;display:flex;flex-direction:column;gap:32px">
    <div style="display:flex;flex-direction:column;gap:10px;max-width:640px">
      <span style="font-size:13px;font-weight:600;color:#A8590A;letter-spacing:0.4px;text-transform:uppercase">For hosts</span>
      <h2 style="margin:0;font-size:40px;font-weight:700;letter-spacing:-1px;line-height:46px">Already posted your meet? Paste the link.</h2>
      <p style="margin:0;font-size:18px;line-height:28px;color:#6B5F57;text-wrap:pretty">Keep organizing on Evite, Instagram, or Facebook. We read the link, draft the listing, and send people back to your original post.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:20px">
      {step(1, "Paste a link", "Evite, Eventbrite, Meetup, Facebook Events, Instagram, Partiful, or a photo of the flyer.", "link")}
      {step(2, "Check the draft", "Title, time, place, and host come in with a confidence tag on each. Fix what we got wrong in a tap.", "seal")}
      {step(3, "Post it", "Your meet shows up on the map and in feeds nearby, with a link back to where you posted it first.", "pin")}
    </div>
  </div>
  <div style="position:absolute;top:1480px;left:50%;transform:translateX(-50%);width:1120px;display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:20px">
    <div style="grid-column:span 1;padding:28px;border-radius:24px;background:#2A1A10;color:#F5EFE8;display:flex;flex-direction:column;gap:16px;justify-content:space-between;min-height:260px">
      {mark(40, '#F5EFE8', '#2A1A10')}
      <div style="display:flex;flex-direction:column;gap:8px"><span style="font-size:24px;font-weight:700;letter-spacing:-0.4px;line-height:30px">Bring whatever you drive.</span><span style="font-size:15px;line-height:22px;color:#B3A79D">Daily beaters, project cars, and the occasional supercar park in the same lot here.</span></div>
    </div>
    <div style="grid-column:span 2;border-radius:24px;overflow:hidden;position:relative;min-height:260px">{photo('v2','position:absolute;inset:0','<div class="scrim" style="height:140px"></div><div style="position:absolute;left:24px;bottom:22px;color:#FFFFFF;display:flex;flex-direction:column;gap:4px"><span style="font-size:22px;font-weight:700;letter-spacing:-0.3px">Sunrise Coffee &amp; Cars</span><span style="font-size:15px;opacity:0.85">Victoria Gardens · Every Saturday 7 to 10am</span></div>')}</div>
  </div>
  <div style="position:absolute;top:1800px;left:50%;transform:translateX(-50%);width:1120px;display:flex;align-items:center;justify-content:space-between;padding-top:28px;border-top:1px solid #E7DED4">
    <div style="display:flex;align-items:center;gap:8px">{mark(24)}<span style="font-size:14px;font-weight:600">Cars &amp; Coffee</span><span style="font-size:14px;color:#8A7E74">· Built in Fontana, CA</span></div>
    <div style="display:flex;gap:24px;font-size:14px;color:#6B5F57"><span>Add your meet</span><span>Hosts</span><span>Privacy</span><span>Contact</span></div>
  </div>
</div>'''

files = {
  'Main.dc.html': wrap(feed),
  'Map.dc.html': wrap(mapb, '#EFE9E0'),
  'List.dc.html': wrap(listb),
  'EventDetail.dc.html': wrap(detail),
  'CreateFromLink.dc.html': wrap(create),
  'Landing.dc.html': wrap(landing),
}
for name, src in files.items():
    with open(os.path.join(OUT, name), 'w') as f: f.write(src)

canvas = {
  "artboards": [
    {"file": "Main.dc.html", "title": "Feed", "x": 0, "y": 0, "w": 390, "h": 844},
    {"file": "Map.dc.html", "title": "Map", "x": 480, "y": 0, "w": 390, "h": 844},
    {"file": "List.dc.html", "title": "List", "x": 960, "y": 0, "w": 390, "h": 844},
    {"file": "EventDetail.dc.html", "title": "Event detail", "x": 1440, "y": 0, "w": 390, "h": 844},
    {"file": "CreateFromLink.dc.html", "title": "Create from link", "x": 1920, "y": 0, "w": 840, "h": 844},
    {"file": "Landing.dc.html", "title": "Web landing", "x": 0, "y": 1000, "w": 1440, "h": 1900},
  ],
  "annotations": [
    {"id": "brand-note", "x": 0, "y": -170, "w": 420, "text": "Cars and Coffee, iOS 26 Liquid Glass.\\nAmber #E8871E on warm cream #FBF7F1, espresso #2A1A10 ink.\\nGlass is the nav layer; content runs edge-to-edge underneath. Inter stands in for SF Pro. No status bar drawn (the real one renders on top)."},
    {"id": "create-note", "x": 1920, "y": -110, "w": 380, "text": "Create flow: paste an Evite URL, then review the draft. Each field carries a confidence chip: Sure (green), Check (amber), Guess (red)."}
  ],
  "launch": {"view": "canvas"}
}
with open(os.path.join(OUT, 'canvas.json'), 'w') as f: json.dump(canvas, f, indent=2)
print('wrote', list(files) + ['canvas.json'])
