from rest_framework import serializers
from .models import CollectorProfile, Vehicle, CollectorDocument


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = "__all__"
        read_only_fields = ("collector",)


class CollectorDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectorDocument
        fields = "__all__"
        read_only_fields = ("collector", "verified")


class CollectorProfileSerializer(serializers.ModelSerializer):
    vehicles = VehicleSerializer(many=True, read_only=True)
    documents = CollectorDocumentSerializer(many=True, read_only=True)
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_phone = serializers.CharField(source="user.phone_number", read_only=True)
    acceptance_rate = serializers.ReadOnlyField()

    class Meta:
        model = CollectorProfile
        fields = (
            "id", "uid", "user", "full_name", "user_phone", "national_id", "national_card_image", "license_image",
            "city", "service_area", "bank_account_number", "sheba_number",
            "verification_status", "verification_note", "is_online", "current_lat", "current_lng",
            "rating_avg", "completed_jobs", "cancelled_jobs", "acceptance_rate", "vehicles", "documents",
        )
        # NOTE: the admin approve/reject/suspend/reactivate actions on AdminCollectorViewSet
        # (collectors/views.py) look up by numeric `id` (DRF's default pk lookup, matching how
        # VerificationCenterView already builds its action URLs) — `id` is exposed here so the
        # admin collector-management UI can call those same actions directly.
        read_only_fields = ("id", "user", "verification_status", "verification_note", "rating_avg", "completed_jobs", "cancelled_jobs")


class CollectorRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectorProfile
        fields = (
            "national_id", "national_card_image", "license_image", "city",
            "service_area", "bank_account_number", "sheba_number",
        )
