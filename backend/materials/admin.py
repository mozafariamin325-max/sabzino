from django.contrib import admin
from .models import MaterialCategory, Material


@admin.register(MaterialCategory)
class MaterialCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "icon", "order")


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "unit", "is_active", "current_price")
    list_filter = ("category", "is_active")
    prepopulated_fields = {"slug": ("name",)}
