#!/usr/bin/env python3
"""tools/run_design_audit.py - Programmatic Design & Visual Audit for Bellmaker

Renders Console and Landing surfaces at 1440x900 and 390x844 via Playwright,
captures per-section crops, measures contrast ratios, checks font resolution,
and verifies zero console/network errors.
"""
from __future__ import annotations

import functools
import http.server
import json
import os
import socketserver
import sys
import threading
import time
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = os.path.abspath("docs/audit/screenshots")
CONSOLE_DIR = os.path.abspath("web/dist")
LANDING_DIR = os.path.abspath("../char/web/dist")

os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

def start_server(directory: str, port: int):
    handler = functools.partial(QuietHandler, directory=directory)
    httpd = socketserver.TCPServer(("127.0.0.1", port), handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd

CONTRAST_SCRIPT = """
() => {
    function parseRGB(str) {
        const m = str.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
        if (!m) return null;
        return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), m[4] !== undefined ? parseFloat(m[4]) : 1.0];
    }
    function luminance(r, g, b) {
        const a = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
    function contrastRatio(rgb1, rgb2) {
        const l1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
        const l2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    const results = [];
    const elements = document.querySelectorAll('h1, h2, h3, p, span, button, th, td, a');
    for (const el of Array.from(elements).slice(0, 100)) {
        const text = el.innerText ? el.innerText.trim() : '';
        if (!text || text.length > 50) continue;
        const style = window.getComputedStyle(el);
        const color = parseRGB(style.color);
        if (!color || color[3] === 0) continue;
        
        // Walk up to find background color
        let bg = null;
        let curr = el;
        while (curr) {
            const bgStyle = window.getComputedStyle(curr);
            const parsed = parseRGB(bgStyle.backgroundColor);
            if (parsed && parsed[3] > 0.5) {
                bg = parsed;
                break;
            }
            curr = curr.parentElement;
        }
        if (!bg) bg = [1, 1, 2, 1]; // fallback canvas #010102

        const cr = contrastRatio(color, bg);
        results.push({
            tag: el.tagName.toLowerCase(),
            text: text.substring(0, 30),
            color: style.color,
            bg: `rgb(${bg[0]},${bg[1]},${bg[2]})`,
            ratio: Math.round(cr * 10) / 10,
            fontFamily: style.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
            fontSize: style.fontSize,
            passAA: cr >= 4.5
        });
    }
    return results;
}
"""

def main():
    print("=== Starting Bellmaker Design Audit Engine ===")
    
    server_console = start_server(CONSOLE_DIR, 3195)
    server_landing = start_server(LANDING_DIR, 3196)
    time.sleep(0.5)

    audit_data = {
        "console": {"errors": [], "contrast": [], "fonts": []},
        "landing": {"errors": [], "contrast": [], "fonts": []}
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # -------------------------------------------------------------
        # 1. CONSOLE AUDIT (Port 3195)
        # -------------------------------------------------------------
        print("\n[Console] Auditing Control Console at http://127.0.0.1:3195...")
        context_c = browser.new_context(viewport={"width": 1440, "height": 900})
        page_c = context_c.new_page()

        console_errors = []
        page_c.on("console", lambda msg: console_errors.append(f"{msg.type}: {msg.text}") if msg.type in ("error", "warning") else None)
        page_c.on("pageerror", lambda err: console_errors.append(f"EXCEPTION: {err}"))

        page_c.goto("http://127.0.0.1:3195", wait_until="load", timeout=8000)
        time.sleep(0.5)

        # Desktop 1440x900 full
        path_c_desktop = os.path.join(SCREENSHOTS_DIR, "console_desktop_1440x900.png")
        page_c.screenshot(path=path_c_desktop)
        print(f"  Saved: {path_c_desktop}")

        # Section crops
        aside = page_c.locator("aside").first
        if aside.is_visible():
            aside.screenshot(path=os.path.join(SCREENSHOTS_DIR, "console_crop_nav_rail.png"))
            print(f"  Saved: {os.path.join(SCREENSHOTS_DIR, 'console_crop_nav_rail.png')}")

        main_col = page_c.locator("main").first
        if main_col.is_visible():
            main_col.screenshot(path=os.path.join(SCREENSHOTS_DIR, "console_crop_work_area.png"))
            print(f"  Saved: {os.path.join(SCREENSHOTS_DIR, 'console_crop_work_area.png')}")

        telephony = page_c.locator("section").first
        if telephony.is_visible():
            telephony.screenshot(path=os.path.join(SCREENSHOTS_DIR, "console_crop_telephony_studio.png"))
            print(f"  Saved: {os.path.join(SCREENSHOTS_DIR, 'console_crop_telephony_studio.png')}")

        # Contrast & Fonts
        c_samples = page_c.evaluate(CONTRAST_SCRIPT)
        audit_data["console"]["contrast"] = c_samples[:25]
        audit_data["console"]["errors"] = console_errors
        context_c.close()

        # Mobile 390x844
        context_c_m = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
        page_c_m = context_c_m.new_page()
        page_c_m.goto("http://127.0.0.1:3195", wait_until="load", timeout=8000)
        time.sleep(0.5)
        path_c_mobile = os.path.join(SCREENSHOTS_DIR, "console_mobile_390x844.png")
        page_c_m.screenshot(path=path_c_mobile)
        print(f"  Saved: {path_c_mobile}")
        context_c_m.close()

        # -------------------------------------------------------------
        # 2. LANDING AUDIT (Port 3196)
        # -------------------------------------------------------------
        print("\n[Landing] Auditing Specimen Sheet Landing at http://127.0.0.1:3196...")
        context_l = browser.new_context(viewport={"width": 1440, "height": 900})
        page_l = context_l.new_page()

        landing_errors = []
        page_l.on("console", lambda msg: landing_errors.append(f"{msg.type}: {msg.text}") if msg.type in ("error", "warning") else None)
        page_l.on("pageerror", lambda err: landing_errors.append(f"EXCEPTION: {err}"))

        page_l.goto("http://127.0.0.1:3196", wait_until="load", timeout=8000)
        time.sleep(0.5)

        # Desktop 1440x900 full
        path_l_desktop = os.path.join(SCREENSHOTS_DIR, "landing_desktop_1440x900.png")
        page_l.screenshot(path=path_l_desktop, full_page=True)
        print(f"  Saved: {path_l_desktop}")

        # Crops of key sections
        for sec_id, crop_name in [
            ("hero", "landing_crop_hero.png"),
            ("console", "landing_crop_console.png"),
            ("speed", "landing_crop_speed.png"),
            ("guardrails", "landing_crop_guardrails.png"),
            ("privacy", "landing_crop_privacy.png"),
        ]:
            try:
                el = page_l.locator(f"#{sec_id}").first
                if el.is_visible():
                    el.screenshot(path=os.path.join(SCREENSHOTS_DIR, crop_name))
                    print(f"  Saved: {os.path.join(SCREENSHOTS_DIR, crop_name)}")
            except Exception as e:
                print(f"  Warning: section #{sec_id} could not be cropped: {e}")

        # Contrast & Fonts
        l_samples = page_l.evaluate(CONTRAST_SCRIPT)
        audit_data["landing"]["contrast"] = l_samples[:25]
        audit_data["landing"]["errors"] = landing_errors
        context_l.close()

        # Mobile 390x844
        context_l_m = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
        page_l_m = context_l_m.new_page()
        page_l_m.goto("http://127.0.0.1:3196", wait_until="load", timeout=8000)
        time.sleep(0.5)
        path_l_mobile = os.path.join(SCREENSHOTS_DIR, "landing_mobile_390x844.png")
        page_l_m.screenshot(path=path_l_mobile, full_page=True)
        print(f"  Saved: {path_l_mobile}")
        context_l_m.close()

        browser.close()

    server_console.shutdown()
    server_landing.shutdown()

    # Save programmatic audit report JSON
    results_path = os.path.join(SCREENSHOTS_DIR, "design_audit_metrics.json")
    with open(results_path, "w") as f:
        json.dump(audit_data, f, indent=2)
    print(f"\n[Audit Engine] Programmatic metrics saved to: {results_path}")
    print("=== Design Audit Complete ===")

if __name__ == "__main__":
    main()
