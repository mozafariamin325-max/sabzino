from django.contrib import admin
from .models import (
    RecyclingCenter, Factory, Wholesaler, Business, Listing, ListingImage, PurchaseRequest, Offer,
    InventoryMovement,
)


@admin.register(RecyclingCenter)
class RecyclingCenterAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "verification_status")
    list_filter = ("verification_status",)


@admin.register(Factory)
class FactoryAdmin(admin.ModelAdmin):
    list_display = ("name", "industry", "city", "verification_status")
    list_filter = ("verification_status",)


@admin.register(Wholesaler)
class WholesalerAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "verification_status")
    list_filter = ("verification_status",)


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ("name", "business_type", "city", "verification_status")
    list_filter = ("verification_status",)


class ListingImageInline(admin.TabularInline):
    model = ListingImage
    extra = 0


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ("material", "seller", "quantity_kg", "price_per_kg", "status")
    list_filter = ("status", "material")
    inlines = [ListingImageInline]


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ("material", "buyer", "quantity_kg", "status")
    list_filter = ("status", "material")


@admin.register(InventoryMovement)
class InventoryMovementAdmin(admin.ModelAdmin):
    list_display = ("owner", "material", "direction", "weight_kg", "total_value", "created_at")
    list_filter = ("direction", "material")
    search_fields = ("owner__username", "counterparty_name")


admin.site.register(Offer)
