from django.db import models
from core.models import TimeStampedModel


class Province(TimeStampedModel):
    name = models.CharField(max_length=64, unique=True)

    def __str__(self):
        return self.name


class City(TimeStampedModel):
    province = models.ForeignKey(Province, on_delete=models.CASCADE, related_name="cities")
    name = models.CharField(max_length=64)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

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
