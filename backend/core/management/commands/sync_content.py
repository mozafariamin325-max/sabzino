from django.core.management.base import BaseCommand

from core.management.commands.seed_demo import Command as SeedDemoCommand


class Command(BaseCommand):
    help = (
        "به‌روزرسانی امن محتوای واقعی روی دیتابیس زنده: کاتالوگ مواد و قیمت‌ها (مدل ۶۰٪)، "
        "پروژه‌های اثر سبز، و (در صورت وجود) ایستگاه‌ها/چالش‌ها. به کاربران، درخواست‌ها و کیف‌پول‌ها دست نمی‌زند."
    )

    def handle(self, *args, **options):
        seeder = SeedDemoCommand()
        seeder.stdout = self.stdout
        seeder.style = self.style
        seeder.seed_materials()
        self.stdout.write("مواد و قیمت‌ها به‌روز شد.")
        seeder.sync_green_impact_content()
        self.stdout.write("پروژه‌های اثر سبز به‌روز شد.")
        for hook in ("sync_yasuj_stations", "sync_challenges"):
            fn = getattr(seeder, hook, None)
            if fn:
                fn()
                self.stdout.write(f"{hook} انجام شد.")
        self.stdout.write(self.style.SUCCESS("sync_content کامل شد."))
