from django.db import models
from core.models import TimeStampedModel, UUIDModel


class RequestStatus(models.TextChoices):
    REQUESTED = "REQUESTED", "ثبت شده"
    SEARCHING_COLLECTOR = "SEARCHING_COLLECTOR", "در جستجوی جمع‌آور"
    ASSIGNED = "ASSIGNED", "تخصیص یافته"
    ACCEPTED = "ACCEPTED", "پذیرفته شده"
    ON_THE_WAY = "ON_THE_WAY", "در مسیر"
    ARRIVED = "ARRIVED", "رسیده"
    COLLECTED = "COLLECTED", "جمع‌آوری شده"
    WEIGHING = "WEIGHING", "در حال وزن‌کشی"
    COMPLETED = "COMPLETED", "تکمیل شده"
    CANCELLED = "CANCELLED", "لغو شده"


class GreenIntent(models.TextChoices):
    SELL = "SELL", "فروش (واریز به کیف‌پول)"
    DONATE = "DONATE", "کمک به اثر سبز"


class AmountRange(models.TextChoices):
    UNDER_5 = "UNDER_5", "کمتر از ۵ کیلو"
    R5_10 = "R5_10", "۵ تا ۱۰ کیلو"
    R10_20 = "R10_20", "۱۰ تا ۲۰ کیلو"
    R20_50 = "R20_50", "۲۰ تا ۵۰ کیلو"
    R50_100 = "R50_100", "۵۰ تا ۱۰۰ کیلو"
    OVER_100 = "OVER_100", "بیشتر از ۱۰۰ کیلو"


def generate_request_code():
    import random
    return f"SZ-{random.randint(10000, 99999)}"


class CollectionRequest(TimeStampedModel, UUIDModel):
    code = models.CharField(max_length=16, unique=True, default=generate_request_code)
    citizen = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="collection_requests")
    materials = models.ManyToManyField("materials.Material", related_name="collection_requests")
    amount_range = models.CharField(max_length=16, choices=AmountRange.choices)
    address = models.ForeignKey("accounts.Address", on_delete=models.SET_NULL, null=True, related_name="collection_requests")
    address_text_snapshot = models.CharField(max_length=255, blank=True)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    preferred_time = models.DateTimeField(null=True, blank=True)
    green_intent = models.CharField(
        max_length=8, choices=GreenIntent.choices, default=GreenIntent.SELL,
        help_text="ترجیح غیرالزام‌آور شهروند هنگام ثبت درخواست — فقط پیش‌فرض تخصیص «اثر سبز» پس از وزن‌کشی را تعیین می‌کند؛ مبلغ و سهم نهایی همچنان اختیاری و پس از وزن‌کشی مشخص می‌شود.",
    )
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to="collection_requests/photos/", null=True, blank=True)
    estimated_value = models.DecimalField(max_digits=12, decimal_places=0, default=0, help_text="Toman, computed at creation")
    status = models.CharField(max_length=24, choices=RequestStatus.choices, default=RequestStatus.REQUESTED)
    cancelled_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"#{self.code}"


class CollectionAssignment(TimeStampedModel):
    request = models.OneToOneField(CollectionRequest, on_delete=models.CASCADE, related_name="assignment")
    collector = models.ForeignKey("collectors.CollectorProfile", on_delete=models.CASCADE, related_name="assignments")
    accepted_at = models.DateTimeField(null=True, blank=True)
    on_the_way_at = models.DateTimeField(null=True, blank=True)
    arrived_at = models.DateTimeField(null=True, blank=True)
    collected_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.request.code} -> {self.collector}"


class CollectionStatusLog(TimeStampedModel):
    """Every status change is logged (spec section 13) for tracking + audit."""

    request = models.ForeignKey(CollectionRequest, on_delete=models.CASCADE, related_name="status_logs")
    status = models.CharField(max_length=24, choices=RequestStatus.choices)
    note = models.CharField(max_length=255, blank=True)
    changed_by = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["created_at"]


class CollectionRequestItem(TimeStampedModel):
    """
    One material line inside a request (spec ask: چند نوع زباله در یک سفارش).
    weight_kg is always a number: either dragged on the weight slider (rough
    estimate) or typed exactly by the citizen when is_exact=True.
    """

    request = models.ForeignKey(CollectionRequest, on_delete=models.CASCADE, related_name="items")
    material = models.ForeignKey("materials.Material", on_delete=models.PROTECT, related_name="request_items")
    weight_kg = models.DecimalField(max_digits=8, decimal_places=2, help_text="وزن تقریبی (اهرم) یا دقیق کیلوگرم")
    is_exact = models.BooleanField(default=False, help_text="کاربر وزن را دقیق وارد کرده یا فقط اهرم را جابه‌جا کرده")

    class Meta:
        unique_together = ("request", "material")

    def __str__(self):
        return f"{self.request.code}: {self.material} x {self.weight_kg}kg"


class RecurrenceFrequency(models.TextChoices):
    WEEKLY = "WEEKLY", "هفتگی"
    BIWEEKLY = "BIWEEKLY", "دو هفته یک‌بار"
    MONTHLY = "MONTHLY", "ماهانه"


class RecurringSchedule(TimeStampedModel, UUIDModel):
    """
    Citizen sets a recurring pickup (spec ask: هفتگی/ماهانه). A daily
    management command (generate_recurring_requests) turns due schedules into
    real CollectionRequest rows — see collection_requests/services.py.
    """

    citizen = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="recurring_schedules")
    address = models.ForeignKey("accounts.Address", on_delete=models.CASCADE, related_name="recurring_schedules")
    materials = models.ManyToManyField("materials.Material", related_name="recurring_schedules")
    frequency = models.CharField(max_length=12, choices=RecurrenceFrequency.choices)
    day_of_week = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text="۰=شنبه ... ۶=جمعه، برای هفتگی/دوهفته‌یک‌بار"
    )
    day_of_month = models.PositiveSmallIntegerField(null=True, blank=True, help_text="برای ماهانه، ۱ تا ۲۸")
    preferred_hour = models.PositiveSmallIntegerField(default=9)
    is_active = models.BooleanField(default=True)
    next_run_date = models.DateField()
    last_generated_request = models.ForeignKey(
        CollectionRequest, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["next_run_date"]

    def __str__(self):
        return f"دوره‌ای {self.get_frequency_display()} - {self.citizen}"


class WeighingRecord(TimeStampedModel, UUIDModel):
    """
    Final weigh-in for a collection request. Snapshots price at time of trade
    (spec section 17-18) so later price changes never alter past payouts.
    """

    request = models.OneToOneField(CollectionRequest, on_delete=models.CASCADE, related_name="weighing")
    material = models.ForeignKey("materials.Material", on_delete=models.PROTECT, related_name="weighing_records")
    weight_kg = models.DecimalField(max_digits=8, decimal_places=2)
    unit_price_snapshot = models.DecimalField(max_digits=12, decimal_places=0)
    total_value = models.DecimalField(max_digits=12, decimal_places=0)
    points_awarded = models.IntegerField(default=0)
    weighed_by = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    def __str__(self):
        return f"وزن‌کشی {self.request.code}: {self.weight_kg}kg"
