import sys
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium", args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)

    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: console_errors.append(f"pageerror: {exc}"))

    page.goto("http://127.0.0.1:5173/login", wait_until="networkidle", timeout=20000)
    page.fill('input[placeholder="مثلاً 09120001001"]', "citizen1@sabzino.demo")
    page.fill('input[type="password"]', "Demo@12345")
    page.click('button[type="submit"]')
    page.wait_for_url("**/", timeout=10000)
    page.wait_for_timeout(1500)
    page.screenshot(path="/root/sabzino/shot_home.png")

    page.goto("http://127.0.0.1:5173/requests/new", wait_until="networkidle")
    page.wait_for_timeout(1000)
    page.screenshot(path="/root/sabzino/shot_wizard.png")

    page.goto("http://127.0.0.1:5173/wallet", wait_until="networkidle")
    page.wait_for_timeout(1000)
    page.screenshot(path="/root/sabzino/shot_wallet.png")

    page.goto("http://127.0.0.1:5173/stations", wait_until="networkidle")
    page.wait_for_timeout(1500)
    page.screenshot(path="/root/sabzino/shot_stations.png")

    page.goto("http://127.0.0.1:5173/profile", wait_until="networkidle")
    page.wait_for_timeout(1000)
    page.screenshot(path="/root/sabzino/shot_profile.png")

    print("CONSOLE_ERRORS:", console_errors[:20])
    browser.close()
