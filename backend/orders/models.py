from django.db import models
from core.models import TimeStampedModel, UUIDModel


class OrderStatus(models.TextChoices):
    PENDING = "PENDING", "در انتظار"
    CONFIRMED = "CONFIRMED", "تأیید شده"
    PROCESSING = "PROCESSING", "در حال پردازش"
    READY_FOR_PICKUP = "READY_FOR_PICKUP", "آماده تحویل"
    IN_TRANSIT = "IN_TRANSIT", "در حال ارسال"
    DELIVERED = "DELIVERED", "تحویل داده شده"
    COMPLETED = "COMPLETED", "تکمیل شده"
    CANCELLED = "CANCELLED", "لغو شده"
    REFUNDED = "REFUNDED", "بازگشت وجه"


def generate_order_code():
    import random
    return f"ORD-{random.randint(100000, 999999)}"


class Order(TimeStampedModel, UUIDModel):
    code = models.CharField(max_length=16, unique=True, default=generate_order_code)
    buyer = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="orders_as_buyer")
    seller = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="orders_as_seller")
    listing = models.ForeignKey("marketplace.Listing", on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    offer = models.ForeignKey("marketplace.Offer", on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    subtotal = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    commission_amount = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    payment_status = models.CharField(
        max_length=16, choices=[("UNPAID", "پرداخت‌نشده"), ("PAID", "پرداخت شده"), ("REFUNDED", "بازگشت وجه")], default="UNPAID"
    )
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.code


class OrderItem(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    material = models.ForeignKey("materials.Material", on_delete=models.PROTECT, related_name="order_items")
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=0)
    line_total = models.DecimalField(max_digits=14, decimal_places=0)


class CommissionRule(TimeStampedModel):
    """
    Admin-tunable commission engine (spec section 44-45): NEVER hard-code a
    rate in code. Rules can be scoped by order_type / role / material / city;
    most-specific matching rule wins (see orders.services.resolve_commission_percent).
    """

    ORDER_TYPE_CHOICES = [
        ("COLLECTION", "جمع‌آوری شهروند"), ("MARKETPLACE", "فروش در بازارگاه"), ("FACTORY", "سفارش کارخانه"),
    ]
    order_type = models.CharField(max_length=16, choices=ORDER_TYPE_CHOICES, default="MARKETPLACE")
    role = models.CharField(max_length=32, blank=True, help_text="Optional: restrict to a seller role")
    material = models.ForeignKey("materials.Material", null=True, blank=True, on_delete=models.CASCADE, related_name="commission_rules")
    city = models.CharField(max_length=64, blank=True)
    percent = models.DecimalField(max_digits=5, decimal_places=2)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.order_type}/{self.role or '*'}/{self.material or '*'} = {self.percent}%"


class CommissionTransaction(TimeStampedModel):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="commission_transaction")
    rule = models.ForeignKey(CommissionRule, null=True, blank=True, on_delete=models.SET_NULL)
    percent_applied = models.DecimalField(max_digits=5, decimal_places=2)
    amount = models.DecimalField(max_digits=14, decimal_places=0)
