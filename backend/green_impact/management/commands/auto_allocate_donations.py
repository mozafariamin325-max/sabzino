from django.core.management.base import BaseCommand

from green_impact.services import auto_allocate_expired_donations


class Command(BaseCommand):
    help = "مهلت‌های هفت‌روزهٔ سررسیدشدهٔ «کمک به اثر سبز» که شهروند خودش تخصیص نداده را به طرح پیش‌فرض هدایت می‌کند."

    def handle(self, *args, **options):
        results = auto_allocate_expired_donations()
        if not results:
            self.stdout.write(self.style.SUCCESS("هیچ مهلت سررسیدشدهٔ در انتظاری برای تخصیص خودکار وجود نداشت."))
            return
        self.stdout.write(self.style.SUCCESS(f"{len(results)} کمک منقضی‌شده به طرح پیش‌فرض تخصیص یافت."))
