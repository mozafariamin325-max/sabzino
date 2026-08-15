from django.contrib import admin
from .models import CollectionRequest, CollectionAssignment, CollectionStatusLog, WeighingRecord


class StatusLogInline(admin.TabularInline):
    model = CollectionStatusLog
    extra = 0
    readonly_fields = ("status", "note", "changed_by", "created_at")


@admin.register(CollectionRequest)
class CollectionRequestAdmin(admin.ModelAdmin):
    list_display = ("code", "citizen", "status", "amount_range", "estimated_value", "created_at")
    list_filter = ("status", "amount_range")
    search_fields = ("code", "citizen__username", "citizen__phone_number")
    inlines = [StatusLogInline]


admin.site.register(CollectionAssignment)
admin.site.register(WeighingRecord)
