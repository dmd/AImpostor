#!/usr/bin/env -S UV_CACHE_DIR=/private/tmp/codex-uv-cache uv run --script
# /// script
# dependencies = [
#   "pillow",
# ]
# ///

from PIL import Image
import sys


def hex_color(pixel):
    r, g, b = pixel[:3]
    return f"#{r:02x}{g:02x}{b:02x}"


def main():
    image = Image.open(sys.argv[1]).convert("RGBA")
    points = [(10, 10), (360, 255), (96, 351), (96, 380), (410, 238), (520, 240), (260, 224), (700, 640)]
    for x, y in points:
      print(f"{x:4d},{y:4d} {hex_color(image.getpixel((x, y)))} {image.getpixel((x, y))}")


if __name__ == "__main__":
    main()
