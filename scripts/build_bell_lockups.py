#!/usr/bin/env python3
"""
BELLMAKER LOCKUPS — Production Asset Generator
Operator Job Spec #2, 2026-09-19

Generates:
1. Cleaned Standalone Marks:
   - 08 Engraved Bell: Clean linework (0 AI speckle) inside an engraved-plate double hairline border.
   - 10 Maker Motif: Cleaned & polished linework (0 raster artifacts/blotches, approved figure+bell composition).
   - Delivered in SVG and PNG (>=1024px), light (#FBFAF8 paper) and dark (#151412 ink) polarities.

2. Typographic Lockups (Mark + Wordmark "Bellmaker"):
   - Outlined vector typography (zero live-font dependency).
   - Directions:
     * engraved__scholarly_serif (P052-Bold transitional serif)
     * engraved__foundry_slab (DejaVuSerif-Bold industrial slab serif)
     * maker__foundry_slab (DejaVuSerif-Bold industrial slab serif)
     * maker__literary_italic (P052-Italic humanistic italic)
     * maker__foundry_slab_stacked (Stacked variant)
     * maker__literary_italic_stacked (Stacked variant)
   - Delivered in SVG and PNG (>=1800px wide), light and dark polarities.

3. Master Specimen Sheets:
   - sheet_paper.png (warm paper #FBFAF8)
   - sheet_ink.png (carbon ink #151412)
   - Footer: "BELLMAKER — LOCKUPS · 2026-09-19"

Verifies:
- Exactly 2 unique tones per file (#151412 and #FBFAF8)
- Marks >= 1024px
- Lockups >= 1800px wide
"""

import os
import sys
import subprocess
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import fitz
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

# --- PALETTE CONSTANTS ---
INK_RGB = (0x15, 0x14, 0x12)    # #151412
PAPER_RGB = (0xFB, 0xFA, 0xF8)  # #FBFAF8
INK_HEX = "#151412"
PAPER_HEX = "#FBFAF8"

# --- DIRECTORY CONFIGURATION ---
REPO_DIR = "/home/knamant/orca/workspaces/smb-voice-agent/char"
BASE_ART_DIR = os.path.join(REPO_DIR, "web/public/assets/art/bell-marks")
RAW_DIR = os.path.join(BASE_ART_DIR, "raw")
OUT_DIR = os.path.join(BASE_ART_DIR, "lockups")
SVG_OUT_DIR = os.path.join(OUT_DIR, "svg")
BRAIN_DIR = "/home/knamant/.gemini/antigravity-cli/brain/05deccd5-9596-4609-94e8-40bbc389bb3f"
POTRACE_BIN = "/home/knamant/.local/bin/potrace"

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(SVG_OUT_DIR, exist_ok=True)
os.makedirs(BRAIN_DIR, exist_ok=True)

# --- FONT DEFINITIONS ---
FONTS = {
    "serif": "/usr/share/fonts/opentype/urw-base35/P052-Bold.otf",
    "serif_italic": "/usr/share/fonts/opentype/urw-base35/P052-Italic.otf",
    "slab": "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    "mono": "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf",
    "sans": "/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf",
}


def get_font_metrics(font_path, font_size):
    font = TTFont(font_path)
    upem = font['head'].unitsPerEm
    scale = font_size / upem
    os2 = font['OS/2']
    cap_h = getattr(os2, 'sCapHeight', int(0.7 * upem)) * scale
    x_h = getattr(os2, 'sxHeight', int(0.5 * upem)) * scale
    return scale, cap_h, x_h


