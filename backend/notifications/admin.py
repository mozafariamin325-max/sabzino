from django.contrib import admin
from .models import NotificationTemplate, Notification

admin.site.register(NotificationTemplate)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "channel", "is_read", "created_at")
    list_filter = ("channel", "is_read")
