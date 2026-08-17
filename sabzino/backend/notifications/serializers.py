from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("uid", "title", "body", "channel", "is_read", "link", "created_at")
