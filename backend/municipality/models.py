from django.db import models
from core.models import TimeStampedModel


class Municipality(TimeStampedModel):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="municipality_profile")
    city = models.CharField(max_length=64, default="یاسوج")
    department_name = models.CharField(max_length=128, blank=True)

    def __str__(self):
        return f"شهرداری {self.city}"
