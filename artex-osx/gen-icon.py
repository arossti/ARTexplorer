#!/usr/bin/env python3
"""Generate ARTexplorer icon — stella octangula wireframe on dark background.

Creates a .iconset folder with all required sizes, then uses iconutil to
produce AppIcon.icns. Requires PIL (Pillow).
"""

import math
import os
from PIL import Image, ImageDraw

# ABCD colors (matching the Rust/WGSL palette)
YELLOW = (255, 255, 0)
RED    = (255, 0, 0)
BLUE   = (0, 102, 255)
GREEN  = (0, 204, 51)

# Tetrahedral vertex directions (Cartesian, matching ABCD basis)
# A=(-1,-1,+1), B=(+1,+1,+1), C=(-1,+1,-1), D=(+1,-1,-1)
VERTS_3D = [
    (-1, -1,  1),  # A
    ( 1,  1,  1),  # B
    (-1,  1, -1),  # C
    ( 1, -1, -1),  # D
]

# Dual tet: negate each
DUAL_3D = [(-x, -y, -z) for x, y, z in VERTS_3D]

EDGES = [(0,1), (0,2), (0,3), (1,2), (1,3), (2,3)]

def project(v3d, size, rotation=0.4):
    """Simple isometric projection with slight rotation."""
    x, y, z = v3d
    # Rotate around Y axis
    c, s = math.cos(rotation), math.sin(rotation)
    x2 = x * c + z * s
    z2 = -x * s + z * c
    # Rotate around X axis slightly
    r2 = 0.3
    c2, s2 = math.cos(r2), math.sin(r2)
    y2 = y * c2 - z2 * s2
    # Scale and center
    scale = size * 0.28
    cx, cy = size / 2, size / 2
    return (cx + x2 * scale, cy - y2 * scale)


def draw_stella(size):
    """Draw stella octangula wireframe at given pixel size."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Dark background circle
    margin = size * 0.08
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=(20, 20, 30, 255)
    )

    # Project vertices
    base_2d = [project(v, size) for v in VERTS_3D]
    dual_2d = [project(v, size) for v in DUAL_3D]

    colors_base = [YELLOW, RED, BLUE, GREEN]
    colors_dual = [YELLOW, RED, BLUE, GREEN]

    # Line width scales with icon size
    lw = max(1, size // 64)

    # Draw base tet edges
    for i, j in EDGES:
        # Blend colors of endpoints
        c1, c2 = colors_base[i], colors_base[j]
        color = tuple((a + b) // 2 for a, b in zip(c1, c2))
        draw.line([base_2d[i], base_2d[j]], fill=color, width=lw)

    # Draw dual tet edges
    for i, j in EDGES:
        c1, c2 = colors_dual[i], colors_dual[j]
        color = tuple((a + b) // 2 for a, b in zip(c1, c2))
        # Slightly dimmer for dual
        color = tuple(int(c * 0.7) for c in color)
        draw.line([dual_2d[i], dual_2d[j]], fill=color, width=lw)

    # Draw vertex dots
    dot_r = max(1, size // 40)
    for pt, col in zip(base_2d, colors_base):
        draw.ellipse(
            [pt[0] - dot_r, pt[1] - dot_r, pt[0] + dot_r, pt[1] + dot_r],
            fill=col
        )
    for pt, col in zip(dual_2d, colors_dual):
        draw.ellipse(
            [pt[0] - dot_r, pt[1] - dot_r, pt[0] + dot_r, pt[1] + dot_r],
            fill=tuple(int(c * 0.7) for c in col)
        )

    return img


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    iconset_dir = os.path.join(script_dir, "AppIcon.iconset")
    os.makedirs(iconset_dir, exist_ok=True)

    # macOS iconset requires these exact sizes
    sizes = [
        ("icon_16x16.png", 16),
        ("icon_16x16@2x.png", 32),
        ("icon_32x32.png", 32),
        ("icon_32x32@2x.png", 64),
        ("icon_128x128.png", 128),
        ("icon_128x128@2x.png", 256),
        ("icon_256x256.png", 256),
        ("icon_256x256@2x.png", 512),
        ("icon_512x512.png", 512),
        ("icon_512x512@2x.png", 1024),
    ]

    for name, px in sizes:
        img = draw_stella(px)
        img.save(os.path.join(iconset_dir, name))
        print(f"  {name} ({px}x{px})")

    # Convert to .icns
    icns_path = os.path.join(script_dir, "AppIcon.icns")
    os.system(f'iconutil -c icns "{iconset_dir}" -o "{icns_path}"')
    print(f"\nGenerated: {icns_path}")


if __name__ == "__main__":
    main()