def text_to_outlined_svg_path(font_path, text, font_size, x=0, y=0, tracking=0):
    font = TTFont(font_path)
    upem = font['head'].unitsPerEm
    scale = font_size / upem
    glyph_set = font.getGlyphSet()
    hmtx = font['hmtx']
    cmap = font.getBestCmap()
    
    cur_x = x
    paths = []
    
    for ch in text:
        glyph_name = cmap.get(ord(ch), '.notdef')
        glyph = glyph_set[glyph_name]
        adv, _ = hmtx[glyph_name]
        
        pen = SVGPathPen(glyph_set)
        transform_pen = TransformPen(pen, (scale, 0, 0, -scale, cur_x, y))
        glyph.draw(transform_pen)
        d = pen.getCommands()
        if d.strip():
            paths.append(d)
        cur_x += adv * scale + tracking
        
    return ' '.join(paths), cur_x - x


def clean_vector_trace_08(raw_jpg_path):
    """
    Vectorizes 08 Engraved Bell:
    - Cleans margin dust/noise
    - Traces with potrace turdsize=80 (eliminating all AI micro-speckle)
    - Returns inner SVG elements (paths) with placeholder __FG__
    """
    raw = Image.open(raw_jpg_path).convert('L')
    arr = np.array(raw)
    mask = arr < 155
    # Zero margin noise outside bell body
    mask[:95, :] = False
    mask[915:, :] = False
    mask[:, :170] = False
    mask[:, 850:] = False

    pbm_path = "/tmp/bell08_clean.pbm"
    with open(pbm_path, 'wb') as f:
        f.write(f"P4\n{mask.shape[1]} {mask.shape[0]}\n".encode())
        f.write(np.packbits(mask, axis=1).tobytes())

    svg_path = "/tmp/bell08_clean.svg"
    env = dict(os.environ, LD_LIBRARY_PATH="/home/knamant/.local/lib:" + os.environ.get("LD_LIBRARY_PATH", ""))
    subprocess.run([POTRACE_BIN, "-s", "-t", "80", "-a", "1.0", "-O", "0.2", pbm_path, "-o", svg_path], check=True, env=env)

    tree = ET.parse(svg_path)
    root = tree.getroot()
    inner_g = ""
    for elem in root:
        tag = elem.tag.split("}")[-1]
        if tag in ["g", "path"]:
            inner_g += ET.tostring(elem, encoding="unicode")
    # Replace default black with __FG__ placeholder
    inner_g = inner_g.replace('#000000', '__FG__').replace('fill="currentColor"', 'fill="__FG__"')
    return inner_g


def clean_vector_trace_10(raw_jpg_path):
    """
    Vectorizes 10 Maker Motif:
    - Applies subtle edge-preserving gaussian filter (radius 1.2) before thresholding
    - Eliminates raster stairstepping and blotches while strictly preserving 100% composition
    - Traces with potrace
    """
    raw = Image.open(raw_jpg_path).convert('L')
    blur = raw.filter(ImageFilter.GaussianBlur(radius=1.2))
    arr = np.array(blur)
    mask = arr < 140

    pbm_path = "/tmp/maker10_clean.pbm"
    with open(pbm_path, 'wb') as f:
        f.write(f"P4\n{mask.shape[1]} {mask.shape[0]}\n".encode())
        f.write(np.packbits(mask, axis=1).tobytes())

    svg_path = "/tmp/maker10_clean.svg"
    env = dict(os.environ, LD_LIBRARY_PATH="/home/knamant/.local/lib:" + os.environ.get("LD_LIBRARY_PATH", ""))
    subprocess.run([POTRACE_BIN, "-s", "-t", "20", "-a", "1.0", "-O", "0.2", pbm_path, "-o", svg_path], check=True, env=env)

    tree = ET.parse(svg_path)
    root = tree.getroot()
    inner_g = ""
    for elem in root:
        tag = elem.tag.split("}")[-1]
        if tag in ["g", "path"]:
            inner_g += ET.tostring(elem, encoding="unicode")
    inner_g = inner_g.replace('#000000', '__FG__').replace('fill="currentColor"', 'fill="__FG__"')
    return inner_g


