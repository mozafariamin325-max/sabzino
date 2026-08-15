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
