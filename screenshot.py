import sys
from playwright.sync_api import sync_playwright

url = sys.argv[1]
out = sys.argv[2]
wait_selector = sys.argv[3] if len(sys.argv) > 3 else None

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium", args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    page.goto(url, wait_until="networkidle", timeout=20000)
    if wait_selector:
        try:
            page.wait_for_selector(wait_selector, timeout=5000)
        except Exception:
            pass
    page.wait_for_timeout(800)
    page.screenshot(path=out)
    browser.close()
print("saved", out)
