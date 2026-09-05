"""Curb Social Club palette source of truth + WCAG 2.1 contrast checks.

Run:  python3 palette.py            -> prints failing pairs and full tables
      python3 palette.py --md       -> prints markdown contrast tables
      python3 palette.py --json     -> writes tokens.json to brand-v2 and the package
"""
import json, sys, os

# --------------------------------------------------------------------------
# Themes. Every color has a role. Roles are identical across themes/schemes.
# --------------------------------------------------------------------------
THEMES = {
  "marine-layer": {
    "name": "Marine Layer",
    "story": "Fog white, overcast grey, wet-asphalt charcoal, muted slate blue, one oxblood accent.",
    "light": {
      "bg":            "#F3F4F4",   # fog white
      "surface":       "#F9FAFA",   # lifted fog
      "surfaceRaised": "#FFFFFF",   # sheet white
      "border":        "#D5D9DB",   # overcast grey hairline
      "textPrimary":   "#23272A",   # wet asphalt
      "textSecondary": "#5C6469",   # slate grey
      "accent":        "#5E2A2E",   # oxblood
      "accentInk":     "#F3F4F4",   # fog on oxblood
      "link":          "#3C5A70",   # muted slate blue
      "success":       "#2E6B51",
      "warning":       "#805518",   # tobacco
      "error":         "#A33A31",
      "pinNow":        "#2E6B51",
      "pinToday":      "#5E2A2E",
      "pinUpcoming":   "#48677D",
      "pinRecurring":  "#5E5B7A",
      "pinPast":       "#7E8588",
      "pinCluster":    "#23272A",
      "pinLabel":      "#FFFFFF",
      "glassTint":     "#F3F4F4A6",  # fog white at 65%
      "scrim":         "#23272A40",
    },
    "dark": {
      "bg":            "#15181A",   # wet asphalt at night
      "surface":       "#1E2225",
      "surfaceRaised": "#272C30",
      "border":        "#363C41",
      "textPrimary":   "#EDEFF0",   # fog
      "textSecondary": "#A2A9AE",
      "accent":        "#C98C8E",   # oxblood lifted for dark
      "accentInk":     "#15181A",
      "link":          "#8FB0C6",   # slate blue lifted
      "success":       "#7FBB9C",
      "warning":       "#D2A868",
      "error":         "#DE8F86",
      "pinNow":        "#7FBB9C",
      "pinToday":      "#C98C8E",
      "pinUpcoming":   "#8FB0C6",
      "pinRecurring":  "#A9A4C9",
      "pinPast":       "#6C7478",
      "pinCluster":    "#EDEFF0",
      "pinLabel":      "#15181A",
      "glassTint":     "#15181AA6",
      "scrim":         "#00000059",
    },
  },
  "harbor": {
    "name": "Harbor",
    "story": "Deep navy, bone white, warm sand, an old-brass accent.",
    "light": {
      "bg":            "#F4F0E7",   # bone white
      "surface":       "#FAF7F0",
      "surfaceRaised": "#FFFDF8",
      "border":        "#DDD3C1",   # warm sand
      "textPrimary":   "#16223A",   # deep navy
      "textSecondary": "#5A6272",
      "accent":        "#7A5A1E",   # old brass
      "accentInk":     "#F4F0E7",
      "link":          "#2F4E7A",   # harbor blue
      "success":       "#2F6A4E",
      "warning":       "#875416",
      "error":         "#A63A30",
      "pinNow":        "#2F6A4E",
      "pinToday":      "#7A5A1E",
      "pinUpcoming":   "#2F4E7A",
      "pinRecurring":  "#5E5679",
      "pinPast":       "#867F72",
      "pinCluster":    "#16223A",
      "pinLabel":      "#FFFFFF",
      "glassTint":     "#F4F0E7A6",
      "scrim":         "#16223A40",
    },
    "dark": {
      "bg":            "#0F1A2B",   # deep navy
      "surface":       "#172438",
      "surfaceRaised": "#203047",
      "border":        "#2F3F57",
      "textPrimary":   "#F1ECE1",   # bone
      "textSecondary": "#A7AEBC",
      "accent":        "#CBA55B",   # brass
      "accentInk":     "#0F1A2B",
      "link":          "#8FB4E0",
      "success":       "#7FBB9C",
      "warning":       "#D8AC5E",
      "error":         "#E08E84",
      "pinNow":        "#7FBB9C",
      "pinToday":      "#CBA55B",
      "pinUpcoming":   "#8FB4E0",
      "pinRecurring":  "#ABA4CD",
      "pinPast":       "#6B7382",
      "pinCluster":    "#F1ECE1",
      "pinLabel":      "#0F1A2B",
      "glassTint":     "#0F1A2BA6",
      "scrim":         "#00000059",
    },
  },
  "olive-ivory": {
    "name": "Olive and Ivory",
    "story": "Sage-olive, ivory, stone grey, a burnt-sienna accent.",
    "light": {
      "bg":            "#F3F0E5",   # ivory
      "surface":       "#F9F7EE",
      "surfaceRaised": "#FFFEF7",
      "border":        "#D8D4C6",   # stone
      "textPrimary":   "#22261E",   # olive black
      "textSecondary": "#5C6156",
      "accent":        "#8A3D1F",   # burnt sienna
      "accentInk":     "#F3F0E5",
      "link":          "#4B5E3E",   # sage olive
      "success":       "#356A48",
      "warning":       "#84561A",
      "error":         "#A3382E",
      "pinNow":        "#356A48",
      "pinToday":      "#8A3D1F",
      "pinUpcoming":   "#4B5E3E",
      "pinRecurring":  "#5F5A78",
      "pinPast":       "#84837A",
      "pinCluster":    "#22261E",
      "pinLabel":      "#FFFFFF",
      "glassTint":     "#F3F0E5A6",
      "scrim":         "#22261E40",
    },
    "dark": {
      "bg":            "#191C15",
      "surface":       "#22261D",
      "surfaceRaised": "#2C3127",
      "border":        "#3B4134",
      "textPrimary":   "#EFECE1",   # ivory
      "textSecondary": "#A8AB9E",
      "accent":        "#D9946E",   # sienna lifted
      "accentInk":     "#191C15",
      "link":          "#A9B98F",   # sage lifted
      "success":       "#84BB99",
      "warning":       "#D4A961",
      "error":         "#DE8F86",
      "pinNow":        "#84BB99",
      "pinToday":      "#D9946E",
      "pinUpcoming":   "#A9B98F",
      "pinRecurring":  "#ADA6CC",
      "pinPast":       "#6E7268",
      "pinCluster":    "#EFECE1",
      "pinLabel":      "#191C15",
      "glassTint":     "#191C15A6",
      "scrim":         "#00000059",
    },
  },
}