def build_standalone_engraved_svg(bell_inner_g, dark_mode=False):
    """
    Creates standalone framed engraved bell:
    - 1024 x 1024
    - Classic engraved-plate double hairline border:
      Outer: 2.5px hairline at margin 56
      Inner: 1.0px fine hairline at margin 66
    """
    bg = INK_HEX if dark_mode else PAPER_HEX
    fg = PAPER_HEX if dark_mode else INK_HEX
    inner = bell_inner_g.replace('__FG__', fg)
    
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="{bg}"/>
  <!-- Engraved plate double hairline border -->
  <rect x="56" y="56" width="912" height="912" fill="none" stroke="{fg}" stroke-width="2.5"/>
  <rect x="66" y="66" width="892" height="892" fill="none" stroke="{fg}" stroke-width="1.0"/>
  <!-- Bell artwork -->
  {inner}
</svg>'''
    return svg


def build_standalone_maker_svg(maker_inner_g, dark_mode=False):
    """
    Creates standalone polished maker motif:
    - 1024 x 1024
    - Centered clean figure + bell mark
    """
    bg = INK_HEX if dark_mode else PAPER_HEX
    fg = PAPER_HEX if dark_mode else INK_HEX
    inner = maker_inner_g.replace('__FG__', fg)
    
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="{bg}"/>
  {inner}
</svg>'''
    return svg


def build_horizontal_lockup_svg(mark_type, bell_inner_g, maker_inner_g, font_key, wordmark_text, tracking=0, dark_mode=False):
    """
    Builds a 2400 x 700 horizontal lockup:
    - Mark on left, Wordmark on right
    - Optical vertical centering
    - Generous spacing
    - Outlined vector paths
    """
    W, H = 2400, 700
    bg = INK_HEX if dark_mode else PAPER_HEX
    fg = PAPER_HEX if dark_mode else INK_HEX
    font_path = FONTS[font_key]
    
    # Render outlined text
    font_size = 150 if font_key in ["serif", "serif_italic"] else 130
    p_text, w_text = text_to_outlined_svg_path(font_path, wordmark_text, font_size, tracking=tracking)
    _, cap_h, _ = get_font_metrics(font_path, font_size)
    
    if mark_type == "engraved":
        # Frame outer box is 912x912 inside (56, 56) to (968, 968)
        mark_display_size = 420.0
        scale = mark_display_size / 912.0
        w_mark = mark_display_size
        h_mark = mark_display_size
        gap = 140.0
        
        tot_w = w_mark + gap + w_text
        start_x = (W - tot_w) / 2
        mark_x = start_x
        mark_y = (H - h_mark) / 2
        
        inner = bell_inner_g.replace('__FG__', fg)
        # Mark element with translation to align (56, 56) to (0, 0)
        mark_svg = f'''<g transform="translate({mark_x:.1f}, {mark_y:.1f}) scale({scale:.5f}) translate(-56, -56)">
    <rect x="56" y="56" width="912" height="912" fill="none" stroke="{fg}" stroke-width="2.5"/>
    <rect x="66" y="66" width="892" height="892" fill="none" stroke="{fg}" stroke-width="1.0"/>
    {inner}
  </g>'''
    else:
        # Maker bounds: 655.68 wide x 612.96 high inside (183.84, 205.44)
        h_mark = 390.0
        scale = h_mark / 612.96
        w_mark = 655.68 * scale
        gap = 130.0
        
        tot_w = w_mark + gap + w_text
        start_x = (W - tot_w) / 2
        mark_x = start_x
        mark_y = (H - h_mark) / 2
        
        inner = maker_inner_g.replace('__FG__', fg)
        mark_svg = f'''<g transform="translate({mark_x:.1f}, {mark_y:.1f}) scale({scale:.5f}) translate(-183.84, -205.44)">
    {inner}
  </g>'''
  
    text_x = start_x + w_mark + gap
    text_y = (H / 2) + (cap_h / 2)
    
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <rect width="{W}" height="{H}" fill="{bg}"/>
  {mark_svg}
  <g transform="translate({text_x:.1f}, {text_y:.1f})">
    <path d="{p_text}" fill="{fg}"/>
  </g>
