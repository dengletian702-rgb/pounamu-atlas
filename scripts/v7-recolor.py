"""v7 recolor: swap the warm beige / flesh tones in the older stylesheets for a cool
"glacier mist" that sits with pounamu green, and turn the rust accent into its
complement (coral red), used only for small signals.

  - light, low-saturation warm colours  -> hsl(150, 10%, same lightness)   (analogous to jade)
  - warm tans / peach with more colour  -> hsl(160, 42%, same lightness)   (light jade)
  - rust / burnt orange accents          -> coral #e5553a                  (complement of jade)
  - reds and pinks (warnings) are left alone.

Usage: python3 scripts/v7-recolor.py   (idempotent: cool colours are not warm, so a rerun changes nothing)
"""
import colorsys
import re
from pathlib import Path

DOCS = Path(__file__).resolve().parent.parent / 'docs'
FILES = ['styles.css', 'ui-v2.css', 'v3.css', 'v4-guide.css', 'p10-planner.css', 'type.css']
CORAL = (0xE5, 0x55, 0x3A)


def to_hex(rgb):
    return '#%02x%02x%02x' % rgb


def hsl_rgb(h, s, l):
    r, g, b = colorsys.hls_to_rgb(h / 360, l, s)
    return (round(r * 255), round(g * 255), round(b * 255))


def remap(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    hue = h * 360
    if not (16 <= hue <= 60) or s < 0.06:
        return None  # not a warm beige / tan / orange
    if l >= 0.72 and s < 0.55:
        return hsl_rgb(150, 0.10, l)        # beige / flesh / cream -> glacier mist
    if l >= 0.55:
        return hsl_rgb(160, 0.42, l)        # tan / peach accents -> light jade
    if s >= 0.35 and l >= 0.25:
        return CORAL                         # rust / burnt orange -> coral complement
    return None


def sub_hex(m):
    raw = m.group(0)
    h = raw[1:]
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    rgb = tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    new = remap(*rgb)
    return to_hex(new) if new else raw


def sub_rgb(m):
    r, g, b = int(m.group(2)), int(m.group(3)), int(m.group(4))
    new = remap(r, g, b)
    if not new:
        return m.group(0)
    return f'{m.group(1)}({new[0]}, {new[1]}, {new[2]}'


total = 0
for name in FILES:
    path = DOCS / name
    src = path.read_text(encoding='utf8')
    out = re.sub(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])', sub_hex, src)
    out = re.sub(r'(rgba?)\((\d+),\s*(\d+),\s*(\d+)', sub_rgb, out)
    changed = sum(1 for a, b in zip(re.findall(r'#[0-9a-fA-F]{3,6}|rgba?\([^)]*\)', src), re.findall(r'#[0-9a-fA-F]{3,6}|rgba?\([^)]*\)', out)) if a != b)
    total += changed
    if out != src:
        path.write_text(out, encoding='utf8')
    print(f'{name}: {changed} colours changed')
print('total', total)
