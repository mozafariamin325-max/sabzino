from django.db import models
from core.models import TimeStampedModel


class MaterialCategory(TimeStampedModel):
    name = models.CharField(max_length=64, unique=True)
    icon = models.CharField(max_length=32, blank=True, help_text="emoji or icon key used by the frontend")
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]
        verbose_name_plural = "Material categories"

    def __str__(self):
        return self.name


class Material(TimeStampedModel):
    UNIT_CHOICES = [("kg", "کیلوگرم"), ("piece", "عدد")]

    category = models.ForeignKey(MaterialCategory, on_delete=models.CASCADE, related_name="materials")
    name = models.CharField(max_length=64)
    slug = models.SlugField(max_length=64, unique=True)
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default="kg")
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=32, blank=True)
    is_active = models.BooleanField(default=True)
    accepted_at_stations = models.BooleanField(default=True)
    co2_kg_saved_per_kg = models.DecimalField(
        max_digits=6, decimal_places=3, default=0,
        help_text="Configurable estimate used for the environmental-impact widgets (not scientific fact).",
    )
    requires_appraisal = models.BooleanField(
        default=False,
        help_text="No fixed per-kg price — value depends on inspection (e.g. mixed e-waste boards, tires). "
                   "Frontend shows 'قیمت پس از کارشناسی' instead of a number.",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def current_price(self):
        latest = self.prices.filter(active=True).order_by("-effective_from").first()
        return latest.price_per_unit if latest else None
