#!/usr/bin/env python3
"""Builds the committed font subsets in packages/design-tokens/fonts/.

Run with: pnpm --filter @curb/design-tokens fonts (needs python3, fonttools,
brotli). Downloads the OFL sources from the Google Fonts repo, instances the
Geist variable font at the three UI weights, and subsets everything with the
unicode ranges and layout features from docs/specs/design-system-and-theming.md
(Data section). The outputs (.ttf for mobile, .woff2 for web) are committed so
CI and app builds never need Python; rerun only when a font version changes.
Instrument Serif Italic is deliberately absent (R-11).
"""

import io
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

UNICODES = "U+0020-007E,U+00A0-00FF,U+2018-201A,U+201C-201E,U+2022,U+2026,U+2032-2033"
LAYOUT_FEATURES = "kern,liga,tnum,case"

GOOGLE_FONTS = "https://raw.githubusercontent.com/google/fonts/main/ofl"
SOURCES = {
    "InstrumentSerif-Regular.ttf": f"{GOOGLE_FONTS}/instrumentserif/InstrumentSerif-Regular.ttf",
    "Geist[wght].ttf": f"{GOOGLE_FONTS}/geist/Geist%5Bwght%5D.ttf",
}
GEIST_WEIGHTS = {"Geist-Regular": 400, "Geist-Medium": 500, "Geist-SemiBold": 600}

FONTS_DIR = Path(__file__).resolve().parent.parent / "fonts"


def subset(source: Path, stem: str) -> None:
    for flavor, suffix in ((None, ".ttf"), ("woff2", ".woff2")):
        out = FONTS_DIR / f"{stem}{suffix}"
        cmd = [
            sys.executable,
            "-m",
            "fontTools.subset",
            str(source),
            f"--unicodes={UNICODES}",
            f"--layout-features={LAYOUT_FEATURES}",
            f"--output-file={out}",
        ]
        if flavor:
            cmd.append(f"--flavor={flavor}")
        subprocess.run(cmd, check=True)
        print(f"wrote {out.relative_to(FONTS_DIR.parent)} ({out.stat().st_size} bytes)")


def main() -> None:
    from fontTools import ttLib
    from fontTools.varLib import instancer

    FONTS_DIR.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        for name, url in SOURCES.items():
            data = urllib.request.urlopen(url).read()
            (tmpdir / name).write_bytes(data)

        subset(tmpdir / "InstrumentSerif-Regular.ttf", "InstrumentSerif-Regular")

        for stem, weight in GEIST_WEIGHTS.items():
            font = ttLib.TTFont(io.BytesIO((tmpdir / "Geist[wght].ttf").read_bytes()))
            instancer.instantiateVariableFont(font, {"wght": weight}, inplace=True)
            static = tmpdir / f"{stem}.ttf"
            font.save(static)
            subset(static, stem)


if __name__ == "__main__":
    main()
