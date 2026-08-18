"""
Demo seed for SABZINO's Yasuj pilot (spec section 68). Everything created
here is clearly demo data — the frontend must label prices/records as
"داده نمونه" rather than presenting them as real market data.
"""
import random
from decimal import Decimal
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from accounts.models import User, UserRole, Role, Address
from locations.models import Province, City, District
from materials.models import MaterialCategory, Material
from pricing.models import MaterialPrice
from core.models import PlatformSetting
from collectors.models import CollectorProfile, Vehicle, VerificationStatus
from stations.models import RecyclingStation, StationOperator, StationTransaction
from marketplace.models import RecyclingCenter, Factory, Wholesaler, Listing
from collection_requests.models import CollectionRequest, RequestStatus, AmountRange
from collection_requests.services import log_status, accept_request, complete_weighing
from wallet.services import ensure_wallet
from rewards.services import ensure_points_account, award_points
from rewards.models import Badge, Challenge
from orders.models import CommissionRule


FIRST_NAMES = ["علی", "سارا", "محمد", "زهرا", "حسین", "فاطمه", "رضا", "مریم", "امیر", "نگار",
               "کیوان", "الناز", "بهروز", "شیدا", "آرش", "پریسا", "فرهاد", "لیلا", "سعید", "یاسمن"]
LAST_NAMES = ["احمدی", "محمدی", "رضایی", "کریمی", "حسینی", "موسوی", "صادقی", "نوری", "قاسمی", "یوسفی"]
DISTRICTS_YASUJ = ["پاسوج", "بلوار آزادی", "شهرک والفجر", "خیابان طالقانی", "شهرک امام حسین", "بلوار دانشجو"]


