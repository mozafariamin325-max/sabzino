from django.db import models
from core.models import TimeStampedModel, UUIDModel


class Wallet(TimeStampedModel):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="wallet")
    balance = models.DecimalField(max_digits=14, decimal_places=0, default=0, help_text="Toman")
    pending_balance = models.DecimalField(max_digits=14, decimal_places=0, default=0)

    def __str__(self):
        return f"کیف پول {self.user} - {self.balance} تومان"

    @property
    def withdrawable_balance(self):
        return self.balance


class WalletTransactionType(models.TextChoices):
    CREDIT = "CREDIT", "واریز"
    DEBIT = "DEBIT", "برداشت"
    WITHDRAWAL = "WITHDRAWAL", "درخواست برداشت"
    PURCHASE = "PURCHASE", "خرید"
    SALE = "SALE", "فروش"
    REWARD = "REWARD", "پاداش"
    COMMISSION = "COMMISSION", "کمیسیون"
    REFUND = "REFUND", "بازگشت وجه"


class WalletTransaction(TimeStampedModel, UUIDModel):
    """Immutable ledger row. Never edit/delete — create a REFUND/adjustment row instead."""

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="transactions")
    type = models.CharField(max_length=16, choices=WalletTransactionType.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=0)
    balance_after = models.DecimalField(max_digits=14, decimal_places=0)
    description = models.CharField(max_length=255, blank=True)
    reference = models.CharField(max_length=64, blank=True, help_text="e.g. collection request code, order code")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.type} {self.amount} - {self.wallet.user}"


class WithdrawalRequest(TimeStampedModel, UUIDModel):
    STATUS_CHOICES = [
        ("PENDING", "در انتظار بررسی"),
        ("APPROVED", "تأیید شد"),
        ("REJECTED", "رد شد"),
        ("PAID", "پرداخت شد"),
    ]
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="withdrawal_requests")
    amount = models.DecimalField(max_digits=14, decimal_places=0)
    sheba_number = models.CharField(max_length=26, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="PENDING")
    processed_by = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    note = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"برداشت {self.amount} - {self.wallet.user} ({self.status})"
