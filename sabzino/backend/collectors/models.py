from django.db import models
from core.models import TimeStampedModel, UUIDModel


class VerificationStatus(models.TextChoices):
    PENDING = "PENDING", "در انتظار بررسی"
    UNDER_REVIEW = "UNDER_REVIEW", "در حال بررسی"
    APPROVED = "APPROVED", "تأیید شده"
    REJECTED = "REJECTED", "رد شده"
    SUSPENDED = "SUSPENDED", "معلق"


class CollectorProfile(TimeStampedModel, UUIDModel):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="collector_profile")
    national_id = models.CharField(max_length=10, blank=True)
    national_card_image = models.ImageField(upload_to="collectors/national_card/", null=True, blank=True)
    license_image = models.ImageField(upload_to="collectors/license/", null=True, blank=True)
    city = models.CharField(max_length=64, default="یاسوج")
    service_area = models.CharField(max_length=255, blank=True, help_text="محدوده فعالیت")
    bank_account_number = models.CharField(max_length=32, blank=True)
    sheba_number = models.CharField(max_length=26, blank=True)
    verification_status = models.CharField(max_length=16, choices=VerificationStatus.choices, default=VerificationStatus.PENDING)
    verification_note = models.CharField(max_length=255, blank=True)
    is_online = models.BooleanField(default=False)
    current_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=5)
    completed_jobs = models.PositiveIntegerField(default=0)
    cancelled_jobs = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"جمع‌آور: {self.user}"

    @property
    def is_approved(self):
        return self.verification_status == VerificationStatus.APPROVED

    @property
    def acceptance_rate(self):
        total = self.completed_jobs + self.cancelled_jobs
        if not total:
            return 100
        return round(self.completed_jobs / total * 100, 1)


class Vehicle(TimeStampedModel):
    VEHICLE_TYPES = [("PICKUP", "وانت"), ("MOTORCYCLE", "موتور"), ("VAN", "ون"), ("TRUCK", "کامیونت")]
    collector = models.ForeignKey(CollectorProfile, on_delete=models.CASCADE, related_name="vehicles")
    brand = models.CharField(max_length=64, blank=True)
    model = models.CharField(max_length=64, blank=True)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    plate_number = models.CharField(max_length=20)
    vehicle_type = models.CharField(max_length=16, choices=VEHICLE_TYPES, default="PICKUP")
    capacity_kg = models.DecimalField(max_digits=8, decimal_places=1, default=100)
    color = models.CharField(max_length=32, blank=True)
    vehicle_image = models.ImageField(upload_to="collectors/vehicles/", null=True, blank=True)
    insurance_expiry = models.DateField(null=True, blank=True)
    technical_inspection_expiry = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.brand} {self.model} ({self.plate_number})"


class CollectorDocument(TimeStampedModel):
    DOC_TYPES = [("NATIONAL_CARD", "کارت ملی"), ("LICENSE", "گواهینامه"), ("VEHICLE_CARD", "کارت خودرو"), ("OTHER", "سایر")]
    collector = models.ForeignKey(CollectorProfile, on_delete=models.CASCADE, related_name="documents")
    doc_type = models.CharField(max_length=16, choices=DOC_TYPES)
    file = models.FileField(upload_to="collectors/documents/")
    verified = models.BooleanField(default=False)
