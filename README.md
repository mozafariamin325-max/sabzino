# سبزینو | SABZINO

مارکت‌پلیس هوشمند بازیافت و اقتصاد چرخشی — پایلوت یاسوج

این نسخه، **فاز اول (MVP واقعی)** از پروژه کامل سبزینو است: یک PWA قابل نصب روی موبایل با بک‌اند واقعی (Django + DRF + دیتابیس)، نه یک نمونه نمایشی با داده ساختگی. تمام دکمه‌ها و صفحات فهرست‌شده در بخش «چه چیزی کار می‌کند» به API واقعی وصل هستند.

## چه چیزی کار می‌کند (فاز اول)

- ثبت‌نام / ورود (ایمیل یا شماره موبایل + رمز عبور — زیرساخت OTP واقعی آماده اما بدون سرویس پیامکی متصل نیست، بخش «قدم بعدی» را ببینید)
- داشبورد شهروند با کیف پول، امتیاز سبزینو، آمار بازیافت — همه از دیتابیس واقعی
- ثبت درخواست جمع‌آوری (ویزارد ۵ مرحله‌ای) با تخمین ارزش بر اساس قیمت روز
- پیگیری زنده وضعیت درخواست (ثبت‌شده → جستجوی جمع‌آور → پذیرفته‌شده → در مسیر → رسیده → جمع‌آوری‌شده → تکمیل)
- داشبورد جمع‌آور (شبیه اسنپ): آنلاین/آفلاین، مشاهده درخواست‌های نزدیک، پذیرش مأموریت، وزن‌کشی و تسویه خودکار کیف پول + امتیاز
- پنل اپراتور ایستگاه بازیافت: جستجوی شهروند، وزن‌کشی، صدور رسید
- کیف پول با تاریخچه تراکنش و درخواست برداشت وجه
- امتیاز سبزینو، سطح، رتبه‌بندی شهروندان
- نقشه و فهرست ایستگاه‌های بازیافت (با فاصله)
- فروشگاه/بازارگاه (مشاهده آگهی‌های فروش مواد)
- داشبورد مدیریت و داشبورد شهرداری با KPIهای واقعی محاسبه‌شده از دیتابیس
- پنل مدیریت کامل جنگو (`/admin/`) برای مدیریت کاربران، قیمت‌ها، کمیسیون، تأیید جمع‌آوران/کارخانه‌ها و غیره

داده‌های نمایش‌داده‌شده (قیمت مواد، کاربران، تراکنش‌ها) از یک Seed نمونه برای پایلوت یاسوج هستند و در رابط کاربری با نشان «داده نمونه» مشخص شده‌اند.

## معماری

```
sabzino/
  backend/     Django + Django REST Framework (اپ‌های ماژولار: accounts, collections, collectors,
               stations, wallet, rewards, marketplace, orders, municipality, pricing, ...)
  frontend/    React + TypeScript + Vite + Tailwind CSS + PWA (vite-plugin-pwa)
  docker-compose.yml
```

API نسخه‌بندی‌شده است: `/api/v1/...` — مستندات خودکار Swagger در `/api/docs/` در دسترس است.

## اجرای سریع با Docker (توصیه‌شده)

```bash
docker compose up --build
```

- فرانت‌اند: http://localhost:8080
- بک‌اند/API: http://localhost:8000/api/v1/
- پنل مدیریت جنگو: http://localhost:8000/admin/

پس از بالا آمدن، برای ساخت کاربر ادمین و داده نمونه یک‌بار این را اجرا کنید:

```bash
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py seed_demo
```

## اجرای دستی (بدون Docker)

### بک‌اند

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # ویندوز: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo      # داده نمونه پایلوت یاسوج (کاربران، قیمت‌ها، ایستگاه‌ها و ...)
python manage.py createsuperuser
python manage.py runserver
```

بک‌اند به‌صورت پیش‌فرض با SQLite کار می‌کند (نیاز به نصب دیتابیس جداگانه نیست). برای Postgres مقدار `DATABASE_URL` را در `.env` تنظیم کنید.

### فرانت‌اند (PWA)

```bash
cd frontend
npm install
cp .env.example .env.development   # آدرس بک‌اند را تنظیم کنید
npm run dev
```

سپس آدرس نمایش‌داده‌شده (مثلاً `http://localhost:5173`) را در مرورگر موبایل یا دسکتاپ باز کنید. برای نصب روی گوشی: در Chrome/Safari گزینه «Add to Home Screen» یا «نصب برنامه» را بزنید.

