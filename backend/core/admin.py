from django.contrib import admin
from .models import PlatformSetting


@admin.register(PlatformSetting)
class PlatformSettingAdmin(admin.ModelAdmin):
    list_display = ("key", "value", "description", "updated_at")
    search_fields = ("key", "description")
