from django.db import models
from core.models import TimeStampedModel


class AuditLog(TimeStampedModel):
    """
    Records every sensitive mutating action (spec section 54): login, role
    change, wallet change, price change, commission change, verification,
    refund, order status change, withdrawal.
    """

    user = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_logs")
    action = models.CharField(max_length=64)
    method = models.CharField(max_length=8, blank=True)
    path = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} - {self.user}"
