#!/usr/bin/env python3
"""
Normalize Bell Logo Variations to exact two-tone palette:
- Ink: #151412 (21, 20, 18)
- Paper: #FBFAF8 (251, 250, 248)

Generates:
- web/public/assets/art/bell-marks/01_solid_silhouette.png ... 10 files
- web/public/assets/art/bell-marks/sheet_paper.png (all 10, numbered)
- web/public/assets/art/bell-marks/sheet_ink.png (inverted: paper on ink)

Verifies:
- Exactly 2 unique tones
- >=1024px on long side
"""

import os
import glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont

INK_RGB = (0x15, 0x14, 0x12)    # #151412
PAPER_RGB = (0xFB, 0xFA, 0xF8)  # #FBFAF8

OUT_DIR = "/home/knamant/orca/workspaces/smb-voice-agent/char/web/public/assets/art/bell-marks"
RAW_DIR = os.path.join(OUT_DIR, "raw")
FONT_PATH = "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf"
FONT_SANS = "/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf"

MARKS = [
    ("raw_01_solid_silhouette.jpg", "01_solid_silhouette.png", "01 / SOLID SILHOUETTE"),
    ("raw_02_monoline_outline.jpg", "02_monoline_outline.png", "02 / MONOLINE OUTLINE"),
    ("raw_03_geometric_minimal.jpg", "03_geometric_minimal.png", "03 / GEOMETRIC MINIMAL"),
    ("raw_04_acoustic_arcs.jpg", "04_acoustic_arcs.png", "04 / ACOUSTIC RING ARCS"),
    ("raw_05_negative_disc.jpg", "05_negative_disc.png", "05 / NEGATIVE SPACE DISC"),
    ("raw_06_focal_clapper.jpg", "06_focal_clapper.png", "06 / BOLD FOCAL CLAPPER"),
    ("raw_07_foundry_badge.jpg", "07_foundry_badge.png", "07 / FOUNDRY NOTCHED BADGE"),
    ("raw_08_engraved_linework.jpg", "08_engraved_linework.png", "08 / ENGRAVED LINEWORK"),
    ("raw_09_beam_suspension.jpg", "09_beam_suspension.png", "09 / SUSPENDED BEAM"),
    ("raw_10_maker_motif.jpg", "10_maker_motif.png", "10 / BELLMAKER MOTIF")
]


def normalize_to_two_tone(raw_path, is_engraved=False):
    im = Image.open(raw_path).convert("L")
    arr = np.array(im)
    h, w = arr.shape
    
    # Clean thresholding
    # For all images, ink is dark (< 50) and paper is bright (> 230)
    thresh = 155
    is_ink = arr < thresh
    
    # For 08 engraved, clean dust outside the bell body margin
    if is_engraved:
        # Clear outer margin noise outside the bell
        is_ink[:95, :] = False
        is_ink[915:, :] = False
        is_ink[:, :170] = False
        is_ink[:, 850:] = False
        
    out = np.zeros((h, w, 3), dtype=np.uint8)
    out[is_ink] = INK_RGB
    out[~is_ink] = PAPER_RGB
    return Image.fromarray(out, mode="RGB")


def verify_two_tones(img_or_path, name=None):
    if isinstance(img_or_path, str):
        im = Image.open(img_or_path)
        display_name = os.path.basename(img_or_path)
    else:
        im = img_or_path
        display_name = name or "Image"
        
    w, h = im.size
    colors = im.getcolors(maxcolors=100)
    if not colors:
        raise ValueError(f"{display_name}: More than 100 colors found!")
    
    color_tuples = {c[1] for c in colors}
    expected = {INK_RGB, PAPER_RGB}
    
    if len(color_tuples) != 2:
        raise ValueError(f"{display_name}: Expected exactly 2 colors, got {len(color_tuples)}: {color_tuples}")
    
    if color_tuples != expected:
        raise ValueError(f"{display_name}: Colors mismatch! Expected {expected}, got {color_tuples}")
        
    if max(w, h) < 1024:
        raise ValueError(f"{display_name}: Long side is {max(w, h)} < 1024px!")
        
    return True, w, h, colors


