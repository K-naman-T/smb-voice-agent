#!/usr/bin/env python3
"""
Typography-Based Logo Generator for "Bellmaker".
Generates 10 distinct typographic logo directions in the category of iconic tech/AI marks:
- Flat typography on uniform backgrounds (#FBFAF8 warm paper and #151412 carbon black)
- High-resolution standalone logo PNGs + scalable vector SVGs for all 10 directions
- Master Specimen Comparison Sheets (Light and Dark)
"""

import os
from PIL import Image, ImageDraw, ImageFont

INK = "#151412"
PAPER = "#FBFAF8"
GREEN = "#1B5E3C"
BRIGHT_GREEN = "#22C55E"
HAIRLINE = "#E8E4DD"
MUTED = "#6E6A63"
DARK_MUTED = "#9E9A92"

OUTPUT_DIR = "/home/knamant/orca/workspaces/smb-voice-agent/char/web/public/assets/art/logos"
BRAIN_DIR = "/home/knamant/.gemini/antigravity-cli/brain/a90fd5b1-27f7-4a11-8ce1-ed3e51406fdd"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(BRAIN_DIR, exist_ok=True)

# Font paths
FONTS = {
    "swiss": "/usr/share/fonts/opentype/urw-base35/NimbusSansNarrow-Bold.otf",
    "serif": "/usr/share/fonts/opentype/urw-base35/P052-Bold.otf",
    "serif_italic": "/usr/share/fonts/opentype/urw-base35/P052-Italic.otf",
    "bookman_italic": "/usr/share/fonts/opentype/urw-base35/URWBookman-LightItalic.otf",
    "sans": "/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf",
    "sans_reg": "/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf",
    "archivo": "/home/knamant/.gemini/antigravity-cli/scratch/Archivo-Variable.ttf",
    "slab": "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    "mono": "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf",
    "mono_reg": "/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf",
}


