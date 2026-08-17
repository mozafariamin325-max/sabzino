from django.contrib import admin
from .models import PlatformSetting, Rating


@admin.register(PlatformSetting)
class PlatformSettingAdmin(admin.ModelAdmin):
    list_display = ("key", "value", "description", "updated_at")
    search_fields = ("key", "description")


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ("from_user", "to_user", "context_type", "reference", "score", "created_at")
    list_filter = ("context_type", "score")
    search_fields = ("from_user__username", "to_user__username", "reference")
