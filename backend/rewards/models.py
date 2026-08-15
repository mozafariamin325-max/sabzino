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
