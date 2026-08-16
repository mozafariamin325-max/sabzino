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

        dormant_cities = [
            ("فارس", "شیراز", "تخت جمشید", "🏛️"),
            ("اصفهان", "اصفهان", "سی‌وسه‌پل", "🌉"),
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
        data = {
            "پلاستیک": [
                ("پلاستیک", 7500, 0.5), ("پت (PET)", 12000, 0.6),
                ("نایلون", 4000, 0.35), ("ظروف یکبار مصرف", 4500, 0.3),
            ],
            "کاغذ و مقوا": [
                ("کارتن", 4000, 0.3), ("کاغذ", 3500, 0.3), ("روزنامه و مجله", 2800, 0.25),
            ],
            "فلزات": [
                ("آهن", 9000, 0.8), ("آلومینیوم", 35000, 1.2), ("مس", 180000, 1.5),
                ("برنج", 90000, 1.1), ("قوطی نوشابه", 15000, 0.6),
            ],
            "شیشه": [("شیشه شکسته", 1500, 0.2), ("بطری شیشه‌ای", 2000, 0.2)],
            "الکترونیک": [
                ("ضایعات الکترونیکی", 18000, 0.5), ("موبایل و لپ‌تاپ فرسوده", 40000, 0.7),
                ("کابل و سیم برق", 25000, 0.5),
            ],
            "پارچه و لباس": [("پارچه و لباس کهنه", 3000, 0.3)],
            "روغن پخت‌وپز": [("روغن خوراکی مستعمل", 6000, 0.2)],
            "باتری و لوازم جانبی": [("باتری", 12000, 0.3)],
            "لاستیک": [("لاستیک فرسوده خودرو", 5000, 0.4)],
            "چوب": [("ضایعات چوب و پالت", 2000, 0.2)],
        }
        icons = {
            "پلاستیک": "♻️", "کاغذ و مقوا": "📦", "فلزات": "🔩", "شیشه": "🍾", "الکترونیک": "🔌",
            "پارچه و لباس": "👕", "روغن پخت‌وپز": "🛢️", "باتری و لوازم جانبی": "🔋", "لاستیک": "🛞", "چوب": "🪵",
        }
        # Reference free-market price for each of the 11 "قیمت روز" homepage
        # materials, expressed as a ratio of Sabzino's buy price — Sabzino
        # pays a bit more than the informal scrap market (product story:
        # guaranteed fair price vs. scattered street buyers).
        market_ratio = {
            "آهن": 0.90, "مس": 0.88, "آلومینیوم": 0.90, "برنج": 0.87, "کارتن": 0.85,
            "کاغذ": 0.85, "پت (PET)": 0.88, "پلاستیک": 0.85, "نایلون": 0.80,
            "باتری": 0.90, "ضایعات الکترونیکی": 0.82,
        }
        categories = {}
        for i, (cat_name, materials) in enumerate(data.items()):
            cat, _ = MaterialCategory.objects.get_or_create(name=cat_name, defaults={"icon": icons.get(cat_name, "♻️"), "order": i})
            categories[cat_name] = cat
            for mat_name, price, co2 in materials:
                slug = mat_name.replace(" ", "-").replace("(", "").replace(")", "")
                mat, created = Material.objects.get_or_create(
                    slug=slug, defaults={"category": cat, "name": mat_name, "co2_kg_saved_per_kg": Decimal(str(co2))}
                )
                if not created and mat.name != mat_name:
                    mat.name = mat_name
                    mat.save(update_fields=["name"])
                existing_price = mat.prices.filter(active=True).first()
                ratio = market_ratio.get(mat_name)
                market_price = Decimal(str(round(price * ratio, -2))) if ratio else None
                if not existing_price:
                    MaterialPrice.objects.create(
                        material=mat, price_per_unit=Decimal(str(price)), market_price=market_price, active=True,
                    )
                elif ratio and existing_price.market_price is None:
                    existing_price.market_price = market_price
                    existing_price.save(update_fields=["market_price"])
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
