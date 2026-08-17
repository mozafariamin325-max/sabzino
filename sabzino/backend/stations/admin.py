from django.contrib import admin
from .models import RecyclingStation, StationOperator, StationTransaction


@admin.register(RecyclingStation)
class RecyclingStationAdmin(admin.ModelAdmin):
    list_display = ("name", "address", "is_active", "capacity_kg_per_day")
    filter_horizontal = ("accepted_materials",)


admin.site.register(StationOperator)


@admin.register(StationTransaction)
class StationTransactionAdmin(admin.ModelAdmin):
    list_display = ("transaction_code", "station", "citizen", "material", "weight_kg", "total_value", "created_at")
    search_fields = ("transaction_code", "citizen__username")
