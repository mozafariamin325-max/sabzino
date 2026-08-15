from django.contrib import admin
from .models import (
    CollectionRequest, CollectionAssignment, CollectionStatusLog, WeighingRecord,
    CollectionRequestItem, RecurringSchedule,
)


class StatusLogInline(admin.TabularInline):
    model = CollectionStatusLog
    extra = 0
    readonly_fields = ("status", "note", "changed_by", "created_at")


class RequestItemInline(admin.TabularInline):
    model = CollectionRequestItem
    extra = 0


@admin.register(CollectionRequest)
class CollectionRequestAdmin(admin.ModelAdmin):
    list_display = ("code", "citizen", "status", "amount_range", "estimated_value", "created_at")
    list_filter = ("status", "amount_range")
    search_fields = ("code", "citizen__username", "citizen__phone_number")
    inlines = [RequestItemInline, StatusLogInline]


@admin.register(RecurringSchedule)
class RecurringScheduleAdmin(admin.ModelAdmin):
    list_display = ("citizen", "frequency", "next_run_date", "is_active")
    list_filter = ("frequency", "is_active")
    search_fields = ("citizen__username",)


admin.site.register(CollectionAssignment)
admin.site.register(WeighingRecord)