ROLE_DESC = {
  "bg": "Page background",
  "surface": "Cards, list rows, flat content surface",
  "surfaceRaised": "Sheets, menus, popovers (raised by tone, not shadow)",
  "border": "1px hairline rules and dividers",
  "textPrimary": "Body, titles, icons",
  "textSecondary": "Metadata, captions, placeholders",
  "accent": "The one action per screen, selected states, today pin",
  "accentInk": "Text and icons on accent fills",
  "link": "Inline links, upcoming pin",
  "success": "Confirmed, live now",
  "warning": "Check this, medium confidence",
  "error": "Failed, low confidence",
  "pinNow": "Map pin: happening right now",
  "pinToday": "Map pin: later today",
  "pinUpcoming": "Map pin: this week or later",
  "pinRecurring": "Map pin: weekly or monthly series",
  "pinPast": "Map pin: ended, photos only",
  "pinCluster": "Map cluster count badge",
  "pinLabel": "Glyph or count on any pin",
  "glassTint": "Tint applied to Liquid Glass nav layer (hex8, alpha)",
  "scrim": "Overlay under text on photos (hex8, alpha)",
}

# --------------------------------------------------------------------------
# WCAG 2.1
# --------------------------------------------------------------------------
def hex_to_rgb(h):
    h = h.lstrip("#")[:6]
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def lum(h):
    def ch(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = hex_to_rgb(h)
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)

def contrast(fg, bg):
    l1, l2 = lum(fg), lum(bg)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)

