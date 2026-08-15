from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium", args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    page.goto("http://127.0.0.1:5173/login", wait_until="networkidle")
    page.fill('input[placeholder="مثلاً 09120001001"]', "citizen1@sabzino.demo")
    page.fill('input[type="password"]', "Demo@12345")
    page.click('button[type="submit"]')
    page.wait_for_url("**/", timeout=10000)
    page.goto("http://127.0.0.1:5173/collector", wait_until="networkidle")
    page.wait_for_timeout(1500)
    page.screenshot(path="/root/sabzino/shot_collector.png")
    browser.close()
