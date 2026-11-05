"""Subset Manrope to the characters the site needs and save WOFF2 files.

Usage: python3 scripts/fonts.py <dir with Manrope-*.ttf> <output dir>
"""
import sys
from pathlib import Path

from fontTools import subset

# Basic Latin, Latin-1 (ä, ö, å, é ...), general punctuation, euro sign, arrows.
UNICODES = "U+0020-007E,U+00A0-00FF,U+0152-0153,U+0160-0161,U+017D-017E,U+2010-2027,U+2030-203A,U+20AC,U+2122,U+2190-2193,U+2212"
WEIGHTS = {"Regular": 400, "SemiBold": 600, "ExtraBold": 800}


def main() -> None:
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    for name, weight in WEIGHTS.items():
        options = subset.Options()
        options.flavor = "woff2"
        options.layout_features = ["kern", "liga", "calt", "tnum", "lnum"]
        options.name_IDs = ["*"]
        font = subset.load_font(str(src / f"Manrope-{name}.ttf"), options)
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=subset.parse_unicodes(UNICODES))
        subsetter.subset(font)
        out = dst / f"manrope-{weight}.woff2"
        subset.save_font(font, str(out), options)
        print(f"{out.name}: {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