class Command(BaseCommand):
    help = "Seeds demo data for the SABZINO Yasuj pilot"

    def add_arguments(self, parser):
        parser.add_argument("--flush", action="store_true", help="Delete existing demo data first (dangerous).")
        parser.add_argument(
            "--materials-only", action="store_true",
            help="Only adds new material categories/materials/prices (idempotent, safe to run on a live/production database).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options.get("materials_only"):
            self.stdout.write(self.style.WARNING("در حال افزودن مواد جدید (بدون تغییر کاربران/درخواست‌ها)..."))
            self.seed_materials()
            self.stdout.write(self.style.SUCCESS("مواد جدید با موفقیت اضافه شدند."))
            return

        self.stdout.write(self.style.WARNING("در حال ساخت داده نمونه سبزینو..."))

        self.seed_settings()
        province, city = self.seed_locations()
        categories = self.seed_materials()
        self.seed_commission_rules()
        admin = self.seed_admin()
        municipality_user = self.seed_municipality(city)
        citizens = self.seed_citizens(20, city)
        collectors = self.seed_collectors(citizens[:10], city)
        stations = self.seed_stations(city, categories)
        self.seed_marketplace_orgs(city, categories)
        self.seed_requests_and_transactions(citizens, collectors, stations, categories)
        self.seed_badges_and_challenges()
        self.seed_green_impact(city)

        self.stdout.write(self.style.SUCCESS("داده نمونه با موفقیت ساخته شد."))
        self.stdout.write(self.style.SUCCESS(f"ادمین: {admin.username} / رمز: Admin@12345"))
        self.stdout.write(self.style.SUCCESS("شهروند نمونه: citizen1@sabzino.demo / Demo@12345"))
        self.stdout.write(self.style.SUCCESS("جمع‌آور نمونه: citizen1@sabzino.demo (نقش COLLECTOR هم دارد اگر جز ۱۰ نفر اول باشد)"))

    # ---------------------------------------------------------------- settings
    def seed_settings(self):
        defaults = {
            "commission_percent": ("10", "درصد کمیسیون پیش‌فرض بازارگاه"),
            "points_per_kg": ("2", "امتیاز سبزینو به ازای هر کیلوگرم"),
            "referral_reward_points": ("100", "پاداش امتیاز دعوت دوست"),
            "xp_per_level": ("500", "تجربه لازم برای هر سطح"),
        }
        for key, (value, desc) in defaults.items():
            PlatformSetting.objects.update_or_create(key=key, defaults={"value": value, "description": desc})

    # ---------------------------------------------------------------- locations
    def seed_locations(self):
        province, _ = Province.objects.get_or_create(name="کهگیلویه و بویراحمد")
        city, _ = City.objects.get_or_create(province=province, name="یاسوج", defaults={"lat": Decimal("30.6683"), "lng": Decimal("51.5877")})
        # Local-identity branding kit (spec section 13) — Yasuj active now,
        # other major cities pre-registered but dormant (has_identity=False)
        # so the architecture is ready without needing photo assets yet.
        city.has_identity = True
        city.landmark_name = "کوه دنا"
        city.landmark_icon = "🏔️"
        city.theme_color_from = "#0b3d24"
        city.theme_color_to = "#178a49"
        city.hero_tagline = "از دل زاگرس، برای یک یاسوج پاکیزه‌تر"
        city.save(update_fields=[
            "has_identity", "landmark_name", "landmark_icon", "theme_color_from", "theme_color_to", "hero_tagline",
        ])
        for d in DISTRICTS_YASUJ:
            District.objects.get_or_create(city=city, name=d)

        # گچساران و دهدشت هم در همان استان کهگیلویه و بویراحمد — هویت محلی فعال
        other_kb_cities = [
            (
                "گچساران", Decimal("30.3592"), Decimal("50.7981"),
                "سرزمین آب و آتش", "🔥", "#3a2a0b", "#c2790f",
                "از دل نفت و طبیعت، برای یک گچساران سبزتر",
            ),
            (
                "دهدشت", Decimal("30.7811"), Decimal("50.5708"),
                "دشت باستانی کهگیلویه", "🏛️", "#2b3d0b", "#6b9c1c",
                "دیار کهن کهگیلویه، سرسبز و پاکیزه",
            ),
        ]
        for name, lat, lng, landmark, icon, color_from, color_to, tagline in other_kb_cities:
            c, _ = City.objects.get_or_create(province=province, name=name, defaults={"lat": lat, "lng": lng})
            c.lat, c.lng = lat, lng
            c.has_identity = True
            c.landmark_name = landmark
            c.landmark_icon = icon
            c.theme_color_from = color_from
            c.theme_color_to = color_to
            c.hero_tagline = tagline
            c.save(update_fields=[
                "lat", "lng", "has_identity", "landmark_name", "landmark_icon",
                "theme_color_from", "theme_color_to", "hero_tagline",
            ])

        # شیراز و اصفهان — هویت محلی فعال (طبق درخواست کاربر)؛ تهران فعلاً خفته می‌ماند
        active_other_cities = [
            ("فارس", "شیراز", Decimal("29.5918"), Decimal("52.5837"), "تخت جمشید", "🏛️", "#4a2e0b", "#c2830f", "شهر گل و بلبل، حالا شهر بازیافت هم"),
            ("اصفهان", "اصفهان", Decimal("32.6546"), Decimal("51.6680"), "سی‌وسه‌پل", "🌉", "#0b2e4a", "#1c7fa6", "نصف جهان، نیمی هم برای طبیعت"),
        ]
        for prov_name, city_name, lat, lng, landmark, icon, color_from, color_to, tagline in active_other_cities:
            prov, _ = Province.objects.get_or_create(name=prov_name)
            c, _ = City.objects.get_or_create(province=prov, name=city_name, defaults={"lat": lat, "lng": lng})
            c.lat, c.lng = lat, lng
            c.has_identity = True
            c.landmark_name = landmark
            c.landmark_icon = icon
            c.theme_color_from = color_from
            c.theme_color_to = color_to
            c.hero_tagline = tagline
            c.save(update_fields=[
                "lat", "lng", "has_identity", "landmark_name", "landmark_icon",
                "theme_color_from", "theme_color_to", "hero_tagline",
            ])

        dormant_cities = [
            ("تهران", "تهران", "برج میلاد", "🌆"),
        ]
        for prov_name, city_name, landmark, icon in dormant_cities:
            prov, _ = Province.objects.get_or_create(name=prov_name)
            City.objects.get_or_create(
                province=prov, name=city_name,
                defaults={"landmark_name": landmark, "landmark_icon": icon, "has_identity": False},
            )
        return province, city

    # ---------------------------------------------------------------- materials
    def seed_materials(self):
        icons = {
            "پلاستیک": "♻️", "کاغذ و مقوا": "📦", "فلزات": "🔩", "شیشه": "🍾", "الکترونیک": "🔌",
            "پارچه و لباس": "👕", "روغن پخت‌وپز": "🛢️", "باتری و لوازم جانبی": "🔋", "لاستیک": "🛞", "چوب": "🪵",
        }
        categories = {}
        for i, cat_name in enumerate(icons):
            cat, _ = MaterialCategory.objects.get_or_create(name=cat_name, defaults={"icon": icons[cat_name], "order": i})
            categories[cat_name] = cat

        def slugify(name):
            return name.replace(" ", "-").replace("(", "").replace(")", "").replace("/", "-")

        def upsert_priced(cat_name, name, citizen_price, market_price, co2=Decimal("0.4")):
            """Create or update a material with a fixed per-kg buy price (always overwrites
            price to the given figures — this is a deliberate re-price, not a gap-fill)."""
            cat = categories[cat_name]
            slug = slugify(name)
            mat, created = Material.objects.get_or_create(
                slug=slug, defaults={"category": cat, "name": name, "co2_kg_saved_per_kg": co2},
            )
            changed = []
            if not created and mat.name != name:
                mat.name = name
                changed.append("name")
            if mat.category_id != cat.id:
                mat.category = cat
                changed.append("category")
            if mat.requires_appraisal:
                mat.requires_appraisal = False
                changed.append("requires_appraisal")
            if not mat.is_active:
                mat.is_active = True
                changed.append("is_active")
            if changed:
                mat.save(update_fields=changed)
            cp, mp = Decimal(str(citizen_price)), Decimal(str(market_price))
            price = mat.prices.filter(active=True).first()
            if price:
                if price.price_per_unit != cp or price.market_price != mp:
                    price.price_per_unit = cp
                    price.market_price = mp
                    price.save(update_fields=["price_per_unit", "market_price"])
            else:
                MaterialPrice.objects.create(material=mat, price_per_unit=cp, market_price=mp, active=True)
            return mat

        def upsert_appraisal(cat_name, name, co2=Decimal("0.3")):
            """Material with no fixed price — value only known after physical inspection
            (e-waste boards, tires with 0-priced market data, etc)."""
            cat = categories[cat_name]
            slug = slugify(name)
            mat, created = Material.objects.get_or_create(
                slug=slug, defaults={"category": cat, "name": name, "co2_kg_saved_per_kg": co2, "requires_appraisal": True},
            )
            changed = []
            if not mat.requires_appraisal:
                mat.requires_appraisal = True
                changed.append("requires_appraisal")
            if not mat.is_active:
                mat.is_active = True
                changed.append("is_active")
            if changed:
                mat.save(update_fields=changed)
            mat.prices.filter(active=True).update(active=False)
            return mat

        def deactivate(name):
            """Retire a superseded generic material once split into real grades — kept in
            the DB (old requests/listings still reference it), just hidden from the catalog."""
            mat = Material.objects.filter(slug=slugify(name)).first()
            if not mat:
                return
            if mat.is_active:
                mat.is_active = False
                mat.save(update_fields=["is_active"])
            mat.prices.filter(active=True).update(active=False)

        # ------------------------------------------------------------------
        # Pricing reference: قیمت‌های خرده‌بار «ایران‌ضایعات»، مورخ ۱۴۰۵/۰۵/۲۵
        # (تحویل مقصد). قیمت سبزینو به شهروند ≈ ۷۰٪ قیمت خرده‌بار بازار —
        # تفاوت صرف هزینهٔ جمع‌آوری/راننده و سود پلتفرم می‌شود، نه سود ناعادلانه.
        # این ارقام پایهٔ محاسبهٔ اولیه‌اند، نه ادعای قیمت لحظه‌ای بازار امروز؛
        # مدیر سبزینو می‌تواند از تب «قیمت‌ها» در داشبورد مدیریت هر زمان به‌روزشان کند.
        # ------------------------------------------------------------------

        # ---- پلاستیک: هر گرید به‌عنوان یک قلم مجزا (نه یک «پلاستیک» کلی) ----
        for name, cp, mp in [
            ("PET درجه ۱", 42000, 60889), ("PET درجه ۲", 38000, 55200),
            ("PET پرسی درجه ۱", 41000, 58333), ("PET پرسی درجه ۲", 59000, 85000),
            ("نایلون درجه ۱", 22000, 31500), ("نایلون درجه ۲", 12000, 17417),
            ("لوله پلی‌اتیلن درجه ۱", 30000, 43000), ("لوله پلی‌اتیلن درجه ۲", 16500, 23800),
            ("لوله سفید PP", 68000, 97429), ("اتصالات PP", 26000, 37000),
            ("لوله پلیکا", 21000, 30000), ("UPVC", 60000, 86000),
            ("GPPS کریستال", 29000, 41667), ("ABS", 45000, 65000), ("HIPS", 14000, 20000),
            ("سبد مرغی", 24000, 34000), ("سبد درهم", 20000, 29083), ("سبد مشکی", 24000, 33833),
            ("سبد سبز", 28000, 40000), ("سبد زرد", 33000, 47500), ("سبد قرمز", 33000, 47500),
            ("سبد آبی", 33000, 47500), ("سپر ماشین", 34000, 48667), ("گونی و جامبو", 4000, 6000),
            ("طلق", 24000, 35000), ("بادی بی‌رنگ", 38000, 54400), ("بادی ۴ رنگ", 27000, 38200),
            ("بادی تک‌رنگ", 33000, 47500), ("لاک زنده بازیافت", 7000, 10667),
        ]:
            upsert_priced("پلاستیک", name, cp, mp, Decimal("0.55"))
        for old_name in ["پلاستیک", "پت (PET)", "نایلون", "ظروف یکبار مصرف"]:
            deactivate(old_name)

        # ---- کاغذ و مقوا ----
        for name, cp, mp in [
            ("کارتن فله", 16000, 23926), ("کارتن پرسی", 24000, 34665),
            ("پوشال سفید", 41000, 58333), ("پوشال رنگی", 25000, 35667),
            ("پوشال صحافی", 29000, 42000), ("پوشال لیوان کاغذی", 40000, 57000),
            ("کاغذ سفید و فرم", 31000, 44429), ("کاغذ مخلوط، دفتر و کتاب", 34000, 48632),
            ("کاغذ پشت طوسی", 19000, 27500), ("روزنامه", 34000, 48500),
        ]:
            upsert_priced("کاغذ و مقوا", name, cp, mp, Decimal("0.3"))
        for old_name in ["کارتن", "کاغذ", "روزنامه و مجله"]:
            deactivate(old_name)

        # ---- شیشه ----
        for name, cp, mp in [
            ("شیشه بلور", 3000, 4300), ("شیشه جام بی‌رنگ", 2400, 3500),
            ("شیشه جام رنگی", 1700, 2500), ("بطری شیشه‌ای سفید", 2200, 3250),
            ("بطری شیشه‌ای رنگی", 1700, 2450), ("شیشه خودرو", 1000, 1400),
        ]:
            upsert_priced("شیشه", name, cp, mp, Decimal("0.2"))
        for old_name in ["شیشه شکسته", "بطری شیشه‌ای"]:
            deactivate(old_name)

        # ---- فلزات ----
        for name, cp, mp in [
            ("آهن سوپر ویژه", 28000, 38225), ("آهن درجه ۱", 26000, 35929), ("آهن درجه ۲", 18000, 25650),
            ("چدن درشت‌بار", 28000, 38125),
            ("آلومینیوم نرم", 310000, 413229), ("آلومینیوم خشک", 215000, 290551),
            ("مس کابلی قرمز", 1500000, 2017614), ("مس آرمیچری", 1350000, 1833393), ("مس ذوبی", 1350000, 1826912),
            ("سرب نرم", 190000, 260529), ("استیل ۳۰۴", 75000, 102638),
        ]:
            upsert_priced("فلزات", name, cp, mp, Decimal("1.3"))
        # «قوطی نوشابه» و «برنج» تک‌گرید هستند — همان قلم قبلی به‌روزرسانی می‌شود، نه دو نسخه موازی
        upsert_priced("فلزات", "قوطی نوشابه", 220000, 297613, Decimal("0.6"))
        upsert_priced("فلزات", "برنج زردبار", 840000, 1140426, Decimal("1.1"))
        for old_name in ["آهن", "آلومینیوم", "مس", "برنج"]:
            deactivate(old_name)

        # ---- باتری و لوازم جانبی ----
        for name, cp, mp in [
            ("باتری خشک ایرانی", 140000, 194391), ("باتری خشک خارجی", 120000, 169750),
            ("باتری موتوری", 112000, 159765), ("باتری UPS", 125000, 179067),
        ]:
            upsert_priced("باتری و لوازم جانبی", name, cp, mp, Decimal("0.3"))
        deactivate("باتری")

        # ---- الکترونیک: لوازم برقی با قیمت مشخص + قطعات پرارزش «فقط با کارشناسی» ----
        for name, cp, mp in [
            ("دینام پوسته چدن", 110000, 156667), ("دینام پوسته آلومینیوم", 115000, 165000),
            ("کیلوبار داغونی", 110000, 156667),
        ]:
            upsert_priced("الکترونیک", name, cp, mp, Decimal("0.5"))
        for name in [
            "لوازم الکترونیکی مجاز (کارشناسی)", "موبایل و لپ‌تاپ فرسوده",
            "برد موبایل", "پردازنده و رم", "مادربرد", "برد سبز",
        ]:
            upsert_appraisal("الکترونیک", name, Decimal("0.5"))
        deactivate("ضایعات الکترونیکی")
        # «کابل و سیم برق» داده جدیدی نداشت — دست‌نخورده با قیمت قبلی باقی می‌ماند.

        # ---- لاستیک: طبق داده ارسالی همهٔ قیمت‌های بازار صفر بودند → کارشناسی ----
        upsert_appraisal("لاستیک", "لاستیک فرسوده خودرو", Decimal("0.4"))

        # ---- چوب ----
        upsert_priced("چوب", "پالت چوبی", 3500, 5000, Decimal("0.2"))
        upsert_appraisal("چوب", "خاک‌اره", Decimal("0.1"))
        deactivate("ضایعات چوب و پالت")

        # ---- بدون تغییر (داده جدیدی برای این‌ها ارائه نشد) ----
        for cat_name, name, price, co2 in [
            ("پارچه و لباس", "پارچه و لباس کهنه", 3000, 0.3),
            ("روغن پخت‌وپز", "روغن خوراکی مستعمل", 6000, 0.2),
            ("الکترونیک", "کابل و سیم برق", 25000, 0.5),
        ]:
            mat, _ = Material.objects.get_or_create(
                slug=slugify(name),
                defaults={"category": categories[cat_name], "name": name, "co2_kg_saved_per_kg": Decimal(str(co2))},
            )
            if not mat.prices.filter(active=True).exists():
                MaterialPrice.objects.create(material=mat, price_per_unit=Decimal(str(price)), active=True)

        return categories

    def seed_commission_rules(self):
        CommissionRule.objects.get_or_create(
            order_type="MARKETPLACE", role="", material=None, city="",
            defaults={"percent": Decimal("10")},
        )
        CommissionRule.objects.get_or_create(
            order_type="FACTORY", role="", material=None, city="",
            defaults={"percent": Decimal("5")},
        )

    # ---------------------------------------------------------------- users
    def seed_admin(self):
        admin, created = User.objects.get_or_create(
            username="admin", defaults={"email": "admin@sabzino.demo", "is_staff": True, "is_superuser": True, "first_name": "مدیر", "last_name": "سبزینو"}
        )
        if created:
            admin.set_password("Admin@12345")
            admin.save()
        UserRole.objects.get_or_create(user=admin, role=Role.SUPER_ADMIN)
        ensure_wallet(admin)
        ensure_points_account(admin)
        return admin

    def seed_municipality(self, city):
        from municipality.models import Municipality
        user, created = User.objects.get_or_create(
            username="municipality_yasuj", defaults={"email": "municipality@sabzino.demo", "first_name": "شهرداری", "last_name": "یاسوج"}
        )
        if created:
            user.set_password("Demo@12345")
            user.save()
        UserRole.objects.get_or_create(user=user, role=Role.MUNICIPALITY)
        Municipality.objects.get_or_create(user=user, defaults={"city": "یاسوج", "department_name": "معاونت خدمات شهری"})
        ensure_wallet(user)
        ensure_points_account(user)
        return user

    def seed_citizens(self, n, city):
        citizens = []
        for i in range(1, n + 1):
            username = f"citizen{i}"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@sabzino.demo",
                    "phone_number": f"0912000{1000 + i}",
                    "first_name": random.choice(FIRST_NAMES),
                    "last_name": random.choice(LAST_NAMES),
                    "referral_code": f"SZDEMO{i:03d}",
                },
            )
            if created:
                user.set_password("Demo@12345")
                user.save()
            UserRole.objects.get_or_create(user=user, role=Role.CITIZEN)
            ensure_wallet(user)
            ensure_points_account(user)
            if not user.addresses.exists():
                Address.objects.create(
                    user=user, title="خانه", city="یاسوج",
                    district=random.choice(DISTRICTS_YASUJ),
                    full_address=f"یاسوج، {random.choice(DISTRICTS_YASUJ)}، کوچه {random.randint(1,30)}، پلاک {random.randint(1,80)}",
                    lat=Decimal("30.6683") + Decimal(str(round(random.uniform(-0.02, 0.02), 6))),
                    lng=Decimal("51.5877") + Decimal(str(round(random.uniform(-0.02, 0.02), 6))),
                    is_default=True,
                )
            citizens.append(user)
        return citizens

    def seed_collectors(self, base_users, city):
        collectors = []
        vehicle_types = ["PICKUP", "MOTORCYCLE", "VAN"]
        for i, user in enumerate(base_users):
            UserRole.objects.get_or_create(user=user, role=Role.COLLECTOR)
            profile, created = CollectorProfile.objects.get_or_create(
                user=user,
                defaults={
                    "national_id": f"31{i:08d}",
                    "city": "یاسوج",
                    "service_area": "مرکز شهر و بلوار آزادی",
                    "bank_account_number": f"01000{i:05d}",
                    "sheba_number": f"IR{100000000000000000000000000 + i}"[:26],
                    "verification_status": VerificationStatus.APPROVED if i < 8 else VerificationStatus.PENDING,
                    "is_online": i < 6,
                    "current_lat": Decimal("30.6683") + Decimal(str(round(random.uniform(-0.02, 0.02), 6))),
                    "current_lng": Decimal("51.5877") + Decimal(str(round(random.uniform(-0.02, 0.02), 6))),
                    "rating_avg": Decimal(str(round(random.uniform(4.0, 5.0), 2))),
                    "completed_jobs": random.randint(5, 120),
                },
            )
            if created:
                Vehicle.objects.create(
                    collector=profile, brand="پیکان" if i % 2 == 0 else "زامیاد", model="وانت", year=1398 + (i % 5),
                    plate_number=f"۱۲ ایران {111 + i}", vehicle_type=vehicle_types[i % 3],
                    capacity_kg=Decimal(str(random.choice([100, 200, 500]))), color="سفید",
                )
            collectors.append(profile)
        return collectors

    def seed_stations(self, city, categories):
        stations_data = [
            ("ایستگاه بازیافت پاسوج", "یاسوج، بلوار آزادی، پاسوج", "30.6650", "51.5820"),
            ("ایستگاه بازیافت والفجر", "یاسوج، شهرک والفجر", "30.6720", "51.5910"),
            ("ایستگاه بازیافت مرکز شهر", "یاسوج، خیابان طالقانی", "30.6690", "51.5860"),
        ]
        all_materials = list(Material.objects.all())
        stations = []
        for i, (name, address, lat, lng) in enumerate(stations_data):
            station, created = RecyclingStation.objects.get_or_create(
                name=name, defaults={"address": address, "lat": Decimal(lat), "lng": Decimal(lng), "phone_number": f"0741111{1000+i}"}
            )
            if created:
                station.accepted_materials.set(all_materials)

            op_user, u_created = User.objects.get_or_create(
                username=f"station_op{i+1}",
                defaults={"email": f"station_op{i+1}@sabzino.demo", "first_name": "اپراتور", "last_name": name.split()[-1]},
            )
            if u_created:
                op_user.set_password("Demo@12345")
                op_user.save()
            UserRole.objects.get_or_create(user=op_user, role=Role.STATION_OPERATOR)
            StationOperator.objects.get_or_create(user=op_user, station=station)
            ensure_wallet(op_user)
            ensure_points_account(op_user)
            stations.append(station)
        return stations

    def seed_marketplace_orgs(self, city, categories):
        all_materials = list(Material.objects.all())

        rc_names = ["مرکز بازیافت سبزینو یاسوج", "مرکز تفکیک پسماند کهگیلویه", "مرکز بازیافت سبز بویراحمد"]
        for i, name in enumerate(rc_names):
            user, created = User.objects.get_or_create(username=f"recycling_center{i+1}", defaults={"email": f"rc{i+1}@sabzino.demo", "first_name": name})
            if created:
                user.set_password("Demo@12345")
                user.save()
            UserRole.objects.get_or_create(user=user, role=Role.RECYCLING_CENTER)
            ensure_wallet(user)
            rc, created = RecyclingCenter.objects.get_or_create(
                user=user, defaults={"name": name, "city": "یاسوج", "verification_status": "APPROVED"}
            )
            if created:
                rc.materials_processed.set(random.sample(all_materials, k=3))
                for mat in rc.materials_processed.all():
                    Listing.objects.get_or_create(
                        seller=user, material=mat,
                        defaults={"quantity_kg": Decimal(random.choice([100, 250, 500])), "price_per_kg": mat.current_price or Decimal("5000"),
                                  "minimum_order_kg": Decimal("20"), "quality": "درجه یک", "location": "یاسوج", "status": "ACTIVE"},
                    )

        factory_names = [("کارخانه بازیافت پلاستیک زاگرس", "پلاستیک"), ("کارخانه فولاد کهگیلویه", "فلزات")]
        for i, (name, industry) in enumerate(factory_names):
            user, created = User.objects.get_or_create(username=f"factory{i+1}", defaults={"email": f"factory{i+1}@sabzino.demo", "first_name": name})
            if created:
                user.set_password("Demo@12345")
                user.save()
            UserRole.objects.get_or_create(user=user, role=Role.FACTORY)
            ensure_wallet(user)
            factory, created = Factory.objects.get_or_create(
                user=user, defaults={
                    "name": name, "industry": industry, "city": "یاسوج", "verification_status": "APPROVED",
                    "purchase_capacity_kg_month": Decimal("5000"), "minimum_order_kg": Decimal("100"),
                    "coverage_area": "استان کهگیلویه و بویراحمد",
                },
            )
            if created:
                factory.materials_needed.set([m for m in all_materials if m.category.name == ("پلاستیک" if industry == "پلاستیک" else "فلزات")])

        for i in range(1, 6):
            user, created = User.objects.get_or_create(username=f"wholesaler{i}", defaults={"email": f"wholesaler{i}@sabzino.demo", "first_name": f"خریدار عمده {i}"})
            if created:
                user.set_password("Demo@12345")
                user.save()
            UserRole.objects.get_or_create(user=user, role=Role.WHOLESALER)
            ensure_wallet(user)
            wholesaler, created = Wholesaler.objects.get_or_create(
                user=user, defaults={"name": f"بازرگانی سبز {i}", "city": "یاسوج", "verification_status": "APPROVED"}
            )
            if created:
                wholesaler.materials_of_interest.set(random.sample(all_materials, k=2))

    def seed_requests_and_transactions(self, citizens, collectors, stations, categories):
        all_materials = list(Material.objects.all())
        amount_ranges = list(AmountRange.values)

        # a handful of completed collection requests with full history, wallet + points already applied
        for i in range(8):
            citizen = citizens[i % len(citizens)]
            collector = collectors[i % len(collectors)]
            if collector.verification_status != VerificationStatus.APPROVED:
                continue
            address = citizen.addresses.first()
            req = CollectionRequest.objects.create(
                citizen=citizen, amount_range=random.choice(amount_ranges),
                address=address, address_text_snapshot=address.full_address if address else "",
                lat=address.lat if address else None, lng=address.lng if address else None,
                status=RequestStatus.REQUESTED,
            )
            material = random.choice(all_materials)
            req.materials.add(material)
            req.estimated_value = (material.current_price or Decimal("5000")) * Decimal("5")
            req.save(update_fields=["estimated_value"])
            log_status(req, RequestStatus.SEARCHING_COLLECTOR, changed_by=citizen)
            try:
                accept_request(collector, req)
                complete_weighing(req, material, Decimal(str(random.randint(3, 40))), weighed_by=collector.user)
            except Exception:
                pass
            req.created_at = timezone.now() - timedelta(days=random.randint(0, 20))
            req.save(update_fields=["created_at"])

        # a couple of open (still searching) requests so the collector job-board isn't empty
        for i in range(3):
            citizen = citizens[(i + 10) % len(citizens)]
            address = citizen.addresses.first()
            req = CollectionRequest.objects.create(
                citizen=citizen, amount_range=random.choice(amount_ranges),
                address=address, address_text_snapshot=address.full_address if address else "",
                lat=address.lat if address else None, lng=address.lng if address else None,
                status=RequestStatus.REQUESTED,
            )
            material = random.choice(all_materials)
            req.materials.add(material)
            req.estimated_value = (material.current_price or Decimal("5000")) * Decimal("5")
            req.save(update_fields=["estimated_value"])
            log_status(req, RequestStatus.SEARCHING_COLLECTOR, changed_by=citizen)

        # a few walk-in station transactions
        for i, station in enumerate(stations):
            operator = station.operators.first()
            for j in range(3):
                citizen = citizens[(i * 3 + j) % len(citizens)]
                material = random.choice(all_materials)
                from stations.services import create_station_transaction
                create_station_transaction(station, operator, citizen, material, Decimal(str(random.randint(2, 25))))

    def seed_badges_and_challenges(self):
        Badge.objects.get_or_create(name="شروع سبز", defaults={"icon": "🌱", "points_required": 0, "description": "اولین قدم در سبزینو"})
        Badge.objects.get_or_create(name="بازیافت‌گر", defaults={"icon": "♻️", "points_required": 200, "description": "۲۰۰ امتیاز سبزینو"})
        Badge.objects.get_or_create(name="قهرمان سبز", defaults={"icon": "🏆", "points_required": 1000, "description": "۱۰۰۰ امتیاز سبزینو"})
        Badge.objects.get_or_create(name="حامی طبیعت", defaults={"icon": "🌳", "points_required": 2000, "description": "۲۰۰۰ امتیاز سبزینو"})

        Challenge.objects.get_or_create(
            title="چالش ۳۰ روزه بازیافت", defaults={
                "description": "در ۳۰ روز آینده حداقل ۵۰ کیلوگرم پسماند تحویل دهید.",
                "type": "WEIGHT", "target_value": Decimal("50"), "reward_points": 300,
                "start_at": timezone.now(), "end_at": timezone.now() + timedelta(days=30), "is_active": True,
            },
        )

    # ---------------------------------------------------------------- green impact
    def seed_green_impact(self, city):
        """
        Demo "اثر سبز" projects (spec: هدف/مبلغ موردنیاز/مجری/گزارش پیشرفت واقعی
        هنوز وجود ندارد → داده نمونه، اما is_demo=True صریح تا در UI مشخص شود و
        بعداً بدون تغییر ساختار از پنل مدیریت با پروژه واقعی جایگزین شود).
        """
        from green_impact.models import ImpactProject

        projects = [
            {
                "title": "توسعه فضای سبز شهری یاسوج", "category": "ENVIRONMENT", "icon": "🌱",
                "summary": "کمک به توسعه فضای سبز و کاهش اثرات زیست‌محیطی پسماند در یاسوج.",
                "description": "این طرح با مشارکت شهرداری یاسوج، بخشی از اعتبار جمع‌آوری‌شده را صرف کاشت و نگهداری فضای سبز شهری می‌کند.",
                "operator_name": "شهرداری یاسوج — معاونت خدمات شهری", "city": city,
                "goal_amount": Decimal("50000000"), "raised_amount": Decimal("32500000"),
            },
            {
                "title": "فرصت برابر برای کودکان", "category": "SOCIAL", "icon": "❤️",
                "summary": "حمایت از یک برنامه اجتماعی معتبر برای کودکان و خانواده‌های کم‌برخوردار.",
                "description": "اعتبار این طرح صرف تهیهٔ لوازم‌التحریر و کمک‌هزینهٔ تحصیلی برای کودکان کم‌برخوردار شهر می‌شود.",
                "operator_name": "کمیتهٔ امداد امام خمینی (شعبهٔ یاسوج)", "city": city,
                "goal_amount": None, "raised_amount": Decimal("24800000"),
            },
            {
                "title": "اشتغال سبز", "category": "EMPLOYMENT", "icon": "🤝",
                "summary": "کمک به آموزش و ایجاد فرصت درآمدی برای افراد کم‌برخوردار در زنجیرهٔ بازیافت.",
                "description": "این طرح به آموزش تفکیک و بازیافت حرفه‌ای و معرفی افراد به شبکهٔ جمع‌آوری سبزینو کمک می‌کند — درآمد پایدار در ازای کار واقعی، نه کمک بلاعوض.",
                "operator_name": "سبزینو × مرکز کاریابی یاسوج", "city": city,
                "goal_amount": None, "raised_amount": Decimal("9400000"),
            },
            {
                "title": "پاکسازی طبیعت دنا", "category": "ENVIRONMENT", "icon": "🏔️",
                "summary": "پاکسازی مسیرهای گردشگری و طبیعت‌گردی کوه دنا از زباله.",
                "description": "برگزاری دوره‌ای اردوهای پاکسازی طبیعت با مشارکت داوطلبان محلی، تأمین‌شده از محل اعتبار اثر سبز شهروندان.",
                "operator_name": "انجمن دوستداران طبیعت دنا", "city": city,
                "goal_amount": Decimal("15000000"), "raised_amount": Decimal("6200000"),
            },
            {
                "title": "توسعهٔ محلی محلهٔ پاسوج", "category": "LOCAL", "icon": "🏘️",
                "summary": "پروژه‌های کوچک محیط‌زیستی و اجتماعی در سطح محله.",
                "description": "نصب سطل‌های تفکیک زباله و آموزش تفکیک از مبدأ برای ساکنان محلهٔ پاسوج.",
                "operator_name": "شورایاری محلهٔ پاسوج", "city": city,
                "goal_amount": Decimal("8000000"), "raised_amount": Decimal("1100000"),
            },
        ]
        for i, p in enumerate(projects):
            ImpactProject.objects.get_or_create(
                title=p["title"],
                defaults={
                    "category": p["category"], "icon": p["icon"], "summary": p["summary"],
                    "description": p["description"], "operator_name": p["operator_name"], "city": p["city"],
                    "goal_amount": p["goal_amount"], "raised_amount": p["raised_amount"],
                    "status": "ACTIVE", "is_demo": True, "order": i,
                    "progress_report": "گزارش پیشرفت به‌زودی از پنل مدیریت سبزینو به‌روزرسانی می‌شود.",
                },
            )
