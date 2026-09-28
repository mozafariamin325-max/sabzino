from rest_framework import serializers
from .models import GreenPointAccount, GreenPointTransaction, Badge, UserBadge, Challenge, ChallengeParticipation, FieldEvent, FieldEventRegistration


class GreenPointAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = GreenPointAccount
        fields = ("points", "level", "xp")


class GreenPointTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GreenPointTransaction
        fields = ("uid", "amount", "reason", "description", "created_at")


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ("id", "name", "icon", "description", "points_required")


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ("badge", "awarded_at")


class ChallengeSerializer(serializers.ModelSerializer):
    my_progress = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = (
            "id", "title", "description", "type", "target_value", "reward_points",
            "start_at", "end_at", "is_active", "my_progress",
        )

    def get_my_progress(self, obj):
        user = self.context.get("request").user if self.context.get("request") else None
        if not user or not user.is_authenticated:
            return None
        cp = obj.participations.filter(user=user).first()
        if not cp:
            return {"progress_value": 0, "completed": False}
        return {"progress_value": cp.progress_value, "completed": cp.completed}


class FieldEventSerializer(serializers.ModelSerializer):
    registered_count = serializers.SerializerMethodField()
    spots_left = serializers.SerializerMethodField()
    is_registered = serializers.SerializerMethodField()

    class Meta:
        model = FieldEvent
        fields = (
            "uid", "title", "description", "location_name", "event_date", "capacity", "prize_text",
            "lunch_included", "extra_info", "is_active", "registered_count", "spots_left", "is_registered",
        )

    def get_registered_count(self, obj):
        return obj.registrations.count()

    def get_spots_left(self, obj):
        return max(obj.capacity - obj.registrations.count(), 0)

    def get_is_registered(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return obj.registrations.filter(user=user).exists()


class FieldEventRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldEventRegistration
        fields = ("full_name", "phone_number", "note", "created_at")