def draw_logo_card(direction_key, width=1200, height=420, dark_mode=False):
    bg_color = INK if dark_mode else PAPER
    fg_color = PAPER if dark_mode else INK
    sec_color = DARK_MUTED if dark_mode else MUTED
    accent = BRIGHT_GREEN if dark_mode else GREEN
    
    im = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(im)
    
    cx, cy = width // 2, height // 2
    
    if direction_key == 1:
        # Direction 1: Swiss Monolithic Condensed
        main_font = ImageFont.truetype(FONTS["swiss"], 108)
        sub_font = ImageFont.truetype(FONTS["mono_reg"], 14)
        
        text = "BELLMAKER"
        sub = "ACOUSTIC INTELLIGENCE · ON-PREMISE"
        
        bbox = draw.textbbox((0, 0), text, font=main_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        
        tx = cx - tw // 2
        ty = cy - th // 2 - 18
        draw.text((tx, ty), text, font=main_font, fill=fg_color)
        
        s_bbox = draw.textbbox((0, 0), sub, font=sub_font)
        sw = s_bbox[2] - s_bbox[0]
        draw.text((cx - sw // 2, ty + th + 28), sub, font=sub_font, fill=sec_color)
        draw.line([(cx - 140, ty + th + 54), (cx + 140, ty + th + 54)], fill=sec_color, width=1)

    elif direction_key == 2:
        # Direction 2: The Scholarly Editorial Serif (Anthropic / Academic Press)
        main_font = ImageFont.truetype(FONTS["serif"], 98)
        sub_font = ImageFont.truetype(FONTS["serif"], 18)
        
        text = "Bellmaker"
        dot = "."
        
        bbox = draw.textbbox((0, 0), text, font=main_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        
        tx = cx - tw // 2 - 8
        ty = cy - th // 2 - 15
        draw.text((tx, ty), text, font=main_font, fill=fg_color)
        
        # Accent period dot in forest green
        draw.text((tx + tw + 2, ty), dot, font=main_font, fill=accent)
        
        sub = "The Sovereign Voice Model"
        s_bbox = draw.textbbox((0, 0), sub, font=sub_font)
        sw = s_bbox[2] - s_bbox[0]
        draw.text((cx - sw // 2, ty + th + 26), sub, font=sub_font, fill=sec_color)

    elif direction_key == 3:
        # Direction 3: The Western Electric Monoline Telecom
        main_font = ImageFont.truetype(FONTS["sans"], 82)
        meta_font = ImageFont.truetype(FONTS["mono"], 13)
        
        text = "bellmaker"
        
        bbox = draw.textbbox((0, 0), text, font=main_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        
        tx = cx - tw // 2
        ty = cy - th // 2 - 14
        draw.text((tx, ty), text, font=main_font, fill=fg_color)
        
        # Dial indicator / status pill tag
        tag = "MODEL 280-MS"
        t_bbox = draw.textbbox((0, 0), tag, font=meta_font)
        tag_w = t_bbox[2] - t_bbox[0]
        
        badge_x1 = cx - tag_w // 2 - 12
        badge_y1 = ty + th + 26
        badge_x2 = cx + tag_w // 2 + 12
        badge_y2 = badge_y1 + 24
        
        border_col = "#33312E" if dark_mode else "#DDD8CF"
        draw.rounded_rectangle([badge_x1, badge_y1, badge_x2, badge_y2], radius=12, outline=border_col, width=1)
        draw.text((cx - tag_w // 2, badge_y1 + 4), tag, font=meta_font, fill=sec_color)

    elif direction_key == 4:
        # Direction 4: The Acoustic Split / Interpunct Wordmark
        main_font = ImageFont.truetype(FONTS["archivo"], 92)
        sub_font = ImageFont.truetype(FONTS["mono_reg"], 13)
        
        p1 = "BELL"
        interpunct = " · "
        p2 = "MAKER"
        
        w1 = draw.textbbox((0, 0), p1, font=main_font)[2]
        wi = draw.textbbox((0, 0), interpunct, font=main_font)[2]
        w2 = draw.textbbox((0, 0), p2, font=main_font)[2]
        total_w = w1 + wi + w2
        th = draw.textbbox((0, 0), p1, font=main_font)[3]
        
        tx = cx - total_w // 2
        ty = cy - th // 2 - 16
        
        draw.text((tx, ty), p1, font=main_font, fill=fg_color)
        draw.text((tx + w1, ty), interpunct, font=main_font, fill=accent)
        draw.text((tx + w1 + wi, ty), p2, font=main_font, fill=fg_color)
        
        sub = "FORGED SOUND · ZERO CLOUD LATENCY"
        s_bbox = draw.textbbox((0, 0), sub, font=sub_font)
        sw = s_bbox[2] - s_bbox[0]
        draw.text((cx - sw // 2, ty + th + 28), sub, font=sub_font, fill=sec_color)

    elif direction_key == 5:
        # Direction 5: The Foundry Stamped Slab
        main_font = ImageFont.truetype(FONTS["slab"], 84)
        sub_font = ImageFont.truetype(FONTS["mono"], 13)
        
        text = "BELLMAKER"
        bbox = draw.textbbox((0, 0), text, font=main_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        
        tx = cx - tw // 2
        ty = cy - th // 2 - 12
        
        pad_x = 36
        pad_y = 20
        frame_col = "#383430" if dark_mode else "#D5CFC5"
        draw.rectangle([tx - pad_x, ty - pad_y, tx + tw + pad_x, ty + th + pad_y + 8], outline=frame_col, width=2)
        draw.text((tx, ty), text, font=main_font, fill=fg_color)
        
        sub = "EST. 2026 · LOCAL HARDWARE REGISTRATION"
        s_bbox = draw.textbbox((0, 0), sub, font=sub_font)
        sw = s_bbox[2] - s_bbox[0]
        draw.text((cx - sw // 2, ty + th + pad_y + 24), sub, font=sub_font, fill=sec_color)

    elif direction_key == 6:
        # Direction 6: The Sovereign Terminal Monospace
        main_font = ImageFont.truetype(FONTS["mono"], 76)
        sub_font = ImageFont.truetype(FONTS["mono_reg"], 14)
        
        p_left = "["
        name = "bellmaker"
        p_right = "]"
        
        w_l = draw.textbbox((0, 0), p_left, font=main_font)[2]
        w_n = draw.textbbox((0, 0), name, font=main_font)[2]
        w_r = draw.textbbox((0, 0), p_right, font=main_font)[2]
        total_w = w_l + w_n + w_r
        th = draw.textbbox((0, 0), name, font=main_font)[3]
        
        tx = cx - total_w // 2
        ty = cy - th // 2 - 18
        
        bracket_col = sec_color
        draw.text((tx, ty), p_left, font=main_font, fill=bracket_col)
        draw.text((tx + w_l, ty), name, font=main_font, fill=fg_color)
        draw.text((tx + w_l + w_n, ty), p_right, font=main_font, fill=bracket_col)
        
        # Solid cursor block
        cursor_x = tx + w_l + w_n + 16
        cursor_y = ty + 12
        cursor_h = th - 10
        draw.rectangle([cursor_x, cursor_y, cursor_x + 14, cursor_y + cursor_h], fill=accent)
        
        sub = "$ ./bellmaker --local-only --listen 127.0.0.1:8083"
        s_bbox = draw.textbbox((0, 0), sub, font=sub_font)
        sw = s_bbox[2] - s_bbox[0]
        draw.text((cx - sw // 2, ty + th + 30), sub, font=sub_font, fill=sec_color)

    elif direction_key == 7:
        # Direction 7: Nordic Ultra-Wide Tracking (B E L L M A K E R)
        main_font = ImageFont.truetype(FONTS["archivo"], 56)
        sub_font = ImageFont.truetype(FONTS["mono_reg"], 12)
        
        # Draw tracked letters
        chars = list("BELLMAKER")
        spacing = 42
        char_widths = [draw.textbbox((0, 0), ch, font=main_font)[2] for ch in chars]
        total_w = sum(char_widths) + spacing * (len(chars) - 1)
        th = draw.textbbox((0, 0), "B", font=main_font)[3]
        
        curr_x = cx - total_w // 2
        ty = cy - th // 2 - 16
        for ch, cw in zip(chars, char_widths):
            draw.text((curr_x, ty), ch, font=main_font, fill=fg_color)
            curr_x += cw + spacing
            
        sub = "N A T U R A L   V O I C E   F O U N D R Y"
        s_bbox = draw.textbbox((0, 0), sub, font=sub_font)
        sw = s_bbox[2] - s_bbox[0]
        draw.text((cx - sw // 2, ty + th + 34), sub, font=sub_font, fill=sec_color)

    elif direction_key == 8:
        # Direction 8: Acoustic Ligature / Dual Slash (BELL // MAKER)
        main_font = ImageFont.truetype(FONTS["sans"], 88)
        slash_font = ImageFont.truetype(FONTS["sans_reg"], 88)
        sub_font = ImageFont.truetype(FONTS["mono"], 13)
        
        t1 = "BELL"
        slashes = "//"
        t2 = "MAKER"
        
        w1 = draw.textbbox((0, 0), t1, font=main_font)[2]
        ws = draw.textbbox((0, 0), slashes, font=slash_font)[2]
        w2 = draw.textbbox((0, 0), t2, font=main_font)[2]
        pad = 20
        total_w = w1 + ws + w2 + pad * 2
        th = draw.textbbox((0, 0), t1, font=main_font)[3]
        
        tx = cx - total_w // 2
        ty = cy - th // 2 - 16
        
        draw.text((tx, ty), t1, font=main_font, fill=fg_color)
        draw.text((tx + w1 + pad, ty), slashes, font=slash_font, fill=accent)
        draw.text((tx + w1 + pad + ws + pad, ty), t2, font=main_font, fill=fg_color)
        
        sub = "LOW-LATENCY DUAL STREAM // LOCAL HOST"
        s_bbox = draw.textbbox((0, 0), sub, font=sub_font)
        sw = s_bbox[2] - s_bbox[0]
        draw.text((cx - sw // 2, ty + th + 30), sub, font=sub_font, fill=sec_color)

    elif direction_key == 9:
        # Direction 9: Precision Instrument Framing (Crosshairs & Bounding Coordinates)
        main_font = ImageFont.truetype(FONTS["mono"], 74)
        sub_font = ImageFont.truetype(FONTS["mono_reg"], 12)
        
        text = "BELLMAKER"
        bbox = draw.textbbox((0, 0), text, font=main_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        
        tx = cx - tw // 2
        ty = cy - th // 2 - 14
        draw.text((tx, ty), text, font=main_font, fill=fg_color)
        
        # Corner reticles / brackets
        arm = 22
        pad_x = 36
        pad_y = 20
        bx1, by1 = tx - pad_x, ty - pad_y
        bx2, by2 = tx + tw + pad_x, ty + th + pad_y + 4
        bracket_color = accent
        
        # Top-left corner
        draw.line([(bx1, by1), (bx1 + arm, by1)], fill=bracket_color, width=2)
        draw.line([(bx1, by1), (bx1, by1 + arm)], fill=bracket_color, width=2)
        # Top-right corner
        draw.line([(bx2, by1), (bx2 - arm, by1)], fill=bracket_color, width=2)
        draw.line([(bx2, by1), (bx2, by1 + arm)], fill=bracket_color, width=2)
        # Bottom-left corner
        draw.line([(bx1, by2), (bx1 + arm, by2)], fill=bracket_color, width=2)
        draw.line([(bx1, by2), (bx1, by2 - arm)], fill=bracket_color, width=2)
        # Bottom-right corner
        draw.line([(bx2, by2), (bx2 - arm, by2)], fill=bracket_color, width=2)
        draw.line([(bx2, by2), (bx2, by2 - arm)], fill=bracket_color, width=2)
        
        sub = "ACOUSTIC CORE · 24kHz HIGH-FIDELITY · 280ms LATENCY"
        s_bbox = draw.textbbox((0, 0), sub, font=sub_font)
        sw = s_bbox[2] - s_bbox[0]
        draw.text((cx - sw // 2, by2 + 20), sub, font=sub_font, fill=sec_color)

    elif direction_key == 10:
        # Direction 10: Literary Renaissance Italic (bellmaker.)
        main_font = ImageFont.truetype(FONTS["serif_italic"], 94)
        sub_font = ImageFont.truetype(FONTS["serif"], 18)
        
        text = "bellmaker"
        dot = "."
        
        bbox = draw.textbbox((0, 0), text, font=main_font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        
        tx = cx - tw // 2 - 6
        ty = cy - th // 2 - 16
        draw.text((tx, ty), text, font=main_font, fill=fg_color)
        draw.text((tx + tw + 2, ty), dot, font=main_font, fill=accent)
        
        sub = "The human voice, crafted locally."
        s_bbox = draw.textbbox((0, 0), sub, font=sub_font)
        sw = s_bbox[2] - s_bbox[0]
        draw.text((cx - sw // 2, ty + th + 28), sub, font=sub_font, fill=sec_color)

    return im


LABELS = [
    ("01 / SWISS MONOLITHIC", "Condensed architectural grotesque. Razor tight tracking. Linear & Braun register."),
    ("02 / SCHOLARLY EDITORIAL SERIF", "Classical transitional serif with terminal period dot. Anthropic & academic authority."),
    ("03 / WESTERN ELECTRIC MONOLINE", "Geometric 1950s telephony monoline. Hardware badge tag. Teenage Engineering register."),
    ("04 / ACOUSTIC INTERPUNCT", "Modern Grotesk with central acoustic resonance node. Vocal cadence & rhythm balance."),
    ("05 / FOUNDRY STAMPED SLAB", "Heavy bracketed slab serif in a stamped hairline border. Physical cast iron permanence."),
    ("06 / SOVEREIGN TERMINAL MONO", "Monospaced character cells with active terminal cursor. Replicate & local hacker tool."),
    ("07 / NORDIC ULTRA-WIDE", "Expansive geometric sans with wide tracking. Gallery exhibition & Scandinavian minimalism."),
    ("08 / ACOUSTIC LIGATURE SLASH", "Bold Grotesk with dynamic parallel routing slashes. Audio bus stream & ML pipeline."),
    ("09 / PRECISION TELEMETRY FRAME", "Engineered monospace with reticle corner brackets. Thinking Machines & aerospace telemetry."),
    ("10 / LITERARY CRAFT ITALIC", "Fluid humanistic italic with green terminal dot. Artisan craft & voice preservation.")
]

NAMES = [
    "01_swiss_condensed",
    "02_scholarly_serif",
    "03_telecom_monoline",
    "04_acoustic_interpunct",
    "05_foundry_slab",
    "06_terminal_mono",
    "07_nordic_wide",
    "08_acoustic_slash",
    "09_precision_frame",
    "10_literary_italic"
]


def generate_specimen_sheets():
    for dark in [False, True]:
        sheet_w = 1600
        sheet_h = 3900
        bg_col = INK if dark else PAPER
        fg_col = PAPER if dark else INK
        line_col = "#2A2825" if dark else "#DDD8CF"
        card_border = "#262422" if dark else "#E5E0D8"
        green_col = BRIGHT_GREEN if dark else GREEN
        muted_col = DARK_MUTED if dark else MUTED
        
        sheet = Image.new("RGB", (sheet_w, sheet_h), bg_col)
        draw = ImageDraw.Draw(sheet)
        
        header_font = ImageFont.truetype(FONTS["archivo"], 42)
        meta_font = ImageFont.truetype(FONTS["mono_reg"], 13)
        num_font = ImageFont.truetype(FONTS["mono"], 16)
        
        # Sheet Header
        draw.text((100, 70), "BELLMAKER — TYPOGRAPHIC LOGO SUITE", font=header_font, fill=fg_col)
        mode_text = "DARK CARBON (#151412)" if dark else "WARM PAPER (#FBFAF8)"
        draw.text((100, 130), f"CATEGORY SPECIMEN SHEET · FLAT TYPOGRAPHY ON UNIFORM {mode_text} · 10 DIRECTIONS", font=meta_font, fill=muted_col)
        draw.line([(100, 165), (sheet_w - 100, 165)], fill=line_col, width=1)
        
        card_w = 1400
        card_h = 300
        start_y = 215
        spacing = 350
        
        for i in range(1, 11):
            y_pos = start_y + (i - 1) * spacing
            title, desc = LABELS[i - 1]
            draw.text((100, y_pos - 32), title, font=num_font, fill=green_col)
            draw.text((430, y_pos - 32), f"— {desc}", font=meta_font, fill=muted_col)
            
            card_img = draw_logo_card(i, width=card_w, height=card_h, dark_mode=dark)
            sheet.paste(card_img, (100, y_pos))
            draw.rectangle([100, y_pos, 100 + card_w, y_pos + card_h], outline=card_border, width=1)
            
        # Sheet Footer
        draw.line([(100, sheet_h - 90), (sheet_w - 100, sheet_h - 90)], fill=line_col, width=1)
        draw.text((100, sheet_h - 65), "BELLMAKER ACOUSTIC INTELLIGENCE · 10 TYPOGRAPHIC DIRECTIONS · ZERO ARTIFACTS", font=meta_font, fill=muted_col)
        
        fname = "bellmaker_logo_specimens_dark.png" if dark else "bellmaker_logo_specimens.png"
        out_path = os.path.join(OUTPUT_DIR, fname)
        sheet.save(out_path, format="PNG")
        sheet.save(os.path.join(BRAIN_DIR, fname), format="PNG")
        print("Saved master specimen sheet to:", out_path)


def generate_all_standalone_pngs():
    for i, name in enumerate(NAMES, start=1):
        # Light mode (#FBFAF8 paper)
        im_light = draw_logo_card(i, width=1200, height=420, dark_mode=False)
        p_light = os.path.join(OUTPUT_DIR, f"bellmaker_logo_{name}_paper.png")
        im_light.save(p_light, format="PNG")
        im_light.save(os.path.join(BRAIN_DIR, f"bellmaker_logo_{name}_paper.png"), format="PNG")
        
        # Dark mode (#151412 carbon)
        im_dark = draw_logo_card(i, width=1200, height=420, dark_mode=True)
        p_dark = os.path.join(OUTPUT_DIR, f"bellmaker_logo_{name}_carbon.png")
        im_dark.save(p_dark, format="PNG")
        im_dark.save(os.path.join(BRAIN_DIR, f"bellmaker_logo_{name}_carbon.png"), format="PNG")
        print(f"Generated standalone PNGs for {name}")


def generate_svg_vectors():
    svgs = {
        "01_swiss_condensed": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160" width="100%" height="100%">
  <text x="300" y="85" text-anchor="middle" font-family="'Nimbus Sans Narrow', 'Helvetica Neue Condensed', 'Arial Narrow', sans-serif" font-size="64" font-weight="900" letter-spacing="2" fill="currentColor">BELLMAKER</text>
  <text x="300" y="116" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9" letter-spacing="4" fill="#6E6A63">ACOUSTIC INTELLIGENCE · ON-PREMISE</text>
  <line x1="220" y1="130" x2="380" y2="130" stroke="#6E6A63" stroke-width="0.8" opacity="0.4"/>
</svg>''',

        "02_scholarly_serif": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160" width="100%" height="100%">
  <text x="300" y="88" text-anchor="middle" font-family="'P052', 'Palatino Linotype', 'Book Antiqua', Georgia, serif" font-size="58" font-weight="700" letter-spacing="-0.5" fill="currentColor">Bellmaker<tspan fill="#1B5E3C">.</tspan></text>
  <text x="300" y="120" text-anchor="middle" font-family="'P052', Georgia, serif" font-size="12" font-style="italic" letter-spacing="1" fill="#6E6A63">The Sovereign Voice Model</text>
</svg>''',

        "03_telecom_monoline": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160" width="100%" height="100%">
  <text x="300" y="82" text-anchor="middle" font-family="'Nimbus Sans', 'Helvetica Neue', Arial, sans-serif" font-size="54" font-weight="700" letter-spacing="-0.5" fill="currentColor">bellmaker</text>
  <rect x="238" y="102" width="124" height="20" rx="10" fill="none" stroke="#6E6A63" stroke-width="1" opacity="0.6"/>
  <text x="300" y="116" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9" font-weight="700" letter-spacing="1.5" fill="#6E6A63">MODEL 280-MS</text>
</svg>''',

        "04_acoustic_interpunct": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160" width="100%" height="100%">
  <text x="300" y="85" text-anchor="middle" font-family="'Archivo', 'Inter', sans-serif" font-size="56" font-weight="800" letter-spacing="3" fill="currentColor">BELL <tspan fill="#1B5E3C">·</tspan> MAKER</text>
  <text x="300" y="118" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9" letter-spacing="3" fill="#6E6A63">FORGED SOUND · ZERO CLOUD LATENCY</text>
</svg>''',

        "05_foundry_slab": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160" width="100%" height="100%">
  <rect x="135" y="32" width="330" height="74" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.75"/>
  <text x="300" y="84" text-anchor="middle" font-family="'DejaVu Serif', 'Rockwell', 'Clarendon', serif" font-size="48" font-weight="700" letter-spacing="2" fill="currentColor">BELLMAKER</text>
  <text x="300" y="128" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" letter-spacing="2" fill="#6E6A63">EST. 2026 · LOCAL HARDWARE REGISTRATION</text>
</svg>''',

        "06_terminal_mono": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160" width="100%" height="100%">
  <text x="300" y="84" text-anchor="middle" font-family="'Liberation Mono', 'JetBrains Mono', monospace" font-size="46" font-weight="700" letter-spacing="1" fill="currentColor"><tspan fill="#6E6A63">[</tspan>bellmaker<tspan fill="#6E6A63">]</tspan></text>
  <rect x="424" y="52" width="10" height="34" fill="#1B5E3C"/>
  <text x="300" y="120" text-anchor="middle" font-family="'Liberation Mono', monospace" font-size="10" letter-spacing="1" fill="#6E6A63">$ ./bellmaker --local-only --listen 127.0.0.1:8083</text>
</svg>''',

        "07_nordic_wide": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160" width="100%" height="100%">
  <text x="300" y="82" text-anchor="middle" font-family="'Archivo', 'Inter', sans-serif" font-size="34" font-weight="700" letter-spacing="18" fill="currentColor">BELLMAKER</text>
  <text x="300" y="118" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" letter-spacing="6" fill="#6E6A63">NATURAL VOICE FOUNDRY</text>
</svg>''',

        "08_acoustic_slash": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160" width="100%" height="100%">
  <text x="300" y="84" text-anchor="middle" font-family="'Nimbus Sans', 'Helvetica Neue', sans-serif" font-size="52" font-weight="800" letter-spacing="2" fill="currentColor">BELL <tspan fill="#1B5E3C" font-weight="400">//</tspan> MAKER</text>
  <text x="300" y="118" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9" letter-spacing="3" fill="#6E6A63">LOW-LATENCY DUAL STREAM // LOCAL HOST</text>
</svg>''',

        "09_precision_frame": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160" width="100%" height="100%">
  <!-- Reticle Framing Brackets -->
  <path d="M 160 50 L 140 50 L 140 70 M 440 50 L 460 50 L 460 70 M 140 85 L 140 105 L 160 105 M 460 85 L 460 105 L 440 105" stroke="#1B5E3C" stroke-width="1.8" fill="none"/>
  <text x="300" y="86" text-anchor="middle" font-family="'Liberation Mono', 'JetBrains Mono', monospace" font-size="44" font-weight="700" letter-spacing="3" fill="currentColor">BELLMAKER</text>
  <text x="300" y="124" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" letter-spacing="2" fill="#6E6A63">ACOUSTIC CORE · 24kHz HIGH-FIDELITY · 280ms LATENCY</text>
</svg>''',

        "10_literary_italic": '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 160" width="100%" height="100%">
  <text x="300" y="86" text-anchor="middle" font-family="'P052', 'Palatino Linotype', Georgia, serif" font-size="56" font-style="italic" font-weight="700" letter-spacing="0.5" fill="currentColor">bellmaker<tspan fill="#1B5E3C">.</tspan></text>
  <text x="300" y="120" text-anchor="middle" font-family="'P052', Georgia, serif" font-size="12" letter-spacing="0.8" fill="#6E6A63">The human voice, crafted locally.</text>
</svg>'''
    }
    
    for fname, code in svgs.items():
        svg_path = os.path.join(OUTPUT_DIR, f"{fname}.svg")
        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(code)
        print(f"Exported vector SVG: {svg_path}")


if __name__ == "__main__":
    generate_all_standalone_pngs()
    generate_svg_vectors()
    generate_specimen_sheets()
    print("All 10 Bellmaker typography logo variations generated successfully.")
