from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium", args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 420, "height": 900}, device_scale_factor=2)
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))

    page.goto("http://127.0.0.1:5173/login", wait_until="networkidle", timeout=20000)
    page.fill('input[placeholder="مثلاً 09120001001"]', "admin@sabzino.demo")
    page.fill('input[type="password"]', "Admin@12345")
    page.click('button[type="submit"]')
    page.wait_for_url("**/", timeout=10000)
    page.wait_for_timeout(800)

    page.goto("http://127.0.0.1:5173/admin", wait_until="networkidle")
    page.wait_for_timeout(800)

    # Drivers tab
    page.click("text=🚚 حساب رانندگان")
    page.wait_for_timeout(800)
    page.screenshot(path="/root/sabzino/admin_drivers_tab.png", full_page=False)

    # Withdrawals tab
    page.click("text=💳 برداشت وجه")
    page.wait_for_timeout(800)
    page.screenshot(path="/root/sabzino/admin_withdrawals_tab.png", full_page=False)

    # Requests tab
    page.click("text=📋 درخواست‌های جمع‌آوری")
    page.wait_for_timeout(800)
    page.screenshot(path="/root/sabzino/admin_requests_tab.png", full_page=False)

    # Expand the edit panel on first request row
    try:
        page.locator("text=✏️ اصلاح آدرس/توضیح").first.click(timeout=3000)
        page.wait_for_timeout(500)
        page.screenshot(path="/root/sabzino/admin_requests_edit_panel.png", full_page=False)
    except Exception as e:
        errors.append(f"edit-panel-failed: {e}")

    print("CONSOLE_ERRORS:", errors[:30])
    browser.close()
