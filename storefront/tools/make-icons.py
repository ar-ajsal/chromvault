#!/usr/bin/env python3
"""
Generate the Chromora storefront PWA icons and favicon.

The mark is drawn geometrically rather than set in a typeface, so it is
resolution-independent, needs no font installed, and reproduces byte-for-byte
on any machine: an open chrome ring — the "C" — on the brand's ink tile, with
the specular band that the site's liquid-chrome material is built around.

    python3 tools/make-icons.py

Writes into the storefront root (the parent of this script's directory):
    icon-192x192.png  icon-256x256.png  icon-384x384.png  icon-512x512.png
    icon-maskable-512.png   apple-touch-icon.png   favicon.ico

Re-run it after changing INK or the ramp to reskin every icon at once.
"""

import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)

INK = (10, 10, 11, 255)          # --ink, the tile behind the mark

# The chrome ramp, sampled top-to-bottom. Same stops as --chrome-ramp in
# css/tokens.css: highlight, shadow trough, blown highlight, cool mid, base.
RAMP = [
    (0.00, (255, 255, 255)),
    (0.18, (214, 218, 224)),
    (0.34, (118, 124, 133)),
    (0.46, (250, 251, 253)),
    (0.62, (168, 176, 189)),
    (0.78, (223, 227, 233)),
    (1.00, (140, 147, 158)),
]

SS = 4     # supersample factor — downscaling is what gives clean edges
SKEW = 0.22  # how far the specular band leans off horizontal


def ramp_at(t):
    t = max(0.0, min(1.0, t))
    for i in range(len(RAMP) - 1):
        t0, c0 = RAMP[i]
        t1, c1 = RAMP[i + 1]
        if t0 <= t <= t1:
            f = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
            return tuple(round(c0[j] + (c1[j] - c0[j]) * f) for j in range(3))
    return RAMP[-1][1]


def chrome_sheet(w, h):
    """The chrome gradient, leaning off horizontal so the band reads as a
    reflection travelling across the mark rather than a flat stripe.

    Built as a one-pixel-wide ramp and then stretched and sheared, which keeps
    the work inside Pillow's C paths — a per-pixel Python loop at 4x supersample
    is millions of iterations and takes minutes."""
    tall = h + int(SKEW * w) + 2
    strip = Image.new('RGB', (1, 512))
    sp = strip.load()
    for y in range(512):
        sp[0, y] = ramp_at(y / 511.0)
    sheet = strip.resize((w, tall), Image.BICUBIC)
    # For output (x, y) sample the sheet at (x, SKEW*x + y).
    return sheet.transform((w, h), Image.AFFINE, (1, 0, 0, SKEW, 1, 0),
                           Image.BILINEAR)


def mark(size, pad_ratio, bg, stroke_ratio=0.19):
    """One icon at `size` px. pad_ratio is the share of the tile left empty
    around the mark — bigger for maskable, where the platform may crop.
    stroke_ratio thickens the ring, which small sizes need to stay legible."""
    s = size * SS
    tile = Image.new('RGBA', (s, s), bg)

    inner = s * (1 - 2 * pad_ratio)
    cx = cy = s / 2
    r_out = inner / 2
    stroke = inner * stroke_ratio
    r_in = r_out - stroke

    # Ring mask with a wedge removed on the right — an open C, opening at the
    # 3 o'clock position, gap centred on the horizontal.
    m = Image.new('L', (s, s), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([cx - r_out, cy - r_out, cx + r_out, cy + r_out], fill=255)
    d.ellipse([cx - r_in, cy - r_in, cx + r_in, cy + r_in], fill=0)
    # The wedge: pieslice from -38° to +38°.
    d.pieslice([cx - r_out - 2, cy - r_out - 2, cx + r_out + 2, cy + r_out + 2],
               start=-38, end=38, fill=0)

    sheet = chrome_sheet(s, s).convert('RGBA')
    tile = Image.composite(sheet, tile, m)

    # Hairline definition so the mark still reads on a light home screen.
    edge = Image.new('L', (s, s), 0)
    de = ImageDraw.Draw(edge)
    lw = max(1, int(s * 0.006))
    de.ellipse([cx - r_out, cy - r_out, cx + r_out, cy + r_out], outline=255, width=lw)
    de.ellipse([cx - r_in, cy - r_in, cx + r_in, cy + r_in], outline=255, width=lw)
    edge = Image.composite(edge, Image.new('L', (s, s), 0), m)
    tile = Image.composite(Image.new('RGBA', (s, s), (60, 64, 70, 255)), tile, edge)

    return tile.resize((size, size), Image.LANCZOS)


def main():
    for n in (192, 256, 384, 512):
        p = os.path.join(OUT, 'icon-%dx%d.png' % (n, n))
        mark(n, 0.16, INK).save(p, optimize=True)
        print('wrote', os.path.relpath(p, OUT))

    # Maskable: 20% safe-zone padding so no platform mask clips the ring.
    p = os.path.join(OUT, 'icon-maskable-512.png')
    mark(512, 0.26, INK).save(p, optimize=True)
    print('wrote', os.path.relpath(p, OUT))

    # iOS home screen: 180px, no transparency, no rounding (iOS adds its own).
    p = os.path.join(OUT, 'apple-touch-icon.png')
    mark(180, 0.17, INK).convert('RGB').save(p, optimize=True)
    print('wrote', os.path.relpath(p, OUT))

    # Favicon: rendered at 16px in a browser tab, so it gets the ink tile (a
    # chrome C on paper is two pale greys and disappears at that size), a
    # thicker ring, and less padding.
    ico = os.path.join(OUT, 'favicon.ico')
    mark(64, 0.07, INK, 0.26).save(ico, sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print('wrote', os.path.relpath(ico, OUT))


if __name__ == '__main__':
    main()
