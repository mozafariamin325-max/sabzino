from django.db import models
from core.models import TimeStampedModel, UUIDModel


class StorePartnerCategory(models.TextChoices):
    FOOD = "FOOD", "خوراکی و سوپرمارکت"
    HOUSEHOLD = "HOUSEHOLD", "لوازم خانه"
    DIGITAL = "DIGITAL", "دیجیتال و شارژ"
    HEALTH = "HEALTH", "سلامت و آرایشی"
    SERVICES = "SERVICES", "خدمات"
    OTHER = "OTHER", "سایر"


class StorePartner(TimeStampedModel, UUIDModel):
    """
    A real local business that has agreed to accept a citizen's Sabzino
    wallet balance. Seeded EMPTY by design — no store is added until an
    admin registers a real, actually-agreed partner from the admin panel
    (per explicit product decision: never invent real business names).
    """

    name = models.CharField(max_length=120)
    category = models.CharField(max_length=16, choices=StorePartnerCategory.choices, default=StorePartnerCategory.OTHER)
    logo = models.ImageField(upload_to="store/partners/", null=True, blank=True)
    description = models.CharField(max_length=255, blank=True)
    address = models.CharField(max_length=255, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    redeem_instructions = models.TextField(
        blank=True, help_text="راهنمای استفاده برای شهروند — مثلاً «کد را هنگام خرید حضوری به فروشنده نشان دهید»",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-is_active", "name"]

    def __str__(self):
        return self.name


class StoreRedemptionStatus(models.TextChoices):
    PENDING = "PENDING", "در انتظار بررسی"
    APPROVED = "APPROVED", "تأیید شد"
    REJECTED = "REJECTED", "رد شد"
    FULFILLED = "FULFILLED", "استفاده شد"


class StoreRedemption(TimeStampedModel, UUIDModel):
    """
    A citizen's request to spend part of their wallet balance at a
    StorePartner. Mirrors WithdrawalRequest's semi-manual review flow
    (Task G pattern): the amount is reserved (debited) the moment the
    request is made; approving it issues a redemption code the citizen
    shows in person; rejecting it refunds the reservation.
    """

    wallet = models.ForeignKey("wallet.Wallet", on_delete=models.CASCADE, related_name="store_redemptions")
    partner = models.ForeignKey(StorePartner, on_delete=models.PROTECT, related_name="redemptions")
    amount = models.DecimalField(max_digits=14, decimal_places=0)
    status = models.CharField(max_length=16, choices=StoreRedemptionStatus.choices, default=StoreRedemptionStatus.PENDING)
    redemption_code = models.CharField(max_length=12, blank=True)
    processed_by = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"استفاده {self.amount} در {self.partner} - {self.wallet.user} ({self.status})"
