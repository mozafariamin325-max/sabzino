from django.db import models
from core.models import TimeStampedModel, UUIDModel


class NotificationTemplate(TimeStampedModel):
    key = models.CharField(max_length=64, unique=True)
    title_template = models.CharField(max_length=128)
    body_template = models.CharField(max_length=255)

    def __str__(self):
        return self.key


class Notification(TimeStampedModel, UUIDModel):
    CHANNEL_CHOICES = [("IN_APP", "درون‌برنامه‌ای"), ("SMS", "پیامک"), ("EMAIL", "ایمیل"), ("PUSH", "پوش")]
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=128)
    body = models.CharField(max_length=255)
    channel = models.CharField(max_length=16, choices=CHANNEL_CHOICES, default="IN_APP")
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} -> {self.user}"
