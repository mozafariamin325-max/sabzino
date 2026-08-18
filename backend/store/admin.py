from django.contrib import admin
from .models import StorePartner, StoreRedemption


@admin.register(StorePartner)
class StorePartnerAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_active", "created_at")
    list_filter = ("category", "is_active")
    search_fields = ("name",)


@admin.register(StoreRedemption)
class StoreRedemptionAdmin(admin.ModelAdmin):
    list_display = ("partner", "wallet", "amount", "status", "created_at")
    list_filter = ("status",)
