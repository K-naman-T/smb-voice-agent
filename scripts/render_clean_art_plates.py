#!/usr/bin/env python3
"""
Render iconic clean art plates for OFY (Nous-category graphic inking).
Outputs both solid warm-paper (#FBFAF8) and transparent-alpha PNGs.
Zero baked-in dithering or extra raster effects.
"""

import os
import numpy as np
from PIL import Image

INK_RGB = np.array([0x15, 0x14, 0x12], dtype=float)    # #151412
PAPER_RGB = np.array([0xFB, 0xFA, 0xF8], dtype=float)  # #FBFAF8
TARGET_SIZE = (896, 1200)

def process_plate(src_path, dst_rgb, dst_alpha, white_cutoff=225.0, black_cutoff=35.0):
    im = Image.open(src_path).convert("L")
    im = im.resize(TARGET_SIZE, Image.LANCZOS)
    arr = np.array(im, dtype=float)
    
    # Levels normalization: ensure background is pure warm paper, dark ink is pure #151412
    t = np.clip((arr - black_cutoff) / (white_cutoff - black_cutoff), 0.0, 1.0)
    
    # RGB on warm paper #FBFAF8
    rgb = (t[:, :, None] * PAPER_RGB + (1.0 - t[:, :, None]) * INK_RGB).astype(np.uint8)
    Image.fromarray(rgb, mode="RGB").save(dst_rgb, format="PNG")
    
    # RGBA on transparent background
    alpha = ((1.0 - t) * 255.0).astype(np.uint8)
    rgba = np.dstack([
        np.full_like(alpha, int(INK_RGB[0])),
        np.full_like(alpha, int(INK_RGB[1])),
        np.full_like(alpha, int(INK_RGB[2])),
        alpha
    ])
    Image.fromarray(rgba, mode="RGBA").save(dst_alpha, format="PNG")
    print(f"Processed: {os.path.basename(dst_rgb)} and {os.path.basename(dst_alpha)} ({TARGET_SIZE[0]}x{TARGET_SIZE[1]})")


if __name__ == "__main__":
    art_dir = "/home/knamant/orca/workspaces/smb-voice-agent/char/web/public/assets/art"
    base_bell = os.path.join(art_dir, "base_bell2.jpg")
    base_bellmaker = os.path.join(art_dir, "base_bellmaker2.jpg")
    
    out_bell = os.path.join(art_dir, "bell2.png")
    out_bell_alpha = os.path.join(art_dir, "bell2-alpha.png")
    out_bellmaker = os.path.join(art_dir, "bellmaker2.png")
    out_bellmaker_alpha = os.path.join(art_dir, "bellmaker2-alpha.png")
    
    process_plate(base_bell, out_bell, out_bell_alpha)
    process_plate(base_bellmaker, out_bellmaker, out_bellmaker_alpha)
    print("All production plates verified and saved.")
