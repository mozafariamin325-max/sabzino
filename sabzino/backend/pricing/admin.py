from django.contrib import admin
from .models import MaterialPrice


@admin.register(MaterialPrice)
class MaterialPriceAdmin(admin.ModelAdmin):
    list_display = ("material", "price_per_unit", "market_price", "active", "effective_from", "effective_to")
    list_filter = ("active", "material")
    list_editable = ("market_price",)
