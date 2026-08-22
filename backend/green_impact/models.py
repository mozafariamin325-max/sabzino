"""
"اثر سبز من" (Green Impact) — a voluntary layer on top of the existing wallet
ledger. It never replaces the core waste-economy flow: a citizen's waste is
always weighed and its full value credited to their wallet exactly as before
(see collection_requests.services.complete_weighing). This module only adds
an OPTIONAL follow-up choice — allocate some of that (already-credited)
balance to a social/environmental project instead of keeping it — modeled as
an ordinary wallet debit (wallet.services.debit_wallet) so the existing
ledger stays the single source of financial truth. No parallel money system.
"""
import uuid
from decimal import Decimal

from django.db import models
from core.models import TimeStampedModel, UUIDModel


class ImpactCategory(models.TextChoices):
    EMPLOYMENT = "EMPLOYMENT", "اشتغال سبز"
    SOCIAL = "SOCIAL", "حمایت اجتماعی"
    ENVIRONMENT = "ENVIRONMENT", "محیط‌زیست"
    LOCAL = "LOCAL", "توسعه محلی"


class ImpactProjectStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "فعال"
    PAUSED = "PAUSED", "متوقف"
    COMPLETED = "COMPLETED", "تکمیل‌شده"


class ImpactProject(TimeStampedModel, UUIDModel):
    """
    Admin-managed social/environmental project a citizen can direct part of
    their waste value to. MVP ships with clearly-labeled demo projects
    (is_demo=True) per product ask — the structure is ready for real
    partner organizations to replace them later without any schema change.
    """

    title = models.CharField(max_length=128)
    category = models.CharField(max_length=16, choices=ImpactCategory.choices)
    icon = models.CharField(max_length=16, default="🌱")
    summary = models.CharField(max_length=255, blank=True, help_text="یک‌خطی برای کارت")
    description = models.TextField(blank=True, help_text="هدف کامل طرح")
    operator_name = models.CharField(max_length=128, blank=True, help_text="مجری/مجموعه مسئول")
    city = models.ForeignKey(
        "locations.City", null=True, blank=True, on_delete=models.SET_NULL, related_name="impact_projects",
        help_text="برای دسته «توسعه محلی» — شهر مرتبط",
    )
    goal_amount = models.DecimalField(
        max_digits=14, decimal_places=0, null=True, blank=True,
        help_text="تومان — خالی یعنی طرح مستمر بدون سقف مشخص (مثل اشتغال سبز)",
    )
    raised_amount = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    status = models.CharField(max_length=16, choices=ImpactProjectStatus.choices, default=ImpactProjectStatus.ACTIVE)
    progress_report = models.TextField(blank=True, help_text="گزارش پیشرفت طرح — قابل ویرایش توسط مدیر")
    impact_report = models.TextField(blank=True, help_text="گزارش اثر واقعی ایجادشده")
    is_demo = models.BooleanField(default=True, help_text="داده نمونه — تا جایگزینی با پروژه واقعی از پنل مدیریت")
    order = models.PositiveSmallIntegerField(default=0)
    is_default_allocation = models.BooleanField(
        default=False,
        help_text="اگر شهروند تا یک هفته پس از «کمک به اثر سبز» تخصیص را انتخاب نکند، مبلغ خودکار به این طرح می‌رود. فقط یک طرح باید این گزینه را فعال داشته باشد.",
    )

    class Meta:
        ordering = ["order", "-created_at"]

    def __str__(self):
        return self.title

    @property
    def progress_percent(self):
        if not self.goal_amount or self.goal_amount <= 0:
            return None
        return min(100, round(float(self.raised_amount) / float(self.goal_amount) * 100))


class ImpactContribution(TimeStampedModel, UUIDModel):
    """
    One allocation of wallet balance to a project. Always backed by a real
    wallet.WalletTransaction (type GREEN_IMPACT) — this table is a receipt /
    reporting layer on top of the ledger, never an independent money store.
    """

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="impact_contributions")
    project = models.ForeignKey(ImpactProject, on_delete=models.PROTECT, related_name="contributions")
    request = models.ForeignKey(
        "collection_requests.CollectionRequest", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="impact_contributions",
        help_text="اگر مشارکت بلافاصله پس از یک تحویل مشخص ثبت شده باشد",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=0)
    waste_value_snapshot = models.DecimalField(
        max_digits=14, decimal_places=0, null=True, blank=True,
        help_text="ارزش کل همان درخواست در لحظهٔ مشارکت (برای رسید)",
    )
    wallet_transaction = models.ForeignKey(
        "wallet.WalletTransaction", null=True, blank=True, on_delete=models.SET_NULL, related_name="+",
    )
    tracking_code = models.CharField(max_length=20, unique=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.tracking_code:
            self.tracking_code = f"GI-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.tracking_code} - {self.amount} -> {self.project}"


class PendingDonation(TimeStampedModel):
    """
    وقتی شهروند در ویزارد ثبت درخواست «کمک به اثر سبز» را انتخاب می‌کند و
    تحویل وزن‌کشی می‌شود، ارزش تحویل (طبق طراحی موجود) طبق روال عادی به
    کیف‌پول واریز می‌شود — این مدل فقط یک «یادآور با مهلت» است: اگر شهروند
    تا یک هفته از همان مبلغ را دستی به یک/چند طرح اثر سبز تخصیص ندهد
    (GreenImpactChoice در صفحه جزئیات درخواست)، دستور مدیریتی
    auto_allocate_expired_donations آن را خودکار به طرح پیش‌فرض
    (ImpactProject.is_default_allocation=True) هدایت می‌کند.
    """

    request = models.OneToOneField(
        "collection_requests.CollectionRequest", on_delete=models.CASCADE, related_name="pending_donation",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=0)
    deadline = models.DateTimeField()
    resolved = models.BooleanField(default=False, help_text="یا شهروند دستی تخصیص داد، یا خودکار به طرح پیش‌فرض رفت")

    def __str__(self):
        return f"{self.request.code} — {self.amount} تومان تا {self.deadline:%Y-%m-%d}"


# Gamification ladder for "اثر سبز من" — based on number of COMPLETED
# collection requests (deliveries), independent of the profile XP/level tiers.
IMPACT_TIERS = [
    {"min": 0, "name": "تازه‌وارد", "icon": "🌱"},
    {"min": 5, "name": "شروع‌کننده سبز", "icon": "🌱"},
    {"min": 20, "name": "همراه طبیعت", "icon": "🌿"},
    {"min": 50, "name": "سفیر سبز", "icon": "🌳"},
    {"min": 100, "name": "قهرمان اثر سبز", "icon": "🌍"},
]


def tier_for_deliveries(count: int) -> dict:
    current = IMPACT_TIERS[0]
    next_tier = None
    for tier in IMPACT_TIERS:
        if count >= tier["min"]:
            current = tier
        elif next_tier is None:
            next_tier = tier
    return {
        "name": current["name"],
        "icon": current["icon"],
        "deliveries": count,
        "next_name": next_tier["name"] if next_tier else None,
        "next_threshold": next_tier["min"] if next_tier else None,
    }
