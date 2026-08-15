import uuid
from django.db import models


class TimeStampedModel(models.Model):
    """Abstract base: created/updated timestamps for every domain model."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UUIDModel(models.Model):
    """Abstract base: public-facing UUID identifier (kept alongside numeric PK)."""

    uid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)

    class Meta:
        abstract = True


class PlatformSetting(TimeStampedModel):
    """
    Key/value store so Admins can tune business rules (commission %, point rates,
    min/max collection weight, referral rewards, etc.) WITHOUT redeploying code.
    Read via core.services.get_setting(key, default).
    """

    key = models.CharField(max_length=100, unique=True)
    value = models.CharField(max_length=255)
    description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.key}={self.value}"


class RatingContext(models.TextChoices):
    COLLECTION = "COLLECTION", "جمع‌آوری (شهروند ↔ جمع‌آور)"
    ORDER = "ORDER", "سفارش بازارگاه (خریدار ↔ فروشنده)"
    STATION = "STATION", "تحویل به ایستگاه (شهروند ↔ ایستگاه)"


class Rating(TimeStampedModel, UUIDModel):
    """
    Two-way post-transaction rating (spec section 79): Citizen↔Collector,
    Buyer↔Seller, Factory↔Seller, Station↔User. `reference` is the
    human-readable code of the underlying object (CollectionRequest.code /
    Order.code / StationTransaction.transaction_code) rather than a generic FK,
    so this stays simple and works the same for every context.
    """

    from_user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="ratings_given")
    to_user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="ratings_received")
    context_type = models.CharField(max_length=16, choices=RatingContext.choices)
    reference = models.CharField(max_length=32, help_text="کد درخواست/سفارش/تراکنش مربوطه")
    score = models.PositiveSmallIntegerField(help_text="۱ تا ۵")
    comment = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("from_user", "context_type", "reference")

    def __str__(self):
        return f"{self.from_user} -> {self.to_user}: {self.score}/5 ({self.context_type})"
