from django.contrib.auth.models import AbstractUser
from django.db import models
from core.models import TimeStampedModel, UUIDModel


class Role(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "مدیر ارشد"
    ADMIN = "ADMIN", "مدیر"
    MUNICIPALITY = "MUNICIPALITY", "شهرداری"
    CITIZEN = "CITIZEN", "شهروند"
    COLLECTOR = "COLLECTOR", "جمع‌آور"
    STATION_OPERATOR = "STATION_OPERATOR", "اپراتور ایستگاه"
    RECYCLING_CENTER = "RECYCLING_CENTER", "مرکز بازیافت"
    WHOLESALER = "WHOLESALER", "خریدار عمده"
    FACTORY = "FACTORY", "کارخانه"
    BUSINESS = "BUSINESS", "کسب‌وکار"
    SCHOOL = "SCHOOL", "مدرسه"
    APARTMENT_MANAGER = "APARTMENT_MANAGER", "مدیر مجتمع"


class User(AbstractUser, UUIDModel):
    """
    Custom user. Phone is the primary real-world identifier (OTP-ready via
    accounts.services.otp, currently backed by password auth per MVP scope),
    email is optional. A user may hold multiple roles (UserRole rows).
    """

    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    phone_verified = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    referral_code = models.CharField(max_length=12, unique=True, null=True, blank=True)
    referred_by = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="referrals"
    )
    is_suspended = models.BooleanField(default=False)

    def __str__(self):
        return self.get_full_name() or self.username

    def has_role(self, role: str) -> bool:
        return self.roles.filter(role=role).exists()

    @property
    def role_list(self):
        return list(self.roles.values_list("role", flat=True))


class UserRole(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="roles")
    role = models.CharField(max_length=32, choices=Role.choices)
    is_primary = models.BooleanField(default=False)

    class Meta:
        unique_together = ("user", "role")

    def __str__(self):
        return f"{self.user} -> {self.role}"


class Address(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    title = models.CharField(max_length=64, default="آدرس من")
    province = models.CharField(max_length=64, blank=True)
    city = models.CharField(max_length=64, default="یاسوج")
    district = models.CharField(max_length=128, blank=True)
    full_address = models.TextField()
    postal_code = models.CharField(max_length=10, blank=True)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_default = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.title} - {self.user}"


class OTPRequest(TimeStampedModel):
    """
    Interface kept ready for real SMS OTP (spec section 4). Not wired to a live
    SMS provider yet (no API key available) — see accounts/services.py.
    """

    phone_number = models.CharField(max_length=15, db_index=True)
    code = models.CharField(max_length=6)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    attempt_count = models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        return f"OTP({self.phone_number})"
