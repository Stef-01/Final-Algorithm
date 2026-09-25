#!/usr/bin/env python3
"""Generate WATL's app icons from its brand mark: a serif "W" (Tiempos Headline Semibold, the tab bar
mark) in white on black. Replaces Expo's template placeholders.

    python3 scripts/make-icons.py      # needs Pillow (pip install pillow)
"""
import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
PUBLIC = ROOT / 'public'
FONT = ASSETS / 'fonts' / 'tiempos_headline_semi_bold.otf'
BLACK, WHITE, CLEAR = (0, 0, 0, 255), (255, 255, 255, 255), (0, 0, 0, 0)


def mark(size, fill, background, scale):
    """The W, centred optically (by its ink, not its text box), at `scale` of the canvas height."""
    img = Image.new('RGBA', (size, size), background)
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(str(FONT), int(size * scale))
    left, top, right, bottom = draw.textbbox((0, 0), 'W', font=font)
    x = (size - (right - left)) / 2 - left
    y = (size - (bottom - top)) / 2 - top
    draw.text((x, y), 'W', font=font, fill=fill)
    return img


def save(img, path, size=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    (img.resize((size, size), Image.LANCZOS) if size else img).save(path, optimize=True)
    print(f'wrote {path.relative_to(ROOT)}')


def main():
    icon = mark(1024, WHITE, BLACK, 0.62)
    save(icon, ASSETS / 'icon.png')                       # iOS (square; iOS rounds the corners)
    save(icon, ASSETS / 'favicon.png', 48)                # browser tab
    save(icon, PUBLIC / 'icon-192.png', 192)              # web manifest
    save(icon, PUBLIC / 'icon-512.png', 512)
    save(icon, PUBLIC / 'apple-touch-icon.png', 180)      # iOS home screen from Safari
    # Android adaptive icon: the mark must sit inside the central safe zone (about 61% of the canvas).
    save(mark(512, WHITE, CLEAR, 0.34), ASSETS / 'android-icon-foreground.png')
    save(Image.new('RGBA', (512, 512), BLACK), ASSETS / 'android-icon-background.png')
    save(mark(432, WHITE, CLEAR, 0.34), ASSETS / 'android-icon-monochrome.png')
    save(mark(1024, BLACK, CLEAR, 0.4), ASSETS / 'splash-icon.png')


if __name__ == '__main__':
    main()