def pairs(p):
    """(label, fg, bg, min_ratio). Body text 4.5, large text and UI 3.0."""
    out = []
    for s in ("bg", "surface", "surfaceRaised"):
        out.append((f"Text primary on {s}", "textPrimary", s, 4.5))
        out.append((f"Text secondary on {s}", "textSecondary", s, 4.5))
        out.append((f"Link on {s}", "link", s, 4.5))
        out.append((f"Accent as text on {s}", "accent", s, 4.5))
        out.append((f"Success text on {s}", "success", s, 4.5))
        out.append((f"Warning text on {s}", "warning", s, 4.5))
        out.append((f"Error text on {s}", "error", s, 4.5))
    out.append(("Accent ink on accent (button)", "accentInk", "accent", 4.5))
    out.append(("Border on bg (non-text, 1px rule)", "border", "bg", 1.2))
    for pin in ("pinNow", "pinToday", "pinUpcoming", "pinRecurring", "pinPast", "pinCluster"):
        out.append((f"Pin label on {pin}", "pinLabel", pin, 3.0))
        out.append((f"{pin} against bg (UI component)", pin, "bg", 3.0))
    return out

def check(verbose=True):
    fails = []
    for tkey, t in THEMES.items():
        for scheme in ("light", "dark"):
            p = t[scheme]
            for label, fg, bg, need in pairs(p):
                r = contrast(p[fg], p[bg])
                ok = r >= need
                if not ok:
                    fails.append((tkey, scheme, label, p[fg], p[bg], round(r, 2), need))
                if verbose:
                    print(f"{tkey:13s} {scheme:5s} {label:44s} {p[fg]} on {p[bg]}  {r:5.2f}  {'ok' if ok else 'FAIL'}")
    return fails

def md_tables():
    lines = []
    for tkey, t in THEMES.items():
        for scheme in ("light", "dark"):
            p = t[scheme]
            lines.append(f"\n#### {t['name']}, {scheme}\n")
            lines.append("| Pair | Foreground | Background | Ratio | Needs | Result |")
            lines.append("| --- | --- | --- | --- | --- | --- |")
            for label, fg, bg, need in pairs(p):
                if need < 3.0:
                    continue
                r = contrast(p[fg], p[bg])
                res = "AA" if r >= need else "FAIL"
                if need == 3.0 and r >= 4.5:
                    res = "AA"
                lines.append(f"| {label} | {p[fg]} | {p[bg]} | {r:.2f} | {need:.1f} | {res} |")
    return "\n".join(lines)

def md_palette_tables():
    lines = []
    for tkey, t in THEMES.items():
        lines.append(f"\n### {t['name']} (`{tkey}`)\n")
        lines.append(t["story"] + "\n")
        lines.append("| Role | Light | Dark | Use |")
        lines.append("| --- | --- | --- | --- |")
        for role in ROLE_DESC:
            lines.append(f"| {role} | {t['light'][role]} | {t['dark'][role]} | {ROLE_DESC[role]} |")
    return "\n".join(lines)

