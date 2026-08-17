from django.contrib import admin
from .models import ImpactProject, ImpactContribution


@admin.register(ImpactProject)
class ImpactProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "status", "goal_amount", "raised_amount", "is_demo", "order")
    list_filter = ("category", "status", "is_demo")
    list_editable = ("status", "order")
    search_fields = ("title", "operator_name")


@admin.register(ImpactContribution)
class ImpactContributionAdmin(admin.ModelAdmin):
    list_display = ("tracking_code", "user", "project", "amount", "request", "created_at")
    list_filter = ("project",)
    search_fields = ("tracking_code", "user__username", "user__first_name", "user__last_name")
    readonly_fields = [f.name for f in ImpactContribution._meta.fields]

    def has_add_permission(self, request):
        return False  # contributions are only created through the wallet-backed service, never freehand
