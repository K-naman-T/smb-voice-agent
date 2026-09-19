#!/usr/bin/env python3
"""
Art plates dither script for OFY landing page.
Converts base plates to pure 1-bit ordered Bayer dithered PNGs:
- Exact tones: black #151412 and warm paper #FBFAF8
- 8x8 Bayer matrix threshold
- Output size: 896x1200
"""

import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

BAYER8 = [
    [ 0, 32,  8, 40,  2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44,  4, 36, 14, 46,  6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [ 3, 35, 11, 43,  1, 33,  9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47,  7, 39, 13, 45,  5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
]

INK_RGB = (0x15, 0x14, 0x12)    # #151412 (21, 20, 18)
PAPER_RGB = (0xFB, 0xFA, 0xF8)  # #FBFAF8 (251, 250, 248)
TARGET_SIZE = (896, 1200)

def apply_bayer8_dither(gray_arr, size=TARGET_SIZE):
    """
    Applies 8x8 ordered Bayer dithering to a 2D grayscale uint8/float array.
    Returns an RGB PIL Image with only INK_RGB and PAPER_RGB.
    """
    im = Image.fromarray(gray_arr.astype(np.uint8))
    im.thumbnail(size, Image.LANCZOS)
    canvas = Image.new("L", size, 255)
    canvas.paste(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2))
    
    px = np.array(canvas, dtype=np.float32)
    bayer = np.array(BAYER8, dtype=np.float32)
    
    # Compute tiled Bayer matrix
    h, w = size[1], size[0]
    tiled_bayer = np.tile(bayer, ((h + 7) // 8, (w + 7) // 8))[:h, :w]
    
    # v in range [0.0, 64.0]
    v = (px / 255.0) * 64.0
    
    # Dark pixels (v <= threshold) -> ink, Light pixels -> paper
    is_ink = v <= tiled_bayer
    
    out_arr = np.zeros((h, w, 3), dtype=np.uint8)
    out_arr[is_ink] = INK_RGB
    out_arr[~is_ink] = PAPER_RGB
    
    return Image.fromarray(out_arr, mode="RGB")


def process_bell(src_path, dst_path):
    print(f"Processing Bell: {src_path} -> {dst_path}")
    raw_img = Image.open(src_path).convert("L")
    arr = np.array(raw_img, dtype=np.float32)
    
    # Levels adjustment to ensure paper background is pure white and linework is crisp
    black_pt = 30.0
    white_pt = 220.0
    arr_norm = np.clip((arr - black_pt) / (white_pt - black_pt) * 255.0, 0.0, 255.0)
    
    out_img = apply_bayer8_dither(arr_norm)
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    out_img.save(dst_path, format="PNG")
    print(f"Saved {dst_path} successfully.")


def process_bellmaker(src_path, dst_path):
    print(f"Processing Bellmaker: {src_path} -> {dst_path}")
    raw_img = Image.open(src_path).convert("L")
    arr = np.array(raw_img, dtype=np.float32)
    
    # Levels adjustment
    black_pt = 20.0
    white_pt = 230.0
    arr_norm = np.clip((arr - black_pt) / (white_pt - black_pt) * 255.0, 0.0, 255.0)
    
    # Remove interior linework inside craftsman to make a solid black silhouette
    # Craftsman bounding region: y in [350, 1150], x in [450, 750]
    craftsman_mask = arr_norm < 128
    torso_mask = craftsman_mask[450:950, 560:750]
    closed_torso = ndimage.binary_closing(torso_mask, structure=np.ones((9, 9)))
    craftsman_mask[450:950, 560:750] = closed_torso
    
    c_box = craftsman_mask[350:1150, 450:740]
    filled_c = ndimage.binary_fill_holes(c_box)
    craftsman_mask[350:1150, 450:740] = filled_c
    
    # Set solid black on craftsman
    y_idx, x_idx = np.ogrid[:arr_norm.shape[0], :arr_norm.shape[1]]
    craftsman_sel = craftsman_mask & (y_idx >= 350) & (x_idx >= 450)
    arr_norm[craftsman_sel] = 0.0
    
    # Align bottom baseline with bell2 (clear ground margin below y=1138 and margins on sides)
    arr_norm[1138:, :] = 255.0
    arr_norm[1100:, :80] = 255.0
    arr_norm[1100:, 860:] = 255.0
    
    out_img = apply_bayer8_dither(arr_norm)
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    out_img.save(dst_path, format="PNG")
    print(f"Saved {dst_path} successfully.")


def verify_image(path):
    print(f"\n--- Verifying {os.path.basename(path)} ---")
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")
    
    im = Image.open(path)
    if im.format != "PNG":
        raise ValueError(f"Expected PNG format, got {im.format}")
    
    w, h = im.size
    print(f"Dimensions: {w}x{h} (width x height)")
    
    colors = im.getcolors(maxcolors=1000)
    if not colors:
        raise ValueError("Too many colors in image! Expected exactly 2.")
    
    print(f"Color count: {len(colors)}")
    allowed_colors = {INK_RGB, PAPER_RGB}
    for count, col in colors:
        hex_code = f"#{col[0]:02X}{col[1]:02X}{col[2]:02X}"
        if col not in allowed_colors:
            raise ValueError(f"Disallowed color found: {col} ({hex_code})")
        name = "Black (#151412)" if col == INK_RGB else "Warm Paper (#FBFAF8)"
        print(f"  {name}: {count} pixels ({count / (w * h) * 100:.2f}%)")
    
    print(f"VERIFIED: {os.path.basename(path)} is a valid 1-bit ordered Bayer dither PNG with exact tones.")


if __name__ == "__main__":
    base_bell = "/home/knamant/orca/workspaces/smb-voice-agent/char/web/public/assets/art/base_bell2.jpg"
    base_bellmaker = "/home/knamant/orca/workspaces/smb-voice-agent/char/web/public/assets/art/base_bellmaker2.jpg"
    
    out_bell = "/home/knamant/orca/workspaces/smb-voice-agent/char/web/public/assets/art/bell2.png"
    out_bellmaker = "/home/knamant/orca/workspaces/smb-voice-agent/char/web/public/assets/art/bellmaker2.png"
    
    process_bell(base_bell, out_bell)
    process_bellmaker(base_bellmaker, out_bellmaker)
    
    verify_image(out_bell)
    verify_image(out_bellmaker)