# --------------------------------------------------------------------------
# Tokens
# --------------------------------------------------------------------------
TYPOGRAPHY = {
  "families": {
    "display": {"$value": "Instrument Serif", "$type": "fontFamily", "fallback": ["Fraunces", "Georgia", "Times New Roman", "serif"], "source": "Google Fonts / github.com/Instrument/instrument-serif (OFL)"},
    "ui":      {"$value": "Geist", "$type": "fontFamily", "fallback": ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"], "source": "npm geist / vercel/geist-font (OFL)"},
    "system":  {"$value": "SF Pro", "$type": "fontFamily", "fallback": ["-apple-system"], "note": "iOS system chrome (tab bar, toolbars, alerts, sheets) under Liquid Glass. Never overridden."},
    "mono":    {"$value": "Geist Mono", "$type": "fontFamily", "fallback": ["SF Mono", "Menlo", "monospace"]}
  },
  "scale": {
    "display":  {"family": "display", "size": 40, "lineHeight": 44, "tracking": -0.4, "weight": 400, "ios": "largeTitle (custom font)", "use": "Feed masthead ('This weekend'), onboarding"},
    "title":    {"family": "display", "size": 28, "lineHeight": 32, "tracking": -0.2, "weight": 400, "ios": "title (custom font)", "use": "Event name on detail, host page name"},
    "headline": {"family": "display", "size": 22, "lineHeight": 26, "tracking": 0,    "weight": 400, "ios": "title2 (custom font)", "use": "Card titles, section headers"},
    "subhead":  {"family": "ui", "size": 15, "lineHeight": 20, "tracking": 0, "weight": 500, "ios": "subheadline", "use": "Buttons, list titles, tab labels"},
    "body":     {"family": "ui", "size": 16, "lineHeight": 24, "tracking": 0, "weight": 400, "ios": "body", "use": "Descriptions, comments"},
    "caption":  {"family": "ui", "size": 12, "lineHeight": 16, "tracking": 0.2, "weight": 500, "ios": "caption", "use": "Metadata, chips, timestamps"},
    "plate":    {"family": "ui", "size": 13, "lineHeight": 16, "tracking": 0.6, "weight": 500, "ios": "footnote", "features": ["tnum", "case"], "transform": "uppercase", "use": "Times, distances, dates. Tabular figures, uppercase, tracked. 'SAT 7:30 AM', '4.2 MI'"},
    "label":    {"family": "ui", "size": 11, "lineHeight": 14, "tracking": 0.8, "weight": 500, "ios": "caption2", "features": ["case"], "transform": "uppercase", "use": "Small caps labels: 'SOCIAL CLUB', section eyebrows"}
  },
  "features": {"ui": ["ss01", "tnum"], "display": ["liga"]}
}

SPACING = {"0": 0, "1": 4, "2": 8, "3": 12, "4": 16, "5": 20, "6": 24, "8": 32, "10": 40, "12": 48, "16": 64, "20": 80, "24": 96,
           "gutter": 20, "pageMax": 1120, "readingMax": 640, "tabBarInset": 88, "bottomSearchInset": 156}

RADIUS = {"none": 0, "hairline": 1, "sm": 6, "md": 10, "lg": 14, "card": 14, "sheet": 20, "pill": 999,
          "note": "Content corners are small. Only Liquid Glass containers (system) use large radii."}

GLASS = {
  "principle": "Glass is the navigation layer only. Content is flat.",
  "material": {"ios": ".regular", "web": "backdrop-filter: blur(20px) saturate(1.1)"},
  "blur": 20,
  "saturate": 1.1,
  "tintAlpha": 0.65,
  "tintRole": "glassTint",
  "scrimRole": "scrim",
  "hairline": {"width": 1, "role": "border", "alphaOnGlass": 0.35},
  "shadow": {"allowed": "hairline only", "value": "0 0 0 1px {border}", "note": "No drop shadows heavier than a 1px hairline anywhere in content."},
  "textOnGlass": "textPrimary with system vibrancy; over photos always add scrim."
}

def tokens():
    themes = {}
    for tkey, t in THEMES.items():
        themes[tkey] = {"name": t["name"], "story": t["story"]}
        for scheme in ("light", "dark"):
            themes[tkey][scheme] = {role: {"$value": hexv, "$type": "color", "$description": ROLE_DESC[role]} for role, hexv in t[scheme].items()}
    return {
      "meta": {
        "name": "Curb Social Club design tokens",
        "brand": {"legal": "Curb Social Club", "common": "Curb Social", "app": "curb"},
        "version": "2.0.0",
        "date": "2026-09-05",
        "defaultTheme": "marine-layer",
        "format": "Flat W3C-style tokens. themes.<theme>.<light|dark>.<role> = {$value,$type}. Hex8 values carry alpha.",
        "themes": list(THEMES.keys()),
        "schemes": ["light", "dark"],
        "roles": list(ROLE_DESC.keys()),
        "contrast": "Every text-on-surface pair >= 4.5:1, every pin label and accent-ink pair >= 3:1 (most >= 4.5). See brand-guide.md section 5."
      },
      "themes": themes,
      "typography": TYPOGRAPHY,
      "spacing": SPACING,
      "radius": RADIUS,
      "glass": GLASS,
    }

if __name__ == "__main__":
    if "--md" in sys.argv:
        print(md_palette_tables()); print(md_tables()); sys.exit()
    if "--json" in sys.argv:
        out = tokens()
        for path in ["/home/claude/cac/brand-v2/tokens.json", "/home/claude/cac/cars-and-coffee/packages/design-tokens/tokens.json"]:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w") as f:
                json.dump(out, f, indent=2)
            print("wrote", path)
        sys.exit()
    fails = check(verbose="-q" not in sys.argv)
    print("\nFAILS:", len(fails))
    for f in fails:
        print("  ", f)
