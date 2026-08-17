from django.db import models
from core.models import TimeStampedModel, UUIDModel


class VerificationStatus(models.TextChoices):
    PENDING = "PENDING", "در انتظار بررسی"
    APPROVED = "APPROVED", "تأیید شده"
    REJECTED = "REJECTED", "رد شده"


class OrgProfileBase(TimeStampedModel, UUIDModel):
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="%(class)s_profile")
    name = models.CharField(max_length=128)
    national_id = models.CharField(max_length=20, blank=True)
    city = models.CharField(max_length=64, default="یاسوج")
    address = models.CharField(max_length=255, blank=True)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    phone_number = models.CharField(max_length=15, blank=True)
    verification_status = models.CharField(max_length=16, choices=VerificationStatus.choices, default=VerificationStatus.PENDING)
    documents = models.FileField(upload_to="marketplace/documents/", null=True, blank=True)

    class Meta:
        abstract = True

    def __str__(self):
        return self.name


class RecyclingCenter(OrgProfileBase):
    materials_processed = models.ManyToManyField("materials.Material", related_name="recycling_centers", blank=True)


class Factory(OrgProfileBase):
    industry = models.CharField(max_length=128, blank=True)
    purchase_capacity_kg_month = models.DecimalField(max_digits=12, decimal_places=1, default=0)
    materials_needed = models.ManyToManyField("materials.Material", related_name="factories", blank=True)
    coverage_area = models.CharField(max_length=255, blank=True)
    minimum_order_kg = models.DecimalField(max_digits=10, decimal_places=1, default=0)


class Wholesaler(OrgProfileBase):
    materials_of_interest = models.ManyToManyField("materials.Material", related_name="wholesalers", blank=True)


class Business(OrgProfileBase):
    business_type = models.CharField(max_length=64, blank=True)


class ListingStatus(models.TextChoices):
    DRAFT = "DRAFT", "پیش‌نویس"
    ACTIVE = "ACTIVE", "فعال"
    RESERVED = "RESERVED", "رزرو شده"
    SOLD = "SOLD", "فروخته شده"
    EXPIRED = "EXPIRED", "منقضی"
    CANCELLED = "CANCELLED", "لغو شده"


class Listing(TimeStampedModel, UUIDModel):
    """A seller offering material for sale (spec section 20). Seller can be any role via seller_user."""

    seller = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="listings")
    material = models.ForeignKey("materials.Material", on_delete=models.PROTECT, related_name="listings")
    quantity_kg = models.DecimalField(max_digits=10, decimal_places=1)
    price_per_kg = models.DecimalField(max_digits=12, decimal_places=0)
    minimum_order_kg = models.DecimalField(max_digits=10, decimal_places=1, default=1)
    quality = models.CharField(max_length=64, blank=True)
    location = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=ListingStatus.choices, default=ListingStatus.ACTIVE)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.material} x {self.quantity_kg}kg - {self.seller}"


class ListingImage(TimeStampedModel):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="marketplace/listings/")


class PurchaseRequestStatus(models.TextChoices):
    OPEN = "OPEN", "باز"
    FULFILLED = "FULFILLED", "تکمیل شده"
    CANCELLED = "CANCELLED", "لغو شده"


class PurchaseRequest(TimeStampedModel, UUIDModel):
    """Reverse marketplace (spec section 24): buyer announces a demand, sellers make offers."""

    buyer = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="purchase_requests")
    material = models.ForeignKey("materials.Material", on_delete=models.PROTECT, related_name="purchase_requests")
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=1)
    target_price_per_kg = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True)
    coverage_area = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=PurchaseRequestStatus.choices, default=PurchaseRequestStatus.OPEN)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"نیاز {self.material} x {self.quantity_kg}kg - {self.buyer}"


class InventoryMovementDirection(models.TextChoices):
    IN = "IN", "ورود"
    OUT = "OUT", "خروج"


class InventoryMovement(TimeStampedModel, UUIDModel):
    """
    Waste in/out ledger for a business account (spec ask: راننده/خریدار عمده/
    کارخانه بتوانند ورود و خروج پسماند را مدیریت کنند). Current stock per
    material is derived as sum(IN) - sum(OUT) for that owner — never stored,
    so it can never drift out of sync with the movement log.
    """

    owner = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="inventory_movements")
    material = models.ForeignKey("materials.Material", on_delete=models.PROTECT, related_name="inventory_movements")
    direction = models.CharField(max_length=4, choices=InventoryMovementDirection.choices)
    weight_kg = models.DecimalField(max_digits=10, decimal_places=1)
    unit_price_snapshot = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True)
    total_value = models.DecimalField(max_digits=14, decimal_places=0, null=True, blank=True)
    counterparty_name = models.CharField(max_length=128, blank=True, help_text="تحویل‌دهنده یا تحویل‌گیرنده")
    note = models.CharField(max_length=255, blank=True)
    recorded_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_direction_display()} {self.weight_kg}kg {self.material} - {self.owner}"


class Offer(TimeStampedModel, UUIDModel):
    STATUS_CHOICES = [("PENDING", "در انتظار"), ("ACCEPTED", "پذیرفته شده"), ("REJECTED", "رد شده"), ("WITHDRAWN", "پس گرفته شده")]
    purchase_request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name="offers")
    seller = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="offers")
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=1)
    price_per_kg = models.DecimalField(max_digits=12, decimal_places=0)
    message = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="PENDING")

    def __str__(self):
        return f"پیشنهاد {self.seller} برای {self.purchase_request}"
