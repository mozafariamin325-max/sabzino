from playwright.sync_api import sync_playwright

REQUEST_UID = "238117f2-7b6c-459f-9f07-d478206e5323"  # citizen1's completed request, value 1,890,000 toman

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium", args=["--no-sandbox"])

    # ---------- Mobile: citizen flows ----------
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))

    page.goto("http://127.0.0.1:5173/login", wait_until="networkidle", timeout=20000)
    page.fill('input[placeholder="مثلاً 09120001001"]', "citizen1@sabzino.demo")
    page.fill('input[type="password"]', "Demo@12345")
    page.click('button[type="submit"]')
    page.wait_for_url("**/", timeout=10000)
    page.wait_for_timeout(1500)
    page.screenshot(path="/root/sabzino/gi_shot_home.png", full_page=True)

    page.goto("http://127.0.0.1:5173/green-impact", wait_until="networkidle")
    page.wait_for_timeout(1200)
    page.screenshot(path="/root/sabzino/gi_shot_my_impact.png", full_page=True)

    page.goto("http://127.0.0.1:5173/green-impact/projects", wait_until="networkidle")
    page.wait_for_timeout(1200)
    page.screenshot(path="/root/sabzino/gi_shot_projects.png", full_page=True)

    # Request detail: collapsed teaser
    page.goto(f"http://127.0.0.1:5173/requests/{REQUEST_UID}", wait_until="networkidle")
    page.wait_for_timeout(1200)
    page.screenshot(path="/root/sabzino/gi_shot_request_detail.png", full_page=True)

    # Wallet ledger — proves green-impact contributions show up as ordinary transactions
    page.goto("http://127.0.0.1:5173/wallet", wait_until="networkidle")
    page.wait_for_timeout(1000)
    page.screenshot(path="/root/sabzino/gi_shot_wallet_ledger.png", full_page=True)

    page.goto(f"http://127.0.0.1:5173/requests/{REQUEST_UID}", wait_until="networkidle")
    page.wait_for_timeout(1000)

    # Expand the "choose your impact" form if the teaser card is present
    try:
        handle = page.locator("text=اختصاص به اثر سبز").element_handle(timeout=5000)
        page.evaluate("(el) => el.click()", handle)
        page.wait_for_timeout(700)
        page.screenshot(path="/root/sabzino/gi_shot_choice_expanded.png", full_page=True)
    except Exception as e:
        errors.append(f"expand-click-failed: {e}")

    page.close()

    # ---------- Desktop: admin dashboard ----------
    admin_page = browser.new_page(viewport={"width": 1440, "height": 960}, device_scale_factor=2)
    admin_page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    admin_page.on("pageerror", lambda exc: errors.append(f"pageerror(admin): {exc}"))

    admin_page.goto("http://127.0.0.1:5173/login", wait_until="networkidle", timeout=20000)
    admin_page.fill('input[placeholder="مثلاً 09120001001"]', "admin@sabzino.demo")
    admin_page.fill('input[type="password"]', "Admin@12345")
    admin_page.click('button[type="submit"]')
    admin_page.wait_for_url("**/", timeout=10000)
    admin_page.wait_for_timeout(1000)

    admin_page.goto("http://127.0.0.1:5173/admin", wait_until="networkidle")
    admin_page.wait_for_timeout(1500)
    try:
        admin_page.click("text=🌱 اثر سبز", timeout=5000)
        admin_page.wait_for_timeout(1500)
    except Exception as e:
        errors.append(f"admin-tab-click-failed: {e}")
    admin_page.screenshot(path="/root/sabzino/gi_shot_admin_dashboard.png", full_page=True)

    print("CONSOLE_ERRORS:", errors[:30])
    browser.close()
