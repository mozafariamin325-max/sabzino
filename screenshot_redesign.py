from playwright.sync_api import sync_playwright

REQUEST_UID = "238117f2-7b6c-459f-9f07-d478206e5323"  # citizen1's completed request, value 1,890,000 toman

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium", args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))

    page.goto("http://127.0.0.1:5173/login", wait_until="networkidle", timeout=20000)
    page.fill('input[placeholder="مثلاً 09120001001"]', "citizen1@sabzino.demo")
    page.fill('input[type="password"]', "Demo@12345")
    page.click('button[type="submit"]')
    page.wait_for_url("**/", timeout=10000)
    page.wait_for_timeout(1000)

    # 1. Redesigned "اثر سبز من" profile page (with avatar header)
    page.goto("http://127.0.0.1:5173/green-impact", wait_until="networkidle")
    page.wait_for_timeout(1000)
    page.screenshot(path="/root/sabzino/redesign_profile.png", full_page=True)

    # 2. Slider-based allocation form on request detail
    page.goto(f"http://127.0.0.1:5173/requests/{REQUEST_UID}", wait_until="networkidle")
    page.wait_for_timeout(800)
    try:
        handle = page.locator("text=اختصاص به اثر سبز").element_handle(timeout=5000)
        page.evaluate("(el) => el.click()", handle)
        page.wait_for_timeout(500)
    except Exception as e:
        errors.append(f"expand-click-failed: {e}")
    # default state (100% cash)
    page.screenshot(path="/root/sabzino/redesign_slider_default.png", full_page=True)

    # toggle two projects to show the split
    try:
        rows = page.locator("button:has-text('توسعه فضای سبز شهری یاسوج')")
        rows.first.click(timeout=3000)
        page.wait_for_timeout(300)
        rows2 = page.locator("button:has-text('فرصت برابر برای کودکان')")
        rows2.first.click(timeout=3000)
        page.wait_for_timeout(300)
    except Exception as e:
        errors.append(f"toggle-failed: {e}")
    page.screenshot(path="/root/sabzino/redesign_slider_split.png", full_page=True)

    # 3. Project detail page
    page.goto("http://127.0.0.1:5173/green-impact/projects", wait_until="networkidle")
    page.wait_for_timeout(800)
    try:
        link = page.locator("text=توسعه فضای سبز شهری یاسوج").first
        link.click(timeout=5000)
        page.wait_for_timeout(800)
    except Exception as e:
        errors.append(f"detail-nav-failed: {e}")
    page.screenshot(path="/root/sabzino/redesign_project_detail.png", full_page=True)

    print("CONSOLE_ERRORS:", errors[:30])
    browser.close()
