from django.db import models
from core.models import TimeStampedModel, UUIDModel


class RecyclingStation(TimeStampedModel, UUIDModel):
    name = models.CharField(max_length=128)
    address = models.CharField(max_length=255)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    working_hours = models.CharField(max_length=128, default="۸ صبح تا ۸ شب")
    accepted_materials = models.ManyToManyField("materials.Material", related_name="stations", blank=True)
    capacity_kg_per_day = models.DecimalField(max_digits=10, decimal_places=1, default=1000)
    phone_number = models.CharField(max_length=15, blank=True)
    image = models.ImageField(upload_to="stations/", null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class StationOperator(TimeStampedModel):
    station = models.ForeignKey(RecyclingStation, on_delete=models.CASCADE, related_name="operators")
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="station_operator_profile")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user} @ {self.station}"


class StationTransaction(TimeStampedModel, UUIDModel):
    """Walk-in drop-off at a station: operator scans citizen, weighs, and settles on the spot."""

    station = models.ForeignKey(RecyclingStation, on_delete=models.CASCADE, related_name="transactions")
    operator = models.ForeignKey(StationOperator, on_delete=models.SET_NULL, null=True, related_name="transactions")
    citizen = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="station_transactions")
    material = models.ForeignKey("materials.Material", on_delete=models.PROTECT, related_name="station_transactions")
    weight_kg = models.DecimalField(max_digits=8, decimal_places=2)
    unit_price_snapshot = models.DecimalField(max_digits=12, decimal_places=0)
    total_value = models.DecimalField(max_digits=12, decimal_places=0)
    points_awarded = models.IntegerField(default=0)
    transaction_code = models.CharField(max_length=16, unique=True)

    def __str__(self):
        return f"{self.transaction_code} - {self.station.name}"