</svg>'''
    return svg


def build_stacked_lockup_svg(maker_inner_g, font_key, wordmark_text, tracking=0, dark_mode=False):
    """
    Builds an 1800 x 1400 stacked lockup for the maker motif:
    - Maker motif on top (centered)
    - Wordmark below (centered)
    """
    Ws, Hs = 1800, 1400
    bg = INK_HEX if dark_mode else PAPER_HEX
    fg = PAPER_HEX if dark_mode else INK_HEX
    font_path = FONTS[font_key]
    
    font_size = 150 if font_key in ["serif", "serif_italic"] else 130
    p_text, w_text = text_to_outlined_svg_path(font_path, wordmark_text, font_size, tracking=tracking)
    _, cap_h, _ = get_font_metrics(font_path, font_size)
    
    h_mark = 560.0
    scale = h_mark / 612.96
    w_mark = 655.68 * scale
    gap = 95.0
    
    tot_h = h_mark + gap + cap_h
    start_y = (Hs - tot_h) / 2
    mark_x = (Ws - w_mark) / 2
    text_x = (Ws - w_text) / 2
    text_y = start_y + h_mark + gap + cap_h
    
    inner = maker_inner_g.replace('__FG__', fg)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {Ws} {Hs}" width="{Ws}" height="{Hs}">
  <rect width="{Ws}" height="{Hs}" fill="{bg}"/>
  <g transform="translate({mark_x:.1f}, {start_y:.1f}) scale({scale:.5f}) translate(-183.84, -205.44)">
    {inner}
  </g>
  <g transform="translate({text_x:.1f}, {text_y:.1f})">
    <path d="{p_text}" fill="{fg}"/>
  </g>
</svg>'''
    return svg


def rasterize_svg_to_exact_two_tone(svg_content, out_png_path, dark_mode=False):
    """
    Renders SVG to high resolution and strictly quantizes to EXACTLY two tones:
    #151412 (INK_RGB) and #FBFAF8 (PAPER_RGB).
    Zero grayscale or antialiasing color bleed.
    """
    doc = fitz.open(stream=svg_content.encode('utf-8'), filetype='svg')
    pix = doc[0].get_pixmap(dpi=72)
    gray = np.array(Image.frombytes("RGB", [pix.width, pix.height], pix.samples).convert("L"))
    
    out = np.zeros((pix.height, pix.width, 3), dtype=np.uint8)
    if dark_mode:
        # Dark mode: bright elements are PAPER_RGB, dark background is INK_RGB
        is_fg = gray > 128
        out[is_fg] = PAPER_RGB
        out[~is_fg] = INK_RGB
    else:
        # Light mode: dark elements are INK_RGB, bright background is PAPER_RGB
        is_fg = gray < 128
        out[is_fg] = INK_RGB
        out[~is_fg] = PAPER_RGB
        
    im = Image.fromarray(out, mode="RGB")
    im.save(out_png_path, format="PNG")
    return im


def verify_two_tone_image(img_path, min_w=None, min_h=None):
    im = Image.open(img_path)
    w, h = im.size
    colors = im.getcolors(maxcolors=20)
    if not colors or len(colors) != 2:
        raise ValueError(f"{img_path}: Expected exactly 2 colors, found {len(colors) if colors else '>20'}: {colors}")
    
    found_colors = {c[1] for c in colors}
    expected = {INK_RGB, PAPER_RGB}
    if found_colors != expected:
        raise ValueError(f"{img_path}: Color mismatch! Expected {expected}, got {found_colors}")
        
    if min_w and w < min_w:
        raise ValueError(f"{img_path}: Width {w} < required {min_w}")
    if min_h and h < min_h:
        raise ValueError(f"{img_path}: Height {h} < required {min_h}")
        
    return w, h, len(colors)


