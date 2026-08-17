from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium", args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))

    page.goto("http://127.0.0.1:5173/login", wait_until="networkidle")
    page.fill('input[placeholder="مثلاً 09120001001"]', "citizen3@sabzino.demo")
    page.fill('input[type="password"]', "Demo@12345")
    page.click('button[type="submit"]')
    page.wait_for_url("**/", timeout=10000)

    page.goto("http://127.0.0.1:5173/requests/new", wait_until="networkidle")
    page.wait_for_timeout(500)
    # select first two material chips
    cards = page.locator("button:has-text('تومان/کیلو')")
    cards.nth(0).click()
    page.click("text=مرحله بعد")
    page.wait_for_timeout(300)
    # amount step
    page.click("text=۱۰ تا ۲۰ کیلو")
    page.click("text=مرحله بعد")
    page.wait_for_timeout(300)
    # address step - type new address
    page.fill("textarea", "یاسوج، خیابان تست پلی‌رایت، پلاک ۱")
    page.click("text=مرحله بعد")
    page.wait_for_timeout(300)
    # time/description step
    page.click("text=مرحله بعد")
    page.wait_for_timeout(300)
    page.screenshot(path="/root/sabzino/shot_wizard_confirm.png")
    page.click("text=ثبت نهایی درخواست")
    page.wait_for_timeout(2000)
    page.screenshot(path="/root/sabzino/shot_request_detail.png")
    print("URL after submit:", page.url)
    print("ERRORS:", errors)
    browser.close()
