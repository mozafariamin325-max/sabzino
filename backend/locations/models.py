from django.db import models
from core.models import TimeStampedModel


class Province(TimeStampedModel):
    name = models.CharField(max_length=64, unique=True)

    def __str__(self):
        return self.name


class City(TimeStampedModel):
    """
    Cities carry an optional "local identity" branding kit so the home page
    can show a per-city hero (landmark + theme colors) instead of one
    generic look. Only cities with has_identity=True get the themed hero;
    others fall back to the default green Sabzino look. This keeps the
    architecture ready for Shiraz/Isfahan/Tehran later without needing
    photo assets yet — landmark_icon is an emoji placeholder.
    """

    province = models.ForeignKey(Province, on_delete=models.CASCADE, related_name="cities")
    name = models.CharField(max_length=64)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    has_identity = models.BooleanField(default=False, help_text="فعال‌سازی هویت بصری اختصاصی این شهر در صفحه اصلی")
    landmark_name = models.CharField(max_length=64, blank=True, help_text="مثلاً کوه دنا / تخت جمشید / سی‌وسه‌پل")
    landmark_icon = models.CharField(max_length=8, blank=True, help_text="ایموجی نمادین لندمارک، مثلاً 🏔️")
    theme_color_from = models.CharField(max_length=9, blank=True, help_text="کد رنگ hex شروع گرادیان، مثلاً #0f4d2e")
    theme_color_to = models.CharField(max_length=9, blank=True, help_text="کد رنگ hex پایان گرادیان، مثلاً #16a34a")
    hero_tagline = models.CharField(max_length=140, blank=True, help_text="شعار کوتاه هویت محلی این شهر")

    class Meta:
        unique_together = ("province", "name")

    def __str__(self):
        return self.name


class District(TimeStampedModel):
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="districts")
    name = models.CharField(max_length=64)

    def __str__(self):
        return f"{self.name} ({self.city})"


class Neighborhood(TimeStampedModel):
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name="neighborhoods")
    name = models.CharField(max_length=64)

    def __str__(self):
        return self.name
