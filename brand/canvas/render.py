#!/usr/bin/env python3
"""Renders 2x PNG previews of every artboard listed in canvas.json with Playwright.
Google Fonts requests are blocked so the local Instrument Serif and Geist TTFs render."""
import json, os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(HERE), 'previews')
os.makedirs(OUT, exist_ok=True)
canvas = json.load(open(os.path.join(HERE, 'canvas.json')))
only = set(sys.argv[2:])
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    for ab in canvas['artboards']:
        stem = ab['file'].replace('.dc.html', '')
        if only and stem not in only: continue
        ctx = browser.new_context(viewport={'width': ab['w'], 'height': ab['h']}, device_scale_factor=2)
        page = ctx.new_page()
        page.route('**/*', lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())
        page.goto('file://' + os.path.join(HERE, ab['file']), wait_until='domcontentloaded')
        page.evaluate('document.fonts.ready')
        page.wait_for_timeout(400)
        out = os.path.join(OUT, f'{stem}.png')
        page.screenshot(path=out, clip={'x': 0, 'y': 0, 'width': ab['w'], 'height': ab['h']})
        print('rendered', out)
        ctx.close()
    browser.close()