def build_specimen_sheet(processed_images, dark_mode=False):
    """
    Builds a 2-column x 5-row specimen sheet showcasing all 10 marks.
    Every element, including borders and labels, is strictly two tones (#151412 and #FBFAF8).
    """
    bg_color = INK_RGB if dark_mode else PAPER_RGB
    fg_color = PAPER_RGB if dark_mode else INK_RGB
    
    # Sheet dimensions: 2 columns of 5 marks
    # Cell size: 800 x 800 for mark, 100 for label header
    cell_w, cell_h = 750, 850
    pad_x, pad_y = 100, 140
    header_h = 240
    footer_h = 140
    
    sheet_w = pad_x * 2 + cell_w * 2 + 100
    sheet_h = header_h + pad_y + cell_h * 5 + footer_h
    
    sheet = Image.new("RGB", (sheet_w, sheet_h), bg_color)
    draw = ImageDraw.Draw(sheet)
    
    title_font = ImageFont.truetype(FONT_SANS, 48)
    sub_font = ImageFont.truetype(FONT_PATH, 18)
    label_font = ImageFont.truetype(FONT_PATH, 20)
    
    # Header text
    mode_str = "DARK CARBON INK (#151412)" if dark_mode else "WARM STUDIO PAPER (#FBFAF8)"
    draw.text((pad_x, 60), "BELLMAKER — BELL LOGO VARIATIONS", font=title_font, fill=fg_color)
    draw.text((pad_x, 130), f"10 MARKS · 2-TONE VERIFIED (#151412 / #FBFAF8) · {mode_str}", font=sub_font, fill=fg_color)
    
    # Hairline divider below header
    draw.line([(pad_x, 180), (sheet_w - pad_x, 180)], fill=fg_color, width=2)
    
    for idx, (img, (_, _, label)) in enumerate(zip(processed_images, MARKS)):
        col = idx % 2
        row = idx // 2
        
        cx = pad_x + col * (cell_w + 100)
        cy = header_h + pad_y + row * cell_h
        
        # Invert mark if dark mode
        if dark_mode:
            arr = np.array(img)
            is_ink = (arr[:, :, 0] == INK_RGB[0]) & (arr[:, :, 1] == INK_RGB[1]) & (arr[:, :, 2] == INK_RGB[2])
            inv_arr = np.zeros_like(arr)
            inv_arr[is_ink] = PAPER_RGB
            inv_arr[~is_ink] = INK_RGB
            mark_to_paste = Image.fromarray(inv_arr, mode="RGB")
        else:
            mark_to_paste = img
            
        # Resize mark for sheet cell (650x650)
        # Using NEAREST to guarantee strict 2-tone palette preservation
        resized_mark = mark_to_paste.resize((650, 650), Image.NEAREST)
        
        # Label above mark
        draw.text((cx + 10, cy - 40), label, font=label_font, fill=fg_color)
        
        # Paste mark
        sheet.paste(resized_mark, (cx + 50, cy))
        
        # Subtle cell frame
        draw.rectangle([cx, cy - 50, cx + cell_w, cy + 680], outline=fg_color, width=1)
        
    # Footer divider
    foot_y = sheet_h - 100
    draw.line([(pad_x, foot_y), (sheet_w - pad_x, foot_y)], fill=fg_color, width=2)
    draw.text((pad_x, foot_y + 30), "BELLMAKER ARCHITECTURE · SPECIMEN PLATES · AUTONOMOUS GENERATION 2026-09-19", font=sub_font, fill=fg_color)
    
    # Threshold the entire sheet at the end to guarantee EXACTLY 2 tones with 0 antialiasing bleed
    sheet_gray = np.array(sheet.convert("L"))
    if dark_mode:
        # dark mode: bright pixels become PAPER_RGB, dark become INK_RGB
        is_paper = sheet_gray > 128
        out_sheet = np.zeros((sheet_h, sheet_w, 3), dtype=np.uint8)
        out_sheet[is_paper] = PAPER_RGB
        out_sheet[~is_paper] = INK_RGB
    else:
        # light mode: dark pixels become INK_RGB, bright become PAPER_RGB
        is_ink = sheet_gray < 128
        out_sheet = np.zeros((sheet_h, sheet_w, 3), dtype=np.uint8)
        out_sheet[is_ink] = INK_RGB
        out_sheet[~is_ink] = PAPER_RGB
        
    return Image.fromarray(out_sheet, mode="RGB")


def main():
    print("=== Normalizing Bell Logo Variations ===")
    os.makedirs(OUT_DIR, exist_ok=True)
    
    processed_images = []
    
    for raw_name, out_name, label in MARKS:
        raw_path = os.path.join(RAW_DIR, raw_name)
        out_path = os.path.join(OUT_DIR, out_name)
        
        is_engraved = ("08_engraved" in out_name)
        normalized = normalize_to_two_tone(raw_path, is_engraved=is_engraved)
        normalized.save(out_path, format="PNG")
        
        ok, w, h, colors = verify_two_tones(out_path)
        ink_cnt = next(c[0] for c in colors if c[1] == INK_RGB)
        paper_cnt = next(c[0] for c in colors if c[1] == PAPER_RGB)
        pct_ink = ink_cnt / (w * h) * 100
        print(f"VERIFIED: {out_name} [{w}x{h}] — ink: {pct_ink:.2f}%, paper: {100-pct_ink:.2f}% (exactly 2 tones)")
        
        processed_images.append(normalized)
        
    print("\n=== Building Specimen Sheets ===")
    paper_sheet = build_specimen_sheet(processed_images, dark_mode=False)
    sheet_paper_path = os.path.join(OUT_DIR, "sheet_paper.png")
    paper_sheet.save(sheet_paper_path, format="PNG")
    ok, pw, ph, _ = verify_two_tones(sheet_paper_path)
    print(f"VERIFIED: sheet_paper.png [{pw}x{ph}] (exactly 2 tones)")
    
    ink_sheet = build_specimen_sheet(processed_images, dark_mode=True)
    sheet_ink_path = os.path.join(OUT_DIR, "sheet_ink.png")
    ink_sheet.save(sheet_ink_path, format="PNG")
    ok, iw, ih, _ = verify_two_tones(sheet_ink_path)
    print(f"VERIFIED: sheet_ink.png [{iw}x{ih}] (exactly 2 tones)")
    
    print("\n=== Copying to Brain Directory for Artifact Display ===")
    brain_dir = "/home/knamant/.gemini/antigravity-cli/brain/a90fd5b1-27f7-4a11-8ce1-ed3e51406fdd"
    for _, out_name, _ in MARKS:
        src = os.path.join(OUT_DIR, out_name)
        dst = os.path.join(brain_dir, out_name)
        Image.open(src).save(dst)
    Image.open(sheet_paper_path).save(os.path.join(brain_dir, "sheet_paper.png"))
    Image.open(sheet_ink_path).save(os.path.join(brain_dir, "sheet_ink.png"))
    print("Copied all deliverables to brain directory.")


if __name__ == "__main__":
    main()
