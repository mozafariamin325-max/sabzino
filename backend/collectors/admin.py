from django.contrib import admin
from .models import CollectorProfile, Vehicle, CollectorDocument, ServiceAreaQuota


class VehicleInline(admin.TabularInline):
    model = Vehicle
    extra = 0


class CollectorDocumentInline(admin.TabularInline):
    model = CollectorDocument
    extra = 0


@admin.register(CollectorProfile)
class CollectorProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "city", "verification_status", "is_online", "rating_avg", "completed_jobs")
    list_filter = ("verification_status", "is_online", "city")
    inlines = [VehicleInline, CollectorDocumentInline]
    actions = ["approve", "reject"]

    @admin.action(description="تأیید جمع‌آوران انتخاب‌شده")
    def approve(self, request, queryset):
        queryset.update(verification_status="APPROVED")

    @admin.action(description="رد جمع‌آوران انتخاب‌شده")
    def reject(self, request, queryset):
        queryset.update(verification_status="REJECTED")


admin.site.register(Vehicle)


@admin.register(ServiceAreaQuota)
class ServiceAreaQuotaAdmin(admin.ModelAdmin):
    list_display = ("area_name", "max_collectors", "is_active")
    list_editable = ("max_collectors", "is_active")
    search_fields = ("area_name",)