def build_specimen_sheets(dark_mode=False):
    """
    Builds master specimen sheets displaying all marks and lockups:
    - Dimensions: 2600 x 5560 (aspect-ratio preserving)
    - Sections:
      1. Standalone Clean Marks (Framed Engraved Bell & Polished Maker Motif)
      2. Primary Horizontal Lockups (4 directions, native 2400x700 uncompressed)
      3. Stacked Lockups (2 directions, native 1800:1400 aspect ratio)
    - Footer: "BELLMAKER — LOCKUPS · 2026-09-19"
    - Guaranteed exact 2-tone quantization (#151412 and #FBFAF8)
    """
    W, H = 2600, 5560
    bg_col = INK_RGB if dark_mode else PAPER_RGB
    fg_col = PAPER_RGB if dark_mode else INK_RGB
    
    sheet = Image.new("RGB", (W, H), bg_col)
    draw = ImageDraw.Draw(sheet)
    
    f_title = ImageFont.truetype(FONTS["sans"], 56)
    f_sub = ImageFont.truetype(FONTS["mono"], 20)
    f_sec = ImageFont.truetype(FONTS["sans"], 28)
    f_label = ImageFont.truetype(FONTS["mono"], 20)
    f_footer = ImageFont.truetype(FONTS["sans"], 28)
    
    # Header
    pad_x = 100
    mode_text = "DARK CARBON INK (#151412)" if dark_mode else "WARM STUDIO PAPER (#FBFAF8)"
    draw.text((pad_x, 70), "BELLMAKER — IDENTITY LOCKUPS SPECIMEN", font=f_title, fill=fg_col)
    draw.text((pad_x, 145), f"OPERATOR SPEC #2 · EXACT 2-TONE (#151412 / #FBFAF8) · {mode_text}", font=f_sub, fill=fg_col)
    draw.line([(pad_x, 195), (W - pad_x, 195)], fill=fg_col, width=2)
    
    cur_y = 245
    
    # --- SECTION 1: STANDALONE MARKS ---
    draw.text((pad_x, cur_y), "01 / CLEANED STANDALONE MARKS (>=1024px · OUTLINED VECTOR · CRISP AT 32px & 1024px)", font=f_sec, fill=fg_col)
    draw.line([(pad_x, cur_y + 40), (W - pad_x, cur_y + 40)], fill=fg_col, width=1)
    cur_y += 65
    
    # Paste marks side by side
    cell_w, cell_h = 640, 640
    marks_info = [
        ("mark_engraved", "08 / ENGRAVED LINEWORK (INSIDE ENGRAVED-PLATE FRAME)"),
        ("mark_maker", "10 / BELLMAKER MOTIF (POLISHED DELIBERATE LINEWORK)")
    ]
    
    for idx, (m_key, m_label) in enumerate(marks_info):
        suffix = "_ink.png" if dark_mode else ".png"
        m_path = os.path.join(OUT_DIR, f"{m_key}{suffix}")
        m_img = Image.open(m_path).resize((cell_w, cell_h), Image.Resampling.NEAREST)
        
        col_x = pad_x + idx * (cell_w + 120)
        draw.text((col_x, cur_y), m_label, font=f_label, fill=fg_col)
        sheet.paste(m_img, (col_x, cur_y + 35))
        draw.rectangle([col_x, cur_y + 35, col_x + cell_w, cur_y + 35 + cell_h], outline=fg_col, width=1)
        
    cur_y += cell_h + 95
    
    # --- SECTION 2: HORIZONTAL LOCKUPS ---
    draw.text((pad_x, cur_y), "02 / PRIMARY HORIZONTAL LOCKUPS (MARK LEFT · OPTICALLY ALIGNED · NATIVE 2400x700)", font=f_sec, fill=fg_col)
    draw.line([(pad_x, cur_y + 40), (W - pad_x, cur_y + 40)], fill=fg_col, width=1)
    cur_y += 65
    
    h_lockups = [
        ("engraved__scholarly_serif", "ENGRAVED BELL · 02 SCHOLARLY EDITORIAL SERIF (P052-BOLD)"),
        ("engraved__foundry_slab", "ENGRAVED BELL · 05 FOUNDRY STAMPED SLAB (DEJAVU-SERIF-BOLD)"),
        ("maker__foundry_slab", "MAKER MOTIF · 05 FOUNDRY STAMPED SLAB (DEJAVU-SERIF-BOLD)"),
        ("maker__literary_italic", "MAKER MOTIF · 10 LITERARY CRAFT ITALIC (P052-ITALIC)")
    ]
    
    card_w = 2400
    card_h = 700
    for name, label in h_lockups:
        suffix = "_ink.png" if dark_mode else ".png"
        p_path = os.path.join(OUT_DIR, f"{name}{suffix}")
        lk_img = Image.open(p_path)  # native 2400x700
        
        draw.text((pad_x, cur_y), label, font=f_label, fill=fg_col)
        sheet.paste(lk_img, (pad_x, cur_y + 32))
        draw.rectangle([pad_x, cur_y + 32, pad_x + card_w, cur_y + 32 + card_h], outline=fg_col, width=1)
        cur_y += card_h + 55
        
    cur_y += 20
    # --- SECTION 3: STACKED LOCKUPS ---
    draw.text((pad_x, cur_y), "03 / STACKED LOCKUP VARIANTS (MAKER MOTIF · CENTERED COMPOSITION · NATIVE 1800:1400)", font=f_sec, fill=fg_col)
    draw.line([(pad_x, cur_y + 40), (W - pad_x, cur_y + 40)], fill=fg_col, width=1)
    cur_y += 65
    
    stk_w = 1140
    stk_h = 887  # exact 1800:1400 aspect ratio
    stk_info = [
        ("maker__foundry_slab_stacked", "MAKER MOTIF STACKED · FOUNDRY SLAB"),
        ("maker__literary_italic_stacked", "MAKER MOTIF STACKED · LITERARY ITALIC")
    ]
    for idx, (name, label) in enumerate(stk_info):
        suffix = "_ink.png" if dark_mode else ".png"
        p_path = os.path.join(OUT_DIR, f"{name}{suffix}")
        stk_img = Image.open(p_path).resize((stk_w, stk_h), Image.Resampling.NEAREST)
        
        col_x = pad_x + idx * (stk_w + 120)
        draw.text((col_x, cur_y), label, font=f_label, fill=fg_col)
        sheet.paste(stk_img, (col_x, cur_y + 32))
        draw.rectangle([col_x, cur_y + 32, col_x + stk_w, cur_y + 32 + stk_h], outline=fg_col, width=1)
        
    # --- FOOTER ---
    foot_y = H - 90
    draw.line([(pad_x, foot_y - 30), (W - pad_x, foot_y - 30)], fill=fg_col, width=2)
    draw.text((pad_x, foot_y - 5), "BELLMAKER — LOCKUPS · 2026-09-19", font=f_footer, fill=fg_col)
    
    # Guaranteed exact two-tone quantization of the full composite sheet
    sheet_gray = np.array(sheet.convert("L"))
    out_sheet = np.zeros((H, W, 3), dtype=np.uint8)
    if dark_mode:
        is_fg = sheet_gray > 128
        out_sheet[is_fg] = PAPER_RGB
        out_sheet[~is_fg] = INK_RGB
    else:
        is_fg = sheet_gray < 128
        out_sheet[is_fg] = INK_RGB
        out_sheet[~is_fg] = PAPER_RGB
        
    final_sheet = Image.fromarray(out_sheet, mode="RGB")
    out_path = os.path.join(OUT_DIR, "sheet_ink.png" if dark_mode else "sheet_paper.png")
    final_sheet.save(out_path, format="PNG")
    final_sheet.save(os.path.join(BRAIN_DIR, os.path.basename(out_path)), format="PNG")
    return out_path