## ورود دمو

| نقش | شناسه | رمز عبور |
|---|---|---|
| ادمین | `admin@sabzino.demo` | `Admin@12345` |
| شهروند (۱۰ نفر اول نقش جمع‌آور هم دارند) | `citizen1@sabzino.demo` تا `citizen20@sabzino.demo` | `Demo@12345` |
| اپراتور ایستگاه | `station_op1@sabzino.demo` تا `station_op3@sabzino.demo` | `Demo@12345` |
| شهرداری | `municipality_yasuj` (ایمیل: `municipality@sabzino.demo`) | `Demo@12345` |

## استقرار روی وب — راهنمای گام‌به‌گام رایگان (بدون نیاز به سرور شخصی)

این مسیر با سرویس‌های رایگان Neon (دیتابیس) + Render (بک‌اند) + Vercel (فرانت‌اند PWA) تست‌شده و امروز (۲۰۲۶) معتبر است. حدود ۱۵-۲۰ دقیقه طول می‌کشد.

### مرحله ۰ — کد را روی گیت‌هاب بگذارید
یک ریپازیتوری جدید در [github.com](https://github.com/new) بسازید (مثلاً `sabzino`)، سپس در پوشه پروژه:
```bash
git remote add origin https://github.com/USERNAME/sabzino.git
git branch -M main
git push -u origin main
```

### مرحله ۱ — دیتابیس رایگان (Neon Postgres)
1. در [neon.com](https://neon.com) ثبت‌نام کنید (نیاز به کارت بانکی ندارد) و یک پروژه جدید بسازید.
2. از داشبورد Neon، مقدار **Connection string** را کپی کنید (چیزی شبیه `postgresql://user:pass@ep-xxxx.neon.tech/dbname?sslmode=require`).
   > توجه: پلن رایگان Render خودش هم Postgres دارد ولی بعد از ۳۰ روز پاک می‌شود؛ به همین دلیل Neon (که رایگان و بدون انقضا است) پیشنهاد شده.

### مرحله ۲ — بک‌اند (Render)
1. در [render.com](https://render.com) با گیت‌هاب ثبت‌نام کنید.
2. **New +ه** → **Blueprint** → ریپازیتوری `sabzino` را انتخاب کنید. Render فایل `render.yaml` را خودش پیدا و سرویس بک‌اند را می‌سازد.
3. وقتی برای متغیر `DATABASE_URL` پرسید، همان Connection string مرحله ۱ را وارد کنید.
4. Deploy را بزنید. بعد از چند دقیقه، آدرسی مثل `https://sabzino-backend.onrender.com` می‌گیرید.
5. از تب **Shell** همان سرویس در Render این دو دستور را یک‌بار اجرا کنید تا داده نمونه و کاربر ادمین ساخته شود:
   ```bash
   python manage.py seed_demo
   python manage.py createsuperuser
   ```

> پلن رایگان Render بعد از ۱۵ دقیقه بی‌فعالیتی می‌خوابد و درخواست بعدی حدود ۱ دقیقه طول می‌کشد تا بیدار شود — برای پایلوت/دمو مشکلی ندارد.

### مرحله ۳ — فرانت‌اند PWA (Vercel)
1. در [vercel.com](https://vercel.com) با گیت‌هاب ثبت‌نام کنید.
2. **Add New** → **Project** → همان ریپازیتوری `sabzino` را وارد کنید.
3. در تنظیمات پروژه: **Root Directory** را روی `frontend` بگذارید (Vercel خودش Vite را تشخیص می‌دهد).
4. یک Environment Variable اضافه کنید: `VITE_API_BASE_URL` = آدرس بک‌اند از مرحله ۲ (مثلاً `https://sabzino-backend.onrender.com`، بدون اسلش انتهایی).
5. Deploy را بزنید. آدرس نهایی چیزی مثل `https://sabzino.vercel.app` خواهد بود — همین را روی گوشی باز کنید و «Add to Home Screen» بزنید.

### مرحله ۴ — اتصال نهایی
بعد از گرفتن آدرس Vercel، در تنظیمات Render مقدار `CSRF_TRUSTED_ORIGINS` را برابر آدرس Vercel بگذارید (مثلاً `https://sabzino.vercel.app`) و سرویس را Redeploy کنید تا امن‌تر شود.

اگر ترجیح می‌دهید روی VPS یا زیرساخت شخصی خودتان بالا بیاورید، فایل `docker-compose.yml` ریشه پروژه دقیقاً همین کار را با یک دستور انجام می‌دهد:
```bash
docker compose up --build -d
```
و مقادیر `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `DATABASE_URL` را در `.env` واقعی تنظیم کنید. HTTPS الزامی است — PWA (Service Worker) فقط روی HTTPS یا localhost کار می‌کند.

## قدم‌های بعدی (خارج از فاز اول)

این‌ها در معماری پیش‌بینی شده‌اند اما در فاز اول به سرویس خارجی واقعی وصل نیستند:

- **OTP پیامکی واقعی**: مدل `accounts.OTPRequest` و ساختار آماده است؛ کافی‌ست یک سرویس پیامکی (مثلاً Kavenegar) و `SMS_PROVIDER_API_KEY` اضافه شود.
- **نقشه/تایل واقعی با ترافیک بالا**: در حال حاضر از تایل رایگان OpenStreetMap استفاده می‌شود؛ برای مقیاس بالاتر یک ارائه‌دهنده نقشه پولی (Neshan، Mapbox) پیشنهاد می‌شود.
- **پرداخت آنلاین شارژ کیف پول**: در حال حاضر شارژ کیف پول فقط از طریق تراکنش‌های سیستمی (تحویل پسماند) انجام می‌شود؛ درگاه پرداخت برای شارژ مستقیم توسط شهروند اضافه نشده است.
- **UI اختصاصی کامل برای کارخانه/خریدار عمده/شهرداری**: بک‌اند و API این نقش‌ها کامل است (مدل‌ها، Serializer، ViewSet)؛ رابط کاربری اختصاصی آن‌ها هنوز ساخته نشده و فعلاً از طریق پنل مدیریت جنگو یا API قابل مدیریت است.
- **AI (تشخیص تصویر، بهینه‌سازی مسیر، پیش‌بینی تقاضا)**: طبق طراحی پروژه، فقط لایه Interface آن (`core/ai_services.py`) ساخته شده تا بعداً بدون تغییر کدهای صدازننده متصل شود.

## ساختار API (خلاصه)

```
/api/v1/auth/            ثبت‌نام، ورود، پروفایل، آدرس‌ها
/api/v1/materials/       مواد قابل بازیافت و دسته‌بندی‌ها
/api/v1/pricing/         تاریخچه و مدیریت قیمت مواد
/api/v1/collections/     درخواست‌های جمع‌آوری شهروند + جریان جمع‌آور
/api/v1/collectors/      ثبت‌نام و پروفایل جمع‌آوران، خودروها، تأیید مدارک
/api/v1/stations/        ایستگاه‌های بازیافت + تراکنش اپراتور
/api/v1/wallet/          کیف پول و برداشت وجه
/api/v1/rewards/         امتیاز سبزینو، نشان‌ها، چالش‌ها، رتبه‌بندی
/api/v1/marketplace/     مراکز بازیافت، کارخانه، خریدار عمده، آگهی‌ها، نیازهای خرید
/api/v1/orders/          سفارش‌ها و موتور کمیسیون
/api/v1/municipality/    داشبورد و نقشه شهرداری
/api/v1/notifications/   اعلان‌ها
/api/v1/admin-dashboard/ KPIهای مدیریت
```

مستندات کامل و تعاملی: `/api/docs/`

## نکات فنی مهم

- **کمیسیون و امتیاز هرگز Hard-code نشده‌اند** — از طریق مدل `CommissionRule` و `PlatformSetting` (هر دو در پنل ادمین جنگو قابل تنظیم) محاسبه می‌شوند.
- **قیمت‌ها Snapshot می‌شوند** — تغییر قیمت یک ماده، تراکنش‌های قبلی را تغییر نمی‌دهد (`pricing.MaterialPrice` + `unit_price_snapshot` روی هر تراکنش).
- **دفتر کل کیف پول تغییرناپذیر است** — هر واریز/برداشت یک ردیف `WalletTransaction` جدید ایجاد می‌کند، هرگز ویرایش نمی‌شود.
- **Audit Log** برای عملیات حساس (ورود، تغییر قیمت، تأیید مدارک، سفارش‌ها، برداشت وجه) به‌صورت خودکار ثبت می‌شود.
