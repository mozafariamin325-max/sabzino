from django.db import models
from core.models import TimeStampedModel, UUIDModel


class GreenPointAccount(TimeStampedModel):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="points_account")
    points = models.IntegerField(default=0)
    level = models.PositiveSmallIntegerField(default=1)
    xp = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user} - {self.points} امتیاز"


class GreenPointTransaction(TimeStampedModel, UUIDModel):
    REASON_CHOICES = [
        ("COLLECTION", "تحویل پسماند"),
        ("REFERRAL", "دعوت دوست"),
        ("CHALLENGE", "چالش"),
        ("STREAK", "تحویل منظم"),
        ("ADMIN_ADJUST", "اصلاح توسط مدیر"),
        ("REDEEM", "استفاده در فروشگاه"),
    ]
    account = models.ForeignKey(GreenPointAccount, on_delete=models.CASCADE, related_name="transactions")
    amount = models.IntegerField()
    reason = models.CharField(max_length=16, choices=REASON_CHOICES)
    description = models.CharField(max_length=255, blank=True)
    reference = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-created_at"]


class Badge(TimeStampedModel):
    name = models.CharField(max_length=64)
    icon = models.CharField(max_length=16, default="🌱")
    description = models.CharField(max_length=255, blank=True)
    points_required = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.icon} {self.name}"


class UserBadge(TimeStampedModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="badges")
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name="holders")
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "badge")


class Challenge(TimeStampedModel):
    TYPE_CHOICES = [
        ("WEIGHT", "وزن"), ("TRANSACTIONS", "تعداد تراکنش"), ("STREAK", "پیوستگی"),
        ("REFERRAL", "دعوت"), ("NEIGHBORHOOD", "محله"),
    ]
    title = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=16, choices=TYPE_CHOICES)
    target_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reward_points = models.IntegerField(default=0)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title


class ChallengeParticipation(TimeStampedModel):
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name="participations")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="challenge_participations")
    progress_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("challenge", "user")


class Referral(TimeStampedModel):
    referrer = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="made_referrals")
    referee = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="referral_record")
    reward_points = models.IntegerField(default=0)
    rewarded = models.BooleanField(default=False)


class FieldEvent(TimeStampedModel, UUIDModel):
    """چالش میدانی (مثلاً پاکسازی آبشار): تاریخ مشخص، ظرفیت، ثبت‌نام شرکت‌کننده، جایزه و ناهار.
    از داشبورد مدیریت ساخته و ویرایش می‌شود."""

    title = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    location_name = models.CharField(max_length=160, blank=True, help_text="مثلاً آبشار یاسوج")
    event_date = models.DateTimeField()
    capacity = models.PositiveIntegerField(default=40)
    prize_text = models.CharField(max_length=200, blank=True, help_text="جایزهٔ شرکت‌کنندگان")
    lunch_included = models.BooleanField(default=True)
    extra_info = models.TextField(blank=True, help_text="محل تجمع، پوشش پیشنهادی و ...")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["event_date"]

    def __str__(self):
        return self.title


class FieldEventRegistration(TimeStampedModel):
    event = models.ForeignKey(FieldEvent, on_delete=models.CASCADE, related_name="registrations")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="event_registrations")
    full_name = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=15)
    note = models.CharField(max_length=200, blank=True)

    class Meta:
        unique_together = ("event", "user")
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.full_name} → {self.event}"