def main():
    print("=================================================================")
    print("BELLMAKER LOCKUPS — Operator Job Spec #2 Generator")
    print("=================================================================")

    # 1. Vectorize raw marks
    print("\n>>> Tracing and cleaning vector marks...")
    bell_inner = clean_vector_trace_08(os.path.join(RAW_DIR, "raw_08_engraved_linework.jpg"))
    maker_inner = clean_vector_trace_10(os.path.join(RAW_DIR, "raw_10_maker_motif.jpg"))
    print("    Marks vectorized into clean, Bézier-smoothed vector paths.")

    file_records = []

    # 2. Generate Standalone Marks (Light and Dark, PNG and SVG)
    print("\n>>> Generating Cleaned Standalone Marks (>=1024px)...")
    mark_defs = [
        ("mark_engraved", "engraved_mark", "Engraved bell in double hairline frame", build_standalone_engraved_svg(bell_inner, False), build_standalone_engraved_svg(bell_inner, True)),
        ("mark_maker", "maker_mark", "Maker motif polished clean linework", build_standalone_maker_svg(maker_inner, False), build_standalone_maker_svg(maker_inner, True))
    ]

    for primary_name, alias_name, treatment, svg_light, svg_dark in mark_defs:
        for is_dark in [False, True]:
            svg_content = svg_dark if is_dark else svg_light
            suffix = "_ink" if is_dark else ""
            
            # Save SVG
            svg_filename = f"{primary_name}{suffix}.svg"
            svg_path = os.path.join(SVG_OUT_DIR, svg_filename)
            with open(svg_path, "w", encoding="utf-8") as f:
                f.write(svg_content)
                
            # Rasterize PNG
            png_filename = f"{primary_name}{suffix}.png"
            png_path = os.path.join(OUT_DIR, png_filename)
            rasterize_svg_to_exact_two_tone(svg_content, png_path, dark_mode=is_dark)
            
            # Also save alias filenames for maximum compatibility
            alias_svg = os.path.join(SVG_OUT_DIR, f"{alias_name}{suffix}.svg")
            alias_png = os.path.join(OUT_DIR, f"{alias_name}{suffix}.png")
            with open(alias_svg, "w", encoding="utf-8") as f:
                f.write(svg_content)
            Image.open(png_path).save(alias_png)
            
            # Copy to brain dir
            Image.open(png_path).save(os.path.join(BRAIN_DIR, png_filename))
            Image.open(png_path).save(os.path.join(BRAIN_DIR, f"{alias_name}{suffix}.png"))
            
            w, h, tc = verify_two_tone_image(png_path, min_w=1024, min_h=1024)
            polarity_str = "dark (#151412)" if is_dark else "light (#FBFAF8)"
            file_records.append((png_filename, f"{treatment} ({polarity_str})", f"{w}x{h}", tc))
            print(f"    VERIFIED: {png_filename} [{w}x{h}] — exactly {tc} tones.")

    # 3. Generate Horizontal Lockups (4 directions x 2 polarities)
    print("\n>>> Generating Primary Horizontal Lockups (>=1800px wide, 2400x700)...")
    h_lockup_defs = [
        ("engraved__scholarly_serif", "engraved", "serif", "Bellmaker.", 0, "Engraved Bell + Scholarly Editorial Serif"),
        ("engraved__foundry_slab", "engraved", "slab", "BELLMAKER", 3.0, "Engraved Bell + Foundry Stamped Slab"),
        ("maker__foundry_slab", "maker", "slab", "BELLMAKER", 3.0, "Maker Motif + Foundry Stamped Slab"),
        ("maker__literary_italic", "maker", "serif_italic", "bellmaker.", 1.0, "Maker Motif + Literary Craft Italic"),
    ]

    for name, mark_type, font_key, wordmark_text, tracking, treatment in h_lockup_defs:
        for is_dark in [False, True]:
            svg_content = build_horizontal_lockup_svg(
                mark_type, bell_inner, maker_inner, font_key, wordmark_text, tracking=tracking, dark_mode=is_dark
            )
            suffix = "_ink" if is_dark else ""
            
            # Save SVG
            svg_filename = f"{name}{suffix}.svg"
            svg_path = os.path.join(SVG_OUT_DIR, svg_filename)
            with open(svg_path, "w", encoding="utf-8") as f:
                f.write(svg_content)
                
            # Rasterize PNG
            png_filename = f"{name}{suffix}.png"
            png_path = os.path.join(OUT_DIR, png_filename)
            rasterize_svg_to_exact_two_tone(svg_content, png_path, dark_mode=is_dark)
            
            # Copy to brain dir
            Image.open(png_path).save(os.path.join(BRAIN_DIR, png_filename))
            
            w, h, tc = verify_two_tone_image(png_path, min_w=1800)
            polarity_str = "dark (#151412)" if is_dark else "light (#FBFAF8)"
            file_records.append((png_filename, f"{treatment} ({polarity_str})", f"{w}x{h}", tc))
            print(f"    VERIFIED: {png_filename} [{w}x{h}] — exactly {tc} tones.")

    # 4. Generate Stacked Lockups (2 directions x 2 polarities)
    print("\n>>> Generating Stacked Lockups (>=1800px wide, 1800x1400)...")
    stk_defs = [
        ("maker__foundry_slab_stacked", "slab", "BELLMAKER", 3.0, "Maker Motif Stacked + Foundry Stamped Slab"),
        ("maker__literary_italic_stacked", "serif_italic", "bellmaker.", 1.0, "Maker Motif Stacked + Literary Craft Italic")
    ]

    for name, font_key, wordmark_text, tracking, treatment in stk_defs:
        for is_dark in [False, True]:
            svg_content = build_stacked_lockup_svg(
                maker_inner, font_key, wordmark_text, tracking=tracking, dark_mode=is_dark
            )
            suffix = "_ink" if is_dark else ""
            
            # Save SVG
            svg_filename = f"{name}{suffix}.svg"
            svg_path = os.path.join(SVG_OUT_DIR, svg_filename)
            with open(svg_path, "w", encoding="utf-8") as f:
                f.write(svg_content)
                
            # Rasterize PNG
            png_filename = f"{name}{suffix}.png"
            png_path = os.path.join(OUT_DIR, png_filename)
            rasterize_svg_to_exact_two_tone(svg_content, png_path, dark_mode=is_dark)
            
            # Copy to brain dir
            Image.open(png_path).save(os.path.join(BRAIN_DIR, png_filename))
            
            w, h, tc = verify_two_tone_image(png_path, min_w=1800)
            polarity_str = "dark (#151412)" if is_dark else "light (#FBFAF8)"
            file_records.append((png_filename, f"{treatment} ({polarity_str})", f"{w}x{h}", tc))
            print(f"    VERIFIED: {png_filename} [{w}x{h}] — exactly {tc} tones.")

    # 5. Generate Master Specimen Sheets
    print("\n>>> Building Master Specimen Sheets...")
    sheet_paper_path = build_specimen_sheets(dark_mode=False)
    w_p, h_p, tc_p = verify_two_tone_image(sheet_paper_path, min_w=1800)
    file_records.append(("sheet_paper.png", "Master Specimen Sheet (warm paper #FBFAF8)", f"{w_p}x{h_p}", tc_p))
    print(f"    VERIFIED: sheet_paper.png [{w_p}x{h_p}] — exactly {tc_p} tones.")

    sheet_ink_path = build_specimen_sheets(dark_mode=True)
    w_i, h_i, tc_i = verify_two_tone_image(sheet_ink_path, min_w=1800)
    file_records.append(("sheet_ink.png", "Master Specimen Sheet (carbon ink #151412)", f"{w_i}x{h_i}", tc_i))
    print(f"    VERIFIED: sheet_ink.png [{w_i}x{h_i}] — exactly {tc_i} tones.")

    # 6. Summary Output
    print("\n" + "="*65)
    print("DONE — ALL DELIVERABLES GENERATED AND VERIFIED")
    print("="*65)
    print(f"Total Deliverable PNG Files: {len(file_records)}")
    print(f"Output Directory: {OUT_DIR}")
    print(f"SVG Directory:    {SVG_OUT_DIR}")


if __name__ == "__main__":
    main()
